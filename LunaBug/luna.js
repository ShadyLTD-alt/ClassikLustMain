// 🌙 Luna Bug - Intelligent Debug & Fix Assistant
// 🔧 FIXED: Now uses Winston logger for unified logging
// Purpose: Automatically detect and fix common game issues

import ChatInterface from './modules/chatInterface.js';
import SchemaAuditor from './plugins/schemaAuditor.js';

class LunaBug {
  constructor(config = {}, logger = null) {
    this.name = 'Luna';
    this.version = '2.0.0';
    this.isActive = true;
    this.config = config;
    
    // ✅ NEW: Winston logger integration
    // Falls back to console if logger not provided
    this.logger = logger || {
      info: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      debug: console.log.bind(console)
    };

    // Plugin system
    this.plugins = new Map();

    // Initialize core modules (pass logger)
    this.chat = new ChatInterface(this, this.logger);

    // Initialize plugins (pass logger)
    this.loadPlugin('SchemaAuditor', SchemaAuditor);

    this.logger.info('🌙 Luna Bug v2.0.0 initialized with Winston logger');
    this.logger.info('🎮 Active plugins: ' + Array.from(this.plugins.keys()).join(', '));
  }

  loadPlugin(name, PluginClass) {
    try {
      const plugin = new PluginClass(this, this.logger);
      this.plugins.set(name, plugin);
      this.logger.info(`✅ Plugin loaded: ${name}`);
      return plugin;
    } catch (error) {
      this.logger.error(`❌ Failed to load plugin ${name}:`, error);
      return null;
    }
  }

  getPlugin(name) {
    return this.plugins.get(name);
  }

  // 🔍 START ALL MONITORING
  async start() {
    this.logger.info('👁️  Luna: Starting comprehensive monitoring...');
    
    // Start schema monitoring
    const schemaAuditor = this.getPlugin('SchemaAuditor');
    if (schemaAuditor && typeof schemaAuditor.startMonitoring === 'function') {
      await schemaAuditor.startMonitoring();
    }
    
    this.logger.info('✅ Luna: All monitoring systems active');
  }

  // 🎮 COMMAND INTERFACE
  async handleCommand(command, args = []) {
    this.logger.debug(`🎮 Luna command: ${command}`, args);
    
    switch (command) {
      case 'status':
        return this.getSystemStatus();
      case 'fix':
        return await this.attemptAutoFix(args[0]);
      case 'audit':
        return await this.runFullAudit();
      case 'chat.test':
        return await this.chat?.sendTestAlert();
      case 'chat.clear':
        return this.chat?.clearAlerts();
      default:
        return { error: 'Unknown command' };
    }
  }

  getSystemStatus() {
    const status = {
      luna: {
        name: this.name,
        version: this.version,
        active: this.isActive,
        uptime: process.uptime()
      },
      plugins: {},
      chat: this.chat?.getStatus() || null
    };
    
    // Get status from all plugins
    for (const [name, plugin] of this.plugins) {
      if (typeof plugin.getStatus === 'function') {
        status.plugins[name] = plugin.getStatus();
      }
    }
    
    return status;
  }

  async runFullAudit() {
    this.logger.info('🧵 Luna: Running full system audit...');
    
    const results = {
      schema: [],
      performance: [],
      security: []
    };
    
    // Run schema audit
    const schemaAuditor = this.getPlugin('SchemaAuditor');
    if (schemaAuditor && typeof schemaAuditor.auditSchema === 'function') {
      results.schema = await schemaAuditor.auditSchema();
    }
    
    this.logger.info('✅ Luna: Full audit completed');
    return results;
  }

  async attemptAutoFix(issue) {
    this.logger.info('🔧 Luna: Auto-fixing issue:', issue);
    return { fixed: false, message: 'Auto-fix not yet implemented for this issue' };
  }

  // 🌙 LUNA'S PERSONALITY RESPONSES
  respond(message) {
    const responses = [
      '🌙 Luna is on it!',
      '✨ Let me fix that for you!',
      '🔍 Analyzing the issue...',
      '🤖 Auto-fix mode activated!',
      '🎯 Target acquired, fixing now!'
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    this.logger.info(randomResponse, message);
    return randomResponse;
  }
}

// ✅ ESM DEFAULT EXPORT
export default LunaBug;