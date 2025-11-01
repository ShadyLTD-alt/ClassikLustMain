
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console(),
  
  // Error logs
  new DailyRotateFile({
    filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxFiles: '14d',
    maxSize: '20m',
  }),
  
  // All logs
  new DailyRotateFile({
    filename: path.join(__dirname, '../../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '20m',
  }),
  
  // MCP-specific logs for Perplexity
  new DailyRotateFile({
    filename: path.join(__dirname, '../../logs/mcp-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    maxFiles: '30d',
    maxSize: '50m',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
});

// MCP-specific logger
export const mcpLogger = {
  logRequest: (method: string, params: any) => {
    logger.info(`[MCP] Request: ${method}`, { params });
  },
  logResponse: (method: string, result: any) => {
    logger.info(`[MCP] Response: ${method}`, { result });
  },
  logError: (method: string, error: any) => {
    logger.error(`[MCP] Error: ${method}`, { error: error.message, stack: error.stack });
  },
};

export default logger;
