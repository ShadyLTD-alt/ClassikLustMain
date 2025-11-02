/**
 * LunaBug/modules/DatabaseModule.js
 * 
 * Database monitoring and debugging module
 * - Tracks database connection health
 * - Monitors for schema/column naming issues
 * - Logs query performance and errors
 * - Independent of game database systems
 */

import DebugPlugin from '../core/DebugPlugin.js';

class DatabaseModule extends DebugPlugin {
  constructor() {
    super('Database');
    this.connected = false;
    this.queryLog = [];
    this.schemaIssues = [];
  }

  async init(context) {
    console.log(`🌙 [${this.name}] Initializing database monitoring...`);
    
    // Set up database connection monitoring
    this.setupConnectionMonitoring();
    
    // Set up query interception
    this.setupQueryLogging();
    
    context.database = {
      module: this,
      getConnectionStatus: () => this.connected,
      getSchemaIssues: () => this.schemaIssues,
      getQueryLog: () => this.queryLog.slice(-100) // Last 100 queries
    };
    
    return true;
  }

  setupConnectionMonitoring() {
    // Monitor for common database errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0];
      try {
        const response = await originalFetch(...args);
        
        // Monitor API calls to database endpoints
        if (typeof url === 'string' && (url.includes('/api/') || url.includes('/db/'))) {
          this.logQuery({
            url,
            method: args[1]?.method || 'GET',
            status: response.status,
            success: response.ok,
            timestamp: new Date().toISOString()
          });
          
          // Update connection status
          if (response.ok) {
            this.connected = true;
          } else if (response.status >= 500) {
            this.connected = false;
            this.detectSchemaIssues(url, response.status);
          }
        }
        
        return response;
      } catch (error) {
        this.logQuery({
          url,
          method: args[1]?.method || 'GET',
          error: error.message,
          success: false,
          timestamp: new Date().toISOString()
        });
        
        this.connected = false;
        throw error;
      }
    };
  }

  setupQueryLogging() {
    // Intercept console errors for database-related issues
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      
      // Detect common database issues
      if (message.includes('column') || message.includes('undefined') || message.includes('null')) {
        this.detectSchemaIssues(message);
      }
      
      if (message.includes('database') || message.includes('query') || message.includes('connection')) {
        this.logEvent('database_error', {
          message,
          args,
          timestamp: new Date().toISOString()
        });
      }
      
      originalError.apply(console, args);
    };
  }

  logQuery(queryData) {
    this.queryLog.push(queryData);
    
    // Keep last 500 queries
    if (this.queryLog.length > 500) {
      this.queryLog = this.queryLog.slice(-500);
    }
  }

  detectSchemaIssues(context, statusCode = null) {
    const issue = {
      timestamp: new Date().toISOString(),
      context,
      statusCode,
      type: 'unknown'
    };

    // Detect camelCase vs snake_case issues
    if (context.includes('avatarUrl') || context.includes('camelcase')) {
      issue.type = 'camelcase_snakecase_mismatch';
      console.warn('🚨 LunaBug detected: CAMELCASE/SNAKE_CASE MISMATCH!');
    }

    // Detect column not found issues
    if (context.includes('column') && context.includes('not found')) {
      issue.type = 'column_not_found';
    }

    // Detect foreign key issues
    if (context.includes('foreign key') || context.includes('constraint')) {
      issue.type = 'foreign_key_constraint';
    }

    this.schemaIssues.push(issue);
  }

  async run(command, data) {
    switch (command) {
      case 'status':
        console.log(`🌙 [${this.name}] Status: ${this.connected ? 'Connected' : 'Disconnected'}`);
        break;
        
      case 'clearCache':
        this.queryLog = [];
        this.schemaIssues = [];
        console.log(`🌙 [${this.name}] Cache cleared`);
        break;
        
      case 'reconnect':
        this.connected = true;
        console.log(`🌙 [${this.name}] Reconnected`);
        break;
        
      case 'logError':
        if (data?.message?.includes('avatarUrl') || data?.message?.includes('camelcase')) {
          console.error(`🌙 [${this.name}] SNAKE_CASE/CAMELCASE MISMATCH DETECTED!`);
          console.error(`🌙 [${this.name}] This is likely a database column naming issue`);
        }
        break;
        
      default:
        // Ignore unknown commands
        break;
    }
  }

  async stop() {
    console.log(`🌙 [${this.name}] Disconnecting...`);
    this.connected = false;
  }
}

export default DatabaseModule;