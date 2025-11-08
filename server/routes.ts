import type { Express } from 'express';
import { createServer, type Server } from 'http';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, requireAdmin } from './middleware/auth';
import { 
  getUpgradesFromMemory, 
  getCharactersFromMemory, 
  getLevelsFromMemory, 
  getUpgradeFromMemory,
  getTasksFromMemory,
  getAchievementsFromMemory,
  getTaskFromMemory,
  getAchievementFromMemory,
  saveUpgradeToJSON,
  saveCharacterToJSON,
  saveLevelToJSON,
  saveTaskToJSON,
  saveAchievementToJSON,
  syncUpgrades,
  syncCharacters,
  syncTasks,
  syncAchievements
} from './utils/dataLoader';
import { syncLevels } from './utils/levelsProgressive';
import { getPlayerState, updatePlayerState, selectCharacterForPlayer, setDisplayImageForPlayer, purchaseUpgradeForPlayer, playerStateManager } from './utils/playerStateManager';
import masterDataService from './utils/MasterDataService';
import { storage } from './storage';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withTracking = async <T,>(name: string, op: () => Promise<T>): Promise<T> => { try { return await op(); } catch (e: any) { console.error(`[${name}] Error:`, e.message); throw e; } };

// 🖼️ Configure multer for image uploads
const uploadsDir = path.join(__dirname, '../uploads');
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

function calculateTaskProgress(player: any, task: any): number {
  switch (task.requirementType) {
    case 'tapCount': return Math.min(player.totalTapsToday || 0, task.target);
    case 'upgradesPurchased': return Math.min(player.upgradesPurchasedToday || 0, task.target);
    case 'lpEarned': return Math.min(player.lpEarnedToday || 0, task.target);
    default: return 0;
  }
}

