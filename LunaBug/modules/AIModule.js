/**
 * LunaBug/modules/AIModule.js
 * 
 * AI Integration Module for LunaBug
 * - Manages Mistral API connections
 * - Handles system prompts and instructions
 * - Switches between API keys intelligently
 * - Caches responses and tracks effectiveness
 */

import DebugPlugin from '../core/DebugPlugin.js';
import { getOptimalSystemPrompt, enhanceSystemPrompt, LUNABUG_PROMPTS } from '../config/system-prompts.js';

class AIModule extends DebugPlugin {
  constructor() {
    super('AI');
    this.config = null;
    this.instructions = [];
    this.apiKeys = {
      primary: null,
      debug: null
    };
    this.responseCache = new Map();
    this.metrics = {
      requestCount: 0,
      successCount: 0,
      averageResponseTime: 0,
      errorCount: 0
    };
  }

  async init(context) {
    console.log(`🌙 [${this.name}] Initializing AI module...`);
    
    // Load configuration
    await this.loadConfig();
    
    // Load instructions from multiple sources
    this.loadInstructions();
    
    // Setup API keys
    this.setupApiKeys();
    
    // Expose AI functionality to LunaBug context
    context.ai = {
      module: this,
      chat: (message, options = {}) => this.chat(message, options),
      debug: (code, error, options = {}) => this.debug(code, error, options),
      getInstructions: () => this.getInstructions(),
      setInstructions: (instructions) => this.setInstructions(instructions),
      getMetrics: () => this.getMetrics()
    };
    
    return true;
  }

  async loadConfig() {
    try {
      // In a real implementation, this would fetch the config
      // For now, use the defaults from lunabug.json
      this.config = {
        model: 'mistral-large-latest',
        temperature: 0.05,
        maxTokens: 2048,
        topP: 1,
        endpoint: '/api/lunabug',
        fallbackEndpoint: '/api/mistral'
      };
    } catch (error) {
      console.warn(`🌙 [${this.name}] Failed to load config:`, error);
      this.config = {}; // Use defaults
    }
  }

  loadInstructions() {
    // Priority order: ENV > localStorage > config
    const envInstructions = this.tryParseJSON(process.env?.LUNABUG_SYSTEM_PROMPT) || [];
    const localInstructions = this.tryParseJSON(localStorage.getItem('lunabug_system_prompt')) || [];
    const configInstructions = [
      "You are LunaBug - an AI debugging assistant for ClassikLust game development.",
      "Focus on TypeScript, React, PostgreSQL, and game development patterns.",
      "Always provide working code solutions with explanations.",
      "Detect camelCase vs snake_case database column issues.",
      "Consider mobile-first responsive design in UI suggestions.",
      "Prioritize performance and user experience optimizations.",
      "Remember this is an adult anime-themed tapping game context."
    ];

    // Merge and dedupe
    this.instructions = this.dedupeArray([
      ...envInstructions,
      ...localInstructions,
      ...configInstructions
    ]);

    console.log(`🌙 [${this.name}] Loaded ${this.instructions.length} system instructions`);
  }

  setupApiKeys() {
    // Check environment variables
    this.apiKeys.primary = process.env?.MISTRAL_API_KEY || null;
    this.apiKeys.debug = process.env?.MISTRAL_DEBUG_API_KEY || null;
    
    const hasKeys = this.apiKeys.primary || this.apiKeys.debug;
    console.log(`🌙 [${this.name}] API Keys: ${hasKeys ? 'Configured' : 'Using fallback endpoint'}`);
  }

  getActiveApiKey(debugMode = false) {
    if (debugMode && this.apiKeys.debug) {
      return this.apiKeys.debug;
    }
    return this.apiKeys.primary || null;
  }

  buildSystemPrompt(requestType, language = 'typescript', debugType = 'general') {
    // Get base prompt
    let basePrompt = getOptimalSystemPrompt(requestType, 'moderate', 'intermediate');
    
    // Enhance with language/project specifics
    basePrompt = enhanceSystemPrompt(basePrompt, language, 'web');
    
    // Add custom instructions
    if (this.instructions.length > 0) {
      basePrompt += '\n\nCUSTOM INSTRUCTIONS:\n' + this.instructions.join('\n');
    }
    
    // Add ClassikLust context
    basePrompt += `\n\nCLASSIKLUST PROJECT CONTEXT:
- Adult anime-themed incremental tapping game
- Stack: React + TypeScript + PostgreSQL + Node.js
- Mobile-first responsive design with Tailwind CSS
- Real-time state management with GameContext
- Achievement/upgrade system with database persistence
- Energy system with passive income mechanics`;
    
    return basePrompt;
  }

  async chat(message, options = {}) {
    const requestId = Date.now().toString();
    const startTime = performance.now();
    
    try {
      this.metrics.requestCount++;
      
      const systemPrompt = this.buildSystemPrompt('chat', options.language);
      const apiKey = this.getActiveApiKey(options.debugMode);
      
      // Use direct API if key available, else fallback to server endpoint
      const response = await this.makeRequest({
        system: systemPrompt,
        message,
        requestId,
        apiKey,
        endpoint: options.endpoint || this.config.endpoint
      });
      
      const responseTime = performance.now() - startTime;
      this.updateMetrics(true, responseTime);
      
      return {
        response: response.content || response.message || 'No response',
        requestId,
        responseTime: Math.round(responseTime),
        model: this.config.model
      };
    } catch (error) {
      this.updateMetrics(false, performance.now() - startTime);
      throw error;
    }
  }

