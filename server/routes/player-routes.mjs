// server/routes/player-routes.mjs
// Backend API endpoints for character selection and gallery (ESM)
// 🔧 FIXED: Use SUPABASE_SERVICE_ROLE_KEY (correct env var name)

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middleware/auth.js';
import { setDisplayImageForPlayer, updatePlayerState, getPlayerState } from '../utils/playerStateManager.js';

const router = express.Router();

// 🔧 FIXED: Use correct environment variable name
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ [PLAYER-ROUTES] Missing Supabase credentials');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
  console.error('   Falling back to SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
  throw new Error('supabaseKey is required. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ [PLAYER-ROUTES] Supabase client initialized');

// ✅ Apply requireAuth to all routes
router.use(requireAuth);

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
      url: img.url,
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

// ✅ POST /api/player/set-display-image (accepts imageUrl OR path)
router.post('/set-display-image', async (req, res) => {
  try {
    const { imageUrl, path } = req.body;  // ✅ Accept both names
    const player = req.player;
    
    // Use whichever is provided
    const imageToSet = imageUrl || path;

    if (!imageToSet) {
      return res.status(400).json({ 
        success: false, 
        error: 'imageUrl or path is required' 
      });
    }

    console.log(`🖼️ [SET-DISPLAY] Player: ${player.username}, Image: ${imageToSet}`);

    const updated = await setDisplayImageForPlayer(player, imageToSet);

    console.log(`✅ [SET-DISPLAY] Updated successfully - displayImage now: ${updated.displayImage}`);

    res.json({ 
      success: true, 
      displayImage: updated.displayImage,
      message: 'Display image updated successfully' 
    });
  } catch (error) {
    console.error('❌ [SET-DISPLAY] Exception:', error);
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