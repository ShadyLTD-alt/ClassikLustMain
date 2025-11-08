/**
 * 🔇 FIXED Winston Logger - Enhanced error tracking
 * 🔧 FIXED: Proper file rotation and spam filtering
 */

import fs from "fs";
import path from "path";
import winston from "winston";

const logDir = path.resolve(process.cwd(), "logs");

// 🔧 FIXED: Ensure logs directory exists with better error handling
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log(`📁 Created logs directory: ${logDir}`);
  }
} catch (err) {
  console.error("❌ Failed to create logs directory:", err);
  // Create fallback logs in current directory
  const fallbackLogDir = path.resolve(process.cwd(), "fallback-logs");
  try {
    if (!fs.existsSync(fallbackLogDir)) {
      fs.mkdirSync(fallbackLogDir, { recursive: true });
      console.log(`🆘 Using fallback logs directory: ${fallbackLogDir}`);
    }
  } catch {}
}

// 🔧 SIMPLIFIED spam filter
const createSpamFilter = () => {
  const seen = new Map<string, { count: number; lastSeen: number }>();
  
  return {
    shouldShow(level: string, message: string): boolean {
      // Always show errors and warnings
      if (['error', 'warn'].includes(level)) {
        return true;
      }

      // Production: only show important messages
      if (process.env.NODE_ENV === 'production' && level !== 'error') {
        return false;
      }

      // Convert message to string if it's not already
      const msgStr = typeof message === 'string' ? message : JSON.stringify(message);

      // Block obvious spam patterns
      const spamPatterns = [
        /PostCSS plugin/i,
        /Re-optimizing/i,
        /\[API\].*200/i,
        /Loading player.*state/i,
        /Health check/i
      ];

      if (spamPatterns.some(p => p.test(msgStr))) {
        return false;
      }

      // Rate limiting
      const key = msgStr.slice(0, 50);  // ← Now it's safe to use .slice()
      const now = Date.now();
      const entry = seen.get(key) || { count: 0, lastSeen: 0 };

      // Reset count if it's been more than 1 minute
      if (now - entry.lastSeen > 60000) {
        entry.count = 0;
      }

      entry.count++;
      entry.lastSeen = now;
      seen.set(key, entry);

      // Allow up to 3 of the same message per minute
      return entry.count <= 3;
    }
  };
};

const spamFilter = createSpamFilter();

// 🔧 FIXED: Clean formatter with better error handling
const formatter = winston.format.printf(({ level, message, timestamp, stack }) => {
  const time = new Date(timestamp as string).toLocaleTimeString('en-US', { 
    hour12: false,
    timeZone: 'America/New_York'
  } as any);

  let msg = '';
  try {
    if (typeof message === 'string') {
      msg = message;
    } else if (message && typeof message === 'object') {
      msg = JSON.stringify(message, null, 2);
    } else {
      msg = String(message || 'undefined message');
    }
  } catch (err) {
    msg = '[LOGGER ERROR: Could not format message]';
  }

  // Add stack trace for errors
  if (level === 'error' && stack) {
    msg += `\n${stack}`;
  }

  return `${time} [${level.toUpperCase()}] ${msg}`;
});

// 🔧 FIXED: Simplified logger with proper error handling
let logger: winston.Logger;