  async debug(code, error = '', options = {}) {
    const requestId = Date.now().toString();
    const startTime = performance.now();
    
    try {
      this.metrics.requestCount++;
      
      const systemPrompt = this.buildSystemPrompt('debug', options.language, options.debugType);
      const apiKey = this.getActiveApiKey(true); // Always use debug key for debugging
      
      const debugRequest = {
        system: systemPrompt,
        language: options.language || 'typescript',
        debugType: options.debugType || 'general',
        code,
        error,
        context: options.context || ''
      };
      
      const response = await this.makeRequest({
        ...debugRequest,
        requestId,
        apiKey,
        endpoint: options.endpoint || this.config.endpoint
      });
      
      const responseTime = performance.now() - startTime;
      this.updateMetrics(true, responseTime);
      
      // Parse response for structured debug data
      let parsedResponse;
      try {
        parsedResponse = typeof response === 'string' ? JSON.parse(response) : response;
      } catch {
        // Fallback if not JSON
        parsedResponse = {
          analysis: response.content || response.message || response,
          suggestions: ['Check the code for syntax errors', 'Review variable declarations'],
          confidence: 0.8,
          severity: 'medium'
        };
      }
      
      return {
        ...parsedResponse,
        requestId,
        responseTime: Math.round(responseTime),
        model: this.config.model
      };
    } catch (error) {
      this.updateMetrics(false, performance.now() - startTime);
      throw error;
    }
  }

  async makeRequest({ system, message, code, language, debugType, error, context, requestId, apiKey, endpoint }) {
    const payload = {
      system,
      message: message || `Please analyze this ${language} code:\n\n${code}${error ? `\n\nError: ${error}` : ''}${context ? `\n\nContext: ${context}` : ''}`,
      model: this.config.model,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      top_p: this.config.topP,
      requestId
    };
    
    // Try direct API if key available
    if (apiKey) {
      return await this.makeDirectAPIRequest(payload, apiKey);
    }
    
    // Fallback to server endpoint
    return await this.makeServerRequest(payload, endpoint);
  }

  async makeDirectAPIRequest(payload, apiKey) {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: payload.model,
        messages: [
          { role: 'system', content: payload.system },
          { role: 'user', content: payload.message }
        ],
        temperature: payload.temperature,
        max_tokens: payload.max_tokens,
        top_p: payload.top_p
      })
    });
    
    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response';
  }

  async makeServerRequest(payload, endpoint) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Server API error: ${response.status}`);
    }
    
    return await response.json();
  }

  updateMetrics(success, responseTime) {
    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;
    }
    
    // Update average response time
    const totalRequests = this.metrics.successCount + this.metrics.errorCount;
    this.metrics.averageResponseTime = 
      ((this.metrics.averageResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
  }

  // Public API methods
  getInstructions() {
    return [...this.instructions];
  }

  setInstructions(newInstructions) {
    this.instructions = this.dedupeArray(newInstructions);
    
    // Persist to localStorage
    try {
      localStorage.setItem('lunabug_system_prompt', JSON.stringify(this.instructions));
      console.log(`🌙 [${this.name}] Instructions updated: ${this.instructions.length} items`);
    } catch (err) {
      console.warn(`🌙 [${this.name}] Failed to persist instructions:`, err);
    }
  }

  addInstruction(instruction) {
    if (!this.instructions.includes(instruction)) {
      this.instructions.push(instruction);
      this.setInstructions(this.instructions);
    }
  }

  removeInstruction(index) {
    if (index >= 0 && index < this.instructions.length) {
      this.instructions.splice(index, 1);
      this.setInstructions(this.instructions);
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.requestCount > 0 
        ? Math.round((this.metrics.successCount / this.metrics.requestCount) * 100)
        : 0,
      averageResponseTime: Math.round(this.metrics.averageResponseTime)
    };
  }

  // Utility methods
  tryParseJSON(str) {
    try {
      return typeof str === 'string' ? JSON.parse(str) : str;
    } catch {
      return null;
    }
  }

  dedupeArray(arr) {
    return [...new Set(arr.filter(item => item && typeof item === 'string'))];
  }

  async run(command, data) {
    switch (command) {
      case 'status':
        console.log(`🌙 [${this.name}] Status:`, this.getMetrics());
        console.log(`🌙 [${this.name}] Instructions:`, this.instructions.length);
        console.log(`🌙 [${this.name}] API Keys:`, {
          primary: !!this.apiKeys.primary,
          debug: !!this.apiKeys.debug
        });
        break;
        
      case 'clearCache':
        this.responseCache.clear();
        console.log(`🌙 [${this.name}] Response cache cleared`);
        break;
        
      case 'resetMetrics':
        this.metrics = {
          requestCount: 0,
          successCount: 0,
          averageResponseTime: 0,
          errorCount: 0
        };
        console.log(`🌙 [${this.name}] Metrics reset`);
        break;
        
      case 'testConnection':
        try {
          const response = await this.chat('Test connection - respond with "LunaBug AI online"');
          console.log(`🌙 [${this.name}] Connection test:`, response.response);
        } catch (error) {
          console.error(`🌙 [${this.name}] Connection test failed:`, error.message);
        }
        break;
        
      default:
        break;
    }
  }

  async stop() {
    console.log(`🌙 [${this.name}] Saving final metrics...`);
    
    // Save final state
    try {
      const finalState = {
        timestamp: new Date().toISOString(),
        metrics: this.getMetrics(),
        instructionsCount: this.instructions.length,
        cacheSize: this.responseCache.size
      };
      localStorage.setItem('lunabug_ai_final_state', JSON.stringify(finalState));
    } catch (err) {
      console.warn('LunaBug AI: Failed to save final state');
    }
  }
}

export default AIModule;