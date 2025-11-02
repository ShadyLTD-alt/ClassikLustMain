/**
 * LunaBug/init.js
 * 
 * LUNABUG BOOTSTRAP SYSTEM
 * 
 * This initializes BEFORE any game systems load.
 * Even if React crashes, GameContext fails, or database is down,
 * LunaBug will be running and logging everything.
 * 
 * Priority: MAXIMUM - Runs before everything else
 */

import DebuggerCore from './core/DebuggerCore.js';
import DatabaseModule from './modules/DatabaseModule.js';
import GameplayModule from './modules/GameplayModule.js';
import AIModule from './modules/AIModule.js';

// Global LunaBug instance
let lunaBugInstance = null;

/**
 * Initialize LunaBug system - STANDALONE MODE
 * This runs before React, GameContext, or any other systems
 */
export async function initLunaBug() {
  if (lunaBugInstance) {
    console.log('🌙 LunaBug already initialized');
    return lunaBugInstance;
  }

  console.log('🌙🚀 LunaBug Bootstrap Sequence Initiated...');
  
  try {
    // Create core instance
    const core = new DebuggerCore();
    
    // Register all modules in dependency order
    core.register(new DatabaseModule());
    core.register(new GameplayModule());
    core.register(new AIModule()); // NEW: AI Module for Mistral integration
    
    // Initialize all modules
    await core.initAll();
    
    // Set up global error monitoring (emergency mode)
    setupEmergencyHandlers(core);
    
    // Expose enhanced global interface for emergency access
    window.LunaBug = {
      core,
      logs: () => core.getLogs(),
      emergency: () => activateEmergencyMode(core),
      clear: () => core.logEvent('manual_clear', 'Logs cleared by user'),
      status: () => getSystemStatus(core),
      // AI-specific methods
      chat: (message, options) => core.context.ai?.chat(message, options),
      debug: (code, error, options) => core.context.ai?.debug(code, error, options),
      instructions: {
        get: () => core.context.ai?.getInstructions(),
        set: (instructions) => core.context.ai?.setInstructions(instructions),
        add: (instruction) => core.context.ai?.module.addInstruction(instruction),
        remove: (index) => core.context.ai?.module.removeInstruction(index)
      },
      metrics: () => core.context.ai?.getMetrics(),
      version: '1.0.1'
    };
    
    lunaBugInstance = core;
    
    console.log('🌙✅ LunaBug initialized successfully!');
    console.log('🌙🎯 Emergency access: window.LunaBug');
    console.log('🤖🌙 AI integration: window.LunaBug.chat("hello")');
    
    // Test AI connection if available
    if (core.context.ai) {
      try {
        console.log('🤖 Testing AI connection...');
        // Don't await - let it run in background
        core.context.ai.chat('LunaBug initialization test - respond briefly', { debugMode: false })
          .then(response => {
            console.log('🤖✅ AI connection successful:', response.response);
          })
          .catch(err => {
            console.log('🤖⚠️ AI connection using fallback endpoint:', err.message);
          });
      } catch (err) {
        console.log('🤖💻 AI will use server endpoint fallback');
      }
    }
    
    return core;
    
  } catch (error) {
    console.error('🌙❌ LunaBug initialization failed:', error);
    
    // Even if initialization fails, provide basic emergency mode
    window.LunaBug = {
      emergency: () => console.log('🚨 LunaBug Emergency Mode - Init Failed'),
      status: () => ({ status: 'failed', error: error.message }),
      chat: () => console.log('🤖❌ AI unavailable - init failed'),
      instructions: {
        get: () => [],
        set: () => console.log('Instructions unavailable - init failed')
      }
    };
    
    return null;
  }
}

/**
 * Set up emergency error handlers
 */
function setupEmergencyHandlers(core) {
  // Global error capture
  window.addEventListener('error', (event) => {
    core.logEvent('global_error', {
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error?.stack
    });
    
    // If it's a React error, suggest emergency mode
    if (event.message.includes('React') || event.message.includes('Component')) {
      console.warn('🚨 LunaBug detected React error - Emergency mode available: window.LunaBug.emergency()');
    }
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    core.logEvent('unhandled_rejection', {
      reason: event.reason,
      stack: event.reason?.stack
    });
  });

  // Performance observer for long tasks
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const longTasks = list.getEntries().filter(entry => entry.duration > 50);
        if (longTasks.length > 0) {
          core.logEvent('performance_issue', {
            longTasks: longTasks.length,
            maxDuration: Math.max(...longTasks.map(t => t.duration))
          });
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (err) {
      // Silent fail if PerformanceObserver not supported
    }
  }
}

