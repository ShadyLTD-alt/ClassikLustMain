/**
 * LunaBug/core/DebugPlugin.js
 * 
 * Base class / contract all plugins must follow.
 * 
 * What it does:
 * ✅ Defines expected structure: name, init(), start(), stop()
 * ✅ Enforces consistency across modules
 * ✅ Provides common logging interface
 * ❌ Does not implement actual logic (plugins extend this)
 */

class DebugPlugin {
  constructor(name) {
    this.name = name;
    this.context = null;
  }

  async init(context) {
    this.context = context;
    throw new Error(`${this.name}: init() not implemented`);
  }

  async start() {
    console.log(`[${this.name}] start() not implemented`);
  }

  async stop() {
    console.log(`[${this.name}] stop() not implemented`);
  }

  // Common logging method all plugins can use
  logEvent(type, data, severity = 'info') {
    if (this.context && this.context.logEvent) {
      // Use core's logEvent if available
      this.context.logEvent(type, data, severity);
    } else {
      // Fallback to console logging
      const timestamp = new Date().toISOString();
      const logData = typeof data === 'object' ? JSON.stringify(data) : data;
      console.log(`🌙 [${this.name}] ${timestamp} | ${type} | ${severity} | ${logData}`);
    }
  }

  // Helper method for consistent error logging
  logError(message, error, context = {}) {
    this.logEvent('plugin_error', {
      plugin: this.name,
      message,
      error: error?.message || error,
      stack: error?.stack,
      ...context
    }, 'error');
  }

  // Helper method for performance tracking
  logPerformance(operation, startTime, endTime = Date.now()) {
    this.logEvent('performance', {
      plugin: this.name,
      operation,
      duration: endTime - startTime,
      timestamp: new Date().toISOString()
    }, 'info');
  }

  // Helper for status updates
  logStatus(status, details = {}) {
    this.logEvent('plugin_status', {
      plugin: this.name,
      status,
      ...details
    }, 'info');
  }
}

export default DebugPlugin;