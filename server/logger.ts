/**
 * 🔇 Enhanced Winston Logger for JSON-First System
 * 
 * Features:
 * ✅ Console shows only critical errors and important messages
 * ✅ Full logging to files (combined.log, error.log)
 * ✅ Smart spam filtering and deduplication
 * ✅ JSON-first system logging integration
 */

import fs from "fs";
import path from "path";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const logDir = path.resolve(process.cwd(), "logs");

// Ensure logs directory exists
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (err) {
  console.error("Failed to create logs directory:", err);
}

// Enhanced spam suppression for JSON-first system
class JsonFirstSpamKiller {
  private seenMessages = new Map<string, { count: number; lastSeen: number }>>();
  private readonly maxRepeats = 1; // Very strict for console
  private readonly timeWindow = 10000; // 10 second window
  
  // More aggressive blacklist for console
  private readonly consoleBlacklist = [
    /\[object Object\]/i,
    /PostCSS plugin/i,
    /Re-optimizing dependencies/i,
    /dependencies.*changed/i,
    /Vite dev server ready/i,
    /vite.*config.*changed/i,
    /hmr.*update/i,
    /Player.*already queued for sync/i,
    /Player.*unchanged, skipping DB sync/i,
    /Loading player.*state/i,
    /\[API\].*200.*json/i,
    /Session validation response/i,
    /Already queued for sync/i,
    /Health check result/i
  ];
  
  // File logging blacklist (less aggressive)
  private readonly fileBlacklist = [
    /PostCSS plugin.*autoprefixer/i,
    /Vite dev server ready/i
  ];
  
  shouldAllowConsole(level: string, message: string): boolean {
    // Only show errors, warnings, and important info in console
    if (!['error', 'warn'].includes(level)) {
      // Allow some important info messages
      if (!this.isImportantMessage(message)) {
        return false;
      }
    }
    
    // Console blacklist check
    if (this.consoleBlacklist.some(pattern => pattern.test(message))) {
      return false;
    }
    
    return this.checkDuplication(`console:${level}`, message);
  }
  
  shouldAllowFile(level: string, message: string): boolean {
    // Files get everything except blacklisted items
    if (this.fileBlacklist.some(pattern => pattern.test(message))) {
      return false;
    }
    
    return this.checkDuplication(`file:${level}`, message);
  }
  
  private isImportantMessage(message: string): boolean {
    const important = [
      /JSON-FIRST.*system.*active/i,
      /Server running on port/i,
      /Player.*selected character/i,
      /Character.*selected successfully/i,
      /routes registered successfully/i,
      /Master.*Data.*initialized/i,
      /Player.*main JSON saved/i,
      /Created new.*player/i,
      /Graceful shutdown handlers registered/i,
      /PlayerStateManager cleanup/i
    ];
    
    return important.some(pattern => pattern.test(message));
  }
  
  private checkDuplication(prefix: string, message: string): boolean {
    const key = `${prefix}:${message.slice(0, 50)}`;
    const now = Date.now();
    const existing = this.seenMessages.get(key);
    
    if (!existing) {
      this.seenMessages.set(key, { count: 1, lastSeen: now });
      return true;
    }
    
    // Reset if outside time window
    if (now - existing.lastSeen > this.timeWindow) {
      existing.count = 1;
      existing.lastSeen = now;
      return true;
    }
    
    existing.count++;
    existing.lastSeen = now;
    
    return existing.count <= this.maxRepeats;
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
}

const spamKiller = new JsonFirstSpamKiller();

// Ultra-clean formatter
const cleanFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const time = new Date(timestamp).toLocaleTimeString();
  
  // Smart message cleaning
  let cleanMsg = typeof message === 'string' ? message : JSON.stringify(message, null, 0);
  if (cleanMsg.length > 200) cleanMsg = cleanMsg.slice(0, 200) + '...';
  
  // Add meta if useful
  let metaStr = '';
  if (meta && Object.keys(meta).length > 0) {
    try {
      const metaJson = JSON.stringify(meta, null, 0);
      if (metaJson !== '{}' && metaJson.length < 100) {
        metaStr = ` ${metaJson}`;
      }
    } catch {}
  }
  
  return `${time} [${level.toUpperCase()}] ${cleanMsg}${metaStr}`;
});

// Create filtered console transport
class FilteredConsoleTransport extends winston.transports.Console {
  log(info: any, callback: any) {
    if (spamKiller.shouldAllowConsole(info.level, info.message)) {
      return super.log(info, callback);
    }
    callback();
    return true;
  }
}

// Create filtered file transport
class FilteredFileTransport extends DailyRotateFile {
  log(info: any, callback: any) {
    if (spamKiller.shouldAllowFile(info.level, info.message)) {
      return super.log(info, callback);
    }
    callback();
    return true;
  }
}

let logger: winston.Logger;

try {
  const isDev = process.env.NODE_ENV !== 'production';
  
  logger = winston.createLogger({
    level: 'debug', // Capture everything for files
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true })
    ),
    transports: [
      // 🔇 CONSOLE: Only critical messages
      new FilteredConsoleTransport({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          cleanFormat
        )
      }),
      
      // 📄 FILES: Everything (with less filtering)
      new FilteredFileTransport({
        filename: path.join(logDir, "combined-%DATE%.log"),
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '7d',
        level: 'debug',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }),
      
      // ❌ ERROR LOG: All errors
      new winston.transports.File({
        filename: path.join(logDir, "error.log"),
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 3
      }),
      
      // 🎯 JSON-FIRST: Dedicated log for player state operations
      new winston.transports.File({
        filename: path.join(logDir, "json-first.log"),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 2
      })
    ],
    
    // Exception handling
    exceptionHandlers: [
      new winston.transports.File({ 
        filename: path.join(logDir, "exceptions.log"),
        maxsize: 2097152, // 2MB
        maxFiles: 2
      })
    ],
    
    exitOnError: false
  });
  
  console.log("🔇 JSON-first enhanced logger initialized");
  
} catch (err) {
  console.error("Logger initialization failed:", err);
  
  // Emergency fallback
  logger = {
    info: (msg: any, meta?: any) => spamKiller.shouldAllowConsole('info', String(msg)) ? console.log(msg, meta) : undefined,
    error: (msg: any, meta?: any) => console.error(msg, meta),
    warn: (msg: any, meta?: any) => spamKiller.shouldAllowConsole('warn', String(msg)) ? console.warn(msg, meta) : undefined,
    debug: (msg: any, meta?: any) => process.env.NODE_ENV === 'development' && spamKiller.shouldAllowConsole('debug', String(msg)) ? console.debug(msg, meta) : undefined
  } as any;
}

// Cleanup spam filter periodically
setInterval(() => {
  spamKiller.cleanup();
}, 30000);

// 🎯 Add JSON-first specific logging methods
(logger as any).jsonFirst = {
  playerUpdate: (playerId: string, action: string, details?: any) => {
    logger.info(`🎯 [JSON-FIRST] Player ${playerId} ${action}`, details);
  },
  systemHealth: (health: any) => {
    logger.debug(`🎯 [JSON-FIRST] System Health`, health);
  },
  syncComplete: (playerId: string, duration: number) => {
    logger.debug(`🎯 [JSON-FIRST] DB Sync complete for ${playerId} (${duration}ms)`);
  }
};

// Enhanced error handling without spam
process.on("unhandledRejection", (reason: any) => {
  if (spamKiller.shouldAllowConsole('error', String(reason))) {
    logger.error("Unhandled Rejection", { reason });
  }
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", { err, stack: err.stack });
});

export default logger;