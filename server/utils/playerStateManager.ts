import AsyncLock from 'async-lock';
import lockfile from 'proper-lockfile';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { storage } from '../storage';
import { EventEmitter } from 'events';

interface PlayerState {
  id: string;
  telegramId: string;
  username: string;
  points: number;
  lustPoints: number;
  lustGems: number;
  energy: number;
  energyMax: number;
  energyRegenRate: number;
  level: number;
  selectedCharacterId: string;
  selectedImageId: string | null;
  displayImage: string | null;
  upgrades: Record<string, number>;
  unlockedCharacters: string[];
  unlockedImages: string[];
  passiveIncomeRate: number;
  isAdmin: boolean;
  boostActive: boolean;
  boostMultiplier: number;
  boostExpiresAt: Date | null;
  totalTapsToday: number;
  totalTapsAllTime: number;
  lastDailyReset: Date;
  lastWeeklyReset: Date;
  lastSync: { timestamp: number; hash: string };
  createdAt: Date;
  updatedAt: Date;
}

EventEmitter.defaultMaxListeners = 20;

class PlayerStateManager extends EventEmitter {
  private states = new Map<string, PlayerState>();
  private locks = new Map<string, AsyncLock>();
  private pendingSyncs = new Set<string>();
  private syncTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly playersRoot: string; // main-gamedata/player-data
  private readonly snapshotsDir: string; // uploads/snapshots/players

  constructor() {
    super();
    this.setMaxListeners(50);
    this.playersRoot = path.join(process.cwd(), 'main-gamedata', 'player-data');
    this.snapshotsDir = path.join(process.cwd(), 'uploads', 'snapshots', 'players');
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    await fs.mkdir(this.playersRoot, { recursive: true });
    await fs.mkdir(this.snapshotsDir, { recursive: true });
    console.log('📁 Player directories ensured:', {
      primary: this.playersRoot,
      backup: this.snapshotsDir
    });
  }

  private getLock(playerId: string): AsyncLock {
    if (!this.locks.has(playerId)) this.locks.set(playerId, new AsyncLock());
    return this.locks.get(playerId)!;
  }

  // 🔧 FIXED: Generate folder using telegramId_username format
  private getFolderName(telegramId: string, username?: string | null): string {
    const cleanTelegramId = telegramId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanUsername = username?.trim()?.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    if (cleanUsername && cleanUsername !== '' && cleanUsername !== 'null' && cleanUsername !== 'undefined') {
      return `${cleanTelegramId}_${cleanUsername}`;
    }
    return cleanTelegramId; // Just telegramId if no username
  }

