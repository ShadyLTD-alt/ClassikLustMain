// server/routes/player-routes.mjs
// Backend API endpoints for character selection and gallery (ESM)

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth.js';
import { setDisplayImageForPlayer } from '../utils/playerStateManager.js';

const router = express.Router();

// Dynamic imports for auth and utilities (will be loaded when needed)
let requireAuth, updatePlayerState, getPlayerState;

// Initialize dependencies
async function initDependencies() {
  if (!requireAuth) {
    const authModule = await import('../middleware/auth.js');
    requireAuth = authModule.requireAuth;
    
    const playerStateModule = await import('../utils/playerStateManager.js');
    updatePlayerState = playerStateModule.updatePlayerState;
    getPlayerState = playerStateModule.getPlayerState;
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware to ensure dependencies are loaded
router.use(async (req, res, next) => {
  await initDependencies();
  if (requireAuth) {
    return requireAuth(req, res, next);
  }
  next();
});

// PATCH /api/player/active-character
router.patch('/active-character', async (req, res) => {
  try {
    const { characterId } = req.body;
    const player = req.player;

    console.log(`🎭 [ACTIVE-CHAR] Request to set ${characterId} for player ${player.username}`);

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    // Update player state with new active character
    const updated = await updatePlayerState(player, {
      selectedCharacterId: characterId,
      activeCharacter: characterId,
      displayImage: path,
    });

    console.log(`✅ [ACTIVE-CHAR] Successfully set to ${characterId}`);

    res.json({ 
      success: true, 
      activeCharacter: characterId,
      player: updated,
      message: `Character updated successfully!`
    });
  } catch (err) {
    console.error('❌ [ACTIVE-CHAR] Error:', err);
    res.status(500).json({ error: err.message || 'Failed to set active character' });
  }
});

// GET /api/player/images?characterId={id}
router.get('/images', async (req, res) => {
  try {
    const { characterId } = req.query;
    const player = req.player;

    console.log(`🖼️ [IMAGES] Request for characterId=${characterId}, player=${player.username}`);

    if (!characterId) {
      return res.status(400).json({ error: 'characterId query parameter is required' });
    }

    const { data: mediaFiles, error } = await supabase
      .from('mediaUploads')
      .select('*')
      .eq('characterId', characterId)
      .order('unlockLevel', { ascending: true });

    if (error) {
      console.error('❌ [IMAGES] DB Error:', error);
      return res.status(500).json({ error: 'Failed to fetch images' });
    }

    console.log(`📊 [IMAGES] Found ${mediaFiles?.length || 0} images for ${characterId}`);

    const enrichedImages = (mediaFiles || []).map(img => ({
      id: img.id,
      filename: img.filename || img.url?.split('/').pop(),
      path: img.url || img.path,
      url: img.url, // ✅ Added for compatibility
      characterId: img.characterId,
      type: img.type || 'default',
      unlockLevel: img.unlockLevel || 1,
      isUnlocked: !img.unlockLevel || player.level >= img.unlockLevel,
      metadata: {
        nsfw: img.categories?.includes('nsfw') || false,
        vip: img.categories?.includes('vip') || false,
        poses: img.poses || []
      }
    }));

    res.json({ images: enrichedImages });
  } catch (err) {
    console.error('❌ [IMAGES] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/player/set-display-image
router.post('/player/set-display-image', authenticateToken, async (req, res) => {
  try {
    const { path } = req.body;  // ← Changed from imageUrl to url
    const player = req.user;   // ← Changed from playerId to player object

    if (!path) {
      return res.status(400).json({ 
        success: false, 
        error: 'url is required' 
      });
    }

    console.log(`🖼️ [ROUTE] Setting display image for ${player.username}`);

    await setDisplayImageForPlayer(player, path);

    res.json({ 
      success: true, 
      path,
      message: 'Display image updated successfully' 
    });
  } catch (error) {
    console.error('❌ [ROUTE] Error setting display image:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to set display image' 
    });
  }
});


// POST /api/player/update - General player update endpoint
router.post('/update', async (req, res) => {
  try {
    const updates = req.body;
    const player = req.player;

    console.log(`📝 [PLAYER-UPDATE] Request to update player ${player.username}`, updates);

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const updated = await updatePlayerState(player, updates);

    console.log(`✅ [PLAYER-UPDATE] Successfully updated player`);

    res.json({ 
      success: true, 
      player: updated,
      message: 'Player updated successfully!'
    });
  } catch (err) {
    console.error('❌ [PLAYER-UPDATE] Error:', err);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

console.log('✅ [PLAYER-ROUTES] ESM Module loaded');

export default router;