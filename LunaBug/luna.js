// 🌙 Luna Bug - Intelligent Debug & Fix Assistant
// Purpose: Automatically detect and fix common game issues

import ChatInterface from './modules/chatInterface.js';
import SchemaAuditor from './plugins/schemaAuditor.js';

class LunaBug {
  constructor(config = {}) {
    this.name = 'Luna';
    this.version = '2.0.0';
    this.isActive = true;
    this.config = config;

    // Plugin system
    this.plugins = new Map();

    // Initialize core modules
    this.chat = new ChatInterface(this);

    // Initialize plugins
    this.loadPlugin('SchemaAuditor', SchemaAuditor);

    console.log('🌙 Luna Bug v2.0.0 initialized successfully');
    console.log('🎮 Active plugins:', Array.from(this.plugins.keys()));
  }

  loadPlugin(name, PluginClass) {
    try {
      const plugin = new PluginClass(this);
      this.plugins.set(name, plugin);
      console.log(`✅ Plugin loaded: ${name}`);
      return plugin;
    } catch (error) {
      console.error(`❌ Failed to load plugin ${name}:`, error);
      return null;
    }
  }

  getPlugin(name) {
    return this.plugins.get(name);
  }

  // 🔍 START ALL MONITORING
  async start() {
    console.log('👁️ Luna: Starting comprehensive monitoring...');
    
    // Start schema monitoring
    const schemaAuditor = this.getPlugin('SchemaAuditor');
    if (schemaAuditor && typeof schemaAuditor.startMonitoring === 'function') {
      await schemaAuditor.startMonitoring();
    }
    
    console.log('✅ Luna: All monitoring systems active');
  }

  // 🎮 COMMAND INTERFACE
  async handleCommand(command, args = []) {
    console.log(`🎮 Luna command: ${command}`, args);
    
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
    console.log('🧵 Luna: Running full system audit...');
    
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
    
    console.log('✅ Luna: Full audit completed');
    return results;
  }

  async attemptAutoFix(issue) {
    console.log('🔧 Luna: Auto-fixing issue:', issue);
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
    console.log(randomResponse, message);
    return randomResponse;
  }
}

// ✅ ESM DEFAULT EXPORT
export default LunaBug;