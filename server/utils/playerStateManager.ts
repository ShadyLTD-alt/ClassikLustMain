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
  lastSync: {
    timestamp: number;
    hash: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// 🔧 FIX: Increase EventEmitter max listeners for JSON-first system
EventEmitter.defaultMaxListeners = 20;

class PlayerStateManager extends EventEmitter {
  private states = new Map<string, PlayerState>();
  private locks = new Map<string, AsyncLock>();
  private pendingSyncs = new Set<string>();
  private syncTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly playersDir: string;
  private readonly snapshotsDir: string;

  constructor() {
    super();
    // 🔧 FIX: Set higher max listeners for this instance
    this.setMaxListeners(50);
    
    // 📁 CORRECTED: Use main-gamedata/player-data/ as primary directory
    this.playersDir = path.join(process.cwd(), 'main-gamedata', 'player-data');
    // 📁 Snapshots are backup only
    this.snapshotsDir = path.join(process.cwd(), 'uploads', 'snapshots', 'players');
    
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.playersDir, { recursive: true });
      await fs.mkdir(this.snapshotsDir, { recursive: true });
      console.log('📁 Player directories ensured:');
      console.log('  📁 Primary:', this.playersDir);
      console.log('  📁 Backup:', this.snapshotsDir);
    } catch (error) {
      console.error('Failed to create player directories:', error);
    }
  }

  // Get or create lock for player
  private getLock(playerId: string): AsyncLock {
    if (!this.locks.has(playerId)) {
      this.locks.set(playerId, new AsyncLock());
    }
    return this.locks.get(playerId)!;
  }

  // Hash critical fields to detect changes
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

  // 📁 Generate proper filename based on telegramId and username
  private getPlayerFileName(telegramId: string, username: string): string {
    const sanitized = username.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${telegramId}_${sanitized}.json`;
  }

  // Load player state (JSON first from main-gamedata, DB fallback)
  async loadPlayer(playerId: string): Promise<PlayerState> {
    const lock = this.getLock(playerId);
    
    return await lock.acquire(playerId, async () => {
      // Return cached if available
      if (this.states.has(playerId)) {
        return this.states.get(playerId)!;
      }

      console.log(`📂 Loading player ${playerId} state...`);
      
      // Try JSON first from main-gamedata (source of truth)
      let state = await this.loadFromMainJson(playerId);
      
      if (!state) {
        console.log(`📂 No main JSON found for ${playerId}, loading from DB...`);
        // Fallback: load from DB and create initial JSON
        state = await this.loadFromDatabase(playerId);
        if (state) {
          await this.saveMainJson(playerId, state);
          await this.createBackupSnapshot(playerId, state);
        }
      }

      if (!state) {
        throw new Error(`Player ${playerId} not found in JSON or DB`);
      }

      this.states.set(playerId, state);
      console.log(`✅ Player ${playerId} state loaded and cached`);
      return state;
    });
  }

  // Update player state (immediate JSON + queued DB sync)
  async updatePlayer(playerId: string, updates: Partial<PlayerState>): Promise<PlayerState> {
    const lock = this.getLock(playerId);
    
    return await lock.acquire(playerId, async () => {
      const currentState = await this.loadPlayer(playerId);
      
      // Apply updates with timestamp
      const newState: PlayerState = {
        ...currentState,
        ...updates,
        updatedAt: new Date(),
        lastSync: {
          timestamp: Date.now(),
          hash: this.hashState({ ...currentState, ...updates })
        }
      };

      console.log(`💾 Updating player ${playerId} state to main JSON...`);
      
      // IMMEDIATE: Save to main-gamedata JSON (source of truth)
      await this.saveMainJson(playerId, newState);
      
      // Update in-memory cache
      this.states.set(playerId, newState);
      
      // 🔧 FIX: Debounced DB sync (prevent too many concurrent syncs)
      this.queueDatabaseSync(playerId, newState);
      
      // Create backup every 10 updates
      if (Math.random() < 0.1) {
        this.createBackupSnapshot(playerId, newState);
      }
      
      console.log(`✅ Player ${playerId} state updated`);
      return newState;
    });
  }

  // 📁 Save to main-gamedata directory with proper naming
  private async saveMainJson(playerId: string, state: PlayerState): Promise<void> {
    const filename = this.getPlayerFileName(state.telegramId, state.username);
    const filePath = path.join(this.playersDir, filename);
    const lockPath = `${filePath}.lock`;

    try {
      // 🔧 FIX: Shorter timeout and retry for file locking
      const release = await lockfile.lock(filePath, {
        lockfilePath: lockPath,
        retries: 3,
        minTimeout: 50,
        maxTimeout: 500,
        realpath: false
      });

      try {
        // Atomic write: temp -> rename
        const tempPath = `${filePath}.tmp`;
        const jsonData = JSON.stringify(state, null, 2);
        
        await fs.writeFile(tempPath, jsonData, 'utf8');
        await fs.rename(tempPath, filePath);
        
        console.log(`💾 Player ${playerId} main JSON saved: ${filename}`);
      } finally {
        await release();
      }
    } catch (error) {
      console.error(`🔴 Failed to save player ${playerId} main JSON:`, error);
      throw error;
    }
  }

  // 📁 Load from main-gamedata directory
  private async loadFromMainJson(playerId: string): Promise<PlayerState | null> {
    try {
      // First try to get player info from DB to build filename
      const player = await storage.getPlayer(playerId);
      if (!player) return null;
      
      const filename = this.getPlayerFileName(player.telegramId, player.username);
      const filePath = path.join(this.playersDir, filename);
      
      const data = await fs.readFile(filePath, 'utf8');
      const state = JSON.parse(data);
      
      console.log(`📂 Player ${playerId} loaded from main JSON: ${filename}`);
      return {
        ...state,
        // Ensure dates are properly parsed
        boostExpiresAt: state.boostExpiresAt ? new Date(state.boostExpiresAt) : null,
        lastDailyReset: new Date(state.lastDailyReset || Date.now()),
        lastWeeklyReset: new Date(state.lastWeeklyReset || Date.now()),
        createdAt: new Date(state.createdAt || Date.now()),
        updatedAt: new Date(state.updatedAt || Date.now())
      };
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null; // No main JSON exists
      }
      console.error(`🔴 Failed to load player ${playerId} main JSON:`, error);
      return null;
    }
  }

  // Load from database (fallback)
  private async loadFromDatabase(playerId: string): Promise<PlayerState | null> {
    try {
      console.log(`🗃️ Loading player ${playerId} from database...`);
      
      const player = await storage.getPlayer(playerId);
      if (!player) return null;
      
      const upgrades = await storage.getPlayerUpgrades(playerId);
      const upgradesMap = upgrades.reduce((acc, upgrade) => {
        acc[upgrade.upgradeId] = upgrade.level;
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
        lastSync: {
          timestamp: Date.now(),
          hash: ''
        },
        createdAt: player.createdAt ? new Date(player.createdAt) : new Date(),
        updatedAt: new Date()
      };

      // Calculate initial hash
      state.lastSync.hash = this.hashState(state);
      
      console.log(`✅ Player ${playerId} loaded from database`);
      return state;
    } catch (error) {
      console.error(`🔴 Failed to load player ${playerId} from database:`, error);
      return null;
    }
  }

  // 🔧 FIX: Improved debounced DB sync with proper cleanup
  private queueDatabaseSync(playerId: string, state: PlayerState) {
    // Clear existing timeout for this player
    const existingTimeout = this.syncTimeouts.get(playerId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.syncTimeouts.delete(playerId);
    }
    
    // Skip if already pending
    if (this.pendingSyncs.has(playerId)) {
      console.log(`⏳ Player ${playerId} already queued for sync, updating timeout...`);
    }
    
    this.pendingSyncs.add(playerId);
    console.log(`🔄 Queuing DB sync for player ${playerId}...`);
    
    // 🔧 FIX: Use setTimeout with proper cleanup
    const timeout = setTimeout(async () => {
      try {
        await this.syncToDatabase(playerId, state);
      } catch (error) {
        console.error(`🔴 DB sync failed for player ${playerId}:`, error);
        // Emit error event for monitoring
        this.emit('syncError', { playerId, error });
      } finally {
        this.pendingSyncs.delete(playerId);
        this.syncTimeouts.delete(playerId);
      }
    }, 3000); // 🔧 FIX: Increased to 3 seconds to reduce API spam
    
    this.syncTimeouts.set(playerId, timeout);
  }

  // Sync to database (only if changed)
  private async syncToDatabase(playerId: string, state: PlayerState) {
    try {
      // Check if we need to sync (compare hashes)
      const currentCached = this.states.get(playerId);
      if (!currentCached) {
        console.log(`⚠️ Player ${playerId} not in cache during sync, skipping...`);
        return;
      }

      const currentHash = this.hashState(currentCached);
      if (currentHash === state.lastSync.hash) {
        console.log(`✅ Player ${playerId} unchanged, skipping DB sync`);
        return;
      }

      console.log(`🔄 Syncing player ${playerId} to database...`);
      
      // Update main player record
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

      // Update upgrades (only changed ones)
      for (const [upgradeId, level] of Object.entries(state.upgrades)) {
        await storage.setPlayerUpgrade(playerId, upgradeId, level);
      }

      // Update hash to mark as synced
      currentCached.lastSync = {
        timestamp: Date.now(),
        hash: currentHash
      };

      console.log(`✅ Player ${playerId} synced to database successfully`);
      this.emit('syncSuccess', { playerId, timestamp: Date.now() });
    } catch (error) {
      console.error(`🔴 Database sync failed for player ${playerId}:`, error);
      throw error;
    }
  }

  // 💾 Create backup snapshots (separate from main data)
  private async createBackupSnapshot(playerId: string, state: PlayerState): Promise<void> {
    const playerDir = path.join(this.snapshotsDir, playerId);
    const backupPath = path.join(playerDir, `backup-${Date.now()}.json`);
    
    try {
      await fs.mkdir(playerDir, { recursive: true });
      await fs.writeFile(backupPath, JSON.stringify(state, null, 2), 'utf8');
      
      // Keep only last 5 backups
      const files = await fs.readdir(playerDir);
      const backups = files
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .map(f => ({ name: f, time: parseInt(f.replace('backup-', '').replace('.json', '')) }))
        .sort((a, b) => b.time - a.time); // Newest first
      
      // Delete old backups (keep 5)
      for (const backup of backups.slice(5)) {
        await fs.unlink(path.join(playerDir, backup.name));
      }
      
      console.log(`💾 Created backup snapshot for player ${playerId}, keeping ${Math.min(backups.length, 5)} total`);
    } catch (error) {
      console.warn(`⚠️ Failed to create backup for player ${playerId}:`, error);
    }
  }

  // Get cached state (no file I/O)
  getCachedState(playerId: string): PlayerState | null {
    return this.states.get(playerId) || null;
  }

  // 🔧 FIX: Improved cache clearing with timeout cleanup
  clearCache(playerId: string): void {
    // Clear any pending timeouts
    const timeout = this.syncTimeouts.get(playerId);
    if (timeout) {
      clearTimeout(timeout);
      this.syncTimeouts.delete(playerId);
    }
    
    this.states.delete(playerId);
    this.locks.delete(playerId);
    this.pendingSyncs.delete(playerId);
  }

  // Force immediate DB sync
  async forceDatabaseSync(playerId: string): Promise<void> {
    const state = this.states.get(playerId);
    if (!state) {
      throw new Error(`Player ${playerId} not in cache`);
    }
    
    await this.syncToDatabase(playerId, state);
  }

  // 🔧 FIX: Enhanced health check with directory info
  async healthCheck(): Promise<{ 
    mainJsonFiles: number; 
    backupSnapshots: number;
    cachedPlayers: number; 
    pendingSyncs: number; 
    pendingTimeouts: number;
    directories: {
      main: string;
      backup: string;
    };
  }> {
    try {
      const mainFiles = await fs.readdir(this.playersDir).catch(() => []);
      const backupDirs = await fs.readdir(this.snapshotsDir).catch(() => []);
      
      let totalBackups = 0;
      for (const dir of backupDirs) {
        try {
          const backups = await fs.readdir(path.join(this.snapshotsDir, dir));
          totalBackups += backups.filter(f => f.startsWith('backup-')).length;
        } catch {}
      }
      
      return {
        mainJsonFiles: mainFiles.filter(f => f.endsWith('.json')).length,
        backupSnapshots: totalBackups,
        cachedPlayers: this.states.size,
        pendingSyncs: this.pendingSyncs.size,
        pendingTimeouts: this.syncTimeouts.size,
        directories: {
          main: this.playersDir,
          backup: this.snapshotsDir
        }
      };
    } catch {
      return {
        mainJsonFiles: 0,
        backupSnapshots: 0,
        cachedPlayers: this.states.size,
        pendingSyncs: this.pendingSyncs.size,
        pendingTimeouts: this.syncTimeouts.size,
        directories: {
          main: this.playersDir,
          backup: this.snapshotsDir
        }
      };
    }
  }

  // 🔧 FIX: Cleanup method for graceful shutdown
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up PlayerStateManager...');
    
    // Clear all timeouts
    for (const [playerId, timeout] of this.syncTimeouts.entries()) {
      clearTimeout(timeout);
      console.log(`⏹️ Cleared pending sync timeout for player ${playerId}`);
    }
    this.syncTimeouts.clear();
    
    // Wait for pending syncs with timeout
    if (this.pendingSyncs.size > 0) {
      console.log(`⏳ Waiting for ${this.pendingSyncs.size} pending syncs...`);
      
      let attempts = 0;
      while (this.pendingSyncs.size > 0 && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (this.pendingSyncs.size > 0) {
        console.warn(`⚠️ ${this.pendingSyncs.size} syncs still pending after cleanup timeout`);
      } else {
        console.log('✅ All pending syncs completed');
      }
    }
    
    // Clear all listeners
    this.removeAllListeners();
    
    console.log('✅ PlayerStateManager cleanup complete');
  }
}

// Global singleton instance
export const playerStateManager = new PlayerStateManager();

// Helper functions for common operations
export async function getPlayerState(playerId: string): Promise<PlayerState> {
  return await playerStateManager.loadPlayer(playerId);
}

export async function updatePlayerState(playerId: string, updates: Partial<PlayerState>): Promise<PlayerState> {
  return await playerStateManager.updatePlayer(playerId, updates);
}

export async function selectCharacterForPlayer(playerId: string, characterId: string): Promise<PlayerState> {
  console.log(`🎭 Selecting character ${characterId} for player ${playerId}`);
  
  return await playerStateManager.updatePlayer(playerId, {
    selectedCharacterId: characterId,
    selectedImageId: null, // Reset to use character's default
    displayImage: null     // Reset to use character's default
  });
}

export async function setDisplayImageForPlayer(playerId: string, imageUrl: string): Promise<PlayerState> {
  console.log(`🖼️ Setting display image for player ${playerId}: ${imageUrl}`);
  
  return await playerStateManager.updatePlayer(playerId, {
    displayImage: imageUrl
  });
}

export async function purchaseUpgradeForPlayer(playerId: string, upgradeId: string, newLevel: number, cost: number): Promise<PlayerState> {
  console.log(`🛒 Player ${playerId} purchasing upgrade ${upgradeId} level ${newLevel} for ${cost} points`);
  
  const currentState = await playerStateManager.loadPlayer(playerId);
  
  if (currentState.points < cost) {
    throw new Error('Insufficient points');
  }
  
  return await playerStateManager.updatePlayer(playerId, {
    points: currentState.points - cost,
    lustPoints: currentState.lustPoints - cost,
    upgrades: {
      ...currentState.upgrades,
      [upgradeId]: newLevel
    }
  });
}