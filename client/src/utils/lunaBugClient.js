/**
 * 🌙 LunaBug Client-Side Integration
 * 
 * Provides window.LunaBug object for browser console access
 * Enhanced with deadlock prevention and emergency modes
 */

// 🌙 Enhanced API wrapper with promise handling
const lunaBugAPI = {
  async status() {
    try {
      const response = await fetch('/api/lunabug/status');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('🌙 LunaBug Status:', data);
      return data;
    } catch (error) {
      console.error('🌙 LunaBug Status Error:', error.message);
      return { error: error.message, fallback: true };
    }
  },

  async timing() {
    try {
      const response = await fetch('/api/lunabug/timing');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('📊 LunaBug Timing Metrics:', data);
      return data;
    } catch (error) {
      console.error('📊 Timing Error:', error.message);
      return { error: error.message, fallback: true };
    }
  },

  async emergency() {
    try {
      const response = await fetch('/api/lunabug/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('🚨 LunaBug Emergency Mode Activated:', data);
      return data;
    } catch (error) {
      console.error('🚨 Emergency Mode Error:', error.message);
      return { error: error.message, fallback: true };
    }
  },

  async ai(message, code = '', error = '') {
    try {
      const response = await fetch('/api/lunabug/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, code, error })
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log(`🌙 LunaBug AI Response (${data.provider}):`);
      console.log(data.response);
      if (data.patterns) {
        console.log('🚨 Detected Patterns:', data.patterns);
      }
      if (data.autoFix) {
        console.log('🔧 Auto-Fix Available:', data.autoFix.type);
      }
      return data;
    } catch (error) {
      console.error('🌙 AI Error:', error.message);
      return { error: error.message, fallback: true };
    }
  },

  // 🔍 Debug helpers
  async functions() {
    try {
      const response = await fetch('/api/lunabug/functions');
      const data = await response.json();
      console.log('🔧 Available LunaBug Functions:', data.functions);
      return data;
    } catch (error) {
      console.error('🔧 Functions Error:', error.message);
      return { error: error.message };
    }
  },

  async health() {
    try {
      const response = await fetch('/api/lunabug/health');
      const data = await response.json();
      console.log('🔍 LunaBug Health:', data);
      return data;
    } catch (error) {
      console.error('🔍 Health Error:', error.message);
      return { error: error.message };
    }
  },

  // 🚨 Quick deadlock scan (client-side)
  deadlock() {
    const patterns = [
      'AsyncLock',
      'proper-lockfile',
      'timed out after 5000ms',
      'lock.acquire',
      'playerState'
    ];
    
    const logs = console.history || [];
    const errors = document.querySelectorAll('[data-error], .error, .console-error');
    
    let detected = [];
    
    // Check console errors
    if (window.console && window.console.memory) {
      console.log('🔍 Scanning for deadlock patterns...');
    }
    
    // Check for common UI indicators
    const loading = document.querySelectorAll('.loading, [data-loading="true"], .spinner');
    if (loading.length > 3) {
      detected.push('multiple_loading_indicators');
    }
    
    // Check for timeout errors in network tab (if available)
    if (window.performance && window.performance.getEntriesByType) {
      const resources = window.performance.getEntriesByType('resource');
      const slowRequests = resources.filter(r => r.duration > 5000);
      if (slowRequests.length > 0) {
        detected.push('slow_requests');
        console.log('🔍 Slow requests detected:', slowRequests);
      }
    }
    
    const result = {
      patterns: detected,
      timestamp: new Date().toISOString(),
      recommendations: detected.length > 0 ? [
        'Run window.LunaBug.emergency() to activate safe mode',
        'Check server console for AsyncLock or timeout errors',
        'Test /api/debug/raw-player endpoint response time'
      ] : ['No deadlock patterns detected']
    };
    
    console.log('🚨 Deadlock Scan Results:', result);
    return result;
  }
};

// 🌙 Expose LunaBug to window for console access
if (typeof window !== 'undefined') {
  window.LunaBug = lunaBugAPI;
  
  // Add enhanced object with nested structure
  window.LunaBug.functions = {
    list: lunaBugAPI.functions,
    ai: lunaBugAPI.ai,
    status: lunaBugAPI.status,
    timing: lunaBugAPI.timing,
    emergency: lunaBugAPI.emergency,
    health: lunaBugAPI.health,
    deadlock: lunaBugAPI.deadlock
  };
  
  // 🔍 Add debug helpers
  window.LunaBug.debug = {
    async testPlayerAPI() {
      console.log('🔍 Testing player API endpoints...');
      const tests = [
        { name: 'Raw Player', url: '/api/debug/raw-player' },
        { name: 'Player Me', url: '/api/player/me' },
        { name: 'Health Check', url: '/api/health' }
      ];
      
      const results = [];
      for (const test of tests) {
        const start = Date.now();
        try {
          const response = await fetch(test.url);
          const duration = Date.now() - start;
          results.push({
            name: test.name,
            status: response.status,
            duration: `${duration}ms`,
            ok: response.ok
          });
        } catch (error) {
          results.push({
            name: test.name,
            error: error.message,
            duration: `${Date.now() - start}ms`,
            ok: false
          });
        }
      }
      
      console.table(results);
      return results;
    },
    
    async testUploadAPI() {
      console.log('📤 Testing upload capability...');
      try {
        // Create a simple test form data
        const formData = new FormData();
        
        // Create a minimal 1x1 pixel PNG
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 1, 1);
        
        canvas.toBlob(async (blob) => {
          formData.append('image', blob, 'test.png');
          formData.append('characterId', 'test');
          formData.append('characterName', 'TestCharacter');
          formData.append('imageType', 'other');
          formData.append('categories', JSON.stringify({ nsfw: false }));
          formData.append('poses', JSON.stringify(['test']));
          
          const start = Date.now();
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          const duration = Date.now() - start;
          
          console.log(`📤 Upload test completed in ${duration}ms:`, {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Upload successful:', result);
          } else {
            const error = await response.text();
            console.error('❌ Upload failed:', error);
          }
        });
      } catch (error) {
        console.error('❌ Upload test failed:', error);
      }
    }
  };
  
  console.log('🌙 LunaBug enhanced client loaded! Try these commands:');
  console.log('  window.LunaBug.status() - System status');
  console.log('  window.LunaBug.timing() - Operation metrics');
  console.log('  window.LunaBug.emergency() - Activate safe mode');
  console.log('  window.LunaBug.deadlock() - Scan for deadlock patterns');
  console.log('  window.LunaBug.debug.testPlayerAPI() - Test player endpoints');
  console.log('  window.LunaBug.debug.testUploadAPI() - Test upload functionality');
}

export default lunaBugAPI;