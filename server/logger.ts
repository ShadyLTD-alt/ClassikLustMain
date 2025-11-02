/**
 * Ultra-Clean Logger - ZERO SPAM TOLERANCE 💀
 * 
 * Eliminates:
 * ❌ [object Object] spam
 * ❌ Duplicate log flooding  
 * ❌ Verbose development noise
 * ❌ PostCSS/Vite rebuild spam
 * 
 * Features:
 * ✅ Smart object serialization
 * ✅ Aggressive spam deduplication
 * ✅ Production-optimized levels
 * ✅ File rotation with size limits
 */

import fs from "fs";
import path from "path";
import winston from "winston";

const logDir = path.resolve(process.cwd(), "logs");

// Ensure logs directory exists
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (err) {
  console.error("Failed to create logs directory:", err);
}

// Spam suppression engine
class UltraSpamKiller {
  private seenMessages = new Map<string, { count: number; lastSeen: number; hash: string }>();
  private readonly maxRepeats = 2; // Allow 2 duplicates then suppress
  private readonly timeWindow = 8000; // 8 second window
  private readonly blacklist = [
    /\[object Object\]/i,
    /PostCSS plugin.*autoprefixer/i,
    /Re-optimizing dependencies/i,
    /dependencies.*changed/i,
    /Vite dev server ready/i,
    /require is not defined in ES module scope/i,
    /Failed to register LunaBug routes.*Cannot find module/i,
    /vite.*config.*changed/i,
    /hmr.*update/i,
    /internal.*server.*error/i,
  ];
  
  shouldAllow(level: string, message: string): boolean {
    // Blacklist check - instant kill
    if (this.blacklist.some(pattern => pattern.test(message))) {
      return false;
    }
    
    // Production: only allow warn and error
    if (process.env.NODE_ENV === 'production' && !['warn', 'error'].includes(level)) {
      return false;
    }
    
    // Generate message fingerprint for deduplication
    const fingerprint = this.generateFingerprint(level, message);
    const now = Date.now();
    const existing = this.seenMessages.get(fingerprint);
    
    if (!existing) {
      this.seenMessages.set(fingerprint, { count: 1, lastSeen: now, hash: fingerprint });
      return true;
    }
    
    // Outside time window - reset
    if (now - existing.lastSeen > this.timeWindow) {
      existing.count = 1;
      existing.lastSeen = now;
      return true;
    }
    
    // Within time window - check count
    existing.count++;
    existing.lastSeen = now;
    
    return existing.count <= this.maxRepeats;
  }
  
  private generateFingerprint(level: string, message: string): string {
    // Create a unique fingerprint that captures the essence of the message
    const normalized = message
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '[timestamp]') // Remove timestamps
      .replace(/\d+ms/g, '[duration]') // Remove durations
      .replace(/port \d+/g, 'port [num]') // Remove port numbers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .slice(0, 80); // Limit length
      
    return `${level}:${normalized}`;
  }
  
  cleanup() {
    const now = Date.now();
    const cutoff = now - (this.timeWindow * 2);
    
    for (const [key, entry] of this.seenMessages.entries()) {
      if (entry.lastSeen < cutoff) {
        this.seenMessages.delete(key);
      }
    }
  }
  
  getStats() {
    return {
      trackedMessages: this.seenMessages.size,
      totalSuppressed: Array.from(this.seenMessages.values()).reduce(
        (sum, entry) => sum + Math.max(0, entry.count - this.maxRepeats), 0
      )
    };
  }
}

const spamKiller = new UltraSpamKiller();

// Ultra-clean formatter that NEVER produces [object Object]
const ultraCleanFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const time = new Date(timestamp).toLocaleTimeString();
  
  // Smart message serialization
  let cleanMsg: string;
  if (typeof message === 'string') {
    cleanMsg = message;
  } else if (message && typeof message === 'object') {
    try {
      cleanMsg = JSON.stringify(message, null, 0);
      // Extra safety - if it's still [object Object], describe it
      if (cleanMsg === '{}' || cleanMsg.includes('[object')) {
        cleanMsg = `[${message.constructor?.name || 'Object'}]`;
      }
    } catch {
      cleanMsg = `[${typeof message}]`;
    }
  } else {
    cleanMsg = String(message);
  }
  
  // Truncate super long messages
  if (cleanMsg.length > 250) {
    cleanMsg = cleanMsg.slice(0, 250) + '...';
  }
  
  // Add meta only if useful
  let metaStr = '';
  if (meta && Object.keys(meta).length > 0) {
    try {
      const metaJson = JSON.stringify(meta, null, 0);
      if (metaJson !== '{}' && metaJson.length < 150) {
        metaStr = ` ${metaJson}`;
      }
    } catch {
      // Ignore meta errors
    }
  }
  
  return `${time} [${level.toUpperCase()}] ${cleanMsg}${metaStr}`;
});

// Create the winston logger with spam filtering
let logger: winston.Logger;

try {
  const isDev = process.env.NODE_ENV !== 'production';
  const logLevel = process.env.LOG_LEVEL || (isDev ? 'info' : 'warn');
  
  logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true })
    ),
    transports: [
      // Console with spam filtering
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          ultraCleanFormat
        ),
        // Override log method to add spam filtering
        log(info, callback) {
          if (spamKiller.shouldAllow(info.level, info.message)) {
            return winston.transports.Console.prototype.log.call(this, info, callback);
          }
          // Suppress spam
          callback();
          return true;
        }
      }),
      
      // Error log file
      new winston.transports.File({
        filename: path.join(logDir, "error.log"),
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 3
      })
    ],
    
    // Handle exceptions without spam
    exceptionHandlers: [
      new winston.transports.File({ 
        filename: path.join(logDir, "exceptions.log"),
        maxsize: 2097152, // 2MB
        maxFiles: 2
      })
    ],
    
    exitOnError: false
  });
  
  // Add general log file only in development
  if (isDev) {
    logger.add(new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 2
    }));
  }
  
  console.log("🌙 Ultra-clean logger initialized");
  
} catch (err) {
  console.error("Logger initialization failed:", err);
  
  // Emergency fallback
  logger = {
    info: (msg: any, meta?: any) => spamKiller.shouldAllow('info', String(msg)) ? console.log(msg, meta) : undefined,
    error: (msg: any, meta?: any) => console.error(msg, meta),
    warn: (msg: any, meta?: any) => spamKiller.shouldAllow('warn', String(msg)) ? console.warn(msg, meta) : undefined,
    debug: (msg: any, meta?: any) => process.env.NODE_ENV === 'development' && spamKiller.shouldAllow('debug', String(msg)) ? console.debug(msg, meta) : undefined
  } as any;
}

// Cleanup spam filter periodically
setInterval(() => {
  spamKiller.cleanup();
}, 30000);

// Add utility methods
(logger as any).getSpamStats = () => spamKiller.getStats();
(logger as any).cleanup = () => spamKiller.cleanup();

// Suppress unhandled rejection spam
process.on("unhandledRejection", (reason: any) => {
  if (spamKiller.shouldAllow('error', String(reason))) {
    logger.error("Unhandled Rejection", { reason });
  }
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", { err, stack: err.stack });
});

export default logger;