/**
 * Emergency mode when game systems fail
 */
function activateEmergencyMode(core) {
  console.log('🚨🌙 LunaBug Emergency Mode Activated!');
  
  core.logEvent('emergency_mode_activated', 'User triggered emergency mode');
  
  const aiMetrics = core.context.ai?.getMetrics() || { requestCount: 0, successRate: 0 };
  
  // Create emergency overlay
  const emergency = document.createElement('div');
  emergency.id = 'lunabug-emergency';
  emergency.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.95);
      color: white;
      z-index: 999999;
      padding: 20px;
      font-family: 'Courier New', monospace;
      overflow: auto;
      line-height: 1.4;
    ">
      <div style="text-align: center; border-bottom: 2px solid #9333ea; padding-bottom: 20px; margin-bottom: 20px;">
        <h1 style="color: #9333ea; font-size: 24px; margin: 0;">🌙 LunaBug Emergency Mode</h1>
        <p style="color: #a855f7; margin: 10px 0;">Standalone debugging active - Game systems bypassed</p>
        <button onclick="document.getElementById('lunabug-emergency').remove()" 
          style="background: #7c3aed; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
          Close Emergency Mode
        </button>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
        <div>
          <h3 style="color: #c084fc;">System Status</h3>
          <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; border-left: 4px solid #9333ea;">
            <div>Uptime: ${Math.round((Date.now() - core.context.startTime) / 1000)}s</div>
            <div>Modules: ${core.modules.length}</div>
            <div>Logs: ${core.logs.length}</div>
            <div>Status: EMERGENCY</div>
          </div>
        </div>
        
        <div>
          <h3 style="color: #c084fc;">AI Status</h3>
          <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
            <div>Requests: ${aiMetrics.requestCount}</div>
            <div>Success Rate: ${aiMetrics.successRate}%</div>
            <div>Avg Response: ${aiMetrics.averageResponseTime}ms</div>
            <div>Instructions: ${core.context.ai?.getInstructions()?.length || 0}</div>
          </div>
        </div>
        
        <div>
          <h3 style="color: #c084fc;">Recent Events</h3>
          <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; font-size: 12px; max-height: 200px; overflow: auto;">
            ${core.logs.slice(-8).map(log => `
              <div style="margin-bottom: 8px; padding: 4px; background: #2a2a2a; border-radius: 4px;">
                <strong style="color: #f59e0b;">${log.type}</strong><br>
                <span style="color: #6b7280;">${new Date(log.timestamp).toLocaleTimeString()}</span><br>
                <span style="color: #e5e7eb;">${JSON.stringify(log.data).substring(0, 80)}...</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <div style="margin-top: 20px;">
        <h3 style="color: #c084fc;">Emergency Commands</h3>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button onclick="window.LunaBug.core.runCommand('status')" 
            style="background: #059669; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
            Status Check
          </button>
          <button onclick="window.LunaBug.core.runCommand('clearCache')" 
            style="background: #dc2626; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
            Clear Cache
          </button>
          <button onclick="console.log(window.LunaBug.logs())" 
            style="background: #7c3aed; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
            Dump Logs
          </button>
          <button onclick="window.LunaBug.chat('Emergency test - are you online?').then(r => console.log('AI Response:', r))" 
            style="background: #0ea5e9; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
            Test AI
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(emergency);
  
  return emergency;
}

/**
 * Get comprehensive system status
 */
function getSystemStatus(core) {
  return {
    lunabug: {
      version: '1.0.1',
      uptime: Date.now() - core.context.startTime,
      modules: core.modules.length,
      logs: core.logs.length,
      initialized: core.isInitialized
    },
    ai: core.context.ai?.getMetrics() || { disabled: true },
    browser: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine,
      cookiesEnabled: navigator.cookieEnabled
    },
    performance: {
      memory: 'memory' in performance ? performance.memory : null,
      timing: performance.timing ? {
        load: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
      } : null
    }
  };
}

// Auto-initialize LunaBug as soon as this script loads
if (typeof window !== 'undefined') {
  // Initialize immediately if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLunaBug);
  } else {
    initLunaBug();
  }
}

export { lunaBugInstance, activateEmergencyMode, getSystemStatus };