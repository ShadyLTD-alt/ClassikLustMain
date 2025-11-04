import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { syncAllGameData } from "./utils/dataLoader";
import { playerStateManager } from "./utils/playerStateManager";
import { setupGracefulShutdown } from "./middleware/playerStateShutdown";
import { PortManager } from "./utils/portManager"; // 🔧 NEW: Port conflict resolution
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import logger from "./logger";
import { quietApiLogger } from "./middleware/quietApiLogger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();

// Reduce API console spam
app.use(quietApiLogger);

app.use(express.json({
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// 🖼️ Serve uploads statically BEFORE any SPA fallback
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  fallthrough: false,
  index: false,
  maxAge: '1y'
}));

(async () => {
  try {
    console.log('🌙 ClassikLust server starting...');
    console.log(`🔍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // 🔧 ENHANCED: Resolve port conflicts automatically
    const preferredPort = parseInt(process.env.PORT || '5000', 10);
    let actualPort: number;
    
    try {
      actualPort = await PortManager.resolvePortConflict(preferredPort);
      console.log(`🎯 Using port: ${actualPort}`);
    } catch (error) {
      console.error('❌ Failed to resolve port conflict:', error);
      logger.error('Port resolution failed', { error: error instanceof Error ? error.message : 'Unknown' });
      process.exit(1);
    }
    
    // 🎯 Initialize game data (master configs)
    logger.info('🎯 JSON-FIRST: Initializing game systems...');
    console.log('🔄 Syncing game data from JSON files to memory...');
    await syncAllGameData();
    console.log('✅ Game data sync complete');
    
    // 🎯 JSON-FIRST: Initialize player state system
    logger.info('💾 Initializing JSON-first player state system...');
    const health = await playerStateManager.healthCheck();
    console.log('📈 Player State Health:', {
      playerFolders: health.playerFolders,
      playerJsonFiles: health.playerJsonFiles,
      cachedPlayers: health.cachedPlayers
    });
    logger.info('🎯 Player State Health:', health);
    
    // 🛑 Setup graceful shutdown for JSON safety
    setupGracefulShutdown();
    
    // Register all routes
    console.log('🔌 Registering API routes...');
    const server = await registerRoutes(app);
    
    // 🎯 Setup development/production environments
    if (app.get("env") === "development") {
      console.log('🔧 Setting up Vite development server...');
      await setupVite(app, server);
    } else {
      console.log('🏯 Setting up production static serving...');
      serveStatic(app);
    }
    
    // 🔧 ENHANCED: Better server startup with error handling
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${actualPort} suddenly became unavailable during startup`);
        logger.error('Port became unavailable during startup', { port: actualPort, error: error.message });
      } else {
        console.error('❌ Server error:', error);
        logger.error('Server startup error', { error: error.message });
      }
      process.exit(1);
    });
    
    server.listen(actualPort, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${actualPort}`);
      console.log(`🌐 Local: http://localhost:${actualPort}`);
      console.log(`🌍 Network: http://0.0.0.0:${actualPort}`);
      console.log('🎯 JSON-FIRST system active: Immediate JSON writes + async DB sync');
      console.log('💾 Player snapshots: main-gamedata/player-data/{telegramId}_{username}/player_{username}.json');
      console.log('🔍 Master data templates loaded from master-data/');
      console.log('🌙 Luna Learning System monitoring for error patterns');
      console.log('📦 Winston logging active in logs/ directory');
      console.log('🛑 Graceful shutdown enabled - player data safety guaranteed');
      
      logger.info('Server started successfully', { 
        port: actualPort, 
        env: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    logger.error('Server startup failed', { error: error instanceof Error ? error.message : 'Unknown' });
    process.exit(1);
  }
})();

// 🛑 Enhanced graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🚪 Received ${signal}, shutting down gracefully...`);
  logger.info(`Graceful shutdown initiated`, { signal });
  
  try {
    // Clean up player state manager
    await playerStateManager.cleanup();
    console.log('✅ Player state manager cleanup complete');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    logger.error('Cleanup error during shutdown', { error: error instanceof Error ? error.message : 'Unknown' });
  }
  
  console.log('🌙 Goodbye! ClassikLust server stopped.');
  logger.info('Server shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

// 🔧 Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled rejection', { reason, promise });
  gracefulShutdown('UNHANDLED_REJECTION');
});