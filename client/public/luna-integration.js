// 🌙 Luna Bug - Client Integration Script
// This script provides browser console access to Luna functionality

(function() {
  'use strict';
  
  console.log('🌙 Luna Bug client integration loading...');
  
  // Global Luna interface object
  const lunaBugInterface = {
    version: '2.0.0',
    connected: false,
    
    // 🆘 Help command
    help() {
      console.log(`\n🌙 ========== LUNA BUG COMMANDS ==========`);
      console.log('🚀 lunaBug.status()              - Check Luna status');
      console.log('🩺 lunaBug.runDiagnostic()       - Run schema diagnostic');
      console.log('🚨 lunaBug.showAlerts()          - Show active issues');
      console.log('🤖 lunaBug.toggleAutoFix()       - Toggle auto-fix mode');
      console.log('💬 lunaBug.respond(id, choice)   - Respond to alerts');
      console.log('🧹 lunaBug.clearAlerts()         - Clear all alerts');
      console.log('=======================================\n');
    },
    
    // 📊 Get Luna status
    async status() {
      try {
        console.log('🔍 Checking Luna status...');
        const response = await fetch('/api/luna/status', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const status = await response.json();
        console.log('🌙 Luna Status:', status);
        return status;
      } catch (error) {
        console.error('❌ Failed to get Luna status:', error.message);
        return null;
      }
    },
    
    // 🩺 Run diagnostic
    async runDiagnostic(type = 'full') {
      try {
        console.log(`🩺 Running ${type} diagnostic...`);
        const response = await fetch('/api/luna/diagnostic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
          },
          body: JSON.stringify({ type })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('🩺 Diagnostic Results:', result);
        
        if (result.diagnostic?.issues?.length > 0) {
          console.log('\n🚨 ========== ISSUES FOUND ==========');
          result.diagnostic.issues.forEach((issue, i) => {
            console.log(`${i + 1}. ${issue.type} (${issue.severity})`);
            console.log(`   ${issue.description}`);
            if (issue.id) {
              console.log(`   💡 Fix: lunaBug.respond('${issue.id}', 'auto_fix')`);
            }
          });
          console.log('=====================================\n');
        } else {
          console.log('✅ No issues found!');
        }
        
        return result;
      } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
        return null;
      }
    },
    
    // 🚨 Show active alerts
    async showAlerts() {
      try {
        console.log('🚨 Fetching active alerts...');
        const response = await fetch('/api/luna/alerts', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('🚨 Active Alerts:', data);
        
        if (data.alerts?.length > 0) {
          console.log('\n🚨 ========== ACTIVE ALERTS ==========');
          data.alerts.forEach((alert, i) => {
            console.log(`${i + 1}. ${alert.type} (${alert.severity})`);
            console.log(`   ${alert.description}`);
            if (alert.id) {
              console.log(`   💡 Respond: lunaBug.respond('${alert.id}', 'auto_fix')`);
            }
          });
          console.log('======================================\n');
        } else {
          console.log('✅ No active alerts!');
        }
        
        return data;
      } catch (error) {
        console.error('❌ Failed to get alerts:', error.message);
        return null;
      }
    },
    
    // 🤖 Toggle auto-fix mode
    async toggleAutoFix() {
      try {
        console.log('🤖 Toggling auto-fix mode...');
        const response = await fetch('/api/luna/toggle-autofix', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`🤖 Auto-fix is now: ${result.autoFixEnabled ? 'ENABLED' : 'DISABLED'}`);
        return result;
      } catch (error) {
        console.error('❌ Failed to toggle auto-fix:', error.message);
        return null;
      }
    },
    
    // 💬 Respond to alert
    async respond(alertId, choice) {
      try {
        console.log(`💬 Responding to alert ${alertId} with: ${choice}`);
        const response = await fetch('/api/luna/respond', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
          },
          body: JSON.stringify({ alertId, choice })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('💬 Response processed:', result);
        return result;
      } catch (error) {
        console.error('❌ Failed to respond to alert:', error.message);
        return null;
      }
    },
    
    // 🧹 Clear all alerts
    async clearAlerts() {
      console.log('🧹 Feature coming soon - clear alerts');
      // TODO: Implement if needed
    },
    
    // 🔧 Force schema audit
    async forceAudit() {
      try {
        console.log('🔧 Forcing schema audit...');
        const response = await fetch('/api/luna/force-audit', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('🔧 Force audit results:', result);
        return result;
      } catch (error) {
        console.error('❌ Force audit failed:', error.message);
        return null;
      }
    }
  };
  
  // Shorter aliases for convenience
  const luna = {
    help: () => lunaBugInterface.help(),
    status: () => lunaBugInterface.status(),
    diagnostic: () => lunaBugInterface.runDiagnostic(),
    alerts: () => lunaBugInterface.showAlerts(),
    fix: (alertId) => lunaBugInterface.respond(alertId, 'auto_fix'),
    manual: (alertId) => lunaBugInterface.respond(alertId, 'manual'),
    ignore: (alertId) => lunaBugInterface.respond(alertId, 'ignore'),
    autofix: () => lunaBugInterface.toggleAutoFix(),
    audit: () => lunaBugInterface.forceAudit()
  };
  
  // Make available globally
  window.lunaBug = lunaBugInterface;
  window.luna = luna;
  
  // Test connection on load
  setTimeout(async () => {
    try {
      const status = await lunaBugInterface.status();
      if (status) {
        lunaBugInterface.connected = true;
        console.log('✅ Luna Bug connected! Type lunaBug.help() for commands.');
      }
    } catch (error) {
      console.log('⚠️ Luna Bug server not ready yet. Will retry in background.');
    }
  }, 3000);
  
  console.log('🌙 Luna Bug client interface ready!');
  console.log('💡 Type lunaBug.help() to see available commands');
})();
