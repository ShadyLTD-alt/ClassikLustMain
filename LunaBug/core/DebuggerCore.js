/**
 * LunaBug/core/DebuggerCore.js
 * 
 * The main orchestrator (bootstrapper) - STANDALONE SYSTEM
 * - Loads all modules/plugins in dependency order
 * - Provides shared lifecycle (init, start, stop)
 * - Keeps global context (shared state)
 * - Works independently of game systems
 * 
 * What it does:
 * ✅ Acts as entry point
 * ✅ Registers and initializes plugins in correct order
 * ✅ Provides error handling fallback
 * ✅ Emergency mode when game systems fail
 * ❌ Does not care about actual feature logic (that belongs to plugins)
 */

class DebuggerCore {
  constructor() {
    this.modules = [];
    this.context = {
      startTime: Date.now(),
      version: '1.0.0',
      standalone: true
    };
    this.isInitialized = false;
    this.logs = [];
    
    // Initialize logging immediately
    this.setupLogging();
  }

  setupLogging() {
    // Capture all console outputs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      this.logEvent('console_log', args.join(' '));
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      this.logEvent('console_error', args.join(' '));
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      this.logEvent('console_warn', args.join(' '));
      originalWarn.apply(console, args);
    };

    console.log('🌙 LunaBug logging system active');
  }

  logEvent(type, data, metadata = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      type,
      data,
      metadata: {
        source: 'lunabug_core',
        uptime: Date.now() - this.context.startTime,
        ...metadata
      }
    };

    this.logs.push(entry);
    
    // Keep last 2000 logs in memory
    if (this.logs.length > 2000) {
      this.logs = this.logs.slice(-2000);
    }

    // Persist critical events
    if (['console_error', 'module_error', 'game_crash'].includes(type)) {
      try {
        const criticalLogs = JSON.parse(localStorage.getItem('lunabug_critical') || '[]');
        localStorage.setItem('lunabug_critical', JSON.stringify([...criticalLogs.slice(-499), entry]));
      } catch (err) {
        // Silent fail - don't break if localStorage is full
      }
    }
  }

  register(module) {
    if (!module.name) {
      this.logEvent('module_error', 'Module must have a name property');
      return;
    }

    this.modules.push(module);
    this.logEvent('module_registered', module.name);
  }

  async initAll() {
    if (this.isInitialized) {
      this.logEvent('init_skip', 'Already initialized');
      return;
    }

    this.logEvent('init_start', `Initializing ${this.modules.length} modules`);
    
    for (const module of this.modules) {
      try {
        await module.init(this.context);
        this.logEvent('module_init_success', module.name);
      } catch (error) {
        this.logEvent('module_init_error', {
          module: module.name,
          error: error.message,
          stack: error.stack
        });
      }
    }

    this.isInitialized = true;
    this.logEvent('init_complete', 'All modules processed');
  }

  async runCommand(command, data = {}) {
    this.logEvent('command_start', { command, data });
    
    for (const module of this.modules) {
      try {
        if (module.run) {
          await module.run(command, data);
        }
      } catch (error) {
        this.logEvent('command_error', {
          module: module.name,
          command,
          error: error.message
        });
      }
    }

    this.logEvent('command_complete', command);
  }

  async stopAll() {
    this.logEvent('stop_start', 'Stopping all modules');
    
    for (const module of this.modules) {
      try {
        if (module.stop) {
          await module.stop();
          this.logEvent('module_stop_success', module.name);
        }
      } catch (error) {
        this.logEvent('module_stop_error', {
          module: module.name,
          error: error.message
        });
      }
    }

    this.isInitialized = false;
    this.logEvent('stop_complete', 'All modules stopped');
  }

  getContext() {
    return this.context;
  }

  setContext(key, value) {
    this.context[key] = value;
    this.logEvent('context_update', { key, value });
  }

  getLogs(filter = null) {
    if (filter) {
      return this.logs.filter(log => log.type.includes(filter));
    }
    return this.logs;
  }

  // Emergency methods for when game crashes
  emergencyDump() {
    const dump = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.context.startTime,
      modules: this.modules.map(m => m.name),
      recentLogs: this.logs.slice(-50),
      context: this.context
    };
    
    localStorage.setItem('lunabug_emergency_dump', JSON.stringify(dump));
    console.log('🚨 LunaBug emergency dump saved');
    return dump;
  }
}

export default DebuggerCore;