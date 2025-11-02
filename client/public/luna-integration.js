// 🌙 Luna Bug - Client Integration Script
// Load this in your HTML to enable Luna in browser console

(function() {
  console.log('🌙 Loading Luna Bug client integration...');
  
  // Luna's client-side interface
  class LunaBugClient {
    constructor() {
      this.version = '2.0.0';
      this.alerts = [];
      this.settings = {
        autoStart: true,
        debugMode: true
      };
      
      console.log('🌙 Luna Bug Client v2.0.0 ready');
    }
    
    // 🚨 RECEIVE ALERTS FROM SERVER
    receiveAlert(alertData) {
      this.alerts.push(alertData);
      
      // Format and display alert
      console.log(`\n🚨 ========== LUNA ALERT ==========`);
      console.log(`📊 Severity: ${alertData.severity}`);
      console.log(`🏷️ Type: ${alertData.metadata?.issueType || 'UNKNOWN'}`);
      console.log(`📝 Message:\n${alertData.content}`);
      
      if (alertData.actions && alertData.actions.length > 0) {
        console.log(`\n🎮 Available Actions:`);
        alertData.actions.forEach((action, i) => {
          console.log(`  ${i + 1}. ${this.formatActionName(action)}`);
        });
        
        console.log(`\n💡 To respond: lunaBug.respond('${alertData.id}', 'action_name')`);
      }
      
      console.log(`=====================================\n`);
      
      // Show browser notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🌙 Luna Alert', {
          body: alertData.content.substring(0, 100) + '...',
          icon: '/luna-icon.png'
        });
      }
    }
    
    formatActionName(action) {
      const actionNames = {
        'auto_fix': '🤖 Auto-Fix',
        'manual_steps': '📋 Manual Steps', 
        'ignore': '🙈 Ignore',
        'view_details': '🔍 Details',
        'run_diagnostic': '🧪 Diagnostic'
      };
      
      return actionNames[action] || action;
    }
    
    // 🎮 RESPOND TO ALERTS
    async respond(alertId, choice) {
      console.log(`🎮 Luna: Sending response - ${choice} for alert ${alertId}`);
      
      try {
        // Send response to server
        const response = await fetch('/api/luna/respond', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
          },
          body: JSON.stringify({
            alertId,
            choice,
            timestamp: new Date().toISOString()
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Luna response processed:', result);
          
          // Remove alert from local list
          this.alerts = this.alerts.filter(a => a.id !== alertId);
          
          return result;
        } else {
          throw new Error('Failed to send response to Luna');
        }
      } catch (error) {
        console.error('❌ Failed to respond to Luna:', error);
        return { error: error.message };
      }
    }
    
    // 📋 STATUS METHODS
    status() {
      return {
        version: this.version,
        activeAlerts: this.alerts.length,
        settings: this.settings,
        lastActivity: new Date().toISOString()
      };
    }
    
    showAlerts() {
      if (this.alerts.length === 0) {
        console.log('✅ No active alerts');
        return;
      }
      
      console.log(`🚨 Active Alerts (${this.alerts.length}):`);
      this.alerts.forEach((alert, i) => {
        console.log(`${i + 1}. [${alert.severity}] ${alert.metadata?.issueType || 'Unknown'} - ${alert.id}`);
      });
    }
    
    clearAlerts() {
      this.alerts = [];
      console.log('🧹 All alerts cleared');
    }
    
    // 💡 HELP
    help() {
      console.log(`\n🌙 ========== LUNA CLIENT HELP ==========`);
      console.log('📊 lunaBug.status()                   - Show Luna status');
      console.log('🚨 lunaBug.showAlerts()              - Show active alerts');
      console.log('🎮 lunaBug.respond(id, choice)        - Respond to alert');
      console.log('🧹 lunaBug.clearAlerts()             - Clear all alerts');
      console.log('💡 lunaBug.help()                    - Show this help');
      console.log(`\nExample: lunaBug.respond('test_123', 'auto_fix')`);
      console.log('=========================================\n');
    }
    
    // 🧪 TRIGGER MANUAL DIAGNOSTIC
    async runDiagnostic() {
      console.log('🧪 Requesting diagnostic from Luna server...');
      
      try {
        const response = await fetch('/api/luna/diagnostic', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Diagnostic completed:', result);
          return result;
        } else {
          throw new Error('Failed to run diagnostic');
        }
      } catch (error) {
        console.error('❌ Diagnostic request failed:', error);
        return { error: error.message };
      }
    }
  }
  
  // Initialize Luna globally
  window.lunaBug = new LunaBugClient();
  window.LunaBug = window.lunaBug; // Alias for consistency
  
  console.log('✅ Luna Bug client ready! Type "lunaBug.help()" for commands.');
  
  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  
})();

// 💡 QUICK ACCESS METHODS
const luna = {
  fix: (alertId) => window.lunaBug?.respond(alertId, 'auto_fix'),
  manual: (alertId) => window.lunaBug?.respond(alertId, 'manual_steps'),
  ignore: (alertId) => window.lunaBug?.respond(alertId, 'ignore'),
  status: () => window.lunaBug?.status(),
  help: () => window.lunaBug?.help()
};

// Make quick access available globally
if (typeof window !== 'undefined') {
  window.luna = luna;
  console.log('💡 Quick access: luna.fix(id), luna.manual(id), luna.ignore(id)');
}