import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import logger from "./logger";
import { requireAuth, requireAdmin } from "./middleware/auth";
import { getUpgradesFromMemory, getCharactersFromMemory, getLevelsFromMemory, getUpgradeFromMemory } from "./utils/dataLoader";
import { playerStateManager, getPlayerState, updatePlayerState, selectCharacterForPlayer, setDisplayImageForPlayer, purchaseUpgradeForPlayer } from "./utils/playerStateManager";
import { lunaLearning, lunaTimeOperation } from "./utils/lunaLearningSystem";
import masterDataService from "./utils/MasterDataService";
import { storage } from "./storage";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

// Luna-instrumented operation wrapper
const withLunaTracking = async <T>(operationName: string, operation: () => Promise<T>): Promise<T> => {
  try {
    return await lunaTimeOperation(operationName, operation());
  } catch (error: any) {
    await lunaLearning.trainOnPattern({
      timestamp: new Date(),
      errorPattern: `${operationName}: ${error.message}`,
      errorType: error.code === 'ENOENT' ? 'JSON_FIRST_BLOCKING' : 'DATABASE_FIELD',
      impact: 'HIGH',
      solution: `Fixed ${operationName} with proper error handling and safe defaults`,
      preventionChecks: [`Always null-guard ${operationName} responses`, 'Return complete player objects with defaults']
    });
    throw error;
  }
};

// Multer configuration for media uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage_multer, limits: { fileSize: 10 * 1024 * 1024 } });

