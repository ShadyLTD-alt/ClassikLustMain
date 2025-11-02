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
 * ❌ Does not hijack console (causes spam)
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
    this.maxLogs = 500; // Reduced from 2000
    
    console.log('🌙 LunaBug Core initialized - clean logging mode');
  }

  // Clean logging - no console hijacking
  logEvent(type, data, metadata = {}) {
    const entry = {
      timestamp: Date.now(),
      type,
      data,
      metadata: {
        source: 'lunabug_core',
        uptime: Date.now() - this.context.startTime,
        ...metadata
      }
    };

    this.logs.push(entry);
    
    // Keep reasonable log limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Only persist critical events - NO SPAM
    if (['module_error', 'game_crash', 'emergency_mode'].includes(type)) {
      try {
        const criticalLogs = JSON.parse(localStorage.getItem('lunabug_critical') || '[]');
        localStorage.setItem('lunabug_critical', JSON.stringify([...criticalLogs.slice(-99), entry]));
      } catch (err) {
        // Silent fail - don't break if localStorage is full
      }
    }
  }

  register(module) {
    if (!module.name) {
      console.warn('🌙 Module must have a name property');
      return;
    }

    this.modules.push(module);
    console.log(`🌙 [${module.name}] Registered`);
  }

  async initAll() {
    if (this.isInitialized) {
      console.log('🌙 Already initialized');
      return;
    }

    console.log(`🌙 Initializing ${this.modules.length} modules...`);
    
    for (const module of this.modules) {
      try {
        console.log(`🌙 [${module.name}] Initializing...`);
        await module.init(this.context);
        console.log(`🌙 [${module.name}] ✅ Initialized`);
      } catch (error) {
        console.error(`🌙 [${module.name}] ❌ Init failed:`, error.message);
        this.logEvent('module_init_error', {
          module: module.name,
          error: error.message,
          stack: error.stack
        });
      }
    }

    this.isInitialized = true;
    console.log('🌙 ✅ All modules processed');
  }

  async runCommand(command, data = {}) {
    console.log(`🌙 Running command: ${command}`);
    
    for (const module of this.modules) {
      try {
        if (module.run) {
          await module.run(command, data);
        }
      } catch (error) {
        console.error(`🌙 [${module.name}] Command '${command}' failed:`, error.message);
        this.logEvent('command_error', {
          module: module.name,
          command,
          error: error.message
        });
      }
    }
  }

  async stopAll() {
    console.log('🌙 Stopping all modules...');
    
    for (const module of this.modules) {
      try {
        if (module.stop) {
          await module.stop();
          console.log(`🌙 [${module.name}] Stopped`);
        }
      } catch (error) {
        console.error(`🌙 [${module.name}] Stop failed:`, error.message);
      }
    }

    this.isInitialized = false;
    console.log('🌙 All modules stopped');
  }

  getContext() {
    return this.context;
  }

  setContext(key, value) {
    this.context[key] = value;
    // Only log important context changes
    if (['ai', 'functions', 'database'].includes(key)) {
      console.log(`🌙 Context updated: ${key}`);
    }
  }

  getLogs(filter = null, limit = 50) {
    let filtered = filter ? this.logs.filter(log => log.type.includes(filter)) : this.logs;
    return filtered.slice(-limit); // Return recent logs only
  }

  // Emergency methods for when game crashes
  emergencyDump() {
    const dump = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.context.startTime,
      modules: this.modules.map(m => ({ name: m.name, initialized: !!m.context })),
      recentErrors: this.logs.filter(log => log.type.includes('error')).slice(-10),
      context: {
        version: this.context.version,
        standalone: this.context.standalone,
        modulesLoaded: Object.keys(this.context).filter(k => k !== 'startTime')
      }
    };
    
    try {
      localStorage.setItem('lunabug_emergency_dump', JSON.stringify(dump));
      console.log('🚨 LunaBug emergency dump saved');
    } catch (err) {
      console.error('🚨 Failed to save emergency dump:', err.message);
    }
    return dump;
  }

  // Get clean status without spam
  getStatus() {
    return {
      version: this.context.version,
      uptime: Math.round((Date.now() - this.context.startTime) / 1000),
      modules: this.modules.length,
      initialized: this.isInitialized,
      logs: this.logs.length,
      recentErrors: this.logs.filter(log => log.type.includes('error')).length
    };
  }
}

export default DebuggerCore;