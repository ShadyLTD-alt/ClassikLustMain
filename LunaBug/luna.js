// 🌙 Luna Bug - Intelligent Debug & Fix Assistant
// ✨ NEW: Now includes CLI commands for quick diagnostics
// Purpose: Automatically detect and fix common game issues

import ChatInterface from './modules/chatInterface.js';
import SchemaAuditor from './plugins/schemaAuditor.js';
//import ErrorQueue from './plugins/errorQueue.js';
import fs from 'fs';
import path from 'path';

class LunaBug {
  constructor(config = {}, logger = null) {
    this.name = 'Luna';
    this.version = '2.0.0';
    this.isActive = true;
    this.config = config;
    
    // ✅ Winston logger integration
    this.logger = logger || {
      info: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      debug: console.log.bind(console)
    };

    // Plugin system
    this.plugins = new Map();

    // Initialize core modules
    this.chat = new ChatInterface(this, this.logger);

    // Initialize plugins
    this.loadPlugin('SchemaAuditor', SchemaAuditor);
 //   this.loadPlugin('ErrorQueue', ErrorQueue);
    

    // ✨ NEW: Initialize CLI commands interface
    this.cli = this.createCliCommands();

    this.logger.info('🌙 Luna Bug v2.0.0 initialized with Winston logger + CLI');
    this.logger.info('🎮 Active plugins: ' + Array.from(this.plugins.keys()).join(', '));
    this.logger.info('💻 CLI commands: Type luna.cli.help() for available commands');
  }

