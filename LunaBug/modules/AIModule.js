/**
 * LunaBug/modules/AIModule.js
 * 
 * AI Integration Module for LunaBug
 * - Manages Mistral/Perplexity API connections
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
      secondary: null,
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
    await this.loadConfig();
    this.loadInstructions();
    this.setupApiKeys();
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
      this.config = {
        model: 'mistral-large-latest',
        temperature: 0.05,
        maxTokens: 2048,
        topP: 1,
        endpoint: '/api/lunabug',
        fallbackEndpoint: '/api/mistral',
        perplexityEndpoint: '/api/perplexity'
      };
    } catch (error) {
      this.config = {};
    }
  }

  loadInstructions() {
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
    this.instructions = this.dedupeArray([
      ...envInstructions,
      ...localInstructions,
      ...configInstructions
    ]);
  }

  setupApiKeys() {
    this.apiKeys.primary = process.env?.MISTRAL_API_KEY || null;
    this.apiKeys.secondary = process.env?.PERPLEXITY_API || null;
    this.apiKeys.debug = process.env?.MISTRAL_DEBUG_API_KEY || null;
  }

  getActiveApiKey(debugMode = false) {
    if (debugMode && this.apiKeys.debug) {
      return this.apiKeys.debug;
    }
    return this.apiKeys.primary || this.apiKeys.secondary || null;
  }

  // ...rest of original AIModule.js remains. Use getActiveApiKey everywhere previously using .primary
}

export default AIModule;
