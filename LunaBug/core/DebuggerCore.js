/**
 * LunaBug/core/DebuggerCore.js
 * 
 * 🌙 Luna-Enhanced Debugger Core - INTELLIGENT ERROR LEARNING
 * - Loads all modules/plugins in dependency order
 * - Integrates Luna's learned error patterns for active analysis
 * - Provides advanced error prevention and auto-fixing
 * - Works independently of game systems but learns from them
 */

class DebuggerCore {
  constructor() {
    this.modules = [];
    this.context = {
      startTime: Date.now(),
      version: '2.0.0-luna', // Updated with Luna integration
      standalone: true,
      lunaLearningActive: false
    };
    this.isInitialized = false;
    this.logs = [];
    this.maxLogs = 500;
    this.lunaLearning = null; // Will hold Luna intelligent learning module
    
    console.log('🌙 Luna-Enhanced LunaBug Core initialized');
    this.initializeLunaLearning();
  }

  // 🌙 Initialize Luna's intelligent learning system
  async initializeLunaLearning() {
    try {
      // Dynamic import of Luna learning module
      const { default: IntelligentErrorLearning } = await import('../modules/intelligentErrorLearning.js');
      this.lunaLearning = new IntelligentErrorLearning(this);
      this.context.lunaLearningActive = true;
      
      console.log('✅ Luna Intelligent Learning integrated into LunaBug Core');
      
      // Add Luna as a module
      this.register({
        name: 'Luna_Learning',
        init: async (context) => {
          context.luna = this.lunaLearning;
          console.log('🌙 Luna learning module initialized');
        },
        run: async (command, data) => {
          if (command === 'analyze_error' && this.lunaLearning) {
            return this.lunaLearning.analyzeLearned(data.error, data.context);
          }
          if (command === 'auto_fix' && this.lunaLearning) {
            return this.lunaLearning.autoFix(data.error, data.context);
          }
        }
      });
      
    } catch (error) {
      console.warn('🌙 Could not load Luna learning module:', error.message);
      this.context.lunaLearningActive = false;
    }
  }

  // 🌙 Enhanced error analysis with Luna integration
  analyzeError(error, context = {}) {
    const errorData = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      type: error.constructor?.name || 'Error',
      timestamp: Date.now()
    };
    
    // Try Luna's intelligent analysis first
    if (this.lunaLearning) {
      const lunaAnalysis = this.lunaLearning.analyzeLearned(error, context);
      if (lunaAnalysis) {
        console.log('✅ Luna recognized error pattern:', lunaAnalysis.category);
        
        this.logEvent('luna_analysis', {
          error: errorData,
          analysis: lunaAnalysis,
          context
        });
        
        return {
          ...lunaAnalysis,
          source: 'Luna Learning System',
          confidence: 'HIGH',
          learningApplied: true
        };
      }
    }
    
