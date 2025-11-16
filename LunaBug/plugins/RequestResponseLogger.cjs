// LunaBug/plugins/RequestResponseLogger/index.mjs

export class RequestResponseLogger {
  constructor(luna) {
    this.luna = luna;
    this.requestLog = [];
    this.errorLog = [];
    this.maxLogSize = 100; // Keep last 100 requests
  }

  async init() {
    console.log('📝 [RequestResponseLogger] Initializing...');
    
    // Hook into Express middleware
    this.luna.app.use((req, res, next) => {
      const startTime = Date.now();
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Log request
      const logEntry = {
        id: requestId,
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body,
        headers: {
          authorization: req.headers.authorization ? 'Bearer ***' : undefined,
          'content-type': req.headers['content-type']
        },
        timestamp: new Date().toISOString(),
        ip: req.ip
      };

      console.log(`📥 [${requestId}] ${req.method} ${req.path}`);

      // Capture response
      const originalSend = res.send;
      res.send = function(data) {
        const duration = Date.now() - startTime;
        
        logEntry.response = {
          status: res.statusCode,
          body: typeof data === 'string' ? data.substring(0, 200) : data,
          duration: `${duration}ms`
        };

        if (res.statusCode >= 400) {
          console.error(`❌ [${requestId}] ${res.statusCode} ${req.method} ${req.path} (${duration}ms)`);
          this.errorLog.push(logEntry);
        } else {
          console.log(`✅ [${requestId}] ${res.statusCode} ${req.method} ${req.path} (${duration}ms)`);
        }

        this.requestLog.push(logEntry);
        
        // Keep log size manageable
        if (this.requestLog.length > this.maxLogSize) {
          this.requestLog.shift();
        }
        if (this.errorLog.length > this.maxLogSize) {
          this.errorLog.shift();
        }

        return originalSend.call(this, data);
      }.bind(this);

      next();
    });
  }

  getRecentRequests(count = 20) {
    return this.requestLog.slice(-count);
  }

  getRecentErrors(count = 20) {
    return this.errorLog.slice(-count);
  }

  getRequestById(id) {
    return this.requestLog.find(log => log.id === id);
  }

  // Luna command
  async handleCommand(command, args) {
    if (command === 'requests') {
      const count = parseInt(args[0]) || 20;
      return this.getRecentRequests(count);
    }
    
    if (command === 'errors') {
      const count = parseInt(args[0]) || 20;
      return this.getRecentErrors(count);
    }

    if (command === 'request') {
      return this.getRequestById(args[0]);
    }
  }
}