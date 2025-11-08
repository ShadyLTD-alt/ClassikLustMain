import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { requireAuth, requireAdmin } from './middleware/auth';
import { getUpgradesFromMemory, getCharactersFromMemory, getLevelsFromMemory, getUpgradeFromMemory } from './utils/dataLoader';
import { getPlayerState, updatePlayerState, selectCharacterForPlayer, setDisplayImageForPlayer, purchaseUpgradeForPlayer, playerStateManager } from './utils/playerStateManager';
import masterDataService from './utils/MasterDataService';
import { storage } from './storage';
import crypto from 'crypto';

const withTracking = async <T,>(name: string, op: () => Promise<T>): Promise<T> => { try { return await op(); } catch (e: any) { console.error(`[${name}] Error:`, e.message); throw e; } };

export async function registerRoutes(app: Express): Promise<Server> {
  const { createServer } = await import('http');
  const server = createServer(app);

  // Health check endpoint
  app.get('/api/health', async (_req, res) => { 
    try { 
      const h = await playerStateManager.healthCheck(); 
      res.json({ status: 'ok', jsonFirst: h, timestamp: new Date().toISOString() }); 
    } catch (e: any) { 
      res.status(500).json({ status: 'error', error: e.message }); 
    } 
  });

  // 🆕 FIXED: Add missing dev authentication route
  app.post('/api/auth/dev', async (req, res) => {
    try {
      const { username } = req.body;

      if (!username || typeof username !== 'string' || !username.trim()) {
        return res.status(400).json({ 
          success: false, 
          error: 'Username is required' 
        });
      }

      console.log(`🔐 [DEV AUTH] Attempting dev login for username: ${username}`);

      // Check if player already exists
      const sanitizedUsername = username.trim().toLowerCase();
      const playerId = `dev_${sanitizedUsername}`;
      let player = await storage.getPlayer(playerId);

      if (!player) {
        // Create new dev player with PROPER Date objects
        console.log(`🆕 [DEV AUTH] Creating new dev player: ${sanitizedUsername}`);
        const now = new Date();
        
        player = await storage.createPlayer({
          id: playerId,
          username: sanitizedUsername,
          telegramId: null,
          points: 0,
          lustPoints: 0,
          lustGems: 0,
          energy: 1000,
          energyMax: 1000,
          level: 1,
          experience: 0,
          passiveIncomeRate: 0,
          lastTapValue: 1,
          selectedCharacterId: null,
          displayImage: null,
          isAdmin: false,
          consecutiveDays: 0,
          createdAt: now,
          updatedAt: now
        });
        console.log(`✅ [DEV AUTH] Created dev player:`, player.id);
      } else {
        console.log(`✅ [DEV AUTH] Found existing dev player:`, player.id);
      }

      // Create session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      await storage.createSession({
        token: sessionToken,
        playerId: player.id,
        expiresAt
      });

      console.log(`🎫 [DEV AUTH] Created session token for player: ${player.id}`);

      // Load full player state from JSON-first system
      const playerState = await getPlayerState(player);

      res.json({
        success: true,
        sessionToken,
        player: playerState
      });

      console.log(`✅ [DEV AUTH] Dev login successful for: ${username}`);
    } catch (error: any) {
      console.error(`❌ [DEV AUTH] Error during dev login:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Dev login failed'
      });
    }
  });

  // Authentication endpoints
  app.get('/api/auth/me', requireAuth, async (req, res) => { 
    try { 
      const p = await withTracking('auth/me', () => getPlayerState(req.player!)); 
      res.json({ success: true, player: p }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });

  // Player endpoints
  app.get('/api/player/me', requireAuth, async (req, res) => { 
    try { 
      const p = await withTracking('player/me', () => getPlayerState(req.player!)); 
      res.json({ player: p }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });

  app.patch('/api/player/me', requireAuth, async (req, res) => { 
    try { 
      const u = await withTracking('player/patch', () => updatePlayerState(req.player!, req.body)); 
      res.json({ player: u }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });
  
  app.post('/api/player/select-character', requireAuth, async (req, res) => { 
    try { 
      console.log(`[CHARACTER SELECT] Player ${req.player!.id} selecting character ${req.body.characterId}`);
      const updated = await withTracking('select-character', () => selectCharacterForPlayer(req.player!, req.body.characterId));
      console.log(`[CHARACTER SELECT] Success, returning:`, { username: updated.username, selectedCharacterId: updated.selectedCharacterId });
      res.json({ success: true, player: updated }); 
    } catch (e: any) { 
      console.error(`[CHARACTER SELECT] Failed:`, e.message);
      res.status(500).json({ error: e.message }); 
    } 
  });
  
  app.post('/api/player/set-display-image', requireAuth, async (req, res) => { 
    try { 
      const u = await withTracking('set-display-image', () => setDisplayImageForPlayer(req.player!, req.body.imageUrl)); 
      res.json({ success: true, player: u }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });

  app.post('/api/player/upgrades', requireAuth, async (req, res) => { 
    try { 
      const { upgradeId, level } = req.body; 
      const upg = getUpgradeFromMemory(upgradeId); 
      if (!upg) return res.status(400).json({ error: 'Invalid upgrade' }); 
      const cost = Math.round(upg.baseCost * Math.pow(upg.costMultiplier, level - 1)); 
      const u = await withTracking('purchase-upgrade', () => purchaseUpgradeForPlayer(req.player!, upgradeId, level, cost)); 
      res.json({ success: true, player: u }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });
  
  // Game data endpoints
  app.get('/api/upgrades', requireAuth, (_req, res) => { 
    res.json({ upgrades: getUpgradesFromMemory() }); 
  });

  app.get('/api/characters', requireAuth, (_req, res) => { 
    res.json({ characters: getCharactersFromMemory() }); 
  });

  app.get('/api/characters/:id', requireAuth, async (req, res) => { 
    try { 
      const c = getCharactersFromMemory().find(x => x.id === req.params.id); 
      if (!c) return res.status(404).json({ error: 'Character not found' }); 
      res.json(c); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });

  // 🖼️ FIXED: Add missing /api/media endpoint (THIS WAS CAUSING IMAGES TO NOT LOAD!)
  app.get('/api/media', requireAuth, async (_req, res) => {
    try {
      console.log('[MEDIA] Fetching all media uploads...');
      const media = await storage.getMediaUploads();
      console.log(`[MEDIA] Returning ${media.length} media items`);
      res.json({ media });
    } catch (e: any) {
      console.error('[MEDIA] Error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/levels', requireAuth, (_req, res) => { 
    try { 
      const lvls = getLevelsFromMemory().map(l => ({ 
        level: Number(l.level) || 0, 
        xpRequired: Number(l.xpRequired) || 0, 
        cost: Number(l.cost) || 0, // Include cost field
        experienceRequired: Number(l.experienceRequired || l.xpRequired) || 0,
        rewards: { 
          lustPoints: Number(l.rewards?.lustPoints) || 0, 
          lustGems: Number(l.rewards?.lustGems) || 0, 
          energyMax: Number(l.rewards?.energyMax) || 0, 
          ...l.rewards 
        }, 
        requirements: l.requirements || [], // Return as array like in JSON files
        unlocks: l.unlocks || [],
        createdAt: l.createdAt || new Date().toISOString(), 
        updatedAt: l.updatedAt || new Date().toISOString(), 
        ...l 
      })); 
      res.json({ levels: lvls }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });
  
  // 🎯 FIXED: Add /api/levels/:level endpoint for LevelUp component
  app.get('/api/levels/:level', requireAuth, (req, res) => {
    try {
      const requestedLevel = parseInt(req.params.level);
      const lvl = getLevelsFromMemory().find(l => l.level === requestedLevel);
      
      if (!lvl) {
        return res.status(404).json({ error: 'Level not found' });
      }
      
      const formatted = {
        level: Number(lvl.level) || 0,
        xpRequired: Number(lvl.xpRequired) || 0,
        cost: Number(lvl.cost) || 0,
        experienceRequired: Number(lvl.experienceRequired || lvl.xpRequired) || 0,
        rewards: {
          lustPoints: Number(lvl.rewards?.lustPoints) || 0,
          lustGems: Number(lvl.rewards?.lustGems) || 0,
          energyMax: Number(lvl.rewards?.energyMax) || 0,
          ...lvl.rewards
        },
        requirements: lvl.requirements || [],
        unlocks: lvl.unlocks || [],
        createdAt: lvl.createdAt || new Date().toISOString(),
        updatedAt: lvl.updatedAt || new Date().toISOString(),
        ...lvl
      };
      
      res.json({ level: formatted });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  // Tasks and achievements
  app.get('/api/tasks', requireAuth, async (req, res) => { 
    try { 
      const p = await getPlayerState(req.player!); 
      const tasks = [
        { id: 'daily-tap-100', name: 'Daily Tapper', description: 'Tap 100 times today', icon: '👆', type: 'daily', target: 100, progress: Math.min(p.totalTapsToday || 0, 100), isCompleted: (p.totalTapsToday || 0) >= 100, isClaimed: (p.claimedTasks || []).includes('daily-tap-100'), rewardType: 'lp', rewardAmount: 500, timeRemaining: 86400 },
        { id: 'daily-upgrade-buy', name: 'Upgrade Hunter', description: 'Purchase 3 upgrades today', icon: '⬆️', type: 'daily', target: 3, progress: Math.min(p.upgradesPurchasedToday || 0, 3), isCompleted: (p.upgradesPurchasedToday || 0) >= 3, isClaimed: (p.claimedTasks || []).includes('daily-upgrade-buy'), rewardType: 'lg', rewardAmount: 10, timeRemaining: 86400 }
      ];
      console.log(`[TASKS] Returning ${tasks.length} tasks for player ${req.player!.id}`);
      res.json({ tasks }); 
    } catch (e: any) { 
      console.error('[TASKS] Error:', e); 
      res.status(500).json({ error: e.message }); 
    } 
  });
  
  app.get('/api/achievements', requireAuth, async (req, res) => { 
    try { 
      const p = await getPlayerState(req.player!); 
      const achs = [
        { id: 'first-million', name: 'Millionaire', description: 'Earn 1,000,000 Lust Points', icon: '💎', type: 'permanent', rarity: 'epic', target: 1000000, progress: Math.min(p.lustPoints || p.points || 0, 1000000), isCompleted: (p.lustPoints || p.points || 0) >= 1000000, isUnlocked: (p.lustPoints || p.points || 0) >= 1000000, isClaimed: (p.claimedAchievements || []).includes('first-million'), rewardType: 'lg', rewardAmount: 100, isSecret: false },
        { id: 'upgrade-master', name: 'Upgrade Master', description: 'Own 10 different upgrades', icon: '🏆', type: 'permanent', rarity: 'rare', target: 10, progress: Math.min(Object.keys(p.upgrades || {}).length, 10), isCompleted: Object.keys(p.upgrades || {}).length >= 10, isUnlocked: Object.keys(p.upgrades || {}).length >= 10, isClaimed: (p.claimedAchievements || []).includes('upgrade-master'), rewardType: 'lp', rewardAmount: 5000, isSecret: false }
      ];
      console.log(`[ACHIEVEMENTS] Returning ${achs.length} achievements for player ${req.player!.id}`);
      res.json({ achievements: achs }); 
    } catch (e: any) { 
      console.error('[ACHIEVEMENTS] Error:', e); 
      res.status(500).json({ error: e.message }); 
    } 
  });
  
  app.post('/api/tasks/:id/claim', requireAuth, async (req, res) => { 
    try { 
      const tid = req.params.id; 
      const p = await getPlayerState(req.player!); 
      if ((p.claimedTasks || []).includes(tid)) return res.status(400).json({ error: 'Already claimed' }); 
      const rews: any = { 
        'daily-tap-100': { type: 'lp', amount: 500 }, 
        'daily-upgrade-buy': { type: 'lg', amount: 10 } 
      }; 
      const r = rews[tid]; 
      if (!r) return res.status(404).json({ error: 'Task not found' }); 
      const upd: any = { claimedTasks: [...(p.claimedTasks || []), tid] }; 
      if (r.type === 'lp') { 
        upd.lustPoints = Math.round((p.lustPoints || p.points || 0) + r.amount); 
        upd.points = upd.lustPoints; 
      } else if (r.type === 'lg') { 
        upd.lustGems = Math.round((p.lustGems || 0) + r.amount); 
      } 
      const u = await withTracking('claim-task', () => updatePlayerState(req.player!, upd)); 
      res.json({ success: true, player: u }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });

  app.post('/api/achievements/:id/claim', requireAuth, async (req, res) => { 
    try { 
      const aid = req.params.id; 
      const p = await getPlayerState(req.player!); 
      if ((p.claimedAchievements || []).includes(aid)) return res.status(400).json({ error: 'Already claimed' }); 
      const rews: any = { 
        'first-million': { type: 'lg', amount: 100 }, 
        'upgrade-master': { type: 'lp', amount: 5000 } 
      }; 
      const r = rews[aid]; 
      if (!r) return res.status(404).json({ error: 'Achievement not found' }); 
      const upd: any = { claimedAchievements: [...(p.claimedAchievements || []), aid] }; 
      if (r.type === 'lp') { 
        upd.lustPoints = Math.round((p.lustPoints || p.points || 0) + r.amount); 
        upd.points = upd.lustPoints; 
      } else if (r.type === 'lg') { 
        upd.lustGems = Math.round((p.lustGems || 0) + r.amount); 
      } 
      const u = await withTracking('claim-achievement', () => updatePlayerState(req.player!, upd)); 
      res.json({ success: true, player: u }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });
  
  // Admin endpoints
  app.get('/api/admin/players', requireAdmin, async (_req, res) => { 
    try { 
      const ps = await storage.getAllPlayers(); 
      res.json({ players: ps }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });

  app.post('/api/admin/levels', requireAdmin, async (req, res) => { 
    try { 
      const l = await storage.createLevel(req.body); 
      await masterDataService.reloadLevels(); 
      res.json({ success: true, level: l, levels: getLevelsFromMemory() }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });
  
  return server;
}