import { playerStateManager } from '../utils/playerStateManager';
import logger from '../logger';

// Graceful shutdown handler for JSON-first system
export function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    logger.info(`💾 ${signal} received, ensuring all player data is saved...`);
    
    try {
      // 🔧 FIX: Use new cleanup method with better timeout handling
      await playerStateManager.cleanup();
      
      logger.info('🎯 JSON-first system shutdown complete - all data safe in JSON snapshots');
      process.exit(0);
    } catch (error) {
      logger.error(`🔴 Error during graceful shutdown: ${error}`);
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
  
  // 🔧 FIX: Improved error handling without forcing shutdown
  process.on('uncaughtException', (error) => {
    logger.error('🔴 Uncaught exception:', error);
    
    // Try to save critical data before exit
    playerStateManager.cleanup().finally(() => {
      process.exit(1);
    });
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('🔴 Unhandled rejection at:', promise, 'reason:', reason);
    // Don't exit on promise rejections, just log them
  });
  
  logger.info('🛡️ Graceful shutdown handlers registered for JSON-first system');
}