// 🌙 Luna Bug - Server API Routes
// 🔧 FIXED: All endpoints return proper JSON, including error cases
import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Luna instance (will be injected by main server)
let lunaInstance = null;

// Initialize Luna instance
export function setLunaInstance(luna) {
  lunaInstance = luna;
  console.log('🌙 Luna API routes connected to Luna instance');
}

// ✅ JSON response middleware - ensures ALL responses are JSON
router.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// All Luna routes require authentication
router.use(requireAuth);

// POST /api/luna/:method - Generic CLI command executor
router.post('/:method', async (req, res) => {
  try {
    if (!lunaInstance) {
      return res.status(503).json({ 
        success: false,
        error: 'Luna not available',
        status: 'NOT_INITIALIZED',
        message: 'LunaBug system is not currently initialized'
      });
    }

    const method = req.params.method;
    console.log(`🌙 User ${req.player.username} executing luna.cli.${method}()`);

    // Check if the CLI method exists
    if (!lunaInstance.cli || typeof lunaInstance.cli[method] !== 'function') {
      return res.status(404).json({
        success: false,
        error: 'Method not found',
        message: `luna.cli.${method}() is not a valid command`,
        availableMethods: lunaInstance.cli ? Object.keys(lunaInstance.cli).filter(k => typeof lunaInstance.cli[k] === 'function') : []
      });
    }

    // Execute the CLI method
    const result = await lunaInstance.cli[method]();
    
    // Ensure result is JSON-serializable
    const response = {
      success: true,
      method: method,
      result: result,
      timestamp: new Date().toISOString()
    };

    return res.json(response);

  } catch (error) {
    console.error(`❌ Luna CLI error (${req.params.method}):`, error);
    return res.status(500).json({ 
      success: false,
      error: 'Command execution failed',
      method: req.params.method,
      message: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/luna/diagnostic - Trigger diagnostic
router.post('/diagnostic', async (req, res) => {
  try {
    if (!lunaInstance) {
      return res.status(503).json({ 
        success: false,
        error: 'Luna not available',
        status: 'NOT_INITIALIZED',
        message: 'LunaBug system is not currently initialized'
      });
    }
    
    console.log(`🧪 User ${req.player.username} requested diagnostic`);
    
    const diagnosticType = req.body.type || 'full';
    const result = await lunaInstance.runDiagnostic?.(diagnosticType) || { message: 'Diagnostic not implemented' };
    
    return res.json({
      success: true,
      diagnostic: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Luna diagnostic API error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Diagnostic failed',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/luna/respond - Handle user responses to alerts
router.post('/respond', async (req, res) => {
  try {
    if (!lunaInstance) {
      return res.status(503).json({ 
        success: false,
        error: 'Luna not available',
        status: 'NOT_INITIALIZED'
      });
    }
    
    const { alertId, choice } = req.body;
    
    if (!alertId || !choice) {
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request',
        message: 'alertId and choice are required',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`🎮 User ${req.player.username} responded to alert ${alertId}: ${choice}`);
    
    // Process the user's choice
    const result = await lunaInstance.chat?.handleUserChoice?.(alertId, choice) || { message: 'Response handler not available' };
    
    return res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Luna response API error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Response processing failed',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/luna/status - Get Luna's current status
router.get('/status', async (req, res) => {
  try {
    if (!lunaInstance) {
      return res.json({ 
        success: true,
        luna: { 
          status: 'NOT_AVAILABLE',
          active: false,
          initialized: false
        },
        message: 'Luna instance not initialized',
        timestamp: new Date().toISOString()
      });
    }
    
    const status = lunaInstance.getSystemStatus?.() || { status: 'Unknown', active: false };
    
    return res.json({
      success: true,
      luna: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Luna status API error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Status check failed',
      message: error.message || 'Unknown error',
      luna: {
        status: 'ERROR',
        active: false
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/luna/alerts - Get active alerts
router.get('/alerts', async (req, res) => {
  try {
    if (!lunaInstance) {
      return res.json({ 
        success: true,
        alerts: [],
        count: 0,
        message: 'Luna not available',
        timestamp: new Date().toISOString()
      });
    }
    
    const schemaAuditor = lunaInstance.getPlugin?.('SchemaAuditor');
    const activeIssues = schemaAuditor?.getActiveIssues?.() || [];
    
    return res.json({
      success: true,
      alerts: activeIssues,
      count: activeIssues.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Luna alerts API error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to get alerts',
      message: error.message || 'Unknown error',
      alerts: [],
      count: 0,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/luna/settings - Update Luna settings
router.post('/settings', async (req, res) => {
  try {
    if (!lunaInstance || !lunaInstance.chat) {
      return res.status(503).json({ 
        success: false,
        error: 'Luna chat not available',
        status: 'NOT_INITIALIZED',
        timestamp: new Date().toISOString()
      });
    }
    
    const newSettings = req.body;
    const updatedSettings = lunaInstance.chat.updateSettings?.(newSettings) || newSettings;
    
    console.log(`⚙️ User ${req.player.username} updated Luna settings:`, newSettings);
    
    return res.json({
      success: true,
      settings: updatedSettings,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Luna settings API error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Settings update failed',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/luna/toggle-autofix - Toggle auto-fix mode
router.post('/toggle-autofix', async (req, res) => {
  try {
    if (!lunaInstance) {
      return res.status(503).json({ 
        success: false,
        error: 'Luna not available',
        status: 'NOT_INITIALIZED',
        timestamp: new Date().toISOString()
      });
    }
    
    const newState = await lunaInstance.toggleAutoFix?.() || false;
    
    console.log(`🤖 User ${req.player.username} toggled Luna auto-fix: ${newState}`);
    
    return res.json({
      success: true,
      autoFixEnabled: newState,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Luna toggle API error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Toggle failed',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 🧪 EMERGENCY: Force schema audit
router.post('/force-audit', async (req, res) => {
  try {
    if (!lunaInstance) {
      return res.status(503).json({ 
        success: false,
        error: 'Luna Schema Auditor not available',
        status: 'NOT_INITIALIZED',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`🚨 User ${req.player.username} forced schema audit`);
    
    const schemaAuditor = lunaInstance.getPlugin?.('SchemaAuditor');
    const issues = await schemaAuditor?.auditSchema?.() || [];
    
    return res.json({
      success: true,
      issues,
      count: issues.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Luna force audit API error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Audit failed',
      message: error.message || 'Unknown error',
      issues: [],
      count: 0,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ Global error handler for this router - catches any unhandled errors
router.use((err, req, res, next) => {
  console.error('💥 Luna API unhandled error:', err);
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message || 'Unknown error occurred',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// ✅ Only export router (default), setLunaInstance is already exported above
export default router;