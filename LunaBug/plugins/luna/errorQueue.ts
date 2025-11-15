// LunaBug/plugins/luna/errorQueue.ts
/**
 * Luna Error Queue System
 * Manages error detection, prioritization, and batch fixing workflow
 */

export interface QueuedError {
  id: string;
  number: number;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  description: string;
  fix: string;
  status: 'PENDING' | 'FIXED' | 'IGNORED' | 'MANUAL';
  timestamp: Date;
  autoFixAvailable: boolean;
  files?: string[];
}

class ErrorQueue {
  private queue: QueuedError[] = [];
  private currentIndex: number = 0;
  private severityPriority = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  private luna: any; // Will be injected

  constructor(lunaInstance?: any) {
    this.luna = lunaInstance;
  }

  /**
   * Set Luna instance (for dependency injection)
   */
  setLuna(lunaInstance: any): void {
    this.luna = lunaInstance;
  }

  /**
   * Add error to queue
   */
  add(error: Omit<QueuedError, 'id' | 'number' | 'timestamp' | 'status'>): void {
    const queuedError: QueuedError = {
      ...error,
      id: `${error.type}_${Date.now()}`,
      number: this.queue.length + 1,
      timestamp: new Date(),
      status: 'PENDING'
    };

    this.queue.push(queuedError);
    this.sort();
    
    if (this.luna?.log) {
      this.luna.log.info(`Added error to queue: #${queuedError.number} ${error.type}`);
    } else {
      console.log(`[ErrorQueue] Added error: #${queuedError.number} ${error.type}`);
    }
  }

  /**
   * Sort queue by severity (CRITICAL -> LOW)
   */
  private sort(): void {
    this.queue.sort((a, b) => {
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      return this.severityPriority[a.severity] - this.severityPriority[b.severity];
    });

    // Renumber after sort
    this.queue.forEach((err, idx) => {
      err.number = idx + 1;
    });
  }

  /**
   * List all errors
   */
  list(): QueuedError[] {
    return this.queue;
  }

  /**
   * List only pending errors
   */
  listPending(): QueuedError[] {
    return this.queue.filter(e => e.status === 'PENDING');
  }

  /**
   * Get current error being processed
   */
  current(): QueuedError | null {
    const pending = this.listPending();
    return pending[this.currentIndex] || null;
  }

  /**
   * Get error by number
   */
  get(number: number): QueuedError | null {
    return this.queue.find(e => e.number === number) || null;
  }

  /**
   * Process error with action
   */
  async process(number: number, action: 'auto' | 'manual' | 'ignore'): Promise<{ success: boolean; message: string }> {
    const error = this.get(number);
    
    if (!error) {
      return { success: false, message: `Error #${number} not found` };
    }

    if (error.status !== 'PENDING') {
      return { success: false, message: `Error #${number} already ${error.status}` };
    }

    switch (action) {
      case 'auto':
        if (!error.autoFixAvailable) {
          return { success: false, message: 'Auto-fix not available for this error' };
        }
        return await this.autoFix(error);

      case 'manual':
        error.status = 'MANUAL';
        this.log('info', `Error #${number} marked for manual fix`);
        return { 
          success: true, 
          message: `✅ Error #${number} marked for manual intervention\n${error.fix}` 
        };

      case 'ignore':
        error.status = 'IGNORED';
        this.log('info', `Error #${number} ignored`);
        return { 
          success: true, 
          message: `⏭️ Error #${number} ignored` 
        };

      default:
        return { success: false, message: 'Invalid action' };
    }
  }

  /**
   * Auto-fix error
   */
  private async autoFix(error: QueuedError): Promise<{ success: boolean; message: string }> {
    try {
      this.log('info', `Auto-fixing error #${error.number}: ${error.type}`);

      // Route to appropriate fixer based on error type
      if (this.luna?.autoFix) {
        const result = await this.luna.autoFix.run(error.type, error);

        if (result.success) {
          error.status = 'FIXED';
          return {
            success: true,
            message: `✅ Auto-fixed #${error.number}: ${error.type}\n${result.details || ''}`
          };
        } else {
          return {
            success: false,
            message: `❌ Auto-fix failed for #${error.number}: ${result.error}`
          };
        }
      } else {
        return {
          success: false,
          message: 'Auto-fix system not available'
        };
      }
    } catch (err: any) {
      this.log('error', `Auto-fix error for #${error.number}:`, err);
      return {
        success: false,
        message: `❌ Auto-fix failed: ${err.message}`
      };
    }
  }

  /**
   * Move to next pending error
   */
  next(): QueuedError | null {
    const pending = this.listPending();
    
    if (this.currentIndex < pending.length - 1) {
      this.currentIndex++;
    }

    return this.current();
  }

  /**
   * Move to previous error
   */
  prev(): QueuedError | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }

    return this.current();
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.queue = [];
    this.currentIndex = 0;
    this.log('info', 'Error queue cleared');
  }

  /**
   * Get queue summary stats
   */
  stats(): {
    total: number;
    pending: number;
    fixed: number;
    manual: number;
    ignored: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  } {
    return {
      total: this.queue.length,
      pending: this.queue.filter(e => e.status === 'PENDING').length,
      fixed: this.queue.filter(e => e.status === 'FIXED').length,
      manual: this.queue.filter(e => e.status === 'MANUAL').length,
      ignored: this.queue.filter(e => e.status === 'IGNORED').length,
      critical: this.queue.filter(e => e.severity === 'CRITICAL').length,
      high: this.queue.filter(e => e.severity === 'HIGH').length,
      medium: this.queue.filter(e => e.severity === 'MEDIUM').length,
      low: this.queue.filter(e => e.severity === 'LOW').length
    };
  }

  /**
   * Helper logging method
   */
  private log(level: string, ...args: any[]): void {
    if (this.luna?.log && typeof this.luna.log[level] === 'function') {
      this.luna.log[level](...args);
    } else {
      console.log(`[ErrorQueue ${level.toUpperCase()}]`, ...args);
    }
  }
}

export default ErrorQueue;
