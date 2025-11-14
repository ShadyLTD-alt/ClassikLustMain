// server/routes/admin-routes.js
// Admin-only routes for system management

const express = require('express');
const router = express.Router();
const { syncUploadsToDatabase } = require('../utils/syncUploadsToDatabase');

// Middleware to verify admin access
const requireAdmin = (req, res, next) => {
  const isAdmin = req.user?.isAdmin || req.query?.isAdmin === 'true';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// POST /api/admin/sync-media
// Trigger media uploads sync from LunaBug admin panel
router.post('/sync-media', requireAdmin, async (req, res) => {
  try {
    console.log('📸 Media sync triggered by admin');
    const result = await syncUploadsToDatabase();
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: result.message || 'Media sync completed successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ 
        error: result.message || 'Sync failed',
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Media sync error:', err);
    res.status(500).json({ 
      error: 'Internal server error during sync',
      details: err.message 
    });
  }
});

// GET /api/admin/sync-status
// Get last sync status and statistics
router.get('/sync-status', requireAdmin, async (req, res) => {
  try {
    // You can expand this to track sync history in DB
    res.json({
      success: true,
      status: 'ready',
      lastSync: null, // TODO: Track in database
      message: 'Media sync is available'
    });
  } catch (err) {
    console.error('Error getting sync status:', err);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

module.exports = router;
