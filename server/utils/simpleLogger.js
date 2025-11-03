/**
 * Luna's Simple, Crash-Resistant Logger
 * Replaces winston to prevent uncaught exceptions
 * Zero external dependencies - pure Node.js
 */
const fs = require('fs');
const path = require('path');

class SimpleLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDir();
    console.log('🌙 Luna Simple Logger initialized');
  }

  ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.warn('⚠️ Could not create log directory:', error.message);
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaString = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaString}`;
  }

  writeToFile(filename, content) {
    try {
      const filepath = path.join(this.logDir, filename);
      fs.appendFileSync(filepath, content + '\n');
    } catch (error) {
      // Fail silently to prevent crashes
      console.warn('⚠️ Log write failed:', error.message);
    }
  }

  info(message, meta = {}) {
    const formatted = this.formatMessage('info', message, meta);
    console.log(`ℹ️  ${formatted}`);
    this.writeToFile('combined.log', formatted);
  }

  warn(message, meta = {}) {
    const formatted = this.formatMessage('warn', message, meta);
    console.warn(`⚠️  ${formatted}`);
    this.writeToFile('combined.log', formatted);
  }

  error(message, meta = {}) {
    const formatted = this.formatMessage('error', message, meta);
    console.error(`❌ ${formatted}`);
    this.writeToFile('error.log', formatted);
    this.writeToFile('combined.log', formatted);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV !== 'production') {
      const formatted = this.formatMessage('debug', message, meta);
      console.debug(`🐛 ${formatted}`);
      this.writeToFile('debug.log', formatted);
    }
  }

  // MCP-specific logging methods
  logRequest(method, params) {
    this.info(`[MCP] Request: ${method}`, { params });
  }

  logResponse(method, result) {
    this.info(`[MCP] Response: ${method}`, { result });
  }

  logError(method, error) {
    this.error(`[MCP] Error: ${method}`, { 
      error: error.message, 
      stack: error.stack 
    });
  }
}

// Create singleton instance
const logger = new SimpleLogger();

// Export for both CommonJS and ES6
module.exports = logger;
module.exports.default = logger;
module.exports.SimpleLogger = SimpleLogger;

// MCP logger object for compatibility
module.exports.mcpLogger = {
  logRequest: (method, params) => logger.logRequest(method, params),
  logResponse: (method, result) => logger.logResponse(method, result),
  logError: (method, error) => logger.logError(method, error)
};

console.log('🌙 Luna: Simple logger ready (winston replacement)');
