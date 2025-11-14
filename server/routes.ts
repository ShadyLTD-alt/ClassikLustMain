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
import { getPlayerState, updatePlayerState, purchaseUpgradeForPlayer, playerStateManager } from './utils/playerStateManager';
import { storage } from './storage';
import crypto from 'crypto';
import playerRoutes from './routes/player-routes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withTracking = async <T,>(name: string, op: () => Promise<T>): Promise<T> => { try { return await op(); } catch (e: any) { console.error(`[${name}] Error:`, e.message); throw e; } };

const uploadsDir = path.join(__dirname, '../uploads');
const metadataDir = path.join(__dirname, '../main-gamedata/progressive-data/images');

// Create directories if they don't exist
try {
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.mkdir(metadataDir, { recursive: true });
  console.log('✅ Upload directories ready');
} catch (e) {
  console.error('Failed to create upload directories:', e);
}

// 📁 AUTO FOLDER ORGANIZATION HELPER - ✅ FIXED: uploads/characters/CHARACTERID/TYPE/
async function organizeImageFile(
  tempPath: string,
  originalFilename: string,
  characterId: string,
  type: string
): Promise<string> {
  try {
    // ✅ Create organized folder structure: /uploads/characters/characterId/type/
    const characterFolder = path.join(uploadsDir, 'characters', characterId.toLowerCase());
    const typeFolder = path.join(characterFolder, type.toLowerCase());
    
    // Create folders if they don't exist
    await fs.mkdir(characterFolder, { recursive: true });
    await fs.mkdir(typeFolder, { recursive: true });
    
    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(originalFilename);
    const uniqueFilename = `${timestamp}-${Math.random().toString(36).substring(7)}${ext}`;
    
    const finalPath = path.join(typeFolder, uniqueFilename);
    
    // Move file from temp to organized location
    await fs.rename(tempPath, finalPath);
    
    // ✅ Return web-accessible path with 'characters' folder
    const webPath = `/uploads/characters/${characterId.toLowerCase()}/${type.toLowerCase()}/${uniqueFilename}`;
    console.log(`📁 [ORGANIZE] File organized: ${webPath}`);
    
    return webPath;
  } catch (error) {
    console.error('📁 [ORGANIZE] Failed:', error);
    return `/uploads/${path.basename(tempPath)}`;
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadsDir); },
    filename: (req, file, cb) => {
      const uniqueName = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) { cb(null, true); } else { cb(new Error('Only image files allowed')); }
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