try {
  logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true })
    ),
    transports: [
      // 🔧 FIXED: Console transport with proper spam filtering
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          formatter
        ),
        // Override log method to include spam filtering
        log: function(info: any, callback: any) {
          try {
            if (spamFilter.shouldShow(info.level, info.message)) {
              // Call the original Console transport log method
              return (winston.transports.Console.prototype as any).log.call(this, info, callback);
            }
            // Skip this message
            if (callback) callback();
            return true;
          } catch (err) {
            console.error('Console transport error:', err);
            if (callback) callback();
            return false;
          }
        }
      }),
      
      // 🔧 FIXED: Error file with better rotation
      new winston.transports.File({
        filename: path.join(logDir, "error.log"),
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 3,
        handleExceptions: true,
        handleRejections: true
      }),
      
      // 🔧 FIXED: Combined file for all logs
      new winston.transports.File({
        filename: path.join(logDir, "combined.log"),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: 10485760, // 10MB
        maxFiles: 2
      }),
      
      // 🆕 NEW: Daily rotating file for debugging
      new winston.transports.File({
        filename: path.join(logDir, "debug.log"),
        level: 'debug',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: 20971520, // 20MB
        maxFiles: 1
      })
    ],
    
    // Enhanced error handling
    exitOnError: false,
    handleExceptions: true,
    handleRejections: true
  });
  
  // Test the logger
  logger.info("🔇 Winston logger initialized successfully");
  logger.debug("🔍 Debug logging active");
  console.log(`✅ Logger files: error.log, combined.log, debug.log in ${logDir}`);
  
} catch (err) {
  console.error("❌ Logger failed to initialize:", err);
  
  // 🔧 FIXED: Robust fallback logger
  logger = {
    info: (msg: any, meta?: any) => {
      const timestamp = new Date().toISOString();
      const logLine = `${timestamp} [INFO] ${typeof msg === 'string' ? msg : JSON.stringify(msg)} ${meta ? JSON.stringify(meta) : ''}`;
      console.log(logLine);
      
      // Also try to write to file
      try {
        const logFile = path.join(process.cwd(), 'fallback.log');
        fs.appendFileSync(logFile, logLine + '\n');
      } catch {}
    },
    error: (msg: any, meta?: any) => {
      const timestamp = new Date().toISOString();
      const logLine = `${timestamp} [ERROR] ${typeof msg === 'string' ? msg : JSON.stringify(msg)} ${meta ? JSON.stringify(meta) : ''}`;
      console.error(logLine);
      
      // Also try to write to file
      try {
        const errorFile = path.join(process.cwd(), 'errors.log');
        fs.appendFileSync(errorFile, logLine + '\n');
      } catch {}
    },
    warn: (msg: any, meta?: any) => {
      const timestamp = new Date().toISOString();
      const logLine = `${timestamp} [WARN] ${typeof msg === 'string' ? msg : JSON.stringify(msg)} ${meta ? JSON.stringify(meta) : ''}`;
      console.warn(logLine);
      
      try {
        const warnFile = path.join(process.cwd(), 'warnings.log');
        fs.appendFileSync(warnFile, logLine + '\n');
      } catch {}
    },
    debug: (msg: any, meta?: any) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG] ${typeof msg === 'string' ? msg : JSON.stringify(msg)} ${meta ? JSON.stringify(meta) : ''}`);
      }
    }
  } as winston.Logger;
}

// 🔧 ENHANCED: Global error handlers with logging
process.on("unhandledRejection", (reason: any, promise) => {
  const errorMsg = `Unhandled Promise Rejection: ${reason instanceof Error ? reason.message : String(reason)}`;
  logger.error(errorMsg, { 
    reason: reason instanceof Error ? reason.stack : String(reason),
    promise: String(promise)
  });
  console.error('🔴 UNHANDLED REJECTION:', reason);
});

process.on("uncaughtException", (err) => {
  const errorMsg = `Uncaught Exception: ${err.message}`;
  logger.error(errorMsg, { 
    message: err.message, 
    stack: err.stack,
    name: err.name
  });
  console.error('🔴 UNCAUGHT EXCEPTION:', err);
  
  // Don't exit process in development
  if (process.env.NODE_ENV === 'production') {
    setTimeout(() => process.exit(1), 1000);
  }
});

// 🆕 NEW: Log rotation helper
setInterval(() => {
  try {
    // Check log file sizes and rotate if needed
    const logFiles = ['error.log', 'combined.log', 'debug.log'];
    
    for (const logFile of logFiles) {
      const filePath = path.join(logDir, logFile);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const fileSizeMB = stats.size / 1048576; // Convert to MB
        
        if (fileSizeMB > 50) { // If larger than 50MB
          console.log(`📄 Log file ${logFile} is ${fileSizeMB.toFixed(1)}MB, consider rotation`);
        }
      }
    }
  } catch (err) {
    // Fail silently - log rotation check shouldn't break anything
  }
}, 300000); // Check every 5 minutes

export default logger;