/**
 * Luna's Crash-Resistant Logger
 * Replaces winston which was causing uncaught exceptions
 * Zero external dependencies for maximum stability
 */

// Import the simple logger instead of winston
const simpleLogger = require('./simpleLogger.js');

// Export the simple logger with the same interface
export const logger = simpleLogger;
export const mcpLogger = simpleLogger.mcpLogger;
export default simpleLogger;

// Add winston-compatible methods for backward compatibility
export const winston = {
  createLogger: () => simpleLogger,
  format: {
    combine: (...args) => args, // Mock for compatibility
    timestamp: () => null,
    colorize: () => null,
    printf: (fn) => fn,
    json: () => null
  },
  transports: {
    Console: function() { return {}; },
    File: function() { return {}; },
    DailyRotateFile: function() { return {}; }
  }
};

console.log('🌙 Luna: Winston replaced with crash-resistant logger');
