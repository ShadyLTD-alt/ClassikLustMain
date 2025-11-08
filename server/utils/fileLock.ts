/**
 * File Locking Utility
 * Prevents race conditions when writing to JSON files concurrently
 */

type LockQueue = {
  resolve: () => void;
  reject: (error: Error) => void;
};

class FileLock {
  private locks: Map<string, LockQueue[]> = new Map();
  private activeLocks: Set<string> = new Set();

  /**
   * Acquire a lock for a file path
   * Waits if file is already locked
   */
  async acquire(filePath: string): Promise<void> {
    // If file is not locked, acquire immediately
    if (!this.activeLocks.has(filePath)) {
      this.activeLocks.add(filePath);
      console.log(`🔒 [LOCK] Acquired: ${filePath}`);
      return;
    }

    // File is locked, add to queue
    console.log(`⏳ [LOCK] Waiting for: ${filePath}`);
    return new Promise((resolve, reject) => {
      const queue = this.locks.get(filePath) || [];
      queue.push({ resolve, reject });
      this.locks.set(filePath, queue);
    });
  }

  /**
   * Release a lock for a file path
   * Processes next queued operation if any
   */
  release(filePath: string): void {
    const queue = this.locks.get(filePath) || [];
    
    if (queue.length > 0) {
      // Process next in queue
      const next = queue.shift()!;
      this.locks.set(filePath, queue);
      console.log(`🔓 [LOCK] Released (next in queue): ${filePath}`);
      next.resolve();
    } else {
      // No queue, fully release
      this.activeLocks.delete(filePath);
      this.locks.delete(filePath);
      console.log(`🔓 [LOCK] Released (no queue): ${filePath}`);
    }
  }

  /**
   * Execute a function with file lock protection
   */
  async withLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
    await this.acquire(filePath);
    try {
      const result = await fn();
      return result;
    } finally {
      this.release(filePath);
    }
  }

  /**
   * Get current lock status (for debugging)
   */
  getStatus(): { active: string[]; queued: Record<string, number> } {
    const queued: Record<string, number> = {};
    for (const [path, queue] of this.locks.entries()) {
      if (queue.length > 0) {
        queued[path] = queue.length;
      }
    }
    return {
      active: Array.from(this.activeLocks),
      queued
    };
  }
}

// Export singleton instance
export const fileLock = new FileLock();
export default fileLock;

console.log('✅ [FILE LOCK] File locking utility initialized');
