/**
 * LunaBug/utils/console-cleanup.js
 * 
 * EMERGENCY CONSOLE CLEANUP UTILITY
 * - Prevents [object Object] spam
 * - Filters out repetitive debug messages
 * - Keeps console readable and useful
 */

class ConsoleCleanup {
  constructor() {
    this.originalMethods = {};
    this.messageCache = new Map();
    this.maxDuplicates = 3;
    this.cleanupActive = false;
  }

  activate() {
    if (this.cleanupActive) return;
    
    console.log('🧹 LunaBug Console Cleanup activated');
    
    // Store original methods
    this.originalMethods.log = console.log;
    this.originalMethods.debug = console.debug;
    this.originalMethods.info = console.info;
    this.originalMethods.warn = console.warn;
    this.originalMethods.error = console.error;

    // Override console methods with smart filtering
    console.log = (...args) => this.smartLog('log', ...args);
    console.debug = (...args) => this.smartLog('debug', ...args);
    console.info = (...args) => this.smartLog('info', ...args);
    console.warn = (...args) => this.smartLog('warn', ...args);
    console.error = (...args) => this.smartLog('error', ...args);

    this.cleanupActive = true;
  }

  deactivate() {
    if (!this.cleanupActive) return;
    
    // Restore original methods
    console.log = this.originalMethods.log;
    console.debug = this.originalMethods.debug;
    console.info = this.originalMethods.info;
    console.warn = this.originalMethods.warn;
    console.error = this.originalMethods.error;

    this.originalMethods.log('🧹 LunaBug Console Cleanup deactivated');
    this.cleanupActive = false;
  }

  smartLog(level, ...args) {
    const originalMethod = this.originalMethods[level];
    
    // Convert args to string for analysis
    const message = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        // Prevent [object Object] spam by properly formatting
        try {
          return JSON.stringify(arg, null, 0);
        } catch (err) {
          return '[Complex Object]';
        }
      }
      return String(arg);
    }).join(' ');

    // Skip obvious spam patterns
    if (this.isSpamMessage(message)) {
      return; // Silently drop spam
    }

    // Check for duplicate messages
    const messageKey = `${level}:${message}`;
    const count = (this.messageCache.get(messageKey) || 0) + 1;
    this.messageCache.set(messageKey, count);

    // Only show first few occurrences of duplicate messages
    if (count <= this.maxDuplicates) {
      if (count === this.maxDuplicates) {
        originalMethod(`[SPAM FILTERED: Previous message repeated ${count} times, further occurrences suppressed]`);
      } else {
        originalMethod(...args);
      }
    }

    // Clean cache periodically
    if (this.messageCache.size > 1000) {
      this.messageCache.clear();
    }
  }

  isSpamMessage(message) {
    const spamPatterns = [
      /\[object Object\]/,
      /debug: \[object Object\].*timestamp/,
      /^\{"timestamp".*\}$/,
      /PostCSS plugin did not pass.*from.*option/,
      /Module not found.*lunabug/i
    ];

    return spamPatterns.some(pattern => pattern.test(message));
  }

  // Method to check for specific patterns and clean them
  filterDebugSpam() {
    // Look for debug spam sources and neutralize them
    if (typeof window !== 'undefined' && window.DEBUG) {
      // Disable debug library spam if present
      window.DEBUG = () => () => {};
    }

    // Override common debug library patterns
    if (typeof global !== 'undefined') {
      global.DEBUG = () => () => {};
    }
  }

  // Get statistics
  getStats() {
    const totalMessages = Array.from(this.messageCache.values()).reduce((sum, count) => sum + count, 0);
    const uniqueMessages = this.messageCache.size;
    const filteredMessages = Array.from(this.messageCache.values()).reduce((sum, count) => sum + Math.max(0, count - this.maxDuplicates), 0);

    return {
      totalMessages,
      uniqueMessages,
      filteredMessages,
      active: this.cleanupActive
    };
  }
}

// Global singleton instance
const cleanup = new ConsoleCleanup();

// Auto-activate if we detect spam environment
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  cleanup.activate();
  cleanup.filterDebugSpam();
}

// Expose to window/global for manual control
if (typeof window !== 'undefined') {
  window.LunaBugCleanup = cleanup;
} else if (typeof global !== 'undefined') {
  global.LunaBugCleanup = cleanup;
}

export default cleanup;