    // Fallback to basic analysis
    return this.basicErrorAnalysis(error, context);
  }

  // Basic error analysis for unknown patterns
  basicErrorAnalysis(error, context) {
    const patterns = {
      network: /fetch|network|timeout|connection/i,
      permission: /permission|unauthorized|forbidden/i,
      syntax: /syntax|unexpected token|parse/i,
      type: /cannot read property|undefined|null/i
    };
    
    for (const [category, pattern] of Object.entries(patterns)) {
      if (pattern.test(error.message || '')) {
        return {
          category: category.charAt(0).toUpperCase() + category.slice(1) + ' Error',
          severity: 'MEDIUM',
          solution: `Check ${category} related code and configurations`,
          learningApplied: false
        };
      }
    }
    
    return {
      category: 'Unknown Error',
      severity: 'LOW',
      solution: 'Check logs for more details',
      learningApplied: false
    };
  }

  // Clean logging - enhanced with Luna integration
  logEvent(type, data, metadata = {}) {
    const entry = {
      timestamp: Date.now(),
      type,
      data,
      metadata: {
        source: 'lunabug_core',
        uptime: Date.now() - this.context.startTime,
        lunaActive: this.context.lunaLearningActive,
        ...metadata
      }
    };

    this.logs.push(entry);
    
    // 🌙 Let Luna learn from error events
    if (type.includes('error') && this.lunaLearning && data.error) {
      this.lunaLearning.learnFromNewPattern(data.error, data.context || {}, data.analysis);
    }
    
    // Keep reasonable log limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Only persist critical events
    if (['module_error', 'game_crash', 'emergency_mode', 'luna_analysis'].includes(type)) {
      try {
        const criticalLogs = JSON.parse(localStorage.getItem('lunabug_critical') || '[]');
        localStorage.setItem('lunabug_critical', JSON.stringify([...criticalLogs.slice(-99), entry]));
      } catch (err) {
        // Silent fail
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
        
        // 🌙 Analyze initialization errors with Luna
        const analysis = this.analyzeError(error, { module: module.name, phase: 'initialization' });
        
        this.logEvent('module_init_error', {
          module: module.name,
          error: {
            message: error.message,
            stack: error.stack
          },
          analysis
        });
      }
    }

    this.isInitialized = true;
    console.log('🌙 ✅ All modules processed with Luna learning active');
  }

  async runCommand(command, data = {}) {
    console.log(`🌙 Running command: ${command}`);
    
    // 🌙 Special Luna commands
    if (command.startsWith('luna_')) {
      return this.handleLunaCommand(command, data);
    }
    
    for (const module of this.modules) {
      try {
        if (module.run) {
          await module.run(command, data);
        }
      } catch (error) {
        console.error(`🌙 [${module.name}] Command '${command}' failed:`, error.message);
        
        // 🌙 Analyze command errors
        const analysis = this.analyzeError(error, { module: module.name, command, data });
        
        this.logEvent('command_error', {
          module: module.name,
          command,
          error: {
            message: error.message,
            stack: error.stack
          },
          analysis
        });
      }
    }
  }

  // 🌙 Handle Luna-specific commands
  async handleLunaCommand(command, data) {
    if (!this.lunaLearning) {
      return { error: 'Luna learning not available' };
    }
    
    switch (command) {
      case 'luna_analyze':
        return this.lunaLearning.analyzeLearned(data.error, data.context);
      case 'luna_auto_fix':
        return this.lunaLearning.autoFix(data.error, data.context);
      case 'luna_stats':
        return this.lunaLearning.getStats();
      case 'luna_prevention_scan':
        return this.lunaLearning.core?.runPreventionScan ? this.lunaLearning.core.runPreventionScan() : null;
      default:
        return { error: 'Unknown Luna command' };
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
    if (['ai', 'functions', 'database', 'luna'].includes(key)) {
      console.log(`🌙 Context updated: ${key}`);
    }
  }

  getLogs(filter = null, limit = 50) {
    let filtered = filter ? this.logs.filter(log => log.type.includes(filter)) : this.logs;
    return filtered.slice(-limit);
  }

  // Emergency methods enhanced with Luna
  emergencyDump() {
    const dump = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.context.startTime,
      modules: this.modules.map(m => ({ name: m.name, initialized: !!m.context })),
      recentErrors: this.logs.filter(log => log.type.includes('error')).slice(-10),
      lunaStats: this.lunaLearning ? this.lunaLearning.getStats() : null,
      context: {
        version: this.context.version,
        standalone: this.context.standalone,
        lunaActive: this.context.lunaLearningActive,
        modulesLoaded: Object.keys(this.context).filter(k => k !== 'startTime')
      }
    };
    
    try {
      localStorage.setItem('lunabug_emergency_dump', JSON.stringify(dump));
      console.log('😨 LunaBug emergency dump saved with Luna data');
    } catch (err) {
      console.error('😨 Failed to save emergency dump:', err.message);
    }
    return dump;
  }

  // Enhanced status with Luna information
  getStatus() {
    return {
      version: this.context.version,
      uptime: Math.round((Date.now() - this.context.startTime) / 1000),
      modules: this.modules.length,
      initialized: this.isInitialized,
      logs: this.logs.length,
      recentErrors: this.logs.filter(log => log.type.includes('error')).length,
      luna: {
        active: this.context.lunaLearningActive,
        stats: this.lunaLearning ? this.lunaLearning.getStats() : null
      }
    };
  }
}

export default DebuggerCore;