/**
 * 🌙 LunaBug Routes - ESM EDITION (No More Import Errors!)
 * 
 * Features:
 * ✅ ESM compatible (no CJS import errors)
 * ✅ Mistral → Perplexity → Local AI cascade
 * ✅ Circuit breakers and health checks
 * ✅ Zero console spam
 * ✅ Clean error handling
 */

import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Provider health tracking
const providerHealth = {
  mistral: { failures: 0, lastFailure: 0, circuitOpen: false },
  perplexity: { failures: 0, lastFailure: 0, circuitOpen: false }
};

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

// Reset circuit breaker if enough time has passed
function checkCircuitBreaker(provider) {
  const health = providerHealth[provider];
  if (health.circuitOpen && Date.now() - health.lastFailure > CIRCUIT_BREAKER_TIMEOUT) {
    health.circuitOpen = false;
    health.failures = 0;
    console.log(`🌙 [${provider}] Circuit breaker reset`);
  }
  return !health.circuitOpen;
}

// Record provider failure
function recordFailure(provider, error) {
  const health = providerHealth[provider];
  health.failures++;
  health.lastFailure = Date.now();
  
  if (health.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    health.circuitOpen = true;
    console.log(`🌙 [${provider}] Circuit breaker OPEN after ${health.failures} failures`);
  }
}

// Record provider success
function recordSuccess(provider) {
  const health = providerHealth[provider];
  health.failures = Math.max(0, health.failures - 1);
}

// AI cascade endpoint with fallback
router.post('/ai', async (req, res) => {
  const { message, code, error, context, system } = req.body;
  const startTime = Date.now();
  
  console.log(`🌙 AI request: ${message?.slice(0, 40) || 'debug request'}...`);
  
  try {
    // Try Mistral first (if circuit is closed)
    if (process.env.MISTRAL_API_KEY && checkCircuitBreaker('mistral')) {
      try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
          },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [
              { role: 'system', content: system || 'You are LunaBug, a helpful AI assistant for ClassikLust game development. Be concise and practical.' },
              { role: 'user', content: message || `Debug this code:\n\n${code}\n\nError: ${error}` }
            ],
            max_tokens: 1200,
            temperature: 0.3
          }),
          timeout: 12000
        });
        
        if (response.ok) {
          const data = await response.json();
          recordSuccess('mistral');
          console.log(`🌙 ✅ Mistral responded (${Date.now() - startTime}ms)`);
          
          return res.json({
            provider: 'mistral',
            response: data.choices[0]?.message?.content || 'Empty response from Mistral',
            fallbackCount: 0,
            metrics: { 
              latency: Date.now() - startTime,
              provider: 'mistral',
              tokens: data.usage?.total_tokens || 0
            }
          });
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        recordFailure('mistral', err);
        console.log(`🌙 ⚠️ Mistral failed (${err.message}), trying Perplexity...`);
      }
    }
    
    // Try Perplexity fallback (if circuit is closed)
    if (process.env.PERPLEXITY_API_KEY && checkCircuitBreaker('perplexity')) {
      try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
              { role: 'system', content: system || 'You are LunaBug, a concise AI debugging assistant. Provide practical solutions.' },
              { role: 'user', content: message || `Debug: ${code}\nError: ${error}` }
            ],
            max_tokens: 800,
            temperature: 0.2
          }),
          timeout: 10000
        });
        
        if (response.ok) {
          const data = await response.json();
          recordSuccess('perplexity');
          console.log(`🌙 ✅ Perplexity responded (${Date.now() - startTime}ms, fallback used)`);
          
          return res.json({
            provider: 'perplexity',
            response: data.choices[0]?.message?.content || 'Empty response from Perplexity',
            fallbackCount: 1,
            metrics: {
              latency: Date.now() - startTime,
              provider: 'perplexity',
              tokens: data.usage?.total_tokens || 0
            }
          });
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        recordFailure('perplexity', err);
        console.log(`🌙 ⚠️ Perplexity failed (${err.message}), using local fallback...`);
      }
    }
    
    // Local heuristic fallback - ALWAYS WORKS
    const localResponse = generateLocalFallback(message, code, error, context);
    console.log(`🌙 💻 Using local fallback (${Date.now() - startTime}ms)`);
    
    res.json({
      provider: 'local',
      response: localResponse,
      fallbackCount: 2,
      metrics: {
        latency: Date.now() - startTime,
        provider: 'local',
        apiKeysAvailable: {
          mistral: !!process.env.MISTRAL_API_KEY,
          perplexity: !!process.env.PERPLEXITY_API_KEY
        }
      }
    });
    
  } catch (error) {
    console.error(`🌙 ❌ AI endpoint failed completely:`, error.message);
    res.status(500).json({
      provider: 'error',
      response: 'LunaBug AI system temporarily unavailable. Check server logs for details.',
      error: error.message,
      fallbackCount: 3
    });
  }
});

