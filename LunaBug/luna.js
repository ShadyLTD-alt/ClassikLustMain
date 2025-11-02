// 🌙 Luna Bug - Steven's AI Development Assistant
// Version: 2.0.0 - Now with Schema Auditing!

const SchemaAuditor = require('./plugins/schemaAuditor');
const ChatInterface = require('./modules/chatInterface');

class LunaBug {
  constructor() {
    this.version = '2.0.0';
    this.startTime = new Date();
    this.plugins = new Map();
    this.modules = new Map();
    
    console.log('🌙 LunaBug v2.0.0 initializing...');
    
    // Initialize core modules
    this.initializeCore();
    
    // Initialize chat interface
    this.chat = new ChatInterface(this);
    this.modules.set('ChatInterface', this.chat);
    
    // Initialize schema auditor
    this.schemaAuditor = new SchemaAuditor(this);
    this.plugins.set('SchemaAuditor', this.schemaAuditor);
    
    console.log('✅ LunaBug fully initialized');
  }

  initializeCore() {
    this.core = {
      logEvent: (event, data) => {
        const timestamp = new Date().toISOString();
        const logEntry = {
          timestamp,
          event,
          data,
          source: 'luna_core'
        };
        
        if (this.chat?.settings.verboseLogging) {
          console.log(`📈 Luna Event: ${event}`, data);
        }
        
        // Store in memory (could save to file/DB later)
        this.core.eventLog = this.core.eventLog || [];
        this.core.eventLog.push(logEntry);
        
        // Keep only last 1000 events
        if (this.core.eventLog.length > 1000) {
          this.core.eventLog.shift();
        }
      },
      
      getEventLog: (filter = null) => {
        if (!this.core.eventLog) return [];
        
        if (filter) {
          return this.core.eventLog.filter(log => 
            log.event.includes(filter) || 
            JSON.stringify(log.data).includes(filter)
          );
        }
        
        return this.core.eventLog;
      }
    };
  }

  // 🔌 PLUGIN MANAGEMENT
  getPlugin(name) {
    return this.plugins.get(name);
  }
  
  getModule(name) {
    return this.modules.get(name);
  }

  // 🚀 START LUNA'S MONITORING
  async start() {
    console.log('👁️ Luna: Starting monitoring systems...');
    
    try {
      // Start schema monitoring
      if (this.schemaAuditor) {
        await this.schemaAuditor.startMonitoring();
        console.log('✅ Schema auditing started');
      }
      
      // Send startup message
      await this.chat.sendMessage(
        '🌙 **Luna is now online!**\n\n' +
        'I\'m monitoring your game for:\n' +
        '• Database schema issues\n' +
        '• Missing fields and constraints\n' +
        '• Code/DB synchronization bugs\n\n' +
        'I\'ll alert you when I find problems and offer to fix them automatically! 🤖'
      );
      
      console.log('✅ Luna is fully operational!');
      
    } catch (error) {
      console.error('❌ Failed to start Luna:', error);
    }
  }

  // 📋 STATUS AND DIAGNOSTICS
  getStatus() {
    const uptime = Date.now() - this.startTime.getTime();
    
    return {
      luna: {
        version: this.version,
        uptime: Math.floor(uptime / 1000) + 's',
        status: 'OPERATIONAL'
      },
      plugins: Object.fromEntries(
        Array.from(this.plugins.entries()).map(([name, plugin]) => [
          name, 
          plugin.getStatus ? plugin.getStatus() : 'LOADED'
        ])
      ),
      modules: Object.fromEntries(
        Array.from(this.modules.entries()).map(([name, module]) => [
          name,
          module.getStatus ? module.getStatus() : 'LOADED'
        ])
      ),
      core: {
        eventLogSize: this.core?.eventLog?.length || 0,
        messageQueueSize: this.chat?.messageQueue?.length || 0
      }
    };
  }

  // 🧪 RUN MANUAL DIAGNOSTIC
  async runDiagnostic(type = 'full') {
    console.log(`🧪 Luna: Running ${type} diagnostic...`);
    
    const results = {
      timestamp: new Date().toISOString(),
      type,
      issues: [],
      summary: {}
    };
    
    try {
      if (type === 'schema' || type === 'full') {
        const schemaIssues = await this.schemaAuditor.auditSchema();
        results.issues.push(...schemaIssues);
        results.summary.schemaIssues = schemaIssues.length;
      }
      
      // Add more diagnostic types here later
      
      const totalIssues = results.issues.length;
      
      if (totalIssues > 0) {
        await this.chat.sendMessage(
          `🧪 **Diagnostic Complete**\n\n` +
          `Found ${totalIssues} issue${totalIssues > 1 ? 's' : ''}:\n` +
          results.issues.map(i => `• ${i.type}: ${i.description}`).join('\n') +
          `\n\nShall I start sending alerts for these issues?`,
          { actions: ['start_alerts', 'manual_review'] }
        );
      } else {
        await this.chat.sendMessage('✅ **All systems looking good!** No issues detected in diagnostic.');
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
      return { error: error.message };
    }
  }

  // 🔧 STEVEN'S CONTROL METHODS
  async toggleAutoFix() {
    const newState = this.schemaAuditor.toggleAutoFix();
    await this.chat.sendMessage(
      `🤖 Auto-fix is now **${newState ? 'ENABLED' : 'DISABLED'}**\n\n` +
      (newState 
        ? 'I\'ll automatically fix simple issues when detected.' 
        : 'I\'ll only provide manual instructions for issues.')
    );
    return newState;
  }

  async showActiveIssues() {
    const issues = this.schemaAuditor.getActiveIssues();
    
    if (issues.length === 0) {
      await this.chat.sendMessage('✅ **No active issues!** Everything looks good.');
      return;
    }
    
    let message = `🚨 **Active Issues (${issues.length}):**\n\n`;
    
    issues.forEach((issue, i) => {
      message += `**${i + 1}. ${issue.type}**\n`;
      message += `   Severity: ${issue.severity}\n`;
      message += `   ${issue.description}\n\n`;
    });
    
    await this.chat.sendMessage(message);
  }

  // 💡 HELPER FOR CONSOLE COMMANDS
  help() {
    console.log(`\n🌙 ========== LUNA COMMANDS ==========`);
    console.log('🚀 lunaBug.start()                    - Start monitoring');
    console.log('🧪 lunaBug.runDiagnostic()             - Run full diagnostic');
    console.log('🚨 lunaBug.showActiveIssues()          - Show current issues');
    console.log('🤖 lunaBug.toggleAutoFix()             - Toggle auto-fix mode');
    console.log('📊 lunaBug.getStatus()                - Get system status');
    console.log('🧪 lunaBug.chat.sendTestAlert()        - Send test alert');
    console.log('💬 lunaBug.chat.handleUserChoice(id, choice) - Respond to alerts');
    console.log('🧹 lunaBug.chat.clearAlerts()          - Clear all alerts');
    console.log('=======================================\n');
  }
}

// Export for both CommonJS and ESM
module.exports = LunaBug;
module.exports.default = LunaBug;
module.exports.LunaBug = LunaBug;

// Also export a named function for easier imports
module.exports.initLunaBug = () => new LunaBug();

// Export as default for ESM
if (typeof exports !== 'undefined') {
  exports.default = LunaBug;
  exports.LunaBug = LunaBug;
  exports.initLunaBug = () => new LunaBug();
}