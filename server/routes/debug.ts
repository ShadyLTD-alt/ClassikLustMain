import { Router } from 'express';
import { MediaCleaner } from '../utils/mediaCleaner.js';
import { authenticate } from '../middleware/auth.js';
import { getPlayerState } from '../utils/playerStateManager.js';
import logger from '../logger.js';

const router = Router();

// 🔍 DEBUG: Who am I and what do I have unlocked?
router.get('/whoami', authenticate, async (req, res) => {
  try {
    const player = req.player!;
    const playerState = await getPlayerState(player.id);
    
    const summary = {
      player: {
        id: player.id,
        telegramId: player.telegramId,
        username: player.username,
        isAdmin: player.isAdmin
      },
      gameState: {
        level: playerState.level,
        points: playerState.points,
        energy: `${playerState.energy}/${playerState.energyMax}`,
        selectedCharacterId: playerState.selectedCharacterId,
        selectedImageId: playerState.selectedImageId,
        displayImage: playerState.displayImage,
        unlockedCharacters: playerState.unlockedCharacters,
        unlockedImages: playerState.unlockedImages,
        upgradeCount: Object.keys(playerState.upgrades || {}).length,
        upgrades: playerState.upgrades
      },
      meta: {
        lastSync: playerState.lastSync,
        createdAt: playerState.createdAt,
        updatedAt: playerState.updatedAt
      }
    };
    
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('❌ [DEBUG WHOAMI] Error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown' });
  }
});

// 🧹 DEBUG: Clean up duplicate media files
router.post('/cleanup-media', authenticate, async (req, res) => {
  try {
    if (!req.player!.isAdmin) {
      return res.status(403).json({ error: 'Admin required' });
    }
    
    const { dryRun = true } = req.body;
    
    console.log(`🧹 [DEBUG CLEANUP] Starting media cleanup (${dryRun ? 'DRY RUN' : 'LIVE'})...`);
    const results = await MediaCleaner.fullCleanup(undefined, dryRun);
    
    res.json({ 
      success: true, 
      cleanup: results,
      message: `Found ${results.duplicateSets} duplicate sets and ${results.orphanedFiles} orphaned files. ${dryRun ? 'Use dryRun: false to actually delete them.' : 'Cleanup complete!'}` 
    });
  } catch (error) {
    console.error('❌ [DEBUG CLEANUP] Error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown' });
  }
});

// 🔧 DEBUG: Force unlock character (dev only)
router.post('/unlock-character', authenticate, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Development only' });
    }
    
    const { characterId } = req.body;
    if (!characterId) {
      return res.status(400).json({ error: 'characterId required' });
    }
    
    const player = req.player!;
    const playerState = await getPlayerState(player.id);
    
    if (!playerState.unlockedCharacters.includes(characterId)) {
      playerState.unlockedCharacters.push(characterId);
      
      // If no character selected, select this one
      if (!playerState.selectedCharacterId) {
        playerState.selectedCharacterId = characterId;
      }
      
      console.log(`🔓 [DEBUG UNLOCK] Character ${characterId} unlocked for ${player.username}`);
      logger.info('Debug character unlock', { playerId: player.id, characterId });
    }
    
    res.json({ 
      success: true, 
      player: {
        selectedCharacterId: playerState.selectedCharacterId,
        unlockedCharacters: playerState.unlockedCharacters
      },
      message: `Character ${characterId} is now unlocked` 
    });
  } catch (error) {
    console.error('❌ [DEBUG UNLOCK] Error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown' });
  }
});

// 🔧 DEBUG: Force unlock all characters (dev only)
router.post('/unlock-all-characters', authenticate, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Development only' });
    }
    
    const player = req.player!;
    const playerState = await getPlayerState(player.id);
    
    // Load all character IDs from master data
    const fs = await import('fs/promises');
    const path = await import('path');
    const charactersPath = path.join(process.cwd(), 'main-gamedata', 'master-data', 'characters.json');
    
    try {
      const charactersContent = await fs.readFile(charactersPath, 'utf8');
      const charactersData = JSON.parse(charactersContent);
      const allCharacterIds = charactersData.characters?.map((c: any) => c.id) || [];
      
      playerState.unlockedCharacters = [...new Set([...playerState.unlockedCharacters, ...allCharacterIds])];
      
      if (!playerState.selectedCharacterId && allCharacterIds.length > 0) {
        playerState.selectedCharacterId = allCharacterIds[0];
      }
      
      console.log(`🔓 [DEBUG UNLOCK ALL] ${allCharacterIds.length} characters unlocked for ${player.username}`);
      logger.info('Debug unlock all characters', { playerId: player.id, count: allCharacterIds.length });
      
      res.json({ 
        success: true, 
        player: {
          selectedCharacterId: playerState.selectedCharacterId,
          unlockedCharacters: playerState.unlockedCharacters
        },
        message: `All ${allCharacterIds.length} characters unlocked` 
      });
    } catch (fileError) {
      throw new Error(`Could not load characters.json: ${fileError}`);
    }
  } catch (error) {
    console.error('❌ [DEBUG UNLOCK ALL] Error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown' });
  }
});

// 🔧 DEBUG: Echo request headers and body
router.all('/echo', (req, res) => {
  const echo = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    authorization: req.get('Authorization') ? 'Present' : 'Missing',
    timestamp: new Date().toISOString()
  };
  
  console.log('🔍 [DEBUG ECHO]:', echo);
  res.json({ success: true, echo });
});

// 🔍 DEBUG: Test endpoint performance
router.get('/perf/:endpoint', authenticate, async (req, res) => {
  const { endpoint } = req.params;
  const validEndpoints = ['characters', 'upgrades', 'levels', 'media', 'auth/me', 'player/me'];
  
  if (!validEndpoints.includes(endpoint)) {
    return res.status(400).json({ error: 'Invalid endpoint', valid: validEndpoints });
  }
  
  const startTime = Date.now();
  
  try {
    const testUrl = `/api/${endpoint}`;
    const testRes = await fetch(`http://localhost:${process.env.PORT || 5000}${testUrl}`, {
      headers: {
        'Authorization': req.get('Authorization') || '',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    const duration = Date.now() - startTime;
    
    if (testRes.ok) {
      const data = await testRes.json();
      res.json({
        success: true,
        endpoint,
        status: testRes.status,
        duration: `${duration}ms`,
        dataSize: JSON.stringify(data).length,
        summary: `${endpoint} responded in ${duration}ms with ${JSON.stringify(data).length} bytes`
      });
    } else {
      const errorText = await testRes.text();
      res.json({
        success: false,
        endpoint,
        status: testRes.status,
        duration: `${duration}ms`,
        error: errorText
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    res.json({
      success: false,
      endpoint,
      duration: `${duration}ms (timeout)`,
      error: error instanceof Error ? error.message : 'Unknown'
    });
  }
});

export default router;