// Generate smart local responses based on patterns
function generateLocalFallback(message, code, error, context) {
  // Greeting detection
  if (message && /^(hi|hello|hey|ping|test)\b/i.test(message.trim())) {
    return `🌙 Hello! LunaBug here running in local fallback mode. 

My AI providers are currently unavailable, but I'm still actively monitoring your ClassikLust game systems!

Available commands:
• window.LunaBug.status() - System health
• window.LunaBug.emergency() - Emergency mode
• window.LunaBug.functions.list() - Available tools

Add MISTRAL_API_KEY or PERPLEXITY_API_KEY to Replit Secrets for full AI capabilities!`;
  }
  
  // Error analysis
  if (error && code) {
    const errorPatterns = [
      {
        pattern: /(undefined|cannot read property|cannot access)/i,
        fix: `**Issue:** Null/undefined reference
        
**Quick Fix:**
• Add null checks: \`if (object && object.property)\`
• Use optional chaining: \`object?.property\`
• Provide defaults: \`const value = data?.field || 'default'\`

**Prevention:**
• Always validate API responses
• Use TypeScript for compile-time checking
• Add defensive programming patterns`
      },
      {
        pattern: /(import|module not found|require.*not defined)/i,
        fix: `**Issue:** Import/Module resolution failure

**Quick Fix:**
• Check file path: \`../../path/to/file\`
• Verify file exists and has correct extension
• For Node modules: \`npm install missing-package\`
• Check package.json dependencies

**ESM/CJS Issues:**
• Use .mjs for ES modules in mixed projects
• Convert require() to import statements
• Check "type": "module" in package.json`
      },
      {
        pattern: /(fetch.*failed|network.*error|cors)/i,
        fix: `**Issue:** Network/API failure

**Quick Fix:**
• Check API endpoint URL and method
• Verify CORS settings on server
• Add proper error handling with try/catch
• Check network connectivity

**For APIs:**
• Add timeout configurations
• Implement retry logic
• Validate response status codes`
      }
    ];
    
    const matchedPattern = errorPatterns.find(p => p.pattern.test(error));
    
    if (matchedPattern) {
      return `🌙 **LunaBug Local Analysis**

**Error:** ${error}

${matchedPattern.fix}

**Code Context:**
\`\`\`
${code.slice(0, 300)}${code.length > 300 ? '...' : ''}
\`\`\`

*This is a local heuristic response. Add API keys to Secrets for advanced AI debugging.*`;
    }
    
    // Generic error response
    return `🌙 **LunaBug Local Analysis**

**Error:** ${error}

**General Debugging Steps:**
1. Check browser console for additional error details
2. Verify all imports and dependencies are correct
3. Add error handling with try/catch blocks
4. Use debugger statements or console.log for step-by-step debugging
5. Review recent code changes that might have introduced the issue

**Code:**
\`\`\`
${code.slice(0, 400)}${code.length > 400 ? '...' : ''}
\`\`\`

**Need more help?** Add MISTRAL_API_KEY or PERPLEXITY_API_KEY to Replit Secrets for advanced AI-powered debugging assistance.`;
  }
  
  // General message response
  if (message) {
    return `🌙 **LunaBug Local Response**

Message received: "${message.slice(0, 150)}${message.length > 150 ? '...' : ''}"

I'm currently running in local fallback mode. For full AI-powered responses, add your API keys to Replit Secrets:

**Required Secrets:**
• \`MISTRAL_API_KEY\` - Primary AI provider
• \`PERPLEXITY_API_KEY\` - Fallback AI provider

**What I can still do:**
• System monitoring and health checks
• Function discovery and execution
• Basic error pattern matching
• Emergency debugging mode
• Console spam filtering

**Quick Access:**
• \`window.LunaBug.status()\` - Check system status
• \`window.LunaBug.functions.list()\` - See available tools`;
  }
  
  return "🌙 LunaBug local mode active. Send a message or debugging request to get help!";
}