async function findExistingPlayerData(username: string): Promise<any | null> {
  const playerDataDir = path.join(process.cwd(), 'main-gamedata', 'player-data');
  
  try {
    const folders = await fs.readdir(playerDataDir);
    const targetUsername = username.toLowerCase();
    
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

// 🗂️ RECURSIVE FILE FINDER FOR ORGANIZED STRUCTURE
async function findImageFile(filename: string): Promise<string | null> {
  try {
    const charactersDir = path.join(uploadsDir, 'characters');
    const characters = await fs.readdir(charactersDir);
    
    for (const char of characters) {
      const charPath = path.join(charactersDir, char);
      const stat = await fs.stat(charPath);
      if (!stat.isDirectory()) continue;
      
      const types = await fs.readdir(charPath);
      for (const type of types) {
        const typePath = path.join(charPath, type);
        const typeStat = await fs.stat(typePath);
        if (!typeStat.isDirectory()) continue;
        
        const files = await fs.readdir(typePath);
        if (files.includes(filename)) {
          return path.join(typePath, filename);
        }
      }
    }
  } catch (e) {
    console.error('🔍 [SEARCH] Error searching for file:', e);
  }
  
  // Fallback: check root uploads folder
  const rootPath = path.join(uploadsDir, filename);
  try {
    await fs.access(rootPath);
    return rootPath;
  } catch {
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
      
      console.log(`🔍 [DEV AUTH] Searching for existing player data for username: ${sanitizedUsername}`);
      const existingPlayerData = await findExistingPlayerData(sanitizedUsername);
      
      let player: any;
      
      if (existingPlayerData) {
        console.log(`🎮 [DEV AUTH] Loading existing player from ${existingPlayerData.folder}`);
        const savedData = existingPlayerData.data;
        
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
            passiveIncomeRate: 0, 
            lastTapValue: 1,
            selectedCharacterId: 'aria',
            displayImage: null, 
            isAdmin: false,
            consecutiveDays: 0, 
            createdAt: now, 
            updatedAt: now
          });
          console.log(`✅ [DEV AUTH] Created new player: ${playerId}`);
        }
      }

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await storage.createSession({ token: sessionToken, playerId: player.id, expiresAt });
      
      const playerState = await getPlayerState(player);
      console.log(`🎮 [DEV AUTH] Loaded player state - isAdmin: ${playerState.isAdmin}`);
      
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

  // ✅ FIXED: PATCH /api/player/active-character
  app.patch('/api/player/active-character', requireAuth, async (req, res) => {
    try {
      const { characterId } = req.body;
      const player = req.player;

      // Just update the active character - display images are stored per-character
      const updated = await updatePlayerState(player, {
        selectedCharacterId: characterId,
        activeCharacter: characterId,
        // DON'T touch characterDisplayImages at all
      });

      res.json({ 
        success: true, 
        activeCharacter: characterId,
        player: updated,
        message: `Character updated successfully!`
      });
    } catch (err: any) {
      console.error('❌ [ACTIVE-CHAR] Error:', err);
      res.status(500).json({ error: err.message || 'Failed to set active character' });
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
  
  app.post('/api/player/level-up', requireAuth, async (req, res) => {
    try {
      const player = await getPlayerState(req.player!);
      const currentLevel = player.level || 1;
      const nextLevel = currentLevel + 1;
      
      const nextLevelData = getLevelsFromMemory().find(l => l.level === nextLevel);
      if (!nextLevelData) return res.status(400).json({ error: 'Maximum level reached' });
      
      const cost = nextLevelData.cost || 100;
      const currentLP = player.lustPoints || 0;
      
      if (currentLP < cost) return res.status(400).json({ error: 'Insufficient points' });
      
      const requirements = nextLevelData.requirements || [];
      const requirementsMet = requirements.every((req: any) => {
        const playerUpgradeLevel = player.upgrades?.[req.upgradeId] || 0;
        return playerUpgradeLevel >= req.minLevel;
      });
      
      if (!requirementsMet) return res.status(400).json({ error: 'Requirements not met' });
      
      const newLP = Math.round(currentLP - cost);
      const updatedPlayer = await updatePlayerState(req.player!, {
        level: nextLevel,
        lustPoints: newLP,
        points: newLP
      });
      
      res.json({ success: true, player: updatedPlayer, leveledUp: true, newLevel: nextLevel, pointsSpent: cost });
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

  // 🗂️ GET ALL MEDIA (recursively searches organized folders)
  app.get('/api/media', requireAuth, async (_req, res) => {
    try {
      const media: any[] = [];
      
      // Recursively search through organized structure
      async function scanDirectory(dirPath: string, webBasePath: string) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const webPath = `${webBasePath}/${entry.name}`;
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath, webPath);
          } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(entry.name)) {
            const stats = await fs.stat(fullPath);
            
            // Try to load metadata
            let metadata = null;
            try {
              const metaPath = path.join(metadataDir, `${entry.name}.meta.json`);
              const metaContent = await fs.readFile(metaPath, 'utf-8');
              metadata = JSON.parse(metaContent);
            } catch {}
            
            media.push({
              filename: entry.name,
              path: webPath,
              size: stats.size,
              uploadedAt: stats.birthtime.toISOString(),
              metadata
            });
          }
        }
      }
      
      await scanDirectory(uploadsDir, '/uploads');
      
      console.log(`📸 [GALLERY] Found ${media.length} images`);
      res.json({ media });
    } catch (e: any) {
      console.error('📸 [GALLERY] Error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // 📤 UPLOAD MEDIA - ✅ FIXED: with dual metadata write
  app.post('/api/media', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      
      let metadata = null;
      if (req.body.metadata) {
        try {
          metadata = JSON.parse(req.body.metadata);
        } catch (e) {
          console.warn('⚠️  [UPLOAD] Failed to parse metadata');
        }
      }
      
      // 📁 ORGANIZE FILE INTO CHARACTER/TYPE STRUCTURE
      const characterId = metadata?.characterId || 'other';
      const type = metadata?.type || 'other';
      const tempPath = req.file.path;
      
      const organizedPath = await organizeImageFile(tempPath, req.file.originalname, characterId, type);
      const finalFilename = path.basename(organizedPath);
      
      // ✅ DUAL METADATA WRITE: Save to both locations
      if (metadata) {
        try {
          // 1. Save to progressive-data/images/
          const metaPath = path.join(metadataDir, `${finalFilename}.meta.json`);
          await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
          
          // 2. ✅ ALSO save to character-data/{character}/{type}/
          const characterDataDir = path.join(
            __dirname,
            '../main-gamedata/character-data',
            characterId.toLowerCase(),
            type.toLowerCase()
          );
          await fs.mkdir(characterDataDir, { recursive: true });
          
          const characterMetaPath = path.join(characterDataDir, `${finalFilename}.json`);
          await fs.writeFile(characterMetaPath, JSON.stringify(metadata, null, 2));
          
          console.log(`✅ [UPLOAD] Metadata synced to both progressive-data and character-data`);
        } catch (e) {
          console.warn(`⚠️  [UPLOAD] Failed to save metadata:`, e);
        }
      }
      
      console.log(`✅ [UPLOAD] Image uploaded and organized: ${organizedPath}`);
      res.json({ 
        success: true, 
        url: organizedPath,
        filename: finalFilename,
        size: req.file.size,
        metadata
      });
    } catch (e: any) {
      console.error('[UPLOAD] Failed:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // 🔄 UPDATE METADATA
  app.put('/api/media/:filename', requireAuth, async (req, res) => {
    try {
      const { filename } = req.params;
      const { metadata } = req.body;
      
      if (!metadata) return res.status(400).json({ error: 'Metadata required' });
      
      // Save updated metadata to both locations
      const metaPath = path.join(metadataDir, `${filename}.meta.json`);
      await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
      
      // Also update in character-data if characterId exists
      if (metadata.characterId && metadata.type) {
        const characterDataDir = path.join(
          __dirname,
          '../main-gamedata/character-data',
          metadata.characterId.toLowerCase(),
          metadata.type.toLowerCase()
        );
        await fs.mkdir(characterDataDir, { recursive: true });
        const characterMetaPath = path.join(characterDataDir, `${filename}.json`);
        await fs.writeFile(characterMetaPath, JSON.stringify(metadata, null, 2));
      }
      
      console.log(`✅ [UPDATE] Metadata updated for ${filename}`);
      res.json({ success: true, metadata });
    } catch (e: any) {
      console.error('[UPDATE] Failed:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // 🗑️ DELETE MEDIA
  app.delete('/api/media/:filename', requireAuth, async (req, res) => {
    try {
      const { filename } = req.params;
      
      // Find file in organized structure
      const filePath = await findImageFile(filename);
      if (!filePath) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Delete file
      await fs.unlink(filePath);
      
      // Delete metadata if exists (both locations)
      try {
        const metaPath = path.join(metadataDir, `${filename}.meta.json`);
        await fs.unlink(metaPath);
      } catch {}
      
      console.log(`✅ [DELETE] Deleted ${filename}`);
      res.json({ success: true });
    } catch (e: any) {
      console.error('[DELETE] Failed:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // 🖼️ GET ALL IMAGES (formatted for character gallery)
  app.get('/api/images', requireAuth, async (req, res) => {
    try {
      const images: any[] = [];
      
      // Scan organized directory structure
      async function scanDirectory(dirPath: string, webBasePath: string, characterId?: string) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const webPath = `${webBasePath}/${entry.name}`;
          
          if (entry.isDirectory()) {
            // First level = character folders
            if (!characterId) {
              await scanDirectory(fullPath, webPath, entry.name);
            } else {
              // Second level = type folders
              await scanDirectory(fullPath, webPath, characterId);
            }
          } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(entry.name)) {
            // Load metadata
            let metadata = null;
            try {
              const metaPath = path.join(metadataDir, `${entry.name}.meta.json`);
              const metaContent = await fs.readFile(metaPath, 'utf-8');
              metadata = JSON.parse(metaContent);
            } catch {}
            
            images.push({
              id: entry.name.split('.')[0],
              characterId: metadata?.characterId || characterId || 'unknown',
              url: webPath,
              filename: entry.name,
              type: metadata?.type || 'other',
              isHidden: metadata?.isHidden || false,
              uploadedAt: (await fs.stat(fullPath)).birthtime.toISOString()
            });
          }
        }
      }
      
      await scanDirectory(uploadsDir, '/uploads');
      
      console.log(`🖼️ [IMAGES API] Returning ${images.length} images`);
      res.json({ images });
    } catch (e: any) {
      console.error('🖼️ [IMAGES API] Error:', e);
      res.status(500).json({ error: e.message });
    }
  });

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
      const levelData = {
        ...req.body,
        requirements: Array.isArray(req.body.requirements) ? req.body.requirements : [],
        unlocks: Array.isArray(req.body.unlocks) ? req.body.unlocks : [],
        rewards: req.body.rewards || {}
      };
      
      await saveGameData('levels', levelData);
      await syncLevels();
      
      res.json({ success: true, level: levelData, levels: getLevelsFromMemory() }); 
    } catch (e: any) {
      res.status(500).json({ error: e.message }); 
    } 
  });

  app.post('/api/admin/characters', requireAuth, requireAdmin, async (req, res) => {
    try {
      await saveGameData('characters', req.body);
      await syncCharacters();
      res.json({ success: true, character: req.body, characters: getCharactersFromMemory() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/upgrades', requireAuth, requireAdmin, async (req, res) => {
    try {
      await saveGameData('upgrades', req.body);
      await syncUpgrades();
      res.json({ success: true, upgrade: req.body, upgrades: getUpgradesFromMemory() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/tasks', requireAuth, requireAdmin, async (req, res) => {
    try {
      await saveGameData('tasks', req.body);
      await syncTasks();
      res.json({ success: true, task: req.body, tasks: getTasksFromMemory() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/achievements', requireAuth, requireAdmin, async (req, res) => {
    try {
      await saveGameData('achievements', req.body);
      await syncAchievements();
      res.json({ success: true, achievement: req.body, achievements: getAchievementsFromMemory() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return server;
}

console.log('✅ [ROUTES] All routes registered');



