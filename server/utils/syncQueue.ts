/**
 * 🔄 Push Request Queue System
 * 
 * Manages throttled JSON → Database synchronization
 * Prevents DB spam while ensuring data consistency
 */

import logger from '../logger';
import { storage } from '../storage';
import type { Player, Upgrade, Character, Level } from '@shared/types';

interface QueuedUpdate<T> {
  id: string;
  data: T;
  timestamp: number;
  retries: number;
  updateType: 'create' | 'update' | 'delete';
}

interface QueueConfig {
  batchSize: number;
  flushIntervalMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

class SyncQueue<T> {
  private queue = new Map<string, QueuedUpdate<T>>();
  private isProcessing = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly name: string;
  private readonly config: QueueConfig;
  private readonly syncFunction: (updates: QueuedUpdate<T>[]) => Promise<void>;

  constructor(
    name: string, 
    syncFunction: (updates: QueuedUpdate<T>[]) => Promise<void>,
    config: Partial<QueueConfig> = {}
  ) {
    this.name = name;
    this.syncFunction = syncFunction;
    this.config = {
      batchSize: 10,
      flushIntervalMs: 5000, // 5 seconds
      maxRetries: 3,
      retryDelayMs: 2000,
      ...config
    };
    
    this.startTimer();
    console.log(`🔄 SyncQueue[${name}] initialized:`, this.config);
  }

  /**
   * Add an update to the queue
   */
  enqueue(id: string, data: T, updateType: 'create' | 'update' | 'delete' = 'update'): void {
    const existing = this.queue.get(id);
    
    const queuedUpdate: QueuedUpdate<T> = {
      id,
      data,
      timestamp: Date.now(),
      retries: existing?.retries || 0,
      updateType
    };
    
    this.queue.set(id, queuedUpdate);
    
    console.log(`🔄 [${this.name}] Queued ${updateType} for ${id} (queue: ${this.queue.size})`);
    
    // If queue is full, process immediately
    if (this.queue.size >= this.config.batchSize && !this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Force immediate flush of all queued updates
   */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    await this.processQueue();
    this.startTimer();
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      name: this.name,
      queueSize: this.queue.size,
      isProcessing: this.isProcessing,
      oldestUpdate: this.queue.size > 0 
        ? Math.min(...Array.from(this.queue.values()).map(u => u.timestamp))
        : null,
      config: this.config
    };
  }

  private startTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    
    this.timer = setTimeout(() => {
      if (this.queue.size > 0 && !this.isProcessing) {
        this.processQueue();
      }
      this.startTimer(); // Restart timer
    }, this.config.flushIntervalMs);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.size === 0) {
      return;
    }
    
    this.isProcessing = true;
    const updates = Array.from(this.queue.values());
    const updateIds = updates.map(u => u.id);
    
    console.log(`🔄 [${this.name}] Processing ${updates.length} updates:`, updateIds);
    