// Clean status endpoint
router.get('/status', (req, res) => {
  const uptime = process.uptime();
  const health = {
    mistral: checkCircuitBreaker('mistral'),
    perplexity: checkCircuitBreaker('perplexity'),
    local: true
  };
  
  res.json({
    status: 'online',
    version: '1.0.1',
    uptime: Math.round(uptime),
    providers: {
      mistral: {
        available: !!process.env.MISTRAL_API_KEY,
        healthy: health.mistral,
        failures: providerHealth.mistral.failures
      },
      perplexity: {
        available: !!process.env.PERPLEXITY_API_KEY,
        healthy: health.perplexity,
        failures: providerHealth.perplexity.failures
      },
      local: {
        available: true,
        healthy: true,
        failures: 0
      }
    },
    routes: ['POST /ai', 'GET /status', 'GET /functions', 'GET /health'],
    timestamp: new Date().toISOString(),
    metrics: {
      totalFailures: providerHealth.mistral.failures + providerHealth.perplexity.failures,
      circuitBreakersOpen: Object.values(providerHealth).filter(h => h.circuitOpen).length
    }
  });
});

// Functions discovery endpoint
router.get('/functions', (req, res) => {
  res.json({
    functions: [
      {
        name: 'javascript_error_analysis',
        description: 'Analyze JavaScript/TypeScript errors and provide specific fixes',
        triggers: ['TypeError', 'ReferenceError', 'SyntaxError', 'undefined', 'null'],
        category: 'debugging',
        enabled: true,
        priority: 'high'
      },
      {
        name: 'import_resolver',
        description: 'Resolve import/export issues and module dependencies',
        triggers: ['import', 'export', 'module not found', 'require'],
        category: 'dependencies',
        enabled: true,
        priority: 'high'
      },
      {
        name: 'api_diagnostics',
        description: 'Diagnose API and network related issues',
        triggers: ['fetch', 'cors', 'network', '404', '500'],
        category: 'networking',
        enabled: true,
        priority: 'medium'
      },
      {
        name: 'performance_analyzer',
        description: 'Analyze performance issues and suggest optimizations',
        triggers: ['slow', 'performance', 'memory', 'lag', 'fps'],
        category: 'performance',
        enabled: true,
        priority: 'medium'
      },
      {
        name: 'console_spam_filter',
        description: 'Filter and reduce console spam automatically',
        triggers: ['spam', 'debug', '[object Object]', 'verbose'],
        category: 'cleanup',
        enabled: true,
        priority: 'low'
      },
      {
        name: 'database_helper',
        description: 'Help with PostgreSQL and Supabase database issues',
        triggers: ['database', 'postgresql', 'supabase', 'sql', 'migration'],
        category: 'database',
        enabled: true,
        priority: 'high'
      }
    ],
    autoDiscovery: true,
    jsonFunctionLoader: 'Available via LunaBug FunctionLoader module',
    totalFunctions: 6,
    categories: ['debugging', 'dependencies', 'networking', 'performance', 'cleanup', 'database']
  });
});

// Health check for LunaBug specifically
router.get('/health', (req, res) => {
  res.json({
    service: 'LunaBug',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Provider management endpoints
router.post('/providers/reset', (req, res) => {
  const { provider } = req.body;
  
  if (provider && providerHealth[provider]) {
    providerHealth[provider].failures = 0;
    providerHealth[provider].circuitOpen = false;
    console.log(`🌙 Manually reset ${provider} circuit breaker`);
    res.json({ success: true, provider, status: 'reset' });
  } else if (!provider) {
    // Reset all providers
    Object.keys(providerHealth).forEach(key => {
      providerHealth[key].failures = 0;
      providerHealth[key].circuitOpen = false;
    });
    console.log('🌙 All provider circuit breakers reset');
    res.json({ success: true, providers: Object.keys(providerHealth), status: 'all_reset' });
  } else {
    res.status(400).json({ error: 'Invalid provider name' });
  }
});

console.log('🌙 ✅ LunaBug ESM routes initialized successfully');

export default router;