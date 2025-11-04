import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { storage } from '../storage';
import logger from '../logger';

// 🌙 IMPORT LUNA'S TIMING HELPER
import { lunaTimeOperation } from './lunaLearningSystem';
// 🔄 IMPORT SYNC QUEUE FOR DB SYNC
import { queuePlayerSync } from './syncQueue';

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
  experience: number; // 🆕 ADD: experience field for level-up calculations
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
  // 🏆 NEW: Task and Achievement tracking fields
  lpEarnedToday?: number;
  upgradesPurchasedToday?: number;
  consecutiveDays?: number;
  claimedTasks?: string[];
  claimedAchievements?: string[];
  achievementUnlockDates?: Record<string, string>;
  lastDailyReset: Date;
  lastWeeklyReset: Date;
  lastSync: { timestamp: number; hash: string };
  createdAt: Date;
  updatedAt: Date;
}

// 😨 SIMPLIFIED: No more locks, event emitters, or complex state management
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
      level: state.level,
      experience: state.experience // 🆕 INCLUDE: experience in hash
    };
    return crypto.createHash('md5').update(JSON.stringify(critical)).digest('hex');
  }

  // 😨 SIMPLIFIED: Direct JSON load with Luna timing
  async loadPlayer(playerId: string): Promise<PlayerState> {
    return lunaTimeOperation(`loadPlayer_${playerId}`, this._loadPlayer(playerId));
  }
  
  private async _loadPlayer(playerId: string): Promise<PlayerState> {
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
          experience: parsed.experience || 0, // 🆕 ENSURE experience field
          // 🏆 ENSURE task/achievement tracking fields
          lpEarnedToday: parsed.lpEarnedToday || 0,
          upgradesPurchasedToday: parsed.upgradesPurchasedToday || 0,
          consecutiveDays: parsed.consecutiveDays || 1,
          claimedTasks: parsed.claimedTasks || [],
          claimedAchievements: parsed.claimedAchievements || [],
          achievementUnlockDates: parsed.achievementUnlockDates || {},
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
          experience: player.experience || 0, // 🆕 ENSURE experience is loaded
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
          // 🏆 INITIALIZE: Task and achievement tracking
          lpEarnedToday: 0,
          upgradesPurchasedToday: 0,
          consecutiveDays: 1,
          claimedTasks: [],
          claimedAchievements: [],
          achievementUnlockDates: {},
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

  // 😨 SIMPLIFIED: Direct JSON save without locks
  private async savePlayerJson(state: PlayerState): Promise<void> {
    try {
      const jsonPath = this.getJsonPath(state.telegramId, state.username);
      const dir = path.dirname(jsonPath);
      
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });
      
      // 🛡️ LUNA LEARNED: Atomic writes (temp + rename)
      const tempPath = `${jsonPath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf8');
      await fs.rename(tempPath, jsonPath);
      
      console.log(`💾 [SIMPLE] Atomically saved JSON for ${state.username}`);
    } catch (error) {
      console.error(`🔴 [SIMPLE] Failed to save JSON:`, error);
      throw error;
    }
  }

  // 😨 SIMPLIFIED: Update player with Luna timing
  async updatePlayer(playerId: string, updates: Partial<PlayerState>): Promise<PlayerState> {
    return lunaTimeOperation(`updatePlayer_${playerId}`, this._updatePlayer(playerId, updates));
  }
  
  private async _updatePlayer(playerId: string, updates: Partial<PlayerState>): Promise<PlayerState> {
    console.log(`🔄 [SIMPLE] Updating player ${playerId}:`, Object.keys(updates));
    
    const current = await this._loadPlayer(playerId);
    
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
    
    // 🔄 QUEUE for DB sync (throttled)
    queuePlayerSync(playerId, newState);
    console.log(`🔄 [SIMPLE] Player queued for DB sync`);
    
    return newState;
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
        pendingSyncs: 0, // No more pending queues - using sync queue system
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
    // 🔄 Direct DB sync for admin force-sync operations
    await this.directDatabaseSync(playerId, state);
  }

  // 🔄 DIRECT DB SYNC: For admin force operations (not queued)
  private async directDatabaseSync(playerId: string, state: PlayerState): Promise<void> {
    try {
      console.log(`🔄 [DIRECT SYNC] Starting immediate sync for ${state.username}`);
      
      // Update upgrades
      await storage.setPlayerUpgradesJSON(playerId, state.upgrades);
      console.log(`✅ [DIRECT SYNC] Upgrades synced: ${Object.keys(state.upgrades).length}`);
      
      // Update main player data - 🆕 INCLUDE EXPERIENCE FOR LEVEL-UP MENU
      await storage.updatePlayer(playerId, {
        points: Math.round(state.points),
        lustPoints: Math.round(state.lustPoints || state.points),
        lustGems: Math.round(state.lustGems || 0),
        energy: Math.round(state.energy),
        energyMax: Math.round(state.energyMax),
        level: state.level,
        experience: state.experience || 0, // 🆕 SYNC EXPERIENCE TO FIX LEVEL-UP MENU
        selectedCharacterId: state.selectedCharacterId,
        displayImage: state.displayImage,
        unlockedCharacters: state.unlockedCharacters, // 🆕 SYNC UNLOCKED CHARACTERS
        totalTapsAllTime: state.totalTapsAllTime,
        totalTapsToday: state.totalTapsToday,
        boostActive: state.boostActive,
        boostMultiplier: state.boostMultiplier,
        lastLogin: new Date()
      });
      
      console.log(`✅ [DIRECT SYNC] Database updated for ${state.username}`);
    } catch (error) {
      console.error(`🔴 [DIRECT SYNC] Failed for ${state.username}:`, error);
      throw error; // Throw for admin operations
    }
  }

  getCachedState(playerId: string): PlayerState | null {
    return this.cache.get(playerId) || null;
  }

  clearCache(playerId: string) {
    this.cache.delete(playerId);
    console.log(`🧩 Cache cleared for player ${playerId}`);
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

// 😨 SIMPLIFIED: Helper functions with Luna timing
export async function getPlayerState(playerId: string): Promise<PlayerState> {
  return lunaTimeOperation('getPlayerState', playerStateManager.loadPlayer(playerId));
}

export async function updatePlayerState(playerId: string, updates: Partial<PlayerState>): Promise<PlayerState> {
  return lunaTimeOperation('updatePlayerState', playerStateManager.updatePlayer(playerId, updates));
}

// 🔧 FIXED: Character selection with atomic unlockedCharacters + selectedCharacterId update
export async function selectCharacterForPlayer(playerId: string, characterId: string): Promise<PlayerState> {
  return lunaTimeOperation('selectCharacterForPlayer', async () => {
    console.log(`🎭 [CHARACTER] Player ${playerId} selecting character: ${characterId}`);
    
    const currentState = await getPlayerState(playerId);
    console.log(`🎭 [CHARACTER] Current character: ${currentState.selectedCharacterId}`);
    console.log(`🎭 [CHARACTER] Unlocked characters: [${currentState.unlockedCharacters.join(', ')}]`);
    
    let updatedUnlockedCharacters = [...currentState.unlockedCharacters];
    
    // Check if character is unlocked
    if (!currentState.unlockedCharacters.includes(characterId)) {
      if (process.env.NODE_ENV === 'production') {
        console.log(`❌ [CHARACTER] Character ${characterId} not unlocked in production`);
        throw new Error(`Character ${characterId} is not unlocked`);
      } else {
        // Auto-unlock in development
        console.log(`🔓 [CHARACTER] DEV: Auto-unlocking character ${characterId}`);
        updatedUnlockedCharacters.push(characterId);
      }
    }
    
    // 🔧 ATOMIC UPDATE: Both selectedCharacterId and unlockedCharacters together
    const updatedState = await updatePlayerState(playerId, {
      selectedCharacterId: characterId,
      selectedImageId: null, // Clear when character changes
      displayImage: null, // Clear when character changes  
      unlockedCharacters: updatedUnlockedCharacters // Persist unlock
    });
    
    console.log(`✅ [CHARACTER] SUCCESS: ${characterId} selected for ${updatedState.username}`);
    console.log(`🎭 [CHARACTER] Updated unlocked list: [${updatedState.unlockedCharacters.join(', ')}]`);
    
    return updatedState;
  });
}

export async function setDisplayImageForPlayer(playerId: string, imageUrl: string): Promise<PlayerState> {
  return lunaTimeOperation('setDisplayImageForPlayer', async () => {
    console.log(`🖼️ [IMAGE] Player ${playerId} setting display image: ${imageUrl}`);
    
    if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
      throw new Error('Invalid image URL');
    }
    
    const updatedState = await updatePlayerState(playerId, {
      displayImage: imageUrl
    });
    
    console.log(`✅ [IMAGE] SUCCESS: Display image set for ${updatedState.username}`);
    return updatedState;
  });
}

// 🆕 ENHANCED: Upgrade purchase with experience gain for level-up menu fix + task tracking
export async function purchaseUpgradeForPlayer(playerId: string, upgradeId: string, newLevel: number, cost: number): Promise<PlayerState> {
  return lunaTimeOperation('purchaseUpgradeForPlayer', async () => {
    console.log(`🛒 [UPGRADE] Player ${playerId} purchasing ${upgradeId} level ${newLevel} for ${cost} points`);
    
    const currentState = await getPlayerState(playerId);
    
    if (currentState.points < cost) {
      throw new Error(`Insufficient points: has ${currentState.points}, needs ${cost}`);
    }
    
    // 🆕 ADD: Experience gain on upgrade purchase (helps level-up system)
    const experienceGain = Math.floor(cost * 0.1); // 10% of cost as experience
    console.log(`🏆 [UPGRADE] Experience gain: ${experienceGain} XP`);
    
    const updatedState = await updatePlayerState(playerId, {
      points: Math.round(currentState.points - cost),
      lustPoints: Math.round((currentState.lustPoints || currentState.points) - cost),
      experience: (currentState.experience || 0) + experienceGain, // 🆕 ADD EXPERIENCE
      // 🏆 Track daily upgrade purchases for task system
      upgradesPurchasedToday: (currentState.upgradesPurchasedToday || 0) + 1,
      upgrades: {
        ...currentState.upgrades,
        [upgradeId]: newLevel
      }
    });
    
    console.log(`✅ [UPGRADE] SUCCESS: ${upgradeId} level ${newLevel} purchased for ${updatedState.username}`);
    console.log(`🏆 [UPGRADE] New experience: ${updatedState.experience} XP`);
    console.log(`🏆 [UPGRADE] Daily purchases: ${updatedState.upgradesPurchasedToday}`);
    return updatedState;
  });
}

export default playerStateManager;