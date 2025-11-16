// LunaBug/plugins/ErrorStackTracer/index.mjs

export class ErrorStackTracer {
  constructor(luna) {
    this.luna = luna;
    this.errorHistory = [];
    this.maxHistory = 50;
  }

  async init() {
    console.log('🔍 [ErrorStackTracer] Initializing...');
    
    // Global error handler
    this.luna.app.use((err, req, res, next) => {
      const errorEntry = this.captureError(err, req);
      
      console.error('\n❌ ========== ERROR CAUGHT ==========');
      console.error(`Request: ${req.method} ${req.path}`);
      console.error(`Error: ${err.message}`);
      console.error(`Stack:\n${err.stack}`);
      console.error('=====================================\n');

      res.status(500).json({
        success: false,
        error: err.message,
        errorId: errorEntry.id
      });
    });

    // Catch unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ [ErrorStackTracer] Unhandled Promise Rejection:', reason);
      this.errorHistory.push({
        id: Date.now(),
        type: 'unhandledRejection',
        reason: reason,
        promise: promise,
        timestamp: new Date().toISOString()
      });
    });
  }

  captureError(err, req) {
    const errorEntry = {
      id: Date.now(),
      message: err.message,
      stack: err.stack,
      request: {
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body,
        user: req.user?.username || 'anonymous'
      },
      timestamp: new Date().toISOString()
    };

    this.errorHistory.push(errorEntry);
    
    if (this.errorHistory.length > this.maxHistory) {
      this.errorHistory.shift();
    }

    return errorEntry;
  }

  getRecentErrors(count = 10) {
    return this.errorHistory.slice(-count);
  }

  getErrorById(id) {
    return this.errorHistory.find(e => e.id === id);
  }
}