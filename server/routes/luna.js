// 🌙 Luna Bug - Server API Routes
// 🔧 FIXED: Removed duplicate export causing build failure
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

// POST /api/luna/diagnostic - Trigger diagnostic
router.post('/diagnostic', async (req, res) => {
  try {
    if (!lunaInstance) {
      return res.status(503).json({ 
        error: 'Luna not available',
        status: 'NOT_INITIALIZED',
        message: 'LunaBug system is not currently initialized'
      });
    }
    
    console.log(`🧪 User ${req.player.username} requested diagnostic`);
    
    const diagnosticType = req.body.type || 'full';
    const result = await lunaInstance.runDiagnostic?.(diagnosticType) || { message: 'Diagnostic not implemented' };
    
    res.json({
      success: true,
      diagnostic: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Luna diagnostic API error:', error);
    res.status(500).json({ 
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
        error: 'Luna not available',
        status: 'NOT_INITIALIZED'
      });
    }
    
    const { alertId, choice } = req.body;
    
    if (!alertId || !choice) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'alertId and choice are required',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`🎮 User ${req.player.username} responded to alert ${alertId}: ${choice}`);
    
    // Process the user's choice
    const result = await lunaInstance.chat?.handleUserChoice?.(alertId, choice) || { message: 'Response handler not available' };
    
    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Luna response API error:', error);
    res.status(500).json({ 
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
    
    res.json({
      luna: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Luna status API error:', error);
    res.status(500).json({ 
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
        alerts: [],
        count: 0,
        message: 'Luna not available',
        timestamp: new Date().toISOString()
      });
    }
    
    const schemaAuditor = lunaInstance.getPlugin?.('SchemaAuditor');
    const activeIssues = schemaAuditor?.getActiveIssues?.() || [];
    
    res.json({
      alerts: activeIssues,
      count: activeIssues.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Luna alerts API error:', error);
    res.status(500).json({ 
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
        error: 'Luna chat not available',
        status: 'NOT_INITIALIZED',
        timestamp: new Date().toISOString()
      });
    }
    
    const newSettings = req.body;
    const updatedSettings = lunaInstance.chat.updateSettings?.(newSettings) || newSettings;
    
    console.log(`⚙️ User ${req.player.username} updated Luna settings:`, newSettings);
    
    res.json({
      success: true,
      settings: updatedSettings,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Luna settings API error:', error);
    res.status(500).json({ 
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
        error: 'Luna not available',
        status: 'NOT_INITIALIZED',
        timestamp: new Date().toISOString()
      });
    }
    
    const newState = await lunaInstance.toggleAutoFix?.() || false;
    
    console.log(`🤖 User ${req.player.username} toggled Luna auto-fix: ${newState}`);
    
    res.json({
      success: true,
      autoFixEnabled: newState,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Luna toggle API error:', error);
    res.status(500).json({ 
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
        error: 'Luna Schema Auditor not available',
        status: 'NOT_INITIALIZED',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`🚨 User ${req.player.username} forced schema audit`);
    
    const schemaAuditor = lunaInstance.getPlugin?.('SchemaAuditor');
    const issues = await schemaAuditor?.auditSchema?.() || [];
    
    res.json({
      success: true,
      issues,
      count: issues.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Luna force audit API error:', error);
    res.status(500).json({ 
      error: 'Audit failed',
      message: error.message || 'Unknown error',
      issues: [],
      count: 0,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ FIXED: Only export router (default), setLunaInstance is already exported above
export default router;