  // 🔧 FIXED: Generate JSON filename using player_username.json or player_telegramId.json
  private getJsonFileName(telegramId: string, username?: string | null): string {
    const cleanUsername = username?.trim()?.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    if (cleanUsername && cleanUsername !== '' && cleanUsername !== 'null' && cleanUsername !== 'undefined') {
      return `player_${cleanUsername}.json`;
    }
    return `player_${telegramId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  }

  // 🔧 FIXED: Get full path to player JSON: telegramId_username/player_username.json
  private getJsonPath(telegramId: string, username?: string | null): string {
    const folder = this.getFolderName(telegramId, username);
    const filename = this.getJsonFileName(telegramId, username);
    return path.join(this.playersRoot, folder, filename);
  }

  private hashState(state: Partial<PlayerState>): string {
    const critical = {
      points: state.points,
      energy: state.energy,
      energyMax: state.energyMax,
      selectedCharacterId: state.selectedCharacterId,
      displayImage: state.displayImage,
      upgrades: state.upgrades,
      unlockedCharacters: state.unlockedCharacters,
      level: state.level
    };
    return crypto.createHash('md5').update(JSON.stringify(critical)).digest('hex');
  }

  async loadPlayer(playerId: string): Promise<PlayerState> {
    const lock = this.getLock(playerId);
    return await lock.acquire(playerId, async () => {
      if (this.states.has(playerId)) return this.states.get(playerId)!;

      console.log(`📂 Loading player ${playerId} from telegramId_username folder...`);
      let state = await this.loadFromMainJson(playerId);
      
      if (!state) {
        console.log(`📂 No telegramId_username JSON found for ${playerId}, loading from DB...`);
        state = await this.loadFromDatabase(playerId);
        if (state) {
          await this.saveMainJson(playerId, state);
          await this.createBackupSnapshot(playerId, state);
        }
      }
      
      if (!state) throw new Error(`Player ${playerId} not found in JSON or DB`);
      this.states.set(playerId, state);
      
      const folder = this.getFolderName(state.telegramId, state.username);
      const filename = this.getJsonFileName(state.telegramId, state.username);
      console.log(`✅ Player ${state.username || playerId} loaded from: ${folder}/${filename}`);
      return state;
    });
  }

  async updatePlayer(playerId: string, updates: Partial<PlayerState>): Promise<PlayerState> {
    const lock = this.getLock(playerId);
    return await lock.acquire(playerId, async () => {
      const current = await this.loadPlayer(playerId);
      const newState: PlayerState = {
        ...current,
        ...updates,
        updatedAt: new Date(),
        lastSync: { timestamp: Date.now(), hash: this.hashState({ ...current, ...updates }) }
      };
      
      const folder = this.getFolderName(newState.telegramId, newState.username);
      const filename = this.getJsonFileName(newState.telegramId, newState.username);
      console.log(`💾 Updating player ${newState.username || playerId} in: ${folder}/${filename}`);
      
      await this.saveMainJson(playerId, newState);
      this.states.set(playerId, newState);
      this.queueDatabaseSync(playerId, newState);
      if (Math.random() < 0.1) this.createBackupSnapshot(playerId, newState);
      return newState;
    });
  }

  // 🔧 FIXED: Save to telegramId_username folder with player_username.json
  private async saveMainJson(playerId: string, state: PlayerState): Promise<void> {
    const filePath = this.getJsonPath(state.telegramId, state.username);
    const dir = path.dirname(filePath);
    const lockPath = `${filePath}.lock`;
    
    const folder = this.getFolderName(state.telegramId, state.username);
    const filename = this.getJsonFileName(state.telegramId, state.username);
    console.log(`💾 Saving to: ${folder}/${filename}`);
    
    await fs.mkdir(dir, { recursive: true });
    const release = await lockfile.lock(filePath, { 
      lockfilePath: lockPath, 
      retries: 3, 
      minTimeout: 50, 
      maxTimeout: 500, 
      realpath: false 
    });
    
    try {
      const tmp = `${filePath}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
      await fs.rename(tmp, filePath);
      console.log(`✅ Player JSON saved: ${folder}/${filename}`);
    } finally {
      await release();
    }
  }

  // 🔧 FIXED: Load from telegramId_username folder
  private async loadFromMainJson(playerId: string): Promise<PlayerState | null> {
    try {
      const player = await storage.getPlayer(playerId);
      if (!player) return null;
      
      const filePath = this.getJsonPath(player.telegramId, player.username);
      const data = await fs.readFile(filePath, 'utf8');
      const state = JSON.parse(data);
      
      const folder = this.getFolderName(player.telegramId, player.username);
      const filename = this.getJsonFileName(player.telegramId, player.username);
      console.log(`📂 Loaded from: ${folder}/${filename}`);
      
      return {
        ...state,
        boostExpiresAt: state.boostExpiresAt ? new Date(state.boostExpiresAt) : null,
        lastDailyReset: new Date(state.lastDailyReset || Date.now()),
        lastWeeklyReset: new Date(state.lastWeeklyReset || Date.now()),
        createdAt: new Date(state.createdAt || Date.now()),
        updatedAt: new Date(state.updatedAt || Date.now())
      };
    } catch (err: any) {
      if (err.code === 'ENOENT') return null;
      console.error('Failed to load player JSON from telegramId_username folder:', err);
      return null;
    }
  }

  private async loadFromDatabase(playerId: string): Promise<PlayerState | null> {
    try {
      console.log(`🗃️ Loading player ${playerId} from database...`);
      
      const player = await storage.getPlayer(playerId);
      if (!player) return null;
      
      const upgrades = await storage.getPlayerUpgrades(playerId);
      const upgradesMap = upgrades.reduce((acc, u) => { 
        acc[u.upgradeId] = u.level; 
        return acc; 
      }, {} as Record<string, number>);
      
      const state: PlayerState = {
        id: player.id,
        telegramId: player.telegramId,
        username: player.username,
        points: typeof player.points === 'string' ? parseFloat(player.points) : (player.points || 0),
        lustPoints: typeof player.lustPoints === 'string' ? parseFloat(player.lustPoints) : (player.lustPoints || player.points || 0),
        lustGems: player.lustGems || 0,
        energy: player.energy || 1000,
        energyMax: player.energyMax || 1000,
        energyRegenRate: player.energyRegenRate || 1,
        level: player.level || 1,
        selectedCharacterId: player.selectedCharacterId || 'shadow',
        selectedImageId: player.selectedImageId || null,
        displayImage: player.displayImage || null,
        upgrades: upgradesMap,
        unlockedCharacters: Array.isArray(player.unlockedCharacters) ? player.unlockedCharacters : ['shadow'],
        unlockedImages: Array.isArray(player.unlockedImages) ? player.unlockedImages : [],
        passiveIncomeRate: player.passiveIncomeRate || 0,
        isAdmin: player.isAdmin || false,
        boostActive: player.boostActive || false,
        boostMultiplier: player.boostMultiplier || 1.0,
        boostExpiresAt: player.boostExpiresAt ? new Date(player.boostExpiresAt) : null,
        totalTapsToday: player.totalTapsToday || 0,
        totalTapsAllTime: player.totalTapsAllTime || 0,
        lastDailyReset: player.lastDailyReset ? new Date(player.lastDailyReset) : new Date(),
        lastWeeklyReset: player.lastWeeklyReset ? new Date(player.lastWeeklyReset) : new Date(),
        lastSync: { timestamp: Date.now(), hash: '' },
        createdAt: player.createdAt ? new Date(player.createdAt) : new Date(),
        updatedAt: new Date()
      };
      
      state.lastSync.hash = this.hashState(state);
      console.log(`✅ Player ${player.username || player.telegramId} loaded from database`);
      return state;
    } catch (e) {
      console.error('Failed to load from DB:', e);
      return null;
    }
  }

  private queueDatabaseSync(playerId: string, state: PlayerState) {
    const existing = this.syncTimeouts.get(playerId);
    if (existing) { 
      clearTimeout(existing); 
      this.syncTimeouts.delete(playerId); 
    }
    
    this.pendingSyncs.add(playerId);
    const timeout = setTimeout(async () => {
      try { 
        await this.syncToDatabase(playerId, state); 
      } catch (e) { 
        console.error(`🔴 DB sync failed for ${playerId}:`, e);
        this.emit('syncError', { playerId, error: e }); 
      } finally { 
        this.pendingSyncs.delete(playerId); 
        this.syncTimeouts.delete(playerId); 
      }
    }, 3000);
    
    this.syncTimeouts.set(playerId, timeout);
  }

  private async syncToDatabase(playerId: string, state: PlayerState) {
    const cached = this.states.get(playerId);
    if (!cached) return;
    
    const currentHash = this.hashState(cached);
    if (currentHash === state.lastSync.hash) return;
    
    console.log(`🔄 Syncing player ${state.username || playerId} to database...`);
    
    await storage.updatePlayer(playerId, {
      points: state.points,
      lustPoints: state.lustPoints,
      lustGems: state.lustGems,
      energy: state.energy,
      energyMax: state.energyMax,
      energyRegenRate: state.energyRegenRate,
      level: state.level,
      selectedCharacterId: state.selectedCharacterId,
      selectedImageId: state.selectedImageId,
      displayImage: state.displayImage,
      unlockedCharacters: state.unlockedCharacters,
      unlockedImages: state.unlockedImages,
      passiveIncomeRate: state.passiveIncomeRate,
      isAdmin: state.isAdmin,
      boostActive: state.boostActive,
      boostMultiplier: state.boostMultiplier,
      boostExpiresAt: state.boostExpiresAt,
      totalTapsToday: state.totalTapsToday,
      totalTapsAllTime: state.totalTapsAllTime,
      lastDailyReset: state.lastDailyReset,
      lastWeeklyReset: state.lastWeeklyReset
    });

    for (const [id, lvl] of Object.entries(state.upgrades)) {
      await storage.setPlayerUpgrade(playerId, id, lvl);
    }
    
    cached.lastSync = { timestamp: Date.now(), hash: currentHash };
    console.log(`✅ Player ${state.username || playerId} synced to database`);
  }

  private async createBackupSnapshot(playerId: string, state: PlayerState) {
    const dir = path.join(this.snapshotsDir, playerId);
    await fs.mkdir(dir, { recursive: true });
    const backup = path.join(dir, `backup-${Date.now()}.json`);
    await fs.writeFile(backup, JSON.stringify(state, null, 2), 'utf8');
    
    try {
      const files = await fs.readdir(dir);
      const backups = files.filter(f => f.startsWith('backup-') && f.endsWith('.json')).sort();
      while (backups.length > 5) {
        const f = backups.shift();
        if (f) await fs.rm(path.join(dir, f));
      }
    } catch {}
  }

  getCachedState(playerId: string): PlayerState | null { 
    return this.states.get(playerId) || null; 
  }

  clearCache(playerId: string) {
    const timeout = this.syncTimeouts.get(playerId); 
    if (timeout) {
      clearTimeout(timeout);
      this.syncTimeouts.delete(playerId);
    }
    this.states.delete(playerId);
    this.locks.delete(playerId);
    this.pendingSyncs.delete(playerId);
  }

  async forceDatabaseSync(playerId: string) {
    const state = this.states.get(playerId);
    if (!state) throw new Error('Player not in cache');
    await this.syncToDatabase(playerId, state);
  }

  async healthCheck() {
    try {
      const mainDirs = await fs.readdir(this.playersRoot).catch(() => []);
      const backupDirs = await fs.readdir(this.snapshotsDir).catch(() => []);
      
      let totalJsonFiles = 0;
      let totalBackups = 0;
      
      // Count JSON files in telegramId_username folders
      for (const playerFolder of mainDirs) {
        try {
          const playerDir = path.join(this.playersRoot, playerFolder);
          const files = await fs.readdir(playerDir);
          totalJsonFiles += files.filter(f => f.startsWith('player_') && f.endsWith('.json')).length;
        } catch {}
      }
      
      // Count backup files
      for (const dir of backupDirs) {
        try {
          const backups = await fs.readdir(path.join(this.snapshotsDir, dir));
          totalBackups += backups.filter(f => f.startsWith('backup-')).length;
        } catch {}
      }
      
      return {
        playerFolders: mainDirs.length,
        playerJsonFiles: totalJsonFiles,
        backupSnapshots: totalBackups,
        cachedPlayers: this.states.size,
        pendingSyncs: this.pendingSyncs.size,
        pendingTimeouts: this.syncTimeouts.size,
        directories: {
          main: this.playersRoot,
          backup: this.snapshotsDir
        },
        namingConvention: 'telegramId_username/player_username.json'
      };
    } catch {
      return {
        playerFolders: 0,
        playerJsonFiles: 0,
        backupSnapshots: 0,
        cachedPlayers: this.states.size,
        pendingSyncs: this.pendingSyncs.size,
        pendingTimeouts: this.syncTimeouts.size,
        directories: {
          main: this.playersRoot,
          backup: this.snapshotsDir
        },
        namingConvention: 'telegramId_username/player_username.json'
      };
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up PlayerStateManager...');
    
    for (const [playerId, timeout] of this.syncTimeouts.entries()) {
      clearTimeout(timeout);
    }
    this.syncTimeouts.clear();
    
    if (this.pendingSyncs.size > 0) {
      console.log(`⏳ Waiting for ${this.pendingSyncs.size} pending syncs...`);
      let attempts = 0;
      while (this.pendingSyncs.size > 0 && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
    }
    
    this.removeAllListeners();
    console.log('✅ PlayerStateManager cleanup complete');
  }

  // 🔧 NEW: Migration helper to move old files to new structure
  async migrateOldPlayerFiles(): Promise<{ moved: number; errors: number }> {
    let moved = 0;
    let errors = 0;
    
    try {
      const playerDirs = await fs.readdir(this.playersRoot).catch(() => []);
      
      for (const dirName of playerDirs) {
        try {
          // Skip if it already follows new naming convention (has underscore)
          if (dirName.includes('_') || !dirName.startsWith('player-')) continue;
          
          const oldDir = path.join(this.playersRoot, dirName);
          const files = await fs.readdir(oldDir).catch(() => []);
          
          const playerJsonFile = files.find(f => f === 'player.json');
          if (!playerJsonFile) continue;
          
          // Load the JSON to get telegramId and username
          const jsonPath = path.join(oldDir, playerJsonFile);
          const data = await fs.readFile(jsonPath, 'utf8');
          const state = JSON.parse(data);
          
          if (!state.telegramId) continue;
          
          // Create new structure
          const newFolderName = this.getFolderName(state.telegramId, state.username);
          const newJsonName = this.getJsonFileName(state.telegramId, state.username);
          const newDir = path.join(this.playersRoot, newFolderName);
          const newJsonPath = path.join(newDir, newJsonName);
          
          // Only move if it doesn't exist in new location
          try {
            await fs.access(newJsonPath);
            console.log(`⚠️ Target already exists, skipping: ${newFolderName}/${newJsonName}`);
            continue;
          } catch {
            // File doesn't exist, proceed with migration
          }
          
          await fs.mkdir(newDir, { recursive: true });
          await fs.copyFile(jsonPath, newJsonPath);
          
          console.log(`📦 Migrated: ${dirName}/player.json → ${newFolderName}/${newJsonName}`);
          moved++;
          
          // Remove old directory after successful copy
          await fs.rm(oldDir, { recursive: true });
          
        } catch (error) {
          console.error(`❌ Migration error for ${dirName}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error('❌ Migration scan error:', error);
      errors++;
    }
    
    return { moved, errors };
  }
}

// Global singleton instance
export const playerStateManager = new PlayerStateManager();

// 🔧 RESTORED: Helper functions for routes.ts
export async function getPlayerState(playerId: string): Promise<PlayerState> {
  return await playerStateManager.loadPlayer(playerId);
}

export async function updatePlayerState(playerId: string, updates: Partial<PlayerState>): Promise<PlayerState> {
  return await playerStateManager.updatePlayer(playerId, updates);
}

export async function selectCharacterForPlayer(playerId: string, characterId: string): Promise<PlayerState> {
  console.log(`🎭 [CHARACTER SELECT] Player ${playerId} selecting character ${characterId}...`);
  
  const currentState = await playerStateManager.loadPlayer(playerId);
  
  if (!currentState.unlockedCharacters.includes(characterId)) {
    console.log(`❌ [CHARACTER SELECT] Character ${characterId} not unlocked for player ${playerId}`);
    throw new Error(`Character ${characterId} is not unlocked`);
  }
  
  const updatedState = await playerStateManager.updatePlayer(playerId, {
    selectedCharacterId: characterId,
    selectedImageId: null,
    displayImage: null
  });
  
  const folder = playerStateManager['getFolderName'](updatedState.telegramId, updatedState.username);
  const filename = playerStateManager['getJsonFileName'](updatedState.telegramId, updatedState.username);
  console.log(`✅ [CHARACTER SELECT] Success! Player ${playerId} now using character ${characterId}`);
  console.log(`📁 [CHARACTER SELECT] Saved to: ${folder}/${filename}`);
  
  return updatedState;
}

export async function setDisplayImageForPlayer(playerId: string, imageUrl: string): Promise<PlayerState> {
  console.log(`🖼️ [DISPLAY IMAGE] Player ${playerId} setting display image: ${imageUrl}`);
  
  if (!imageUrl || typeof imageUrl !== 'string') {
    console.log(`❌ [DISPLAY IMAGE] Invalid URL provided: ${imageUrl}`);
    throw new Error('Invalid image URL');
  }
  
  if (!imageUrl.startsWith('/uploads/')) {
    console.log(`❌ [DISPLAY IMAGE] URL not from uploads directory: ${imageUrl}`);
    throw new Error('Image URL must be from uploads directory');
  }
  
  const updatedState = await playerStateManager.updatePlayer(playerId, {
    displayImage: imageUrl
  });
  
  const folder = playerStateManager['getFolderName'](updatedState.telegramId, updatedState.username);
  const filename = playerStateManager['getJsonFileName'](updatedState.telegramId, updatedState.username);
  console.log(`✅ [DISPLAY IMAGE] Success! Player ${playerId} display image updated`);
  console.log(`📁 [DISPLAY IMAGE] Saved to: ${folder}/${filename}`);
  
  return updatedState;
}

export async function purchaseUpgradeForPlayer(playerId: string, upgradeId: string, newLevel: number, cost: number): Promise<PlayerState> {
  console.log(`🛒 [UPGRADE] Player ${playerId} purchasing upgrade ${upgradeId} level ${newLevel} for ${cost} points`);
  
  const currentState = await playerStateManager.loadPlayer(playerId);
  
  if (currentState.points < cost) {
    console.log(`❌ [UPGRADE] Insufficient points: has ${currentState.points}, needs ${cost}`);
    throw new Error('Insufficient points');
  }
  
  const updatedState = await playerStateManager.updatePlayer(playerId, {
    points: currentState.points - cost,
    lustPoints: currentState.lustPoints - cost,
    upgrades: {
      ...currentState.upgrades,
      [upgradeId]: newLevel
    }
  });
  
  console.log(`✅ [UPGRADE] Success! Player ${playerId} upgrade ${upgradeId} purchased`);
  return updatedState;
}

export default playerStateManager;