function calculateAchievementProgress(player: any, achievement: any): number {
  switch (achievement.requirementType) {
    case 'lpTotal': return Math.min(player.lustPoints || player.points || 0, achievement.target);
    case 'upgradeCount': return Math.min(Object.keys(player.upgrades || {}).length, achievement.target);
    case 'characterUnlocked': return (player.unlockedCharacters || []).length >= achievement.target ? achievement.target : 0;
    case 'level': return Math.min(player.level || 1, achievement.target);
    default: return 0;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const { createServer } = await import('http');
  const server = createServer(app);

  app.get('/api/health', async (_req, res) => { 
    try { 
      const h = await playerStateManager.healthCheck(); 
      res.json({ status: 'ok', jsonFirst: h, timestamp: new Date().toISOString() }); 
    } catch (e: any) { 
      res.status(500).json({ status: 'error', error: e.message }); 
    } 
  });

  app.post('/api/auth/dev', async (req, res) => {
    try {
      const { username } = req.body;
      if (!username || typeof username !== 'string' || !username.trim()) {
        return res.status(400).json({ success: false, error: 'Username is required' });
      }

      const sanitizedUsername = username.trim().toLowerCase();
      const playerId = `dev_${sanitizedUsername}`;
      let player = await storage.getPlayer(playerId);

      if (!player) {
        const now = new Date();
        player = await storage.createPlayer({
          id: playerId, username: sanitizedUsername, telegramId: null,
          points: 0, lustPoints: 0, lustGems: 0, energy: 1000, energyMax: 1000,
          level: 1, experience: 0, passiveIncomeRate: 0, lastTapValue: 1,
          selectedCharacterId: null, displayImage: null, isAdmin: false,
          consecutiveDays: 0, createdAt: now, updatedAt: now
        });
      }

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await storage.createSession({ token: sessionToken, playerId: player.id, expiresAt });
      const playerState = await getPlayerState(player);
      res.json({ success: true, sessionToken, player: playerState });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Dev login failed' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req, res) => { 
    try { 
      const p = await withTracking('auth/me', () => getPlayerState(req.player!)); 
      res.json({ success: true, player: p }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });

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
      const updated = await withTracking('select-character', () => selectCharacterForPlayer(req.player!, req.body.characterId));
      res.json({ success: true, player: updated }); 
    } catch (e: any) { 
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

  app.get('/api/media', requireAuth, async (_req, res) => {
    try {
      const media = await storage.getMediaUploads();
      res.json({ media });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 🖼️ CRITICAL: Add POST /api/media for image uploads
  app.post('/api/media', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      const mediaUpload = await storage.createMediaUpload({
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        uploadedBy: req.player!.id,
        category: req.body.category || 'general',
        isNsfw: req.body.isNsfw === 'true' || req.body.isNsfw === true,
        isHidden: req.body.hideFromGallery === 'true' || req.body.hideFromGallery === true
      });

      console.log(`✅ [UPLOAD] Image uploaded: ${req.file.filename}`);
      res.json({ success: true, media: mediaUpload, url: fileUrl });
    } catch (e: any) {
      console.error('[UPLOAD] Failed:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/levels', requireAuth, (_req, res) => { 
    try { 
      const lvls = getLevelsFromMemory().map(l => ({ 
        level: Number(l.level) || 0, xpRequired: Number(l.xpRequired) || 0, 
        cost: Number(l.cost) || 0, experienceRequired: Number(l.experienceRequired || l.xpRequired) || 0,
        rewards: l.rewards || {}, requirements: l.requirements || [], unlocks: l.unlocks || [],
        createdAt: l.createdAt || new Date().toISOString(), updatedAt: l.updatedAt || new Date().toISOString(), ...l 
      })); 
      res.json({ levels: lvls }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });
  
  app.get('/api/levels/:level', requireAuth, (req, res) => {
    try {
      const requestedLevel = parseInt(req.params.level);
      const lvl = getLevelsFromMemory().find(l => l.level === requestedLevel);
      if (!lvl) return res.status(404).json({ error: 'Level not found' });
      const formatted = {
        level: Number(lvl.level) || 0, xpRequired: Number(lvl.xpRequired) || 0,
        cost: Number(lvl.cost) || 0, experienceRequired: Number(lvl.experienceRequired || lvl.xpRequired) || 0,
        rewards: lvl.rewards || {}, requirements: lvl.requirements || [], unlocks: lvl.unlocks || [],
        createdAt: lvl.createdAt || new Date().toISOString(), updatedAt: lvl.updatedAt || new Date().toISOString(), ...lvl
      };
      res.json({ level: formatted });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.get('/api/tasks', requireAuth, async (req, res) => { 
    try { 
      const p = await getPlayerState(req.player!); 
      const tasksFromJSON = getTasksFromMemory();
      const tasks = tasksFromJSON.map(task => ({
        ...task, progress: calculateTaskProgress(p, task),
        isCompleted: calculateTaskProgress(p, task) >= task.target,
        isClaimed: (p.claimedTasks || []).includes(task.id)
      }));
      res.json({ tasks }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });
  
  app.get('/api/achievements', requireAuth, async (req, res) => { 
    try { 
      const p = await getPlayerState(req.player!); 
      const achievementsFromJSON = getAchievementsFromMemory();
      const achievements = achievementsFromJSON.map(ach => {
        const progress = calculateAchievementProgress(p, ach);
        return { ...ach, progress, isCompleted: progress >= ach.target, isUnlocked: progress >= ach.target, isClaimed: (p.claimedAchievements || []).includes(ach.id) };
      });
      res.json({ achievements }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });
  
  app.post('/api/tasks/:id/claim', requireAuth, async (req, res) => { 
    try { 
      const tid = req.params.id; 
      const p = await getPlayerState(req.player!); 
      const task = getTaskFromMemory(tid);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      if ((p.claimedTasks || []).includes(tid)) return res.status(400).json({ error: 'Already claimed' });
      const upd: any = { claimedTasks: [...(p.claimedTasks || []), tid] }; 
      if (task.rewardType === 'lp') { 
        upd.lustPoints = Math.round((p.lustPoints || p.points || 0) + task.rewardAmount); 
        upd.points = upd.lustPoints; 
      } else if (task.rewardType === 'lg') { 
        upd.lustGems = Math.round((p.lustGems || 0) + task.rewardAmount); 
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
      const ach = getAchievementFromMemory(aid);
      if (!ach) return res.status(404).json({ error: 'Achievement not found' });
      if ((p.claimedAchievements || []).includes(aid)) return res.status(400).json({ error: 'Already claimed' });
      const upd: any = { claimedAchievements: [...(p.claimedAchievements || []), aid] }; 
      if (ach.rewardType === 'lp') { 
        upd.lustPoints = Math.round((p.lustPoints || p.points || 0) + ach.rewardAmount); 
        upd.points = upd.lustPoints; 
      } else if (ach.rewardType === 'lg') { 
        upd.lustGems = Math.round((p.lustGems || 0) + ach.rewardAmount); 
      } 
      const u = await withTracking('claim-achievement', () => updatePlayerState(req.player!, upd)); 
      res.json({ success: true, player: u }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });
  
  app.get('/api/admin/players', requireAdmin, async (_req, res) => { 
    try { 
      const ps = await storage.getAllPlayers(); 
      res.json({ players: ps }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });

  // ✅ FIXED: Admin level edits now save to JSON
  app.post('/api/admin/levels', requireAdmin, async (req, res) => { 
    try { 
      const levelData = req.body;
      await saveLevelToJSON(levelData);  // Save to JSON FIRST
      await storage.createLevel(levelData);  // Then sync to DB
      await syncLevels();  // Reload memory cache
      res.json({ success: true, level: levelData, levels: getLevelsFromMemory() }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });

  // ✅ FIXED: Admin character edits now save to JSON
  app.post('/api/admin/characters', requireAdmin, async (req, res) => {
    try {
      const characterData = req.body;
      await saveCharacterToJSON(characterData);  // Save to JSON FIRST
      try { await storage.createCharacter(characterData); } catch { await storage.updateCharacter(characterData.id, characterData); }
      await syncCharacters();  // Reload memory cache
      res.json({ success: true, character: characterData, characters: getCharactersFromMemory() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ✅ FIXED: Admin upgrade edits now save to JSON
  app.post('/api/admin/upgrades', requireAdmin, async (req, res) => {
    try {
      const upgradeData = req.body;
      await saveUpgradeToJSON(upgradeData);  // Save to JSON FIRST
      try { await storage.createUpgrade(upgradeData); } catch { await storage.updateUpgrade(upgradeData.id, upgradeData); }
      await syncUpgrades();  // Reload memory cache
      res.json({ success: true, upgrade: upgradeData, upgrades: getUpgradesFromMemory() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ✅ NEW: Admin task management
  app.post('/api/admin/tasks', requireAdmin, async (req, res) => {
    try {
      const taskData = req.body;
      await saveTaskToJSON(taskData);  // Save to JSON FIRST
      await syncTasks();  // Reload memory cache
      res.json({ success: true, task: taskData, tasks: getTasksFromMemory() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ✅ NEW: Admin achievement management
  app.post('/api/admin/achievements', requireAdmin, async (req, res) => {
    try {
      const achData = req.body;
      await saveAchievementToJSON(achData);  // Save to JSON FIRST
      await syncAchievements();  // Reload memory cache
      res.json({ success: true, achievement: achData, achievements: getAchievementsFromMemory() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  return server;
}

console.log('✅ [ROUTES] All routes registered - JSON-first + file locking enabled');
