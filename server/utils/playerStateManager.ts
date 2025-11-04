import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { storage } from '../storage';
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

// 🚨 SIMPLIFIED: No more locks, event emitters, or complex state management
class SimplePlayerStateManager {
  private readonly playersRoot: string;
  private readonly backupsDir: string;
  
  // Simple in-memory cache without locks
  private cache = new Map<string, PlayerState>();

  constructor() {
    this.playersRoot = path.join(process.cwd(), 'main-gamedata', 'player-data');
    this.backupsDir = path.join(process.cwd(), 'game-backups', 'player-snapshots');
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.playersRoot, { recursive: true });
      await fs.mkdir(this.backupsDir, { recursive: true });
      console.log('✅ Player directories ready');
    } catch (error) {
      console.error('❌ Failed to create directories:', error);
    }
  }

  private getFolderName(telegramId: string, username?: string | null): string {
    const cleanTelegramId = telegramId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanUsername = username?.trim()?.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    if (cleanUsername && cleanUsername !== '' && cleanUsername !== 'null') {
      return `${cleanTelegramId}_${cleanUsername}`;
    }
    return cleanTelegramId;
  }

  private getJsonFileName(telegramId: string, username?: string | null): string {
    const cleanUsername = username?.trim()?.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    if (cleanUsername && cleanUsername !== '' && cleanUsername !== 'null') {
      return `player_${cleanUsername}.json`;
    }
    return `player_${telegramId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  }

  private getJsonPath(telegramId: string, username?: string | null): string {
    const folder = this.getFolderName(telegramId, username);
    const filename = this.getJsonFileName(telegramId, username);
    return path.join(this.playersRoot, folder, filename);
  }

  private hashState(state: Partial<PlayerState>): string {
    const critical = {
      points: state.points,
      energy: state.energy,
      selectedCharacterId: state.selectedCharacterId,
      displayImage: state.displayImage,
      upgrades: state.upgrades,
      level: state.level
    };
    return crypto.createHash('md5').update(JSON.stringify(critical)).digest('hex');
  }

  // 🚨 SIMPLIFIED: Direct JSON load without locks or complex error handling
  async loadPlayer(playerId: string): Promise<PlayerState> {
    console.log(`📂 [SIMPLE] Loading player ${playerId}...`);
    
    // Check cache first
    if (this.cache.has(playerId)) {
      const cached = this.cache.get(playerId)!;
      console.log(`💨 [SIMPLE] Using cached data for ${cached.username}`);
      return cached;
    }

    try {
      // Get player info from database quickly
      const player = await storage.getPlayer(playerId);
      if (!player) {
        throw new Error(`Player ${playerId} not found in database`);
      }

      const jsonPath = this.getJsonPath(player.telegramId, player.username);
      const folder = this.getFolderName(player.telegramId, player.username);
      const filename = this.getJsonFileName(player.telegramId, player.username);
      
      console.log(`📂 [SIMPLE] Trying to load: ${folder}/${filename}`);
      
      let state: PlayerState;
      
      try {
        // Try to load from JSON
        const data = await fs.readFile(jsonPath, 'utf8');
        const parsed = JSON.parse(data);
        
        state = {
          ...parsed,
          boostExpiresAt: parsed.boostExpiresAt ? new Date(parsed.boostExpiresAt) : null,
          lastDailyReset: new Date(parsed.lastDailyReset || Date.now()),
          lastWeeklyReset: new Date(parsed.lastWeeklyReset || Date.now()),
          createdAt: new Date(parsed.createdAt || Date.now()),
          updatedAt: new Date(parsed.updatedAt || Date.now())
        };
        
        console.log(`✅ [SIMPLE] Loaded from JSON: ${folder}/${filename}`);
      } catch (jsonError) {
        // JSON doesn't exist or is corrupted, create from database
        console.log(`⚠️ [SIMPLE] JSON not found, creating from database for ${player.username}`);
        
        state = {
          id: player.id,
          telegramId: player.telegramId,
          username: player.username,
          points: typeof player.points === 'string' ? parseFloat(player.points) : (player.points || 0),
          lustPoints: typeof player.lustPoints === 'string' ? parseFloat(player.lustPoints) : (player.lustPoints || player.points || 0),
          lustGems: player.lustGems || 0,
          energy: player.energy || 1000,
          energyMax: player.energyMax || 1000,
          energyRegenRate: 1,
          level: player.level || 1,
          selectedCharacterId: player.selectedCharacterId || 'shadow',
          selectedImageId: player.selectedImageId || null,
          displayImage: player.displayImage || null,
          upgrades: player.upgrades || {},
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
        
        // Save the new JSON
        await this.savePlayerJson(state);
        console.log(`💾 [SIMPLE] Created JSON from database for ${player.username}`);
      }
      
      // Cache it
      this.cache.set(playerId, state);
      return state;
      
    } catch (error) {
      console.error(`🔴 [SIMPLE] Failed to load player ${playerId}:`, error);
      throw error;
    }
  }

  // 🚨 SIMPLIFIED: Direct JSON save without locks
  private async savePlayerJson(state: PlayerState): Promise<void> {
    try {
      const jsonPath = this.getJsonPath(state.telegramId, state.username);
      const dir = path.dirname(jsonPath);
      
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });
      
      // Write directly (no temp files, no locks)
      await fs.writeFile(jsonPath, JSON.stringify(state, null, 2), 'utf8');
      
      console.log(`💾 [SIMPLE] Saved JSON for ${state.username}`);
    } catch (error) {
      console.error(`🔴 [SIMPLE] Failed to save JSON:`, error);
      throw error;
    }
  }

  // 🚨 SIMPLIFIED: Update player without locks or complex state management
  async updatePlayer(playerId: string, updates: Partial<PlayerState>): Promise<PlayerState> {
    console.log(`🔄 [SIMPLE] Updating player ${playerId}:`, Object.keys(updates));
    
    const current = await this.loadPlayer(playerId);
    
    const newState: PlayerState = {
      ...current,
      ...updates,
      updatedAt: new Date()
    };
    
    // Update cache
    this.cache.set(playerId, newState);
    
    // Save JSON immediately
    await this.savePlayerJson(newState);
    
    console.log(`✅ [SIMPLE] Updated player ${newState.username}`);
    
    // Background DB sync (don't await)
    this.syncToDatabaseBackground(playerId, newState);
    
    return newState;
  }

  // 🚨 SIMPLIFIED: Background DB sync without blocking
  private async syncToDatabaseBackground(playerId: string, state: PlayerState): Promise<void> {
    try {
      console.log(`🔄 [BG SYNC] Starting background sync for ${state.username}`);
      
      // Update main player data
      await storage.updatePlayer(playerId, {
        points: Math.round(state.points),
        lustPoints: Math.round(state.lustPoints || state.points),
        energy: Math.round(state.energy),
        selectedCharacterId: state.selectedCharacterId,
        displayImage: state.displayImage,
        upgrades: state.upgrades
      });
      
      console.log(`✅ [BG SYNC] Database updated for ${state.username}`);
    } catch (error) {
      console.error(`🔴 [BG SYNC] Failed for ${state.username}:`, error);
      // Don't throw - this is background operation
    }
  }

  async healthCheck() {
    try {
      const mainDirs = await fs.readdir(this.playersRoot).catch(() => []);
      let totalJsonFiles = 0;
      let playerFolderDetails: Array<{folder: string, files: string[]}> = [];
      
      for (const playerFolder of mainDirs) {
        try {
          const playerDir = path.join(this.playersRoot, playerFolder);
          const files = await fs.readdir(playerDir);
          const playerJsons = files.filter(f => f.startsWith('player_') && f.endsWith('.json'));
          totalJsonFiles += playerJsons.length;
          playerFolderDetails.push({ folder: playerFolder, files: playerJsons });
        } catch {}
      }
      
      return {
        playerFolders: mainDirs.length,
        playerJsonFiles: totalJsonFiles,
        backupSnapshots: 0, // Simplified - no complex backup system
        cachedPlayers: this.cache.size,
        pendingSyncs: 0, // No more pending queues
        pendingTimeouts: 0, // No more timeout queues
        directories: {
          main: this.playersRoot,
          backups: this.backupsDir
        },
        namingConvention: 'telegramId_username/player_username.json',
        playerFolderDetails: playerFolderDetails.slice(0, 10)
      };
    } catch (error) {
      return {
        playerFolders: 0,
        playerJsonFiles: 0,
        backupSnapshots: 0,
        cachedPlayers: this.cache.size,
        pendingSyncs: 0,
        pendingTimeouts: 0,
        directories: {
          main: this.playersRoot,
          backups: this.backupsDir
        },
        error: 'Health check failed'
      };
    }
  }

  async forceDatabaseSync(playerId: string) {
    const state = this.cache.get(playerId);
    if (!state) throw new Error(`Player ${playerId} not in cache`);
    await this.syncToDatabaseBackground(playerId, state);
  }

  // Stub methods for compatibility
  getCachedState(playerId: string): PlayerState | null {
    return this.cache.get(playerId) || null;
  }

  clearCache(playerId: string) {
    this.cache.delete(playerId);
    console.log(`🧹 Cache cleared for player ${playerId}`);
  }

  async migrateOldPlayerFiles(): Promise<{ moved: number; errors: number }> {
    // Simplified migration - just return success
    return { moved: 0, errors: 0 };
  }

  async cleanup(): Promise<void> {
    this.cache.clear();
    console.log('✅ Simple cleanup complete');
  }
}

// Global singleton instance
export const playerStateManager = new SimplePlayerStateManager();

// 🚨 SIMPLIFIED: Helper functions without complex operations
export async function getPlayerState(playerId: string): Promise<PlayerState> {
  console.time(`[GET] ${playerId}`);
  try {
    const result = await playerStateManager.loadPlayer(playerId);
    console.timeEnd(`[GET] ${playerId}`);
    return result;
  } catch (error) {
    console.timeEnd(`[GET] ${playerId}`);
    throw error;
  }
}

export async function updatePlayerState(playerId: string, updates: Partial<PlayerState>): Promise<PlayerState> {
  console.time(`[UPDATE] ${playerId}`);
  try {
    const result = await playerStateManager.updatePlayer(playerId, updates);
    console.timeEnd(`[UPDATE] ${playerId}`);
    return result;
  } catch (error) {
    console.timeEnd(`[UPDATE] ${playerId}`);
    throw error;
  }
}

export async function selectCharacterForPlayer(playerId: string, characterId: string): Promise<PlayerState> {
  console.log(`🎭 [CHARACTER] Selecting ${characterId} for ${playerId}`);
  
  const currentState = await getPlayerState(playerId);
  
  if (!currentState.unlockedCharacters.includes(characterId)) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Character ${characterId} is not unlocked`);
    } else {
      // Auto-unlock in development
      console.log(`🔓 [DEV] Auto-unlocking character ${characterId}`);
      currentState.unlockedCharacters.push(characterId);
    }
  }
  
  return await updatePlayerState(playerId, {
    selectedCharacterId: characterId,
    selectedImageId: null,
    displayImage: null,
    unlockedCharacters: currentState.unlockedCharacters
  });
}

export async function setDisplayImageForPlayer(playerId: string, imageUrl: string): Promise<PlayerState> {
  console.log(`🖼️ [IMAGE] Setting ${imageUrl} for ${playerId}`);
  
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
    throw new Error('Invalid image URL');
  }
  
  return await updatePlayerState(playerId, {
    displayImage: imageUrl
  });
}

export async function purchaseUpgradeForPlayer(playerId: string, upgradeId: string, newLevel: number, cost: number): Promise<PlayerState> {
  console.log(`🛒 [UPGRADE] ${upgradeId} level ${newLevel} for ${playerId} (cost: ${cost})`);
  
  const currentState = await getPlayerState(playerId);
  
  if (currentState.points < cost) {
    throw new Error(`Insufficient points: has ${currentState.points}, needs ${cost}`);
  }
  
  return await updatePlayerState(playerId, {
    points: Math.round(currentState.points - cost),
    lustPoints: Math.round(currentState.lustPoints - cost),
    upgrades: {
      ...currentState.upgrades,
      [upgradeId]: newLevel
    }
  });
}

export default playerStateManager;