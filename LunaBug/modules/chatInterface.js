// 💬 Luna's Chat Interface Module
// Purpose: Handle communication with Steven for alerts, fixes, and debugging

class ChatInterface {
  constructor(lunaBug) {
    this.lunaBug = lunaBug;
    this.name = 'ChatInterface';
    this.version = '1.0.0';
    
    // Message queue for alerts
    this.messageQueue = [];
    this.isProcessing = false;
    
    // User preference settings
    this.settings = {
      autoAlerts: true,
      alertCooldown: 60000, // 1 minute between similar alerts
      verboseLogging: true
    };
    
    console.log('💬 Luna Chat Interface initialized');
  }

  // 🚨 SEND ISSUE ALERT WITH ACTION BUTTONS
  async sendAlert({ type, severity, message, actions, issueId }) {
    const alertData = {
      id: issueId,
      type: 'ISSUE_ALERT',
      timestamp: new Date().toISOString(),
      severity,
      content: message,
      actions: actions || [],
      metadata: { issueType: type }
    };
    
    // Add to message queue
    this.messageQueue.push(alertData);
    
    // Log to console immediately
    console.log(`\n🚨 ========== LUNA ALERT ==========`);
    console.log(`📊 Severity: ${severity}`);
    console.log(`🏷️ Type: ${type}`);
    console.log(`📝 Message:\n${message}`);
    
    if (actions.length > 0) {
      console.log(`🎮 Available Actions:`);
      actions.forEach((action, i) => {
        console.log(`  ${i + 1}. ${this.formatActionName(action)}`);
      });
      
      console.log(`\n💡 To respond: lunaBug.chat.handleUserChoice('${issueId}', 'action_name')`);
    }
    
    console.log(`=====================================\n`);
    
    // Process the queue
    if (!this.isProcessing) {
      this.processMessageQueue();
    }
    
    return alertData;
  }

  formatActionName(action) {
    const actionNames = {
      'auto_fix': '🤖 Auto-Fix (Let Luna handle it)',
      'manual_steps': '📋 Manual Steps (I will do it myself)',
      'ignore': '🙈 Ignore for now',
      'view_details': '🔍 Show more details',
      'run_diagnostic': '🧪 Run diagnostic'
    };
    
    return actionNames[action] || action;
  }

  // 📨 SEND REGULAR MESSAGE
  async sendMessage(message, options = {}) {
    const messageData = {
      id: 'msg_' + Date.now(),
      type: 'MESSAGE',
      timestamp: new Date().toISOString(),
      content: message,
      actions: options.actions || [],
      metadata: options.metadata || {}
    };
    
    this.messageQueue.push(messageData);
    
    console.log(`\n💬 ========== LUNA MESSAGE ==========`);
    console.log(`📝 ${message}`);
    
    if (options.actions && options.actions.length > 0) {
      console.log(`🎮 Actions: ${options.actions.join(', ')}`);
    }
    
    console.log(`===================================\n`);
    
    return messageData;
  }

  // 📋 PROCESS MESSAGE QUEUE
  async processMessageQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      
      // Here you could integrate with:
      // - Telegram API for Telegram notifications
      // - WebSocket for real-time web notifications
      // - Discord API for Discord alerts
      // - Email API for email notifications
      
      // For now, we'll just log and store
      await this.storeMessage(message);
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    this.isProcessing = false;
  }

  async storeMessage(message) {
    // Store in Luna's memory/logs for tracking
    if (this.lunaBug?.core?.logEvent) {
      this.lunaBug.core.logEvent('luna_chat_message', {
        messageId: message.id,
        type: message.type,
        severity: message.severity,
        actions: message.actions
      });
    }
  }

  // 🎮 HANDLE USER CHOICES
  async handleUserChoice(issueId, choice) {
    console.log(`🎮 Luna received user choice: ${choice} for issue: ${issueId}`);
    
    // Find the schema auditor plugin
    const schemaAuditor = this.lunaBug.getPlugin('SchemaAuditor');
    if (schemaAuditor && schemaAuditor.handleUserChoice) {
      return await schemaAuditor.handleUserChoice(issueId, choice);
    }
    
    return { error: 'SchemaAuditor plugin not found' };
  }

  // 🔧 UTILITY METHODS FOR STEVEN
  
  // Get recent alerts
  getRecentAlerts(limit = 10) {
    return this.messageQueue.slice(-limit);
  }
  
  // Clear all alerts
  clearAlerts() {
    this.messageQueue = [];
    console.log('🧹 Luna: Cleared all alerts');
  }
  
  // Send custom test alert
  async sendTestAlert() {
    await this.sendAlert({
      type: 'TEST_ALERT',
      severity: 'LOW',
      message: '🧪 **Test Alert**\n\nThis is a test of Luna\'s alert system!\n\nEverything is working correctly.',
      actions: ['auto_fix', 'manual_steps', 'ignore'],
      issueId: 'test_' + Date.now()
    });
  }
  
  // Update settings
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    console.log('⚙️ Luna chat settings updated:', this.settings);
    return this.settings;
  }
  
  // Get current status
  getStatus() {
    return {
      module: this.name,
      version: this.version,
      settings: this.settings,
      queueLength: this.messageQueue.length,
      isProcessing: this.isProcessing,
      lastActivity: new Date().toISOString()
    };
  }
}

export default ChatInterface;