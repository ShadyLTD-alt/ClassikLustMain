/**
 * 🚫 SPAM KILLER: Debounced Save System
 * 
 * Prevents sendBeacon spam by:
 * ✅ Batching rapid state changes (500ms debounce)
 * ✅ Managing sendBeacon 64KB queue limit
 * ✅ Fallback to regular fetch when queue full
 * ✅ Smart retry logic with exponential backoff
 * ✅ Zero spam, maximum efficiency
 */

type PlayerData = {
  id?: string;
  points?: number;
  energy?: number;
  level?: number;
  lustPoints?: number;
  selectedCharacter?: string;
  upgrades?: Record<string, number>;
  unlockedCharacters?: string[];
  [key: string]: any;
};

class DebouncedSaveManager {
  private saveTimeout: NodeJS.Timeout | null = null;
  private pendingData: PlayerData = {};
  private saving = false;
  private failureCount = 0;
  private lastSaveAttempt = 0;
  private readonly debounceMs = 500; // Wait 500ms of silence before saving
  private readonly maxRetries = 3;
  private readonly retryDelayBase = 1000;
  private readonly sendBeaconSizeLimit = 60000; // Stay under 64KB limit
  private queuedBytes = 0;
  private lastQueueReset = Date.now();
  
  /**
   * Queue a save operation (debounced)
   */
  queueSave(data: PlayerData) {
    // Merge new data with pending
    this.pendingData = { ...this.pendingData, ...data };
    
    // Reset debounce timer
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Schedule save after debounce period
    this.saveTimeout = setTimeout(() => {
      this.executeSave();
    }, this.debounceMs);
  }
  
  /**
   * Force immediate save (for critical operations)
   */
  async forceSave(data: PlayerData): Promise<boolean> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    
    this.pendingData = { ...this.pendingData, ...data };
    return this.executeSave();
  }
  
  /**
   * Execute the actual save operation
   */
  private async executeSave(): Promise<boolean> {
    if (this.saving || Object.keys(this.pendingData).length === 0) {
      return true;
    }
    
    this.saving = true;
    const dataToSave = { ...this.pendingData };
    this.pendingData = {}; // Clear pending data
    
    try {
      const success = await this.performSave(dataToSave);
      
      if (success) {
        this.failureCount = 0;
        console.log('🌙 ✅ Player data saved successfully');
      } else {
        // Re-queue failed data
        this.pendingData = { ...dataToSave, ...this.pendingData };
        this.handleSaveFailure();
      }
      
      return success;
      
    } catch (error) {
      console.error('🌙 ❌ Save error:', error);
      this.pendingData = { ...dataToSave, ...this.pendingData };
      this.handleSaveFailure();
      return false;
    } finally {
      this.saving = false;
    }
  }
  
  /**
   * Perform the actual HTTP request with smart beacon management
   */
  private async performSave(data: PlayerData): Promise<boolean> {
    const payload = JSON.stringify(data);
    const payloadSize = new Blob([payload]).size;
    
    // Check if we should reset the queue byte counter
    if (Date.now() - this.lastQueueReset > 10000) {
      this.queuedBytes = 0;
      this.lastQueueReset = Date.now();
    }
    
    // Try sendBeacon if payload is small enough and queue isn't full
    const totalQueueSize = this.queuedBytes + payloadSize;
    if (payloadSize < this.sendBeaconSizeLimit && totalQueueSize < this.sendBeaconSizeLimit) {
      try {
        const success = navigator.sendBeacon('/api/player/me', payload);
        
        if (success) {
          this.queuedBytes += payloadSize;
          console.log(`🌙 📮 sendBeacon success (${payloadSize} bytes, queue: ${this.queuedBytes})`); 
          return true;
        } else {
          console.log(`🌙 ⚠️ sendBeacon failed (queue full), falling back to fetch...`);
        }
      } catch (error) {
        console.log(`🌙 ⚠️ sendBeacon error, falling back to fetch...`);
      }
    }
    
    // Fallback to regular fetch
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      
      const response = await fetch('/api/player/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: payload
      });
      
      if (response.ok) {
        console.log(`🌙 ✅ Fetch save success (${payloadSize} bytes)`);
        return true;
      } else {
        console.error(`🌙 ❌ Fetch save failed: ${response.status}`);
        return false;
      }
      
    } catch (error) {
      console.error(`🌙 ❌ Fetch save error:`, error);
      return false;
    }
  }
  
  /**
   * Handle save failure with exponential backoff
   */
  private handleSaveFailure() {
    this.failureCount++;
    
    if (this.failureCount <= this.maxRetries) {
      const delay = this.retryDelayBase * Math.pow(2, this.failureCount - 1);
      console.log(`🌙 🔄 Retrying save in ${delay}ms (attempt ${this.failureCount}/${this.maxRetries})`);
      
      setTimeout(() => {
        this.executeSave();
      }, delay);
    } else {
      console.error(`🌙 ❌ Save failed permanently after ${this.maxRetries} attempts`);
      
      // Store failed data in localStorage as emergency backup
      try {
        const backupKey = `playerDataBackup_${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(this.pendingData));
        console.log(`🌙 💾 Emergency backup saved to localStorage: ${backupKey}`);
      } catch (err) {
        console.error('🌙 ❌ Even localStorage backup failed:', err);
      }
    }
  }
  
  /**
   * Get current save status
   */
  getStatus() {
    return {
      saving: this.saving,
      pendingChanges: Object.keys(this.pendingData).length > 0,
      failureCount: this.failureCount,
      queuedBytes: this.queuedBytes,
      lastSaveAttempt: this.lastSaveAttempt
    };
  }
  
  /**
   * Clear all pending data (emergency)
   */
  clearPending() {
    this.pendingData = {};
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    console.log('🌙 🧽 Pending data cleared');
  }
}

// Singleton instance
const saveManager = new DebouncedSaveManager();

/**
 * Public API - Use this instead of direct savePlayerDataToJSON
 */
export const debouncedSave = {
  // Queue save (debounced) - USE THIS FOR REGULAR UPDATES
  queue: (data: PlayerData) => {
    saveManager.queueSave(data);
  },
  
  // Force immediate save - USE FOR CRITICAL OPERATIONS
  force: async (data: PlayerData): Promise<boolean> => {
    return await saveManager.forceSave(data);
  },
  
  // Get save status
  status: () => {
    return saveManager.getStatus();
  },
  
  // Clear pending (emergency)
  clear: () => {
    saveManager.clearPending();
  }
};

export default debouncedSave;