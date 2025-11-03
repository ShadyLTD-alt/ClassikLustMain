import { playerStateManager } from '../utils/playerStateManager';
import logger from '../logger';

// Graceful shutdown handler for JSON-first system
export function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    logger.info(`💾 ${signal} received, ensuring all player data is saved...`);
    
    try {
      // Get health check to see pending operations
      const health = await playerStateManager.healthCheck();
      
      if (health.pendingSyncs > 0) {
        logger.info(`⏳ Waiting for ${health.pendingSyncs} pending DB syncs to complete...`);
        
        // Wait up to 10 seconds for pending syncs
        let attempts = 0;
        while (attempts < 50) { // 50 * 200ms = 10 seconds max
          const currentHealth = await playerStateManager.healthCheck();
          if (currentHealth.pendingSyncs === 0) break;
          
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }
        
        const finalHealth = await playerStateManager.healthCheck();
        if (finalHealth.pendingSyncs > 0) {
          logger.warn(`⚠️ ${finalHealth.pendingSyncs} DB syncs still pending after timeout`);
        } else {
          logger.info('✅ All pending DB syncs completed');
        }
      }
      
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
  
  // Handle uncaught errors gracefully
  process.on('uncaughtException', (error) => {
    logger.error('🔴 Uncaught exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('🔴 Unhandled rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED_REJECTION');
  });
  
  logger.info('🛡️ Graceful shutdown handlers registered for JSON-first system');
}