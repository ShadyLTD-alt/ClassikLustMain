/**
 * 🔇 STARTUP-SAFE Winston Logger 
 * 🔧 FIXED: Removed transform-breaking class extensions
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

// 🔧 SIMPLE spam filter to avoid transform issues
const createSpamFilter = () => {
  const seen = new Map();
  
  return {
    shouldShow(level: string, message: string): boolean {
      // Production: only show errors and critical warnings
      if (process.env.NODE_ENV === 'production' && !['error', 'warn'].includes(level)) {
        return false;
      }
      
      // Block obvious spam
      const spamPatterns = [
        /PostCSS plugin/i,
        /Re-optimizing/i,
        /Player.*already queued/i,
        /\[API\].*200/i,
        /Loading player.*state/i
      ];
      
      if (spamPatterns.some(p => p.test(message))) {
        return false;
      }
      
      // Simple deduplication
      const key = message.slice(0, 40);
      const count = seen.get(key) || 0;
      seen.set(key, count + 1);
      
      return count < 3; // Allow 3 duplicates max
    }
  };
};

const spamFilter = createSpamFilter();

// Clean formatter
const formatter = winston.format.printf(({ level, message, timestamp }) => {
  const time = new Date(timestamp).toLocaleTimeString();
  const msg = typeof message === 'string' ? message : JSON.stringify(message);
  return `${time} [${level.toUpperCase()}] ${msg}`;
});

// 🔧 SIMPLIFIED logger creation - no complex class extensions
let logger: winston.Logger;

try {
  logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true })
    ),
    transports: [
      // Console with simple filtering
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          formatter
        ),
        // 🔧 Override log method properly
        log: function(info: any, callback: any) {
          if (spamFilter.shouldShow(info.level, info.message)) {
            return winston.transports.Console.prototype.log.call(this, info, callback);
          }
          if (callback) callback();
          return true;
        }
      }),
      
      // Error file only
      new winston.transports.File({
        filename: path.join(logDir, "error.log"),
        level: 'error',
        format: winston.format.json(),
        maxsize: 5242880,
        maxFiles: 3
      }),
      
      // Combined file for development
      new winston.transports.File({
        filename: path.join(logDir, "combined.log"),
        format: winston.format.json(),
        maxsize: 10485760,
        maxFiles: 2
      })
    ],
    
    exitOnError: false
  });
  
  console.log("🔇 Startup-safe logger initialized");
  
} catch (err) {
  console.error("Logger failed to initialize:", err);
  
  // Fallback logger
  logger = {
    info: (msg: any) => console.log(`[INFO] ${msg}`),
    error: (msg: any) => console.error(`[ERROR] ${msg}`),
    warn: (msg: any) => console.warn(`[WARN] ${msg}`),
    debug: (msg: any) => console.debug(`[DEBUG] ${msg}`)
  } as any;
}

// Simple error handling
process.on("unhandledRejection", (reason: any) => {
  logger.error("Unhandled Rejection", { reason: String(reason) });
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", { message: err.message });
});

export default logger;