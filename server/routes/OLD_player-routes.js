// server/routes/player-routes.js
// Backend API endpoints for character selection and gallery

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { updatePlayerState, getPlayerState } = require('../utils/playerStateManager');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// PATCH /api/player/active-character
router.patch('/active-character', requireAuth, async (req, res) => {
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
      displayImage: null
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
router.get('/images', requireAuth, async (req, res) => {
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
      path: img.url,
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
router.post('/set-display-image', requireAuth, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const player = req.player;

    console.log(`🖼️ [DISPLAY-IMG] Request to set image for player ${player.username}`);

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    const updated = await updatePlayerState(player, { displayImage: imageUrl });

    console.log(`✅ [DISPLAY-IMG] Successfully set to ${imageUrl}`);

    res.json({ 
      success: true, 
      displayImage: imageUrl,
      player: updated,
      message: 'Display image updated successfully!'
    });
  } catch (err) {
    console.error('❌ [DISPLAY-IMG] Error:', err);
    res.status(500).json({ error: 'Failed to set display image' });
  }
});

console.log('✅ [PLAYER-ROUTES] Module loaded');

module.exports = router;
