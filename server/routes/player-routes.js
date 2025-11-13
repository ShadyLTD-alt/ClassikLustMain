// server/routes/player-routes.js
// Backend API endpoints for character selection and gallery

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware to get authenticated user
const authenticateUser = async (req, res, next) => {
  try {
    const telegramId = req.user?.telegramId || req.body?.telegramId || req.query?.telegramId;
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { data: player, error } = await supabase
      .from('players')
      .select('*')
      .eq('telegramId', telegramId)
      .single();

    if (error || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    req.player = player;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// PATCH /api/player/active-character
router.patch('/active-character', authenticateUser, async (req, res) => {
  try {
    const { characterId } = req.body;
    const { player } = req;

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single();

    if (charError || !character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character.unlockLevel && player.level < character.unlockLevel) {
      return res.status(403).json({ error: 'Character not unlocked' });
    }

    const { error: updateError } = await supabase
      .from('players')
      .update({ activeCharacter: characterId })
      .eq('id', player.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({ error: 'Failed to update active character' });
    }

    res.json({ 
      success: true, 
      activeCharacter: characterId,
      message: `${character.name} is now your active character!`
    });
  } catch (err) {
    console.error('Error setting active character:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/player/images?characterId={id}
router.get('/images', authenticateUser, async (req, res) => {
  try {
    const { characterId } = req.query;
    const { player } = req;

    if (!characterId) {
      return res.status(400).json({ error: 'characterId query parameter is required' });
    }

    const { data: mediaFiles, error } = await supabase
      .from('mediaUploads')
      .select('*')
      .eq('characterId', characterId)
      .order('unlockLevel', { ascending: true });

    if (error) {
      console.error('Error fetching images:', error);
      return res.status(500).json({ error: 'Failed to fetch images' });
    }

    const enrichedImages = (mediaFiles || []).map(img => ({
      id: img.id,
      filename: img.filename || img.url?.split('/').pop(),
      path: img.url,
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
    console.error('Error getting player images:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/player/set-display-image
router.post('/set-display-image', authenticateUser, async (req, res) => {
  try {
    const { imageId, characterId } = req.body;
    const { player } = req;

    if (!imageId || !characterId) {
      return res.status(400).json({ error: 'imageId and characterId are required' });
    }

    const { data: image, error: imgError } = await supabase
      .from('mediaUploads')
      .select('*')
      .eq('id', imageId)
      .eq('characterId', characterId)
      .single();

    if (imgError || !image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    if (image.unlockLevel && player.level < image.unlockLevel) {
      return res.status(403).json({ error: 'Image not unlocked' });
    }

    const { error: updateError } = await supabase
      .from('players')
      .update({ displayImage: imageId })
      .eq('id', player.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({ error: 'Failed to update display image' });
    }

    res.json({ 
      success: true, 
      displayImage: imageId,
      message: 'Display image updated successfully!'
    });
  } catch (err) {
    console.error('Error setting display image:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
