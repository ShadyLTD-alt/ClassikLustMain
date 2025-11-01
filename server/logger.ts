import fs from "fs";
import path from "path";
import winston from "winston";

const logDir = path.resolve(process.cwd(), "logs");

// Ensure logs directory exists with better error handling
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log(`📁 Created logs directory: ${logDir}`);
  }
} catch (err) {
  console.error("❌ Failed to create logs directory:", err);
}

// Winston logger instance with fallback
let logger: winston.Logger;

try {
  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "debug",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      new winston.transports.File({
        filename: path.join(logDir, "server.log"),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5
      })
    ]
  });

  // Test write to confirm logger is working
  logger.info("🚀 Winston logger initialized successfully");
  
} catch (err) {
  console.error("❌ Winston logger failed to initialize:", err);
  
  // Fallback to console logger
  logger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug
  } as any;
}

// Capture unhandled errors
process.on("unhandledRejection", (reason: any) => {
  logger.error("💥 Unhandled Rejection", { reason });
});

process.on("uncaughtException", (err) => {
  logger.error("💥 Uncaught Exception", { err });
});

export default logger;