    try {
      // Process all updates in this batch
      await this.syncFunction(updates);
      
      // Remove successfully processed updates
      for (const id of updateIds) {
        this.queue.delete(id);
      }
      
      console.log(`✅ [${this.name}] Successfully processed ${updates.length} updates`);
    } catch (error) {
      console.error(`❌ [${this.name}] Batch sync failed:`, error);
      
      // Handle retries
      const now = Date.now();
      for (const update of updates) {
        if (update.retries < this.config.maxRetries) {
          update.retries += 1;
          update.timestamp = now + (this.config.retryDelayMs * update.retries);
          this.queue.set(update.id, update);
          console.log(`🔄 [${this.name}] Retry ${update.retries}/${this.config.maxRetries} for ${update.id}`);
        } else {
          console.error(`❌ [${this.name}] Max retries exceeded for ${update.id}, dropping from queue`);
          this.queue.delete(update.id);
          
          // Log to Winston for admin attention
          logger.error(`SyncQueue[${this.name}] failed permanently`, {
            id: update.id,
            retries: update.retries,
            error: error instanceof Error ? error.message : 'Unknown'
          });
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clean shutdown - process remaining queue
   */
  async shutdown(): Promise<void> {
    console.log(`🔄 [${this.name}] Shutting down, flushing remaining ${this.queue.size} updates`);
    
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    await this.processQueue();
    console.log(`✅ [${this.name}] Shutdown complete`);
  }
}

/**
 * Global Sync Queue Manager
 * Manages separate queues for different data types
 */
class SyncQueueManager {
  private playerQueue: SyncQueue<Player>;
  private upgradeQueue: SyncQueue<Upgrade>;
  private characterQueue: SyncQueue<Character>;
  private levelQueue: SyncQueue<Level>;
  
  constructor() {
    // Player sync queue (most frequent updates)
    this.playerQueue = new SyncQueue('Players', this.syncPlayers.bind(this), {
      batchSize: 5,
      flushIntervalMs: 3000, // 3s for player data
      maxRetries: 5
    });
    
    // Upgrade sync queue (admin changes)
    this.upgradeQueue = new SyncQueue('Upgrades', this.syncUpgrades.bind(this), {
      batchSize: 10,
      flushIntervalMs: 8000, // 8s for admin changes
      maxRetries: 3
    });
    
    // Character sync queue (admin changes)
    this.characterQueue = new SyncQueue('Characters', this.syncCharacters.bind(this), {
      batchSize: 10,
      flushIntervalMs: 8000,
      maxRetries: 3
    });
    
    // Level sync queue (admin changes, less frequent)
    this.levelQueue = new SyncQueue('Levels', this.syncLevels.bind(this), {
      batchSize: 20,
      flushIntervalMs: 15000, // 15s for level changes
      maxRetries: 3
    });
    
    console.log('🔄 SyncQueueManager initialized with throttled DB sync');
  }

  /**
   * Queue player updates for DB sync
   */
  queuePlayerUpdate(playerId: string, playerData: Player): void {
    this.playerQueue.enqueue(playerId, playerData, 'update');
  }

  /**
   * Queue upgrade updates for DB sync
   */
  queueUpgradeUpdate(upgradeId: string, upgradeData: Upgrade, updateType: 'create' | 'update' = 'update'): void {
    this.upgradeQueue.enqueue(upgradeId, upgradeData, updateType);
  }

  /**
   * Queue character updates for DB sync
   */
  queueCharacterUpdate(characterId: string, characterData: Character, updateType: 'create' | 'update' = 'update'): void {
    this.characterQueue.enqueue(characterId, characterData, updateType);
  }

  /**
   * Queue level updates for DB sync
   */
  queueLevelUpdate(level: number, levelData: Level, updateType: 'create' | 'update' = 'update'): void {
    this.levelQueue.enqueue(level.toString(), levelData, updateType);
  }

  /**
   * Get status of all queues
   */
  getAllQueueStatus() {
    return {
      players: this.playerQueue.getStatus(),
      upgrades: this.upgradeQueue.getStatus(),
      characters: this.characterQueue.getStatus(),
      levels: this.levelQueue.getStatus(),
      totalQueued: (
        this.playerQueue.getStatus().queueSize +
        this.upgradeQueue.getStatus().queueSize +
        this.characterQueue.getStatus().queueSize +
        this.levelQueue.getStatus().queueSize
      )
    };
  }

  /**
   * Force flush all queues immediately
   */
  async flushAll(): Promise<void> {
    console.log('🔄 Force flushing all sync queues...');
    
    await Promise.all([
      this.playerQueue.flush(),
      this.upgradeQueue.flush(),
      this.characterQueue.flush(),
      this.levelQueue.flush()
    ]);
    
    console.log('✅ All queues flushed successfully');
  }

  /**
   * Graceful shutdown - flush all queues
   */
  async shutdown(): Promise<void> {
    console.log('🔄 SyncQueueManager shutting down...');
    
    await Promise.all([
      this.playerQueue.shutdown(),
      this.upgradeQueue.shutdown(),
      this.characterQueue.shutdown(),
      this.levelQueue.shutdown()
    ]);
    
    console.log('✅ SyncQueueManager shutdown complete');
  }

  // Private sync functions for each data type
  private async syncPlayers(updates: QueuedUpdate<Player>[]): Promise<void> {
    console.log(`🔄 [DB SYNC] Syncing ${updates.length} players...`);
    
    for (const update of updates) {
      try {
        if (update.updateType === 'create') {
          await storage.createPlayer(update.data);
        } else {
          await storage.updatePlayer(update.id, update.data);
        }
        console.log(`✅ [DB SYNC] Player ${update.id} synced successfully`);
      } catch (error) {
        console.error(`❌ [DB SYNC] Failed to sync player ${update.id}:`, error);
        throw error; // Let queue handle retries
      }
    }
  }

  private async syncUpgrades(updates: QueuedUpdate<Upgrade>[]): Promise<void> {
    console.log(`🔄 [DB SYNC] Syncing ${updates.length} upgrades...`);
    
    for (const update of updates) {
      try {
        if (update.updateType === 'create') {
          await storage.createUpgrade(update.data);
        } else {
          await storage.updateUpgrade(update.id, update.data);
        }
        console.log(`✅ [DB SYNC] Upgrade ${update.id} synced successfully`);
      } catch (error) {
        console.error(`❌ [DB SYNC] Failed to sync upgrade ${update.id}:`, error);
        throw error;
      }
    }
  }

  private async syncCharacters(updates: QueuedUpdate<Character>[]): Promise<void> {
    console.log(`🔄 [DB SYNC] Syncing ${updates.length} characters...`);
    
    for (const update of updates) {
      try {
        if (update.updateType === 'create') {
          await storage.createCharacter(update.data);
        } else {
          await storage.updateCharacter(update.id, update.data);
        }
        console.log(`✅ [DB SYNC] Character ${update.id} synced successfully`);
      } catch (error) {
        console.error(`❌ [DB SYNC] Failed to sync character ${update.id}:`, error);
        throw error;
      }
    }
  }

  private async syncLevels(updates: QueuedUpdate<Level>[]): Promise<void> {
    console.log(`🔄 [DB SYNC] Syncing ${updates.length} levels...`);
    
    for (const update of updates) {
      try {
        if (update.updateType === 'create') {
          await storage.createLevel(update.data);
        } else {
          const levelNum = parseInt(update.id);
          await storage.updateLevel(levelNum, update.data);
        }
        console.log(`✅ [DB SYNC] Level ${update.id} synced successfully`);
      } catch (error) {
        console.error(`❌ [DB SYNC] Failed to sync level ${update.id}:`, error);
        throw error;
      }
    }
  }
}

// Global sync queue manager
export const syncQueueManager = new SyncQueueManager();

// Convenience functions for easy queuing
export const queuePlayerSync = (playerId: string, playerData: Player) => {
  syncQueueManager.queuePlayerUpdate(playerId, playerData);
};

export const queueUpgradeSync = (upgradeId: string, upgradeData: Upgrade, isNew = false) => {
  syncQueueManager.queueUpgradeUpdate(upgradeId, upgradeData, isNew ? 'create' : 'update');
};

export const queueCharacterSync = (characterId: string, characterData: Character, isNew = false) => {
  syncQueueManager.queueCharacterUpdate(characterId, characterData, isNew ? 'create' : 'update');
};

export const queueLevelSync = (level: number, levelData: Level, isNew = false) => {
  syncQueueManager.queueLevelUpdate(level, levelData, isNew ? 'create' : 'update');
};

// Admin force-flush function
export const forceFlushAllQueues = () => {
  return syncQueueManager.flushAll();
};

// Get all queue statuses for admin monitoring
export const getAllQueueStatus = () => {
  return syncQueueManager.getAllQueueStatus();
};

// Graceful shutdown
export const shutdownSyncQueues = () => {
  return syncQueueManager.shutdown();
};

console.log('🔄 Sync queue system initialized - JSON changes will auto-sync to Supabase DB');

export default syncQueueManager;