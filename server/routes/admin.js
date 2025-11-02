const express = require('express');
const { supabase } = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { safeStringify, safeParseJson, safeParseRequestBody, debugJSON, validateAndCleanFormData } = require('../utils/safeJson');
const router = express.Router();

// All admin routes require authentication AND admin privileges
router.use(requireAuth);
router.use(requireAdmin);

// Middleware to safely parse request bodies
router.use((req, res, next) => {
  try {
    req.body = safeParseRequestBody(req);
    debugJSON(req.body, `${req.method} ${req.path} REQUEST BODY`);
    next();
  } catch (error) {
    console.error('🔥 Request body parsing middleware error:', error);
    res.status(400).json({ error: 'Invalid request data' });
  }
});

// GET /api/admin/players - List all players
router.get('/players', async (req, res) => {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Failed to fetch players:', error);
      return res.status(500).json({ error: 'Failed to fetch players' });
    }

    res.json({ players: players || [] });
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/players/:id - Update player data
router.patch('/players/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const updates = validateAndCleanFormData(req.body);
    
    debugJSON(updates, 'PLAYER UPDATES');
    
    // Validate player exists
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('id', playerId)
      .single();
    
    if (!existingPlayer) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Update player with proper column names
    const { data: updatedPlayer, error } = await supabase
      .from('players')
      .update({
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .eq('id', playerId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update player:', error);
      return res.status(500).json({ error: 'Failed to update player' });
    }

    console.log(`✅ Admin updated player ${playerId}:`, Object.keys(updates));
    res.json({ player: updatedPlayer });
  } catch (err) {
    console.error('Error updating player:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/admin/add-currency - Add LP or LG to current user (for testing)
router.post('/add-currency', async (req, res) => {
  try {
    const { type, amount } = validateAndCleanFormData(req.body);
    const userId = req.user.id;
    
    if (!['points', 'gems'].includes(type) || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Invalid type or amount' });
    }

    // Get current values
    const { data: player } = await supabase
      .from('players')
      .select('lustPoints, lustGems')
      .eq('id', userId)
      .single();

    const currentPoints = parseInt(player?.lustPoints || 0);
    const currentGems = parseInt(player?.lustGems || 0);
    
    const updates = {
      updatedAt: new Date().toISOString()
    };
    
    if (type === 'points') {
      updates.lustPoints = currentPoints + amount;
    } else {
      updates.lustGems = currentGems + amount;
    }

    const { data: updatedPlayer, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', userId)
      .select('lustPoints, lustGems')
      .single();

    if (error) {
      console.error('Failed to add currency:', error);
      return res.status(500).json({ error: 'Failed to add currency' });
    }

    console.log(`✅ Added ${amount} ${type} to player ${userId}`);
    res.json({ 
      newPoints: updatedPlayer.lustPoints,
      newLustGems: updatedPlayer.lustGems
    });
  } catch (err) {
    console.error('Error adding currency:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// LEVELS - ENHANCED WITH SAFE JSON HANDLING
// POST /api/admin/levels - Create new level
router.post('/levels', async (req, res) => {
  try {
    const levelData = validateAndCleanFormData(req.body);
    debugJSON(levelData, 'CREATE LEVEL DATA');
    
    // Validate required fields
    if (!levelData.level || levelData.cost === undefined) {
      return res.status(400).json({ error: 'Level and cost are required' });
    }
    
    // Safely handle requirements and unlocks arrays
    let requirements = [];
    let unlocks = [];
    
    if (levelData.requirements) {
      if (Array.isArray(levelData.requirements)) {
        requirements = levelData.requirements;
      } else if (typeof levelData.requirements === 'string') {
        const parsed = safeParseJson(levelData.requirements);
        requirements = Array.isArray(parsed) ? parsed : [];
      }
    }
    
    if (levelData.unlocks) {
      if (Array.isArray(levelData.unlocks)) {
        unlocks = levelData.unlocks;
      } else if (typeof levelData.unlocks === 'string') {
        const parsed = safeParseJson(levelData.unlocks);
        unlocks = Array.isArray(parsed) ? parsed : [];
      }
    }
    
    const { data: newLevel, error } = await supabase
      .from('levels')
      .insert({
        level: parseInt(levelData.level),
        cost: parseInt(levelData.cost),
        requirements: requirements,
        unlocks: unlocks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create level:', error);
      return res.status(500).json({ error: 'Failed to create level: ' + error.message });
    }

    console.log(`✅ Created level: ${levelData.level}`);
    res.json({ level: newLevel });
  } catch (err) {
    console.error('Error creating level:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// PATCH /api/admin/levels/:level - Update level
router.patch('/levels/:levelNum', async (req, res) => {
  try {
    const { levelNum } = req.params;
    const levelData = validateAndCleanFormData(req.body);
    debugJSON(levelData, 'UPDATE LEVEL DATA');
    
    // Safely handle arrays
    let requirements = [];
    let unlocks = [];
    
    if (levelData.requirements) {
      if (Array.isArray(levelData.requirements)) {
        requirements = levelData.requirements;
      } else if (typeof levelData.requirements === 'string') {
        const parsed = safeParseJson(levelData.requirements);
        requirements = Array.isArray(parsed) ? parsed : [];
      }
    }
    
    if (levelData.unlocks) {
      if (Array.isArray(levelData.unlocks)) {
        unlocks = levelData.unlocks;
      } else if (typeof levelData.unlocks === 'string') {
        const parsed = safeParseJson(levelData.unlocks);
        unlocks = Array.isArray(parsed) ? parsed : [];
      }
    }
    
    const { data: updatedLevel, error } = await supabase
      .from('levels')
      .update({
        cost: parseInt(levelData.cost) || 0,
        requirements: requirements,
        unlocks: unlocks,
        updatedAt: new Date().toISOString()
      })
      .eq('level', parseInt(levelNum))
      .select()
      .single();

    if (error) {
      console.error('Failed to update level:', error);
      return res.status(500).json({ error: 'Failed to update level: ' + error.message });
    }

    console.log(`✅ Updated level: ${levelNum}`);
    res.json({ level: updatedLevel });
  } catch (err) {
    console.error('Error updating level:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// DELETE /api/admin/levels/:level - Delete level
router.delete('/levels/:levelNum', async (req, res) => {
  try {
    const { levelNum } = req.params;
    
    const { error } = await supabase
      .from('levels')
      .delete()
      .eq('level', parseInt(levelNum));

    if (error) {
      console.error('Failed to delete level:', error);
      return res.status(500).json({ error: 'Failed to delete level: ' + error.message });
    }

    console.log(`✅ Deleted level: ${levelNum}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting level:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// UPGRADES - ENHANCED WITH SAFE JSON HANDLING
// POST /api/admin/upgrades - Create new upgrade
router.post('/upgrades', async (req, res) => {
  try {
    const upgradeData = validateAndCleanFormData(req.body);
    debugJSON(upgradeData, 'CREATE UPGRADE DATA');
    
    // Validate required fields
    if (!upgradeData.id || !upgradeData.name) {
      return res.status(400).json({ error: 'ID and name are required' });
    }
    
    const { data: newUpgrade, error } = await supabase
      .from('upgrades')
      .insert({
        id: upgradeData.id,
        name: upgradeData.name,
        description: upgradeData.description || '',
        type: upgradeData.type || 'perTap',
        maxLevel: parseInt(upgradeData.maxLevel) || 30,
        baseCost: parseInt(upgradeData.baseCost) || 10,
        costMultiplier: parseFloat(upgradeData.costMultiplier) || 1.2,
        baseValue: parseFloat(upgradeData.baseValue) || 1,
        valueIncrement: parseFloat(upgradeData.valueIncrement) || 1,
        icon: upgradeData.icon || '⚡',
        isHidden: upgradeData.isHidden || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create upgrade:', error);
      return res.status(500).json({ error: 'Failed to create upgrade: ' + error.message });
    }

    console.log(`✅ Created upgrade: ${upgradeData.name}`);
    res.json({ upgrade: newUpgrade });
  } catch (err) {
    console.error('Error creating upgrade:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// PATCH /api/admin/upgrades/:id - Update upgrade
router.patch('/upgrades/:upgradeId', async (req, res) => {
  try {
    const { upgradeId } = req.params;
    const upgradeData = validateAndCleanFormData(req.body);
    debugJSON(upgradeData, 'UPDATE UPGRADE DATA');
    
    const { data: updatedUpgrade, error } = await supabase
      .from('upgrades')
      .update({
        name: upgradeData.name,
        description: upgradeData.description || '',
        type: upgradeData.type,
        maxLevel: parseInt(upgradeData.maxLevel) || 30,
        baseCost: parseInt(upgradeData.baseCost) || 10,
        costMultiplier: parseFloat(upgradeData.costMultiplier) || 1.2,
        baseValue: parseFloat(upgradeData.baseValue) || 1,
        valueIncrement: parseFloat(upgradeData.valueIncrement) || 1,
        icon: upgradeData.icon || '⚡',
        isHidden: upgradeData.isHidden || false,
        updatedAt: new Date().toISOString()
      })
      .eq('id', upgradeId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update upgrade:', error);
      return res.status(500).json({ error: 'Failed to update upgrade: ' + error.message });
    }

    console.log(`✅ Updated upgrade: ${upgradeData.name}`);
    res.json({ upgrade: updatedUpgrade });
  } catch (err) {
    console.error('Error updating upgrade:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// DELETE /api/admin/upgrades/:id - Delete upgrade
router.delete('/upgrades/:upgradeId', async (req, res) => {
  try {
    const { upgradeId } = req.params;
    
    const { error } = await supabase
      .from('upgrades')
      .delete()
      .eq('id', upgradeId);

    if (error) {
      console.error('Failed to delete upgrade:', error);
      return res.status(500).json({ error: 'Failed to delete upgrade: ' + error.message });
    }

    console.log(`✅ Deleted upgrade: ${upgradeId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting upgrade:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// CHARACTERS - ENHANCED WITH SAFE JSON HANDLING
// POST /api/admin/characters - Create new character
router.post('/characters', async (req, res) => {
  try {
    const characterData = validateAndCleanFormData(req.body);
    debugJSON(characterData, 'CREATE CHARACTER DATA');
    
    // Validate required fields
    if (!characterData.id || !characterData.name) {
      return res.status(400).json({ error: 'ID and name are required' });
    }
    
    const { data: newCharacter, error } = await supabase
      .from('characters')
      .insert({
        id: characterData.id,
        name: characterData.name,
        description: characterData.description || '',
        unlockLevel: parseInt(characterData.unlockLevel) || 1,
        rarity: characterData.rarity || 'common',
        defaultImage: characterData.defaultImage || '',
        avatarImage: characterData.avatarImage || '',
        displayImage: characterData.displayImage || '',
        vip: characterData.vip || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create character:', error);
      return res.status(500).json({ error: 'Failed to create character: ' + error.message });
    }

    console.log(`✅ Created character: ${characterData.name}`);
    res.json({ character: newCharacter });
  } catch (err) {
    console.error('Error creating character:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// PATCH /api/admin/characters/:id - Update character
router.patch('/characters/:characterId', async (req, res) => {
  try {
    const { characterId } = req.params;
    const characterData = validateAndCleanFormData(req.body);
    debugJSON(characterData, 'UPDATE CHARACTER DATA');
    
    const { data: updatedCharacter, error } = await supabase
      .from('characters')
      .update({
        name: characterData.name,
        description: characterData.description || '',
        unlockLevel: parseInt(characterData.unlockLevel) || 1,
        rarity: characterData.rarity,
        defaultImage: characterData.defaultImage || '',
        avatarImage: characterData.avatarImage || '',
        displayImage: characterData.displayImage || '',
        vip: characterData.vip || false,
        updatedAt: new Date().toISOString()
      })
      .eq('id', characterId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update character:', error);
      return res.status(500).json({ error: 'Failed to update character: ' + error.message });
    }

    console.log(`✅ Updated character: ${characterData.name}`);
    res.json({ character: updatedCharacter });
  } catch (err) {
    console.error('Error updating character:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// DELETE /api/admin/characters/:id - Delete character
router.delete('/characters/:characterId', async (req, res) => {
  try {
    const { characterId } = req.params;
    
    // Delete character and cascade to images
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', characterId);

    if (error) {
      console.error('Failed to delete character:', error);
      return res.status(500).json({ error: 'Failed to delete character: ' + error.message });
    }

    console.log(`✅ Deleted character: ${characterId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting character:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/admin/boost - Enable/disable boost for current user
router.post('/boost', async (req, res) => {
  try {
    const { action, multiplier, durationMinutes, cost, boostId } = validateAndCleanFormData(req.body);
    const userId = req.user.id;
    
    let updates = {
      updatedAt: new Date().toISOString()
    };
    
    if (action === 'enable') {
      // Deduct LustGems if cost specified
      if (cost && cost > 0) {
        const { data: player } = await supabase
          .from('players')
          .select('lustGems')
          .eq('id', userId)
          .single();
          
        if (!player || (player.lustGems || 0) < cost) {
          return res.status(400).json({ error: 'Not enough LustGems' });
        }
        
        updates.lustGems = (player.lustGems || 0) - cost;
        
        // Log purchase to boostPurchases table
        await supabase
          .from('boostPurchases')
          .insert({
            playerId: userId,
            boostId: boostId || 'unknown',
            cost: cost,
            effect: req.body.effect || 'boost',
            duration: durationMinutes || 0,
            multiplier: multiplier || 2.0,
            purchasedAt: new Date().toISOString(),
            expiresAt: durationMinutes > 0 ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString() : null
          });
      }
      
      updates.boostActive = true;
      updates.boostMultiplier = multiplier || 2.0;
      updates.boostExpiresAt = durationMinutes > 0 ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString() : null;
    } else {
      updates.boostActive = false;
      updates.boostMultiplier = 1.0;
      updates.boostExpiresAt = null;
    }

    const { data: updatedPlayer, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', userId)
      .select('boostActive, boostMultiplier, boostExpiresAt, lustGems')
      .single();

    if (error) {
      console.error('Failed to update boost:', error);
      return res.status(500).json({ error: 'Failed to update boost' });
    }

    console.log(`✅ ${action === 'enable' ? 'Enabled' : 'Disabled'} boost for player ${userId}`);
    res.json({
      boostActive: updatedPlayer.boostActive,
      boostMultiplier: parseFloat(updatedPlayer.boostMultiplier),
      boostExpiresAt: updatedPlayer.boostExpiresAt,
      lustGems: updatedPlayer.lustGems
    });
  } catch (err) {
    console.error('Error updating boost:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;