  // ✨ Create CLI commands interface
  createCliCommands() {
    const luna = this;
    const logger = this.logger;
    
    return {
      // 🐞 Status check
      status: () => {
        logger.info('🌙 [CLI] Checking system status...');
        const status = luna.getSystemStatus();
        
        logger.info('\n========== LUNA SYSTEM STATUS ==========');
        logger.info(`Name: ${status.luna.name}`);
        logger.info(`Version: ${status.luna.version}`);
        logger.info(`Active: ${status.luna.active}`);
        logger.info(`Uptime: ${Math.floor(status.luna.uptime / 60)} minutes`);
        logger.info('\nPlugins:');
        Object.entries(status.plugins).forEach(([name, pluginStatus]) => {
          logger.info(`  - ${name}: ${JSON.stringify(pluginStatus)}`);
        });
        if (status.chat) {
          logger.info('\nChat:');
          logger.info(`  Active alerts: ${status.chat.alertCount || 0}`);
        }
        logger.info('========================================\n');
        return status;
      },
      
      // 🧪 Full diagnostic
      diagnose: async () => {
        logger.info('🧪 [CLI] Running full system diagnostic...');
        const results = await luna.runFullAudit();
        
        logger.info('\n========== DIAGNOSTIC RESULTS ==========');
        if (results.schema && results.schema.length > 0) {
          logger.info(`\n⚠️  Schema Issues: ${results.schema.length}`);
          results.schema.forEach((issue, idx) => {
            logger.warn(`  ${idx + 1}. [${issue.severity}] ${issue.message}`);
          });
        } else {
          logger.info('\n✅ Schema: No issues');
        }
        logger.info('========================================\n');
        return results;
      },
      
      // 📝 Check logs
      logs: (lines = 20) => {
        logger.info(`📝 [CLI] Fetching last ${lines} log entries...`);
        try {
          const logPath = path.join(process.cwd(), 'logs', 'combined.log');
          const logContent = fs.readFileSync(logPath, 'utf8');
          const logLines = logContent.split('\n').filter(line => line.trim());
          const recentLogs = logLines.slice(-lines);
          logger.info('\n========== RECENT LOGS ==========');
          recentLogs.forEach(line => logger.info(line));
          logger.info('=================================\n');
          return recentLogs;
        } catch (err) {
          logger.error('❌ Failed to read log file:', err.message);
          return [];
        }
      },
      
      // 🚨 Check errors
      errors: (lines = 10) => {
        logger.info(`🚨 [CLI] Fetching last ${lines} errors...`);
        try {
          const errorPath = path.join(process.cwd(), 'logs', 'error.log');
          const errorContent = fs.readFileSync(errorPath, 'utf8');
          const errorLines = errorContent.split('\n').filter(line => line.trim());
          const recentErrors = errorLines.slice(-lines);
          if (recentErrors.length === 0) {
            logger.info('\n✅ No recent errors!\n');
            return [];
          }
          logger.info('\n========== RECENT ERRORS ==========');
          recentErrors.forEach(line => logger.error(line));
          logger.info('===================================\n');
          return recentErrors;
        } catch (err) {
          logger.error('❌ Failed to read error log:', err.message);
          return [];
        }
      },
      
      // 🔌 Check plugins
      plugins: () => {
        logger.info('🔌 [CLI] Checking plugin status...');
        logger.info('\n========== PLUGIN STATUS ==========');
        const pluginNames = Array.from(luna.plugins.keys());
        if (pluginNames.length === 0) {
          logger.warn('No plugins loaded');
        } else {
          pluginNames.forEach(name => {
            const plugin = luna.getPlugin(name);
            const status = plugin.getStatus ? plugin.getStatus() : 'Active';
            logger.info(`  ✅ ${name}: ${typeof status === 'object' ? JSON.stringify(status) : status}`);
          });
        }
        logger.info('===================================\n');
        return pluginNames;
      },
      
      // 🧪 Force audit
      audit: async () => {
        logger.info('🧪 [CLI] Running schema audit...');
        const schemaAuditor = luna.getPlugin('SchemaAuditor');
        if (!schemaAuditor) {
          logger.error('❌ SchemaAuditor plugin not loaded');
          return null;
        }
        const issues = await schemaAuditor.auditSchema();
        logger.info('\n========== AUDIT RESULTS ==========');
        if (issues.length === 0) {
          logger.info('✅ No schema issues found!');
        } else {
          logger.warn(`Found ${issues.length} issues:`);
          issues.forEach((issue, idx) => {
            logger.warn(`  ${idx + 1}. [${issue.severity}] ${issue.message}`);
          });
        }
        logger.info('===================================\n');
        return issues;
      },
      
      // 📊 Health check
      health: () => {
        logger.info('📊 [CLI] Running health check...');
        const health = {
          luna: luna.isActive,
          plugins: luna.plugins.size,
          chat: !!luna.chat,
          uptime: Math.floor(process.uptime() / 60)
        };
        logger.info('\n========== HEALTH CHECK ==========');
        logger.info(`Luna Active: ${health.luna ? '✅ Yes' : '❌ No'}`);
        logger.info(`Plugins: ${health.plugins}`);
        logger.info(`Chat: ${health.chat ? '✅ Ready' : '❌ Not Available'}`);
        logger.info(`Uptime: ${health.uptime} min`);
        logger.info('==================================\n');
        return health;
      },
      
      // 📝 Help
      help: () => {
        logger.info('\n🌙 ========== LUNA CLI COMMANDS ==========');
        logger.info('\nAvailable commands:');
        logger.info('  luna.cli.status()     - Show system status');
        logger.info('  luna.cli.diagnose()   - Run full diagnostic');
        logger.info('  luna.cli.logs(n)      - Show last n logs (default: 20)');
        logger.info('  luna.cli.errors(n)    - Show last n errors (default: 10)');
        logger.info('  luna.cli.plugins()    - List plugins');
        logger.info('  luna.cli.audit()      - Force schema audit');
        logger.info('  luna.cli.health()     - Quick health check');
        logger.info('  luna.cli.help()       - Show this help');
        logger.info('\n==========================================\n');
      }
    };
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
    this.logger.info('💻 Type luna.cli.help() in console for available commands');
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