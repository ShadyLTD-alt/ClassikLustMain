import type { Express } from 'express';
import { createServer, type Server } from 'http';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
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
  saveGameData,
  syncUpgrades,
  syncCharacters,
  syncTasks,
  syncAchievements,
  syncLevels
} from './utils/unifiedDataLoader';
import { getPlayerState, updatePlayerState, selectCharacterForPlayer, setDisplayImageForPlayer, purchaseUpgradeForPlayer, playerStateManager } from './utils/playerStateManager';
import masterDataService from './utils/MasterDataService';
import { storage } from './storage';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withTracking = async <T,>(name: string, op: () => Promise<T>): Promise<T> => { try { return await op(); } catch (e: any) { console.error(`[${name}] Error:`, e.message); throw e; } };

const uploadsDir = path.join(__dirname, '../uploads');
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadsDir); },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) { cb(null, true); } else { cb(new Error('Only image files are allowed')); }
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

/**
 * 🔍 Find existing player folder by searching player-data directory (case-insensitive)
 */
async function findExistingPlayerData(username: string): Promise<any | null> {
  const playerDataDir = path.join(process.cwd(), 'main-gamedata', 'player-data');
  
  try {
    const folders = await fs.readdir(playerDataDir);
    const targetUsername = username.toLowerCase();
    
    // Look for folders containing the username
    for (const folder of folders) {
      if (folder.toLowerCase().includes(targetUsername)) {
        const playerFilePath = path.join(playerDataDir, folder, 'player-state.json');
        try {
          const fileContent = await fs.readFile(playerFilePath, 'utf-8');
          const playerData = JSON.parse(fileContent);
          console.log(`✅ [DEV AUTH] Found existing player save: ${folder}`);
          return { folder, data: playerData };
        } catch (e) {
          console.warn(`⚠️  [DEV AUTH] Found folder ${folder} but couldn't read player-state.json`);
        }
      }
    }
    
    return null;
  } catch (e) {
    console.error('[DEV AUTH] Error searching player-data:', e);
    return null;
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
      
      // 🔍 STEP 1: Search for existing player data in player-data directory
      console.log(`🔍 [DEV AUTH] Searching for existing player data for username: ${sanitizedUsername}`);
      const existingPlayerData = await findExistingPlayerData(sanitizedUsername);
      
      let player: any;
      
      if (existingPlayerData) {
        // ✅ Found existing save file - use that player's actual ID and data
        console.log(`🎮 [DEV AUTH] Loading existing player from ${existingPlayerData.folder}`);
        const savedData = existingPlayerData.data;
        
        // Create/update database record with the save file's ID
        player = await storage.getPlayer(savedData.id);
        if (!player) {
          console.log(`💾 [DEV AUTH] Creating DB record for existing save: ${savedData.id}`);
          player = await storage.createPlayer({
            id: savedData.id,
            username: savedData.username,
            telegramId: savedData.telegramId,
            points: savedData.points || 0,
            lustPoints: savedData.lustPoints || 0,
            lustGems: savedData.lustGems || 0,
            energy: savedData.energy || 1000,
            energyMax: savedData.energyMax || 1000,
            level: savedData.level || 1,
            experience: savedData.experience || 0,
            passiveIncomeRate: savedData.passiveIncomeRate || 0,
            lastTapValue: savedData.lastTapValue || 1,
            selectedCharacterId: savedData.selectedCharacterId,
            displayImage: savedData.displayImage,
            isAdmin: savedData.isAdmin || false,
            consecutiveDays: savedData.consecutiveDays || 0,
            createdAt: new Date(savedData.createdAt),
            updatedAt: new Date(savedData.updatedAt)
          });
        } else {
          console.log(`✅ [DEV AUTH] Found existing DB record: ${savedData.id}`);
        }
      } else {
        // 🆕 No existing save - create new player
        const playerId = `dev_${sanitizedUsername}`;
        console.log(`🆕 [DEV AUTH] Creating new player: ${playerId}`);
        
        player = await storage.getPlayer(playerId);
        if (!player) {
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
            isAdmin: true,
            consecutiveDays: 0, 
            createdAt: now, 
            updatedAt: now
          });
          console.log(`✅ [DEV AUTH] Created new admin dev user: ${playerId}`);
        }
      }

      // Create session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await storage.createSession({ token: sessionToken, playerId: player.id, expiresAt });
      
      // Load full player state from player-data directory
      const playerState = await getPlayerState(player);
      console.log(`🎮 [DEV AUTH] Loaded player state - isAdmin: ${playerState.isAdmin}, LP: ${playerState.lustPoints}`);
      
      res.json({ success: true, sessionToken, player: playerState });
    } catch (error: any) {
      console.error('[DEV AUTH] Error:', error);
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

  app.post('/api/media', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const fileUrl = `/uploads/${req.file.filename}`;
      const mediaUpload = await storage.createMediaUpload({
        fileName: req.file.filename, originalName: req.file.originalname,
        mimeType: req.file.mimetype, size: req.file.size, url: fileUrl,
        uploadedBy: req.player!.id, category: req.body.category || 'general',
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

  app.post('/api/upload', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const fileUrl = `/uploads/${req.file.filename}`;
    const { characterId, imageType, unlockLevel, categories, poses, isHidden, chatEnable, chatSendPercent } = req.body;
    
    // Parse the JSON strings from FormData
    const parsedCategories = categories ? JSON.parse(categories) : {};
    const parsedPoses = poses ? JSON.parse(poses) : [];
    
    // Convert categories object to array of keys where value is true
    const categoryArray: string[] = Object.keys(parsedCategories).filter(key => parsedCategories[key] === true);
    
    const mediaUpload = await storage.createMediaUpload({
      characterId,
      url: fileUrl,
      type: imageType || 'character',
      unlockLevel: unlockLevel ? parseInt(unlockLevel) : 1,
      categories: categoryArray, // Array of strings
      poses: parsedPoses, // Already an array
      isHidden: isHidden === 'true' || isHidden === true,
      chatEnable: chatEnable === 'true' || chatEnable === true,
      chatSendPercent: chatSendPercent ? parseInt(chatSendPercent) : 0
    });
    
    console.log(`✅ [UPLOAD] Image uploaded: ${req.file.filename} for character ${characterId}`);
    res.json({ success: true, media: mediaUpload, url: fileUrl });
  } catch (e: any) {
    console.error('[UPLOAD] Failed:', e);
    res.status(500).json({ error: e.message });
  }
});
  

  // ✅ FIXED: Removed xpRequired and experienceRequired
  app.get('/api/levels', requireAuth, (_req, res) => { 
    try { 
      const lvls = getLevelsFromMemory().map(l => ({ 
        level: Number(l.level) || 0,
        cost: Number(l.cost) || 0,
        rewards: l.rewards || {},
        requirements: Array.isArray(l.requirements) ? l.requirements : [],
        unlocks: Array.isArray(l.unlocks) ? l.unlocks : [],
        createdAt: l.createdAt || new Date().toISOString(),
        updatedAt: l.updatedAt || new Date().toISOString()
      })); 
      res.json({ levels: lvls }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });
  
  // ✅ FIXED: Removed xpRequired and experienceRequired
  app.get('/api/levels/:level', requireAuth, (req, res) => {
    try {
      const requestedLevel = parseInt(req.params.level);
      const lvl = getLevelsFromMemory().find(l => l.level === requestedLevel);
      if (!lvl) return res.status(404).json({ error: 'Level not found' });
      const formatted = {
        level: Number(lvl.level) || 0,
        cost: Number(lvl.cost) || 0,
        rewards: lvl.rewards || {},
        requirements: Array.isArray(lvl.requirements) ? lvl.requirements : [],
        unlocks: Array.isArray(lvl.unlocks) ? lvl.unlocks : [],
        createdAt: lvl.createdAt || new Date().toISOString(),
        updatedAt: lvl.updatedAt || new Date().toISOString()
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
  
  app.get('/api/admin/players', requireAuth, requireAdmin, async (_req, res) => { 
    try { 
      const ps = await storage.getAllPlayers(); 
      res.json({ players: ps }); 
    } catch (e: any) { 
      res.status(500).json({ error: e.message }); 
    } 
  });

  app.post('/api/admin/levels', requireAuth, requireAdmin, async (req, res) => { 
    try {
      console.log(`🔧 [ADMIN LEVEL] Saving level ${req.body.level}...`);
      const levelData = {
        ...req.body,
        requirements: Array.isArray(req.body.requirements) ? req.body.requirements : [],
        unlocks: Array.isArray(req.body.unlocks) ? req.body.unlocks : [],
        rewards: req.body.rewards || {}
      };
      
      console.log(`📝 [ADMIN LEVEL] Writing to JSON: level-${levelData.level}.json`);
      await saveGameData('levels', levelData);
      
      console.log(`🔄 [ADMIN LEVEL] Reloading levels cache...`);
      await syncLevels();
      
      console.log(`✅ [ADMIN LEVEL] Level ${levelData.level} saved successfully!`);
      res.json({ success: true, level: levelData, levels: getLevelsFromMemory() }); 
    } catch (e: any) {
      console.error(`❌ [ADMIN LEVEL] Save failed:`, e);
      res.status(500).json({ error: e.message }); 
    } 
  });

  app.post('/api/admin/characters', requireAuth, requireAdmin, async (req, res) => {
    try {
      console.log(`🔧 [ADMIN CHAR] Saving character ${req.body.id}...`);
      const characterData = req.body;
      await saveGameData('characters', characterData);
      await syncCharacters();
      console.log(`✅ [ADMIN CHAR] Character ${characterData.id} saved!`);
      res.json({ success: true, character: characterData, characters: getCharactersFromMemory() });
    } catch (e: any) {
      console.error(`❌ [ADMIN CHAR] Save failed:`, e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/upgrades', requireAuth, requireAdmin, async (req, res) => {
    try {
      console.log(`🔧 [ADMIN UPG] Saving upgrade ${req.body.id}...`);
      const upgradeData = req.body;
      await saveGameData('upgrades', upgradeData);
      await syncUpgrades();
      console.log(`✅ [ADMIN UPG] Upgrade ${upgradeData.id} saved!`);
      res.json({ success: true, upgrade: upgradeData, upgrades: getUpgradesFromMemory() });
    } catch (e: any) {
      console.error(`❌ [ADMIN UPG] Save failed:`, e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/tasks', requireAuth, requireAdmin, async (req, res) => {
    try {
      console.log(`🔧 [ADMIN TASK] Saving task ${req.body.id}...`);
      const taskData = req.body;
      await saveGameData('tasks', taskData);
      await syncTasks();
      console.log(`✅ [ADMIN TASK] Task ${taskData.id} saved!`);
      res.json({ success: true, task: taskData, tasks: getTasksFromMemory() });
    } catch (e: any) {
      console.error(`❌ [ADMIN TASK] Save failed:`, e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/achievements', requireAuth, requireAdmin, async (req, res) => {
    try {
      console.log(`🔧 [ADMIN ACH] Saving achievement ${req.body.id}...`);
      const achData = req.body;
      await saveGameData('achievements', achData);
      await syncAchievements();
      console.log(`✅ [ADMIN ACH] Achievement ${achData.id} saved!`);
      res.json({ success: true, achievement: achData, achievements: getAchievementsFromMemory() });
    } catch (e: any) {
      console.error(`❌ [ADMIN ACH] Save failed:`, e);
      res.status(500).json({ error: e.message });
    }
  });
  
  return server;
}

console.log('✅ [ROUTES] All routes registered with proper admin auth');