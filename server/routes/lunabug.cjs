/**
 * server/routes/lunabug.js
 * 
 * LunaBug Dedicated API Routes
 * - Standalone debugging endpoints
 * - Mistral API integration with system prompts
 * - Separate from main game API routes
 * - Uses MISTRAL_API_KEY or MISTRAL_DEBUG_API_KEY
 */

const express = require('express');
const winston = require('winston');
const router = express.Router();

// Mistral API integration
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_DEBUG_API_KEY = process.env.MISTRAL_DEBUG_API_KEY;

// LunaBug logger
const lunaBugLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'lunabug' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          return `🌙 [${service}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    })
  ]
});

/**
 * POST /api/lunabug/debug
 * AI-powered code analysis and debugging
 */
router.post('/debug', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { system, language, debugType, code, error, context, requestId } = req.body;
    
    lunaBugLogger.info('Debug request received', {
      requestId,
      language,
      debugType,
      codeLength: code?.length || 0
    });
    
    // Choose API key (debug requests use MISTRAL_DEBUG_API_KEY if available)
    const apiKey = MISTRAL_DEBUG_API_KEY || MISTRAL_API_KEY;
    
    if (!apiKey) {
      lunaBugLogger.error('No Mistral API key configured');
      return res.status(500).json({
        error: 'AI service unavailable',
        message: 'No Mistral API key configured. Add MISTRAL_API_KEY or MISTRAL_DEBUG_API_KEY to environment.'
      });
    }
    
    // Build messages
    const messages = [
      { role: 'system', content: system },
      { 
        role: 'user', 
        content: `Please analyze this ${language} code:\n\n${code}${
          error ? `\n\nError: ${error}` : ''
        }${context ? `\n\nContext: ${context}` : ''}`
      }
    ];
    
    // Call Mistral API
    const mistralResponse = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages,
        temperature: 0.05,
        max_tokens: 2048,
        top_p: 1
      })
    });
    
    if (!mistralResponse.ok) {
      const errorData = await mistralResponse.json().catch(() => ({}));
      lunaBugLogger.error('Mistral API error', {
        status: mistralResponse.status,
        error: errorData
      });
      
      return res.status(mistralResponse.status).json({
        error: 'Mistral API error',
        details: errorData
      });
    }
    
    const mistralData = await mistralResponse.json();
    const aiResponse = mistralData.choices[0]?.message?.content;
    
    // Try to parse as JSON debug response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch {
      // If not JSON, wrap in standard format
      parsedResponse = {
        analysis: aiResponse,
        suggestions: ['Check the provided analysis for detailed recommendations'],
        confidence: 0.8,
        severity: 'medium'
      };
    }
    
    const responseTime = Date.now() - startTime;
    
    lunaBugLogger.info('Debug request completed', {
      requestId,
      responseTime,
      confidence: parsedResponse.confidence || 0.8
    });
    
    res.json({
      ...parsedResponse,
      requestId,
      responseTime,
      model: 'mistral-large-latest',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    lunaBugLogger.error('Debug request failed', {
      error: error.message,
      stack: error.stack,
      responseTime
    });
    
    res.status(500).json({
      error: 'Debug analysis failed',
      message: error.message,
      responseTime
    });
  }
});

/**
 * POST /api/lunabug/chat
 * Conversational AI chat for general questions
 */
router.post('/chat', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { system, message, requestId } = req.body;
    
    lunaBugLogger.info('Chat request received', {
      requestId,
      messageLength: message?.length || 0
    });
    
    // Chat uses primary API key
    const apiKey = MISTRAL_API_KEY || MISTRAL_DEBUG_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        error: 'AI service unavailable',
        message: 'No Mistral API key configured'
      });
    }
    
    // Build messages
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: message }
    ];
    
    // Call Mistral API
    const mistralResponse = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages,
        temperature: 0.1, // Slightly higher for chat
        max_tokens: 1000,  // Smaller for chat responses
        top_p: 1
      })
    });
    
    if (!mistralResponse.ok) {
      const errorData = await mistralResponse.json().catch(() => ({}));
      lunaBugLogger.error('Mistral API error', {
        status: mistralResponse.status,
        error: errorData
      });
      
      return res.status(mistralResponse.status).json({
        error: 'Mistral API error',
        details: errorData
      });
    }
    
    const mistralData = await mistralResponse.json();
    const responseTime = Date.now() - startTime;
    
    lunaBugLogger.info('Chat request completed', {
      requestId,
      responseTime,
      tokensUsed: mistralData.usage?.total_tokens || 0
    });
    
    res.json({
      response: mistralData.choices[0]?.message?.content || 'No response',
      requestId,
      responseTime,
      model: 'mistral-large-latest',
      usage: mistralData.usage,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    lunaBugLogger.error('Chat request failed', {
      error: error.message,
      stack: error.stack,
      responseTime
    });
    
    res.status(500).json({
      error: 'Chat request failed',
      message: error.message,
      responseTime
    });
  }
});

/**
 * GET /api/lunabug/status
 * LunaBug system status and health check
 */
router.get('/status', (req, res) => {
  res.json({
    service: 'LunaBug',
    version: '1.0.1',
    timestamp: new Date().toISOString(),
    apiKeys: {
      primary: !!MISTRAL_API_KEY,
      debug: !!MISTRAL_DEBUG_API_KEY
    },
    endpoints: {
      debug: '/api/lunabug/debug',
      chat: '/api/lunabug/chat',
      status: '/api/lunabug/status'
    },
    uptime: process.uptime(),
    status: 'operational'
  });
});

/**
 * POST /api/lunabug/test
 * Test Mistral API connection
 */
router.post('/test', async (req, res) => {
  try {
    const apiKey = MISTRAL_DEBUG_API_KEY || MISTRAL_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'No API key configured' });
    }
    
    const testResponse = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'user', content: 'Respond with exactly: LunaBug AI connection test successful' }
        ],
        temperature: 0.0,
        max_tokens: 50
      })
    });
    
    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => ({}));
      return res.status(testResponse.status).json({
        error: 'Mistral API test failed',
        details: errorData
      });
    }
    
    const data = await testResponse.json();
    
    lunaBugLogger.info('API connection test successful');
    
    res.json({
      success: true,
      response: data.choices[0]?.message?.content,
      usage: data.usage,
      model: 'mistral-large-latest'
    });
    
  } catch (error) {
    lunaBugLogger.error('API test failed', error);
    
    res.status(500).json({
      error: 'Connection test failed',
      message: error.message
    });
  }
});

module.exports = router;