export async function registerRoutes(app: Express): Promise<Server> {
  const { createServer } = await import("http");
  const server = createServer(app);

  // 🏥 Health & Luna Learning
  app.get('/api/health', async (_req, res) => {
    try {
      const health = await playerStateManager.healthCheck();
      const lunaStatus = await lunaLearning.getLearningSummary();
      const preventionScan = await lunaLearning.runPreventionScan();
      
      res.json({ 
        status: 'ok', 
        jsonFirst: health, 
        luna: lunaStatus,
        safeModeChecks: preventionScan,
        timestamp: new Date().toISOString() 
      });
    } catch (e:any) {
      res.status(500).json({ status: 'error', error: e.message });
    }
  });

  app.get('/api/luna/learning-report', requireAdmin, async (_req, res) => {
    try {
      const report = await lunaLearning.getLearningSummary();
      const checks = await lunaLearning.getPreventionChecklist();
      res.json({ report, preventionChecks: checks });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/luna/emergency-mode', requireAdmin, async (_req, res) => {
    try {
      await lunaLearning.activateEmergencyMode();
      res.json({ success: true, message: 'Emergency mode activated' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 🔐 Auth
  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const player = await withLunaTracking('auth/me', () => getPlayerState(req.player!.id));
      res.json({ success: true, player });
    } catch (e:any) { res.status(500).json({ error: e.message }); }
  });

  // 👤 Player Operations
  app.get('/api/player/me', requireAuth, async (req, res) => {
    try { 
      const player = await withLunaTracking('player/me', () => getPlayerState(req.player!.id));
      res.json({ player }); 
    } catch(e:any){ res.status(500).json({ error: e.message }); }
  });
  
  app.patch('/api/player/me', requireAuth, async (req, res) => {
    try { 
      const updated = await withLunaTracking('player/patch', () => updatePlayerState(req.player!.id, req.body));
      res.json({ player: updated }); 
    } catch(e:any){ res.status(500).json({ error: e.message }); }
  });
  
  app.post('/api/player/select-character', requireAuth, async (req, res) => {
    try { 
      const updated = await withLunaTracking('select-character', () => selectCharacterForPlayer(req.player!.id, req.body.characterId));
      res.json({ success: true, player: updated }); 
    } catch(e:any){ res.status(500).json({ error: e.message }); }
  });
  
  app.post('/api/player/set-display-image', requireAuth, async (req, res) => {
    try { 
      const updated = await withLunaTracking('set-display-image', () => setDisplayImageForPlayer(req.player!.id, req.body.imageUrl));
      res.json({ success: true, player: updated }); 
    } catch(e:any){ res.status(500).json({ error: e.message }); }
  });
  
  app.post('/api/player/upgrades', requireAuth, async (req, res) => {
    try {
      const { upgradeId, level } = req.body;
      const upgrade = getUpgradeFromMemory(upgradeId);
      if (!upgrade) return res.status(400).json({ error: 'Invalid upgrade' });
      
      const cost = Math.round(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level - 1));
      console.log(`🛒 [UPGRADE] Player ${req.player?.username} purchasing ${upgradeId} level ${level} for ${cost} LP`);
      
      const updated = await withLunaTracking('purchase-upgrade', () => purchaseUpgradeForPlayer(req.player!.id, upgradeId, level, cost));
      console.log(`✅ [UPGRADE] Success for ${updated.username}`);
      
      res.json({ success: true, player: updated });
    } catch(e:any){ 
      console.error(`❌ [UPGRADE] Failed: ${e.message}`);
      res.status(500).json({ error: e.message }); 
    }
  });

  // 📊 Master Data
  app.get('/api/upgrades', requireAuth, (_req, res) => {
    res.json({ upgrades: getUpgradesFromMemory() });
  });
  
  app.get('/api/characters', requireAuth, (_req, res) => {
    res.json({ characters: getCharactersFromMemory() });
  });
  
  app.get('/api/characters/:id', requireAuth, async (req, res) => {
    try {
      const character = getCharactersFromMemory().find(c => c.id === req.params.id);
      if (!character) return res.status(404).json({ error: 'Character not found' });
      res.json(character);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.get('/api/levels', requireAuth, (_req, res) => {
    res.json({ levels: getLevelsFromMemory() });
  });

  // 🎯 Tasks & Achievements System
  app.get('/api/tasks', requireAuth, async (req, res) => {
    try {
      const player = await getPlayerState(req.player!.id);
      
      // Mock tasks data - you can replace with JSON loading
      const tasks = [
        {
          id: 'daily-tap-100',
          name: 'Daily Tapper',
          description: 'Tap 100 times today',
          icon: '👆',
          type: 'daily',
          target: 100,
          progress: Math.min(player.totalTapsToday || 0, 100),
          isCompleted: (player.totalTapsToday || 0) >= 100,
          isClaimed: (player.claimedTasks || []).includes('daily-tap-100'),
          rewardType: 'lp',
          rewardAmount: 500,
          timeRemaining: 86400 // 24 hours in seconds
        },
        {
          id: 'daily-upgrade-buy',
          name: 'Upgrade Hunter',
          description: 'Purchase 3 upgrades today',
          icon: '⬆️',
          type: 'daily',
          target: 3,
          progress: Math.min(player.upgradesPurchasedToday || 0, 3),
          isCompleted: (player.upgradesPurchasedToday || 0) >= 3,
          isClaimed: (player.claimedTasks || []).includes('daily-upgrade-buy'),
          rewardType: 'lg',
          rewardAmount: 10,
          timeRemaining: 86400
        }
      ];
      
      res.json({ tasks });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/achievements', requireAuth, async (req, res) => {
    try {
      const player = await getPlayerState(req.player!.id);
      
      const achievements = [
        {
          id: 'first-million',
          name: 'Millionaire',
          description: 'Earn 1,000,000 Lust Points',
          icon: '💎',
          type: 'permanent',
          rarity: 'epic',
          target: 1000000,
          progress: Math.min(player.lustPoints || player.points || 0, 1000000),
          isCompleted: (player.lustPoints || player.points || 0) >= 1000000,
          isUnlocked: (player.lustPoints || player.points || 0) >= 1000000,
          isClaimed: (player.claimedAchievements || []).includes('first-million'),
          rewardType: 'lg',
          rewardAmount: 100,
          isSecret: false
        },
        {
          id: 'upgrade-master',
          name: 'Upgrade Master',
          description: 'Own 10 different upgrades',
          icon: '🏆',
          type: 'permanent',
          rarity: 'rare',
          target: 10,
          progress: Math.min(Object.keys(player.upgrades || {}).length, 10),
          isCompleted: Object.keys(player.upgrades || {}).length >= 10,
          isUnlocked: Object.keys(player.upgrades || {}).length >= 10,
          isClaimed: (player.claimedAchievements || []).includes('upgrade-master'),
          rewardType: 'lp',
          rewardAmount: 5000,
          isSecret: false
        }
      ];
      
      res.json({ achievements });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/tasks/:id/claim', requireAuth, async (req, res) => {
    try {
      const taskId = req.params.id;
      const player = await getPlayerState(req.player!.id);
      
      // Check if already claimed
      if ((player.claimedTasks || []).includes(taskId)) {
        return res.status(400).json({ error: 'Task already claimed' });
      }
      
      // Mock task rewards - replace with JSON data loading
      const rewards = {
        'daily-tap-100': { type: 'lp', amount: 500 },
        'daily-upgrade-buy': { type: 'lg', amount: 10 }
      };
      
      const reward = rewards[taskId as keyof typeof rewards];
      if (!reward) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const updates: any = {
        claimedTasks: [...(player.claimedTasks || []), taskId]
      };
      
      if (reward.type === 'lp') {
        updates.lustPoints = Math.round((player.lustPoints || player.points || 0) + reward.amount);
        updates.points = updates.lustPoints;
      } else if (reward.type === 'lg') {
        updates.lustGems = Math.round((player.lustGems || 0) + reward.amount);
      }
      
      const updated = await withLunaTracking('claim-task', () => updatePlayerState(req.player!.id, updates));
      res.json({ success: true, player: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/achievements/:id/claim', requireAuth, async (req, res) => {
    try {
      const achievementId = req.params.id;
      const player = await getPlayerState(req.player!.id);
      
      if ((player.claimedAchievements || []).includes(achievementId)) {
        return res.status(400).json({ error: 'Achievement already claimed' });
      }
      
      const rewards = {
        'first-million': { type: 'lg', amount: 100 },
        'upgrade-master': { type: 'lp', amount: 5000 }
      };
      
      const reward = rewards[achievementId as keyof typeof rewards];
      if (!reward) {
        return res.status(404).json({ error: 'Achievement not found' });
      }
      
      const updates: any = {
        claimedAchievements: [...(player.claimedAchievements || []), achievementId]
      };
      
      if (reward.type === 'lp') {
        updates.lustPoints = Math.round((player.lustPoints || player.points || 0) + reward.amount);
        updates.points = updates.lustPoints;
      } else if (reward.type === 'lg') {
        updates.lustGems = Math.round((player.lustGems || 0) + reward.amount);
      }
      
      const updated = await withLunaTracking('claim-achievement', () => updatePlayerState(req.player!.id, updates));
      res.json({ success: true, player: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 📁 Media Upload
  app.post('/api/media/upload', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const mediaUpload = {
        id: uuidv4(),
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
        characterId: req.body.characterId || null,
        uploadedBy: req.player!.id,
        isHidden: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await storage.createMediaUpload(mediaUpload);
      res.json({ success: true, media: mediaUpload });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/media', requireAuth, async (req, res) => {
    try {
      const { characterId, includeHidden } = req.query;
      const media = await storage.getMediaUploads(
        characterId as string,
        includeHidden === 'true'
      );
      res.json({ media });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 🔧 Admin Routes
  app.get('/api/admin/players', requireAdmin, async (_req, res) => {
    try {
      const players = await storage.getAllPlayers();
      res.json({ players });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/upgrades', requireAdmin, async (req, res) => {
    try {
      const upgrade = await storage.createUpgrade(req.body);
      await masterDataService.reloadUpgrades();
      res.json({ success: true, upgrade, upgrades: getUpgradesFromMemory() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/upgrades/:id', requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateUpgrade(req.params.id, req.body);
      await masterDataService.reloadUpgrades();
      res.json({ success: true, upgrade: updated, upgrades: getUpgradesFromMemory() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/upgrades/:id', requireAdmin, async (req, res) => {
    try {
      await storage.deleteUpgrade(req.params.id);
      await masterDataService.reloadUpgrades();
      res.json({ success: true, upgrades: getUpgradesFromMemory() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/characters', requireAdmin, async (req, res) => {
    try {
      const character = await storage.createCharacter(req.body);
      await masterDataService.reloadCharacters();
      res.json({ success: true, character, characters: getCharactersFromMemory() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/characters/:id', requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateCharacter(req.params.id, req.body);
      await masterDataService.reloadCharacters();
      res.json({ success: true, character: updated, characters: getCharactersFromMemory() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/characters/:id', requireAdmin, async (req, res) => {
    try {
      await storage.deleteCharacter(req.params.id);
      await masterDataService.reloadCharacters();
      res.json({ success: true, characters: getCharactersFromMemory() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/levels', requireAdmin, async (req, res) => {
    try {
      const level = await storage.createLevel(req.body);
      await masterDataService.reloadLevels();
      res.json({ success: true, level, levels: getLevelsFromMemory() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return server;
}