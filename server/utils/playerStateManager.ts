import AsyncLock from 'async-lock';
import lockfile from 'proper-lockfile';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { storage } from '../storage';
import { EventEmitter } from 'events';
import logger from '../logger';

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
  private readonly backupsDir: string; // game-backups/player-snapshots

  constructor() {
    super();
    this.setMaxListeners(50);
    this.playersRoot = path.join(process.cwd(), 'main-gamedata', 'player-data');
    this.backupsDir = path.join(process.cwd(), 'game-backups', 'player-snapshots');
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.playersRoot, { recursive: true });
      await fs.mkdir(this.backupsDir, { recursive: true });
      console.log('📁 Player directories ensured:', {
        primary: this.playersRoot,
        backups: this.backupsDir
      });
    } catch (error) {
      console.error('❌ Failed to create player directories:', error);
    }
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
      if (this.states.has(playerId)) {
        const cached = this.states.get(playerId)!;
        console.log(`💼 Using cached state for player ${cached.username || playerId}`);
        return cached;
      }

      console.log(`📂 Loading player ${playerId} from telegramId_username folder...`);
      let state = await this.loadFromMainJson(playerId);
      
      if (!state) {
        console.log(`📂 No telegramId_username JSON found for ${playerId}, loading from DB...`);
        state = await this.loadFromDatabase(playerId);
        if (state) {
          console.log(`💾 Creating new JSON for player ${state.username}...`);
          await this.saveMainJson(playerId, state);
          await this.createBackupSnapshot(playerId, state);
        }
      }
      
      if (!state) {
        console.error(`❌ Player ${playerId} not found in JSON or DB`);
        throw new Error(`Player ${playerId} not found in JSON or DB`);
      }
      
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
      
      // DEBUG: Log what's being updated
      const updatedFields = Object.keys(updates).join(', ');
      console.log(`🔄 [UPDATE] Fields: ${updatedFields}`);
      
      await this.saveMainJson(playerId, newState);
      this.states.set(playerId, newState);
      
      // 🔧 FIXED: Force immediate DB sync for critical fields
      const criticalFields = ['selectedCharacterId', 'displayImage', 'points', 'level'];
      const hasCriticalUpdate = Object.keys(updates).some(key => criticalFields.includes(key));
      
      if (hasCriticalUpdate) {
        console.log(`⚡ [CRITICAL UPDATE] Forcing immediate DB sync for: ${updatedFields}`);
        // Don't await - let it run in background but start immediately
        this.syncToDatabase(playerId, newState).catch(err => {
          console.error(`🔴 Critical DB sync failed for ${playerId}:`, err);
          logger.error('Critical DB sync failed', { playerId, error: err.message });
        });
      } else {
        // Regular delayed sync for non-critical updates
        this.queueDatabaseSync(playerId, newState);
      }
      
      // Create backup snapshot occasionally
      if (Math.random() < 0.1) {
        this.createBackupSnapshot(playerId, newState).catch(err => {
          console.error(`🔴 Backup snapshot failed for ${playerId}:`, err);
        });
      }
      
      return newState;
    });
  }

  // 🔧 FIXED: Save to telegramId_username folder with player_username.json
  private async saveMainJson(playerId: string, state: PlayerState): Promise<void> {
    try {
      const filePath = this.getJsonPath(state.telegramId, state.username);
      const dir = path.dirname(filePath);
      const lockPath = `${filePath}.lock`;
      
      const folder = this.getFolderName(state.telegramId, state.username);
      const filename = this.getJsonFileName(state.telegramId, state.username);
      console.log(`💾 Saving to: ${folder}/${filename}`);
      
      await fs.mkdir(dir, { recursive: true });
      
      // Try to acquire lock, but don't fail if it's not available
      let release: (() => Promise<void>) | null = null;
      try {
        release = await lockfile.lock(filePath, { 
          lockfilePath: lockPath, 
          retries: 2, 
          minTimeout: 50, 
          maxTimeout: 200, 
          realpath: false 
        });
      } catch (lockError) {
        console.warn(`⚠️ Failed to acquire lock for ${filename}, proceeding anyway:`, lockError);
      }
      
      try {
        const tmp = `${filePath}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
        await fs.rename(tmp, filePath);
        console.log(`✅ Player JSON saved: ${folder}/${filename}`);
      } finally {
        if (release) {
          try {
            await release();
          } catch (releaseError) {
            console.warn(`⚠️ Failed to release lock for ${filename}:`, releaseError);
          }
        }
      }
    } catch (error) {
      console.error(`🔴 Failed to save JSON for player ${state.username || playerId}:`, error);
      logger.error('Player JSON save failed', { 
        playerId, 
        telegramId: state.telegramId, 
        username: state.username, 
        error: error instanceof Error ? error.message : 'Unknown' 
      });
      throw error;
    }
  }

  // 🔧 FIXED: Load from telegramId_username folder with better error handling
  private async loadFromMainJson(playerId: string): Promise<PlayerState | null> {
    try {
      const player = await storage.getPlayer(playerId);
      if (!player) {
        console.log(`🔴 Player ${playerId} not found in database`);
        return null;
      }
      
      const filePath = this.getJsonPath(player.telegramId, player.username);
      const folder = this.getFolderName(player.telegramId, player.username);
      const filename = this.getJsonFileName(player.telegramId, player.username);
      
      console.log(`📂 Attempting to load: ${folder}/${filename}`);
      
      const data = await fs.readFile(filePath, 'utf8');
      
      // 🔧 FIXED: Validate JSON before parsing
      if (!data || data.trim() === '') {
        console.log(`⚠️ JSON file is empty: ${folder}/${filename}`);
        return null;
      }
      
      let state: any;
      try {
        state = JSON.parse(data);
      } catch (parseError) {
        console.error(`🔴 JSON parse error in ${folder}/${filename}:`, parseError);
        
        // Backup corrupted file
        const backupPath = `${filePath}.corrupted.${Date.now()}`;
        try {
          await fs.copyFile(filePath, backupPath);
          console.log(`💾 Corrupted file backed up to: ${backupPath}`);
        } catch {}
        
        return null; // Will trigger DB reload
      }
      
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
      if (err.code === 'ENOENT') {
        console.log(`📂 JSON file doesn't exist yet for player ${playerId}`);
        return null;
      }
      console.error(`🔴 Failed to load player JSON from telegramId_username folder:`, err);
      return null;
    }
  }

  private async loadFromDatabase(playerId: string): Promise<PlayerState | null> {
    try {
      console.log(`🗃️ Loading player ${playerId} from database...`);
      
      const player = await storage.getPlayer(playerId);
      if (!player) {
        console.log(`🔴 Player ${playerId} not found in database`);
        return null;
      }
      
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
      console.error(`🔴 Failed to load from DB:`, e);
      logger.error('Database load failed', { playerId, error: e instanceof Error ? e.message : 'Unknown' });
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
    console.log(`🕒 [DB SYNC] Queued sync for player ${state.username || playerId} (${this.pendingSyncs.size} total queued)`);
    
    const timeout = setTimeout(async () => {
      try { 
        await this.syncToDatabase(playerId, state); 
      } catch (e) { 
        console.error(`🔴 DB sync failed for ${playerId}:`, e);
        logger.error('DB sync failed', { playerId, error: e instanceof Error ? e.message : 'Unknown' });
        this.emit('syncError', { playerId, error: e }); 
      } finally { 
        this.pendingSyncs.delete(playerId); 
        this.syncTimeouts.delete(playerId); 
      }
    }, 3000);
    
    this.syncTimeouts.set(playerId, timeout);
  }

  // 🔧 FIXED: Enhanced database sync with detailed logging
  private async syncToDatabase(playerId: string, state: PlayerState) {
    const cached = this.states.get(playerId);
    if (!cached) {
      console.log(`⚠️ [DB SYNC] No cached state for player ${playerId}, skipping sync`);
      return;
    }
    
    const currentHash = this.hashState(cached);
    if (currentHash === state.lastSync.hash) {
      console.log(`⏭️ [DB SYNC] No changes for player ${cached.username || playerId}, skipping sync`);
      return;
    }
    
    console.log(`🔄 [DB SYNC] Starting sync for player ${state.username || playerId}...`);
    console.log(`🔄 [DB SYNC] Hash change: ${state.lastSync.hash} → ${currentHash}`);
    
    try {
      // 🔧 FIXED: Sync player basic data
      await storage.updatePlayer(playerId, {
        points: Math.round(cached.points),
        lustPoints: Math.round(cached.lustPoints),
        lustGems: Math.round(cached.lustGems),
        energy: Math.round(cached.energy),
        energyMax: Math.round(cached.energyMax),
        energyRegenRate: Math.round(cached.energyRegenRate),
        level: cached.level,
        selectedCharacterId: cached.selectedCharacterId,
        selectedImageId: cached.selectedImageId,
        displayImage: cached.displayImage,
        unlockedCharacters: cached.unlockedCharacters,
        unlockedImages: cached.unlockedImages,
        passiveIncomeRate: Math.round(cached.passiveIncomeRate),
        isAdmin: cached.isAdmin,
        boostActive: cached.boostActive,
        boostMultiplier: cached.boostMultiplier,
        boostExpiresAt: cached.boostExpiresAt,
        totalTapsToday: cached.totalTapsToday,
        totalTapsAllTime: cached.totalTapsAllTime,
        lastDailyReset: cached.lastDailyReset,
        lastWeeklyReset: cached.lastWeeklyReset,
        lastLogin: new Date() // Update last login time
      });
      
      console.log(`✅ [DB SYNC] Player data synced for ${cached.username || playerId}`);

      // 🔧 FIXED: Sync upgrade data with better error handling
      console.log(`🔄 [DB SYNC] Syncing ${Object.keys(cached.upgrades).length} upgrades...`);
      
      for (const [upgradeId, level] of Object.entries(cached.upgrades)) {
        try {
          if (level > 0) {
            await storage.setPlayerUpgrade(playerId, upgradeId, level);
            console.log(`✅ [DB SYNC] Upgrade ${upgradeId}: level ${level}`);
          }
        } catch (upgradeError) {
          console.error(`🔴 [DB SYNC] Failed to sync upgrade ${upgradeId}:`, upgradeError);
          // Don't throw, continue with other upgrades
        }
      }
      
      cached.lastSync = { timestamp: Date.now(), hash: currentHash };
      console.log(`✅ [DB SYNC] Complete for player ${cached.username || playerId}`);
      
    } catch (error) {
      console.error(`🔴 [DB SYNC] Failed for player ${cached.username || playerId}:`, error);
      logger.error('Database sync failed', { 
        playerId, 
        username: cached.username, 
        error: error instanceof Error ? error.message : 'Unknown' 
      });
      throw error;
    }
  }

  // 🔧 MOVED: Backup snapshots now go to game-backups/player-snapshots
  private async createBackupSnapshot(playerId: string, state: PlayerState) {
    try {
      const dir = path.join(this.backupsDir, playerId);
      await fs.mkdir(dir, { recursive: true });
      const backup = path.join(dir, `backup-${Date.now()}.json`);
      await fs.writeFile(backup, JSON.stringify(state, null, 2), 'utf8');
      
      console.log(`💾 Backup snapshot saved: game-backups/player-snapshots/${playerId}/`);
      
      // Clean old backups (keep only 5)
      try {
        const files = await fs.readdir(dir);
        const backups = files.filter(f => f.startsWith('backup-') && f.endsWith('.json')).sort();
        while (backups.length > 5) {
          const f = backups.shift();
          if (f) {
            await fs.rm(path.join(dir, f));
            console.log(`🧹 Cleaned old backup: ${f}`);
          }
        }
      } catch {}
    } catch (error) {
      console.error(`🔴 Failed to create backup snapshot for ${playerId}:`, error);
      // Don't throw - backup failure shouldn't break the main operation
    }
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
    console.log(`🧹 Cache cleared for player ${playerId}`);
  }

  async forceDatabaseSync(playerId: string) {
    const state = this.states.get(playerId);
    if (!state) throw new Error(`Player ${playerId} not in cache`);
    console.log(`⚡ [FORCE SYNC] Forcing immediate sync for ${state.username || playerId}`);
    await this.syncToDatabase(playerId, state);
  }

  async healthCheck() {
    try {
      const mainDirs = await fs.readdir(this.playersRoot).catch(() => []);
      const backupDirs = await fs.readdir(this.backupsDir).catch(() => []);
      
      let totalJsonFiles = 0;
      let totalBackups = 0;
      let playerFolderDetails: Array<{folder: string, files: string[]}> = [];
      
      // Count JSON files in telegramId_username folders
      for (const playerFolder of mainDirs) {
        try {
          const playerDir = path.join(this.playersRoot, playerFolder);
          const files = await fs.readdir(playerDir);
          const playerJsons = files.filter(f => f.startsWith('player_') && f.endsWith('.json'));
          totalJsonFiles += playerJsons.length;
          playerFolderDetails.push({ folder: playerFolder, files: playerJsons });
        } catch {}
      }
      
      // Count backup files in game-backups
      for (const dir of backupDirs) {
        try {
          const backups = await fs.readdir(path.join(this.backupsDir, dir));
          totalBackups += backups.filter(f => f.startsWith('backup-')).length;
        } catch {}
      }
      
      const health = {
        playerFolders: mainDirs.length,
        playerJsonFiles: totalJsonFiles,
        backupSnapshots: totalBackups,
        cachedPlayers: this.states.size,
        pendingSyncs: this.pendingSyncs.size,
        pendingTimeouts: this.syncTimeouts.size,
        directories: {
          main: this.playersRoot,
          backups: this.backupsDir
        },
        namingConvention: 'telegramId_username/player_username.json',
        playerFolderDetails: playerFolderDetails.slice(0, 10) // Show first 10
      };
      
      console.log('📊 [HEALTH] Player state system health:', health);
      return health;
    } catch (error) {
      console.error('🔴 Health check failed:', error);
      return {
        playerFolders: 0,
        playerJsonFiles: 0,
        backupSnapshots: 0,
        cachedPlayers: this.states.size,
        pendingSyncs: this.pendingSyncs.size,
        pendingTimeouts: this.syncTimeouts.size,
        directories: {
          main: this.playersRoot,
          backups: this.backupsDir
        },
        namingConvention: 'telegramId_username/player_username.json',
        error: 'Health check failed'
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
    
    console.log('📦 [MIGRATION] Starting player file migration...');
    
    try {
      const playerDirs = await fs.readdir(this.playersRoot).catch(() => []);
      console.log(`📦 [MIGRATION] Found ${playerDirs.length} player directories to check`);
      
      for (const dirName of playerDirs) {
        try {
          // Skip if it already follows new naming convention (has underscore)
          if (dirName.includes('_')) {
            console.log(`⏭️ [MIGRATION] Skipping already migrated: ${dirName}`);
            continue;
          }
          
          if (!dirName.startsWith('player-')) {
            console.log(`⏭️ [MIGRATION] Skipping non-player directory: ${dirName}`);
            continue;
          }
          
          const oldDir = path.join(this.playersRoot, dirName);
          const files = await fs.readdir(oldDir).catch(() => []);
          
          const playerJsonFile = files.find(f => f === 'player.json');
          if (!playerJsonFile) {
            console.log(`⏭️ [MIGRATION] No player.json in ${dirName}`);
            continue;
          }
          
          // Load the JSON to get telegramId and username
          const jsonPath = path.join(oldDir, playerJsonFile);
          const data = await fs.readFile(jsonPath, 'utf8');
          
          let state: any;
          try {
            state = JSON.parse(data);
          } catch (parseError) {
            console.error(`❌ [MIGRATION] JSON parse error in ${dirName}:`, parseError);
            errors++;
            continue;
          }
          
          if (!state.telegramId) {
            console.log(`⏭️ [MIGRATION] No telegramId in ${dirName}, skipping`);
            continue;
          }
          
          // Create new structure
          const newFolderName = this.getFolderName(state.telegramId, state.username);
          const newJsonName = this.getJsonFileName(state.telegramId, state.username);
          const newDir = path.join(this.playersRoot, newFolderName);
          const newJsonPath = path.join(newDir, newJsonName);
          
          // Only move if it doesn't exist in new location
          try {
            await fs.access(newJsonPath);
            console.log(`⚠️ [MIGRATION] Target already exists, skipping: ${newFolderName}/${newJsonName}`);
            continue;
          } catch {
            // File doesn't exist, proceed with migration
          }
          
          await fs.mkdir(newDir, { recursive: true });
          await fs.copyFile(jsonPath, newJsonPath);
          
          console.log(`📦 [MIGRATION] Migrated: ${dirName}/player.json → ${newFolderName}/${newJsonName}`);
          moved++;
          
          // Remove old directory after successful copy
          await fs.rm(oldDir, { recursive: true });
          
        } catch (error) {
          console.error(`❌ [MIGRATION] Migration error for ${dirName}:`, error);
          errors++;
        }
      }
      
      // 🔧 BONUS: Also migrate old backup files to game-backups
      console.log('📦 [MIGRATION] Also migrating backup files to game-backups...');
      
      const oldSnapshotsDir = path.join(process.cwd(), 'uploads', 'snapshots', 'players');
      try {
        const oldBackupDirs = await fs.readdir(oldSnapshotsDir).catch(() => []);
        console.log(`📦 [MIGRATION] Found ${oldBackupDirs.length} backup directories to migrate`);
        
        for (const playerBackupDir of oldBackupDirs) {
          try {
            const oldBackupPath = path.join(oldSnapshotsDir, playerBackupDir);
            const newBackupPath = path.join(this.backupsDir, playerBackupDir);
            
            // Check if old backup directory exists and has files
            const backupFiles = await fs.readdir(oldBackupPath).catch(() => []);
            if (backupFiles.length === 0) continue;
            
            // Create new backup directory
            await fs.mkdir(newBackupPath, { recursive: true });
            
            // Copy all backup files
            let backupsMoved = 0;
            for (const backupFile of backupFiles.filter(f => f.startsWith('backup-'))) {
              const oldFilePath = path.join(oldBackupPath, backupFile);
              const newFilePath = path.join(newBackupPath, backupFile);
              
              // Only copy if target doesn't exist
              try {
                await fs.access(newFilePath);
              } catch {
                await fs.copyFile(oldFilePath, newFilePath);
                console.log(`📦 [MIGRATION] Migrated backup: ${playerBackupDir}/${backupFile}`);
                backupsMoved++;
              }
            }
            
            // Remove old backup directory after successful copy
            if (backupsMoved > 0) {
              await fs.rm(oldBackupPath, { recursive: true });
            }
            
          } catch (error) {
            console.error(`❌ [MIGRATION] Backup migration error for ${playerBackupDir}:`, error);
            errors++;
          }
        }
      } catch {
        // Old snapshots directory doesn't exist, that's fine
        console.log('📦 [MIGRATION] No old snapshots directory found, skipping backup migration');
      }
      
    } catch (error) {
      console.error('❌ [MIGRATION] Migration scan error:', error);
      errors++;
    }
    
    console.log(`📦 [MIGRATION] Complete: ${moved} moved, ${errors} errors`);
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
  
  console.log(`✅ [CHARACTER SELECT] Success! Player ${playerId} now using character ${characterId}`);
  
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
  
  console.log(`✅ [DISPLAY IMAGE] Success! Player ${playerId} display image updated`);
  
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
    points: Math.round(currentState.points - cost),
    lustPoints: Math.round(currentState.lustPoints - cost),
    upgrades: {
      ...currentState.upgrades,
      [upgradeId]: newLevel
    }
  });
  
  console.log(`✅ [UPGRADE] Success! Player ${playerId} upgrade ${upgradeId} purchased`);
  return updatedState;
}

export default playerStateManager;