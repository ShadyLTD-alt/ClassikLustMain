import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { AuthDataValidator } from "@telegram-auth/server";
import { requireAuth, requireAdmin } from "./middleware/auth";
import { 
  saveUpgradeToJSON, 
  saveLevelToJSON, 
  saveCharacterToJSON, 
  savePlayerDataToJSON,
  getUpgradesFromMemory,
  getUpgradeFromMemory,
  getCharactersFromMemory,
  getCharacterFromMemory,
  getLevelsFromMemory,
  getLevelFromMemory,
  syncAllGameData
} from "./utils/dataLoader";
// 🔄 IMPORT: Sync queue system with FK constraint handling
import { 
  queuePlayerSync, 
  queueUpgradeSync, 
  queueCharacterSync, 
  queueLevelSync, 
  forceFlushAllQueues, 
  getAllQueueStatus,
  cleanupForeignKeyErrors // 🧹 NEW: FK constraint cleanup
} from "./utils/syncQueue";
import { insertUpgradeSchema, insertCharacterSchema, insertLevelSchema, insertPlayerUpgradeSchema, insertMediaUploadSchema } from "@shared/schema";
import { generateSecureToken, getSessionExpiry } from "./utils/auth";
import logger from "./logger";
// ✅ LUNA FIX: Import MasterDataService for single source of truth
import masterDataService from "./utils/MasterDataService";
// 🎯 JSON-FIRST: Import new player state manager WITH FIXED EXPORTS
import { playerStateManager, getPlayerState, updatePlayerState, selectCharacterForPlayer, purchaseUpgradeForPlayer, setDisplayImageForPlayer } from "./utils/playerStateManager";
// 🌙 LUNA LEARNING: Import enhanced learning system
import { lunaLearning } from "./utils/lunaLearningSystem";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📁 Directory constants for master-data template system - FIXED PATHS
const MASTER_DATA_DIR = path.join(process.cwd(), 'main-gamedata', 'master-data'); // 🔧 FIXED: Correct path
const MAIN_GAMEDATA_DIR = path.join(process.cwd(), 'main-gamedata');

// 🏆 NEW: Load tasks from JSON files
const getTasksFromJSON = async () => {
  try {
    const tasksDir = path.join(MAIN_GAMEDATA_DIR, 'progressive-data', 'tasks');
    const dailyTasksFile = path.join(tasksDir, 'daily-tasks.json');
    
    let tasks = [];
    if (fs.existsSync(dailyTasksFile)) {
      const data = await fs.promises.readFile(dailyTasksFile, 'utf8');
      tasks = JSON.parse(data);
    }
    
    return tasks;
  } catch (error) {
    console.error('Failed to load tasks from JSON:', error);
    return [];
  }
};

// 🏅 NEW: Load achievements from JSON files
const getAchievementsFromJSON = async () => {
  try {
    const achievementsDir = path.join(MAIN_GAMEDATA_DIR, 'progressive-data', 'achievements');
    const achievementsFile = path.join(achievementsDir, 'permanent-achievements.json');
    
    let achievements = [];
    if (fs.existsSync(achievementsFile)) {
      const data = await fs.promises.readFile(achievementsFile, 'utf8');
      achievements = JSON.parse(data);
    }
    
    return achievements;
  } catch (error) {
    console.error('Failed to load achievements from JSON:', error);
    return [];
  }
};

// 🔧 TYPE COERCION HELPERS FOR ADMIN FORMS
const coerceNumeric = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const coerceInteger = (value: any): number => {
  if (typeof value === 'number') return Math.round(value);
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const sanitizeUpgrade = (data: any) => ({
  ...data,
  maxLevel: coerceInteger(data.maxLevel),
  baseCost: coerceNumeric(data.baseCost),
  costMultiplier: coerceNumeric(data.costMultiplier),
  baseValue: coerceNumeric(data.baseValue),
  valueIncrement: coerceNumeric(data.valueIncrement),
  unlockLevel: coerceInteger(data.unlockLevel || 1),
  isHidden: Boolean(data.isHidden)
});

const sanitizeCharacter = (data: any) => ({
  ...data,
  unlockLevel: coerceInteger(data.unlockLevel || 1),
  rarity: data.rarity || 'Common',
  isHidden: Boolean(data.isHidden),
  isVip: Boolean(data.isVip)
});

const sanitizeLevel = (data: any) => ({
  ...data,
  level: coerceInteger(data.level),
  experienceRequired: coerceInteger(data.experienceRequired || 0),
  pointsReward: coerceInteger(data.pointsReward || 0),
  requirements: Array.isArray(data.requirements) ? data.requirements : []
});

// 🔧 TIMEOUT HELPER: Wrap database operations with timeout protection
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 5000, operation: string = 'operation'): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    logger.error(`Timeout in ${operation}`, { error: error instanceof Error ? error.message : 'Unknown' });
    
    // 🌙 TRAIN LUNA ON TIMEOUT PATTERNS
    if (error instanceof Error && error.message.includes('timed out')) {
      lunaLearning.recordOperationTiming(operation, timeoutMs);
    }
    
    throw error;
  }
};

const storageConfig = multer.diskStorage({
  destination: function (req, _file, cb) {
    const uploadPath = path.join(__dirname, "..", "uploads", "temp");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storageConfig,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  logger.info('⚡ Registering routes...');

  // 🔧 REGISTER DEBUG ROUTES (development only)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const debugRoutes = await import('./routes/debug');
      app.use('/api/debug', debugRoutes.default);
      console.log('🔧 Debug routes registered at /api/debug');
      
      // 🆕 NEW: Raw player file debug route
      app.get('/api/debug/raw-player', requireAuth, async (req, res) => {
        try {
          const playerId = req.player!.id;
          const player = await storage.getPlayer(playerId);
          
          if (!player) {
            return res.status(404).json({ error: 'Player not found' });
          }
          
          const folder = `${player.telegramId}_${player.username}`.replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `player_${player.username.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
          const fullPath = path.join(process.cwd(), 'main-gamedata', 'player-data', folder, filename);
          
          const exists = fs.existsSync(fullPath);
          let data = null;
          let parseError = null;
          
          if (exists) {
            try {
              const content = await fs.promises.readFile(fullPath, 'utf8');
              data = JSON.parse(content);
            } catch (err) {
              parseError = err instanceof Error ? err.message : 'Parse error';
            }
          }
          
          res.json({
            exists,
            path: fullPath,
            folder,
            filename,
            keys: data ? Object.keys(data) : [],
            parseError,
            fileSize: exists ? fs.statSync(fullPath).size : 0
          });
          
        } catch (error) {
          res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
      });
      
    } catch (error) {
      console.warn('⚠️ Debug routes not available:', error instanceof Error ? error.message : 'Unknown');
    }
  }

  // 🔍 DIAGNOSTIC: Enhanced health check with detailed debugging
  app.get("/api/health", async (req, res) => {
    try {
      const playerStateHealth = await withTimeout(
        playerStateManager.healthCheck(),
        3000,
        'player state health check'
      );
      const queueStatus = getAllQueueStatus();
      const timestamp = new Date().toISOString();
      
      // Check session token if provided
      let sessionInfo = null;
      const sessionToken = req.headers['authorization']?.replace('Bearer ', '');
      if (sessionToken) {
        try {
          const session = await withTimeout(
            storage.getSessionByToken(sessionToken),
            2000,
            'session validation'
          );
          sessionInfo = {
            exists: !!session,
            playerId: session?.player?.id,
            username: session?.player?.username,
            telegramId: session?.player?.telegramId,
            isAdmin: session?.player?.isAdmin,
            expiresAt: session?.expiresAt
          };
        } catch (err) {
          sessionInfo = { error: err instanceof Error ? err.message : 'Unknown session error' };
        }
      }
      
      logger.info('Health check requested', { 
        timestamp, 
        sessionProvided: !!sessionToken,
        sessionInfo 
      });
      
      res.json({ 
        status: 'ok', 
        timestamp,
        env: process.env.NODE_ENV || 'development',
        port: process.env.PORT || '5000',
        jsonFirst: {
          active: true,
          ...playerStateHealth
        },
        syncQueues: queueStatus, // 🔄 Show queue status with FK errors
        session: sessionInfo,
        logging: {
          logDir: path.resolve(process.cwd(), "logs"),
          fallbackActive: !fs.existsSync(path.resolve(process.cwd(), "logs")),
          lastHealthCheck: timestamp
        },
        luna: {
          safeModeActive: lunaLearning.getSafeModeConfig().enabled,
          asyncLockBypassed: lunaLearning.shouldBypassAsyncLock(),
          maxOperationTimeMs: lunaLearning.getMaxOperationTime()
        }
      });
    } catch (error) {
      logger.error('Health check failed', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ 
        status: 'error', 
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed'
      });
    }
  });

  // 🏆 NEW: Get tasks with player progress
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      console.log(`🏆 [TASKS] Request from: ${req.player?.username}`);
      
      const tasks = await getTasksFromJSON();
      const playerState = await getPlayerState(req.player!.id);
      
      // Calculate progress for each task
      const tasksWithProgress = tasks.map((task: any) => {
        let progress = 0;
        let isCompleted = false;
        let timeRemaining = null;
        
        switch (task.requirementType) {
          case 'tapCount':
            progress = playerState.totalTapsToday || 0;
            break;
          case 'lpEarnedToday':
            progress = playerState.lpEarnedToday || 0;
            break;
          case 'energyEfficiency':
            const currentEfficiency = Math.round((playerState.energy / playerState.energyMax) * 100);
            progress = currentEfficiency >= task.target ? task.target : currentEfficiency;
            break;
          case 'upgradesPurchasedToday':
            progress = playerState.upgradesPurchasedToday || 0;
            break;
        }
        
        isCompleted = progress >= task.target;
        
        // Calculate time remaining for daily tasks
        if (task.resetType === 'daily') {
          const now = new Date();
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          timeRemaining = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
        }
        
        return {
          ...task,
          progress,
          isCompleted,
          isClaimed: playerState.claimedTasks?.includes(task.id) || false,
          timeRemaining
        };
      });
      
      console.log(`✅ [TASKS] Loaded ${tasksWithProgress.length} tasks for ${playerState.username}`);
      res.json({ success: true, tasks: tasksWithProgress });
    } catch (error) {
      logger.error('Tasks fetch error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // 🏅 NEW: Get achievements with player progress
  app.get("/api/achievements", requireAuth, async (req, res) => {
    try {
      console.log(`🏅 [ACHIEVEMENTS] Request from: ${req.player?.username}`);
      
      const achievements = await getAchievementsFromJSON();
      const playerState = await getPlayerState(req.player!.id);
      
      // Calculate progress for each achievement
      const achievementsWithProgress = achievements.map((achievement: any) => {
        let progress = 0;
        let isUnlocked = false;
        
        switch (achievement.requirementType) {
          case 'tapCount':
            progress = playerState.totalTapsAllTime || 0;
            break;
          case 'lpTotal':
            progress = playerState.lustPoints || playerState.points || 0;
            break;
          case 'levelReached':
            progress = playerState.level || 1;
            break;
          case 'charactersUnlocked':
            progress = (playerState.unlockedCharacters || []).length;
            break;
          case 'upgradesTotal':
            progress = Object.values(playerState.upgrades || {}).reduce((sum: number, level: any) => sum + (level || 0), 0);
            break;
          case 'consecutiveDays':
            progress = playerState.consecutiveDays || 0;
            break;
        }
        
        isUnlocked = progress >= achievement.target;
        
        return {
          ...achievement,
          progress,
          isUnlocked,
          isClaimed: playerState.claimedAchievements?.includes(achievement.id) || false,
          unlockedAt: isUnlocked ? (playerState.achievementUnlockDates?.[achievement.id] || null) : null
        };
      });
      
      console.log(`✅ [ACHIEVEMENTS] Loaded ${achievementsWithProgress.length} achievements for ${playerState.username}`);
      res.json({ success: true, achievements: achievementsWithProgress });
    } catch (error) {
      logger.error('Achievements fetch error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to fetch achievements' });
    }
  });

  // 🏆 NEW: Claim task reward
  app.post("/api/tasks/:id/claim", requireAuth, async (req, res) => {
    try {
      const { id: taskId } = req.params;
      console.log(`🏆 [CLAIM TASK] ${req.player?.username} claiming task: ${taskId}`);
      
      const tasks = await getTasksFromJSON();
      const task = tasks.find((t: any) => t.id === taskId);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const playerState = await getPlayerState(req.player!.id);
      
      // Check if already claimed
      if ((playerState.claimedTasks || []).includes(taskId)) {
        return res.status(400).json({ error: 'Task reward already claimed' });
      }
      
      // Verify task is completed
      let progress = 0;
      switch (task.requirementType) {
        case 'tapCount':
          progress = playerState.totalTapsToday || 0;
          break;
        case 'lpEarnedToday':
          progress = playerState.lpEarnedToday || 0;
          break;
        case 'energyEfficiency':
          progress = Math.round((playerState.energy / playerState.energyMax) * 100);
          break;
        case 'upgradesPurchasedToday':
          progress = playerState.upgradesPurchasedToday || 0;
          break;
      }
      
      if (progress < task.target) {
        return res.status(400).json({ error: 'Task not completed yet' });
      }
      
      // Apply reward
      const updates: any = {
        claimedTasks: [...(playerState.claimedTasks || []), taskId]
      };
      
      if (task.rewardType === 'lp') {
        updates.lustPoints = (playerState.lustPoints || playerState.points || 0) + task.rewardAmount;
      } else if (task.rewardType === 'lg') {
        updates.lustGems = (playerState.lustGems || 0) + task.rewardAmount;
      } else if (task.rewardType === 'energy') {
        updates.energy = Math.min(playerState.energyMax, playerState.energy + task.rewardAmount);
      }
      
      const updatedState = await updatePlayerState(req.player!.id, updates);
      
      console.log(`✅ [CLAIM TASK] Reward claimed: ${task.rewardAmount} ${task.rewardType}`);
      
      res.json({ 
        success: true, 
        player: updatedState,
        reward: { type: task.rewardType, amount: task.rewardAmount }
      });
    } catch (error) {
      logger.error('Task claim error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to claim task reward' });
    }
  });

  // 🏅 NEW: Claim achievement reward
  app.post("/api/achievements/:id/claim", requireAuth, async (req, res) => {
    try {
      const { id: achievementId } = req.params;
      console.log(`🏅 [CLAIM ACHIEVEMENT] ${req.player?.username} claiming: ${achievementId}`);
      
      const achievements = await getAchievementsFromJSON();
      const achievement = achievements.find((a: any) => a.id === achievementId);
      
      if (!achievement) {
        return res.status(404).json({ error: 'Achievement not found' });
      }
      
      const playerState = await getPlayerState(req.player!.id);
      
      // Check if already claimed
      if ((playerState.claimedAchievements || []).includes(achievementId)) {
        return res.status(400).json({ error: 'Achievement reward already claimed' });
      }
      
      // Verify achievement is unlocked
      let progress = 0;
      switch (achievement.requirementType) {
        case 'tapCount':
          progress = playerState.totalTapsAllTime || 0;
          break;
        case 'lpTotal':
          progress = playerState.lustPoints || playerState.points || 0;
          break;
        case 'levelReached':
          progress = playerState.level || 1;
          break;
        case 'charactersUnlocked':
          progress = (playerState.unlockedCharacters || []).length;
          break;
        case 'upgradesTotal':
          progress = Object.values(playerState.upgrades || {}).reduce((sum: number, level: any) => sum + (level || 0), 0);
          break;
      }
      
      if (progress < achievement.target) {
        return res.status(400).json({ error: 'Achievement not unlocked yet' });
      }
      
      // Apply reward
      const updates: any = {
        claimedAchievements: [...(playerState.claimedAchievements || []), achievementId],
        achievementUnlockDates: {
          ...playerState.achievementUnlockDates,
          [achievementId]: new Date().toISOString()
        }
      };
      
      if (achievement.rewardType === 'lp') {
        updates.lustPoints = (playerState.lustPoints || playerState.points || 0) + achievement.rewardAmount;
      } else if (achievement.rewardType === 'lg') {
        updates.lustGems = (playerState.lustGems || 0) + achievement.rewardAmount;
      }
      
      // Handle special rewards
      if (achievement.rewardData?.characterUnlock) {
        updates.unlockedCharacters = [...(playerState.unlockedCharacters || []), achievement.rewardData.characterUnlock];
      }
      
      const updatedState = await updatePlayerState(req.player!.id, updates);
      
      console.log(`✅ [CLAIM ACHIEVEMENT] Reward claimed: ${achievement.rewardAmount} ${achievement.rewardType}`);
      
      res.json({ 
        success: true, 
        player: updatedState,
        reward: { type: achievement.rewardType, amount: achievement.rewardAmount },
        specialRewards: achievement.rewardData || {}
      });
    } catch (error) {
      logger.error('Achievement claim error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to claim achievement reward' });
    }
  });

  // 🚀 NEW: Level-up endpoint to fix "Maximum level reached!" bug
  app.post("/api/player/level-up", requireAuth, async (req, res) => {
    try {
      const { targetLevel } = req.body;
      console.log(`🆙 [LEVEL UP] Request from: ${req.player?.username} to level ${targetLevel}`);
      
      // Get current player state
      const playerState = await withTimeout(
        getPlayerState(req.player!.id),
        5000,
        'get player state for level up'
      );
      
      const currentLevel = playerState.level || 1;
      const nextLevel = targetLevel || (currentLevel + 1);
      
      // Find level configuration
      const levels = getLevelsFromMemory();
      const levelConfig = levels.find(l => l.level === nextLevel);
      
      if (!levelConfig) {
        console.log(`❌ [LEVEL UP] Level ${nextLevel} configuration not found`);
        return res.status(404).json({ error: `Level ${nextLevel} not available` });
      }
      
      // Check requirements
      const experienceRequired = levelConfig.experienceRequired || (nextLevel * 1000);
      const hasEnoughExperience = playerState.experience >= experienceRequired;
      
      if (!hasEnoughExperience) {
        const needed = experienceRequired - playerState.experience;
        console.log(`❌ [LEVEL UP] Not enough experience: need ${needed} more`);
        return res.status(400).json({ 
          error: 'Not enough experience', 
          required: experienceRequired,
          current: playerState.experience,
          needed 
        });
      }
      
      // Check upgrade requirements
      const requirements = levelConfig.requirements || [];
      for (const req of requirements) {
        const playerUpgradeLevel = playerState.upgrades[req.upgradeId] || 0;
        if (playerUpgradeLevel < req.minLevel) {
          const upgrade = getUpgradeFromMemory(req.upgradeId);
          console.log(`❌ [LEVEL UP] Requirement not met: ${upgrade?.name} level ${req.minLevel}`);
          return res.status(400).json({ 
            error: `Requirement not met: ${upgrade?.name || req.upgradeId} level ${req.minLevel}` 
          });
        }
      }
      
      // 🏆 FIXED: Sync level-up to database (playerLevelUps table)
      try {
        await storage.recordPlayerLevelUp(req.player!.id, nextLevel, 'progression');
        console.log(`✅ [LEVEL UP] Level-up synced to playerLevelUps table`);
      } catch (dbError) {
        console.warn(`⚠️ [LEVEL UP] DB sync failed (continuing with JSON):`, dbError);
      }
      
      // Perform level up
      const pointsReward = levelConfig.pointsReward || 0;
      const levelUpUpdates = {
        level: nextLevel,
        experience: Math.max(0, playerState.experience - experienceRequired), // Subtract used experience
        lustPoints: (playerState.lustPoints || playerState.points || 0) + pointsReward
      };
      
      console.log(`🆙 [LEVEL UP] Leveling up player to level ${nextLevel}`, {
        experienceUsed: experienceRequired,
        pointsReward,
        remainingExperience: levelUpUpdates.experience
      });
      
      const updatedState = await withTimeout(
        updatePlayerState(req.player!.id, levelUpUpdates),
        5000,
        'apply level up updates'
      );
      
      console.log(`✅ [LEVEL UP] SUCCESS: ${playerState.username} reached level ${nextLevel}`);
      
      res.json({ 
        success: true, 
        player: updatedState,
        levelUp: {
          newLevel: nextLevel,
          experienceUsed: experienceRequired,
          pointsReward,
          unlocks: levelConfig.unlocks || []
        }
      });
      
    } catch (error) {
      console.error(`🔴 [LEVEL UP] Failed for ${req.player?.username}:`, error);
      logger.error('Level up error', { 
        playerId: req.player?.id,
        username: req.player?.username,
        targetLevel: req.body.targetLevel,
        error: error instanceof Error ? error.message : 'Unknown' 
      });
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to level up' });
    }
  });

  // 🌙 LUNA LEARNING ENDPOINTS
  app.get("/api/luna/learning-report", requireAuth, requireAdmin, async (req, res) => {
    try {
      const summary = await withTimeout(
        lunaLearning.getLearningSummary(),
        5000,
        'luna learning summary'
      );
      const checklist = await withTimeout(
        lunaLearning.getPreventionChecklist(),
        5000,
        'luna prevention checklist'
      );
      const scan = await withTimeout(
        lunaLearning.runPreventionScan(),
        5000,
        'luna prevention scan'
      );
      
      res.json({
        success: true,
        luna: {
          learning: summary,
          preventionChecklist: checklist,
          currentScan: scan,
          operationMetrics: lunaLearning.getOperationMetrics(),
          message: "Luna's enhanced knowledge including AsyncLock deadlock prevention"
        }
      });
    } catch (error) {
      logger.error('Luna learning report error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to generate Luna learning report' });
    }
  });

  // 🌙 LUNA EMERGENCY MODE ENDPOINT
  app.post("/api/luna/emergency-mode", requireAuth, requireAdmin, async (req, res) => {
    try {
      await lunaLearning.activateEmergencyMode();
      res.json({
        success: true,
        message: 'Luna emergency mode activated - all known problematic modules bypassed',
        safeModeConfig: lunaLearning.getSafeModeConfig()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to activate emergency mode' });
    }
  });

  // 🔄 Sync queue status endpoint for admin monitoring
  app.get("/api/admin/sync-queues", requireAuth, requireAdmin, async (req, res) => {
    try {
      const status = getAllQueueStatus();
      res.json({
        success: true,
        queues: status,
        message: 'Sync queue status - JSON changes queued for DB sync'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get sync queue status' });
    }
  });

  // 🔄 Force flush all queues (admin tool)
  app.post("/api/admin/sync-queues/flush", requireAuth, requireAdmin, async (req, res) => {
    try {
      const statusBefore = getAllQueueStatus();
      await forceFlushAllQueues();
      const statusAfter = getAllQueueStatus();
      
      res.json({
        success: true,
        before: statusBefore,
        after: statusAfter,
        message: 'All sync queues flushed to database immediately'
      });
    } catch (error) {
      logger.error('Force flush queues error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to flush sync queues' });
    }
  });

  // 🧹 NEW: Clean up foreign key constraint violations
  app.post("/api/admin/cleanup-fk", requireAuth, requireAdmin, async (req, res) => {
    try {
      console.log(`🧹 [ADMIN] FK cleanup requested by: ${req.player?.username}`);
      
      const result = await cleanupForeignKeyErrors();
      
      console.log(`🧹 [ADMIN] FK cleanup result:`, result);
      
      res.json({
        success: true,
        cleanup: result,
        message: `FK constraint cleanup complete: ${result.cleaned} items cleaned`,
        queueStatusAfter: getAllQueueStatus()
      });
    } catch (error) {
      logger.error('FK cleanup error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ 
        error: 'Failed to cleanup foreign key constraints',
        details: error instanceof Error ? error.message : 'Unknown'
      });
    }
  });

  // 🧹 NEW: Clean up sessions for specific player (manual FK fix)
  app.post("/api/admin/cleanup-player-sessions", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { playerId } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ error: 'Player ID is required' });
      }
      
      console.log(`🧹 [ADMIN] Manual session cleanup for player: ${playerId}`);
      
      const deletedSessions = await storage.deletePlayerSessions(playerId);
      
      res.json({
        success: true,
        deletedSessions,
        message: `Cleaned up ${deletedSessions} sessions for player ${playerId}`,
        playerId
      });
    } catch (error) {
      logger.error('Manual session cleanup error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ 
        error: 'Failed to cleanup player sessions',
        details: error instanceof Error ? error.message : 'Unknown'
      });
    }
  });

  // 🔧 DEV AUTH: Now auto-unlocks all characters in development
  app.post("/api/auth/dev", async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Development login not available in production' });
    }

    try {
      const { username } = req.body;
      console.log(`🔍 [DEV AUTH] Login request for username: ${username}`);
      
      if (!username || username.trim().length === 0) {
        return res.status(400).json({ error: 'Username is required' });
      }

      const sanitizedUsername = username.trim().substring(0, 50);
      const devTelegramId = `dev_${sanitizedUsername.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      
      console.log(`🔍 [DEV AUTH] Generated telegramId: ${devTelegramId}`);

      let player = await withTimeout(
        storage.getPlayerByTelegramId(devTelegramId),
        3000,
        'get player by telegram id'
      );
      console.log(`🔍 [DEV AUTH] Player lookup result:`, {
        found: !!player,
        id: player?.id,
        username: player?.username,
        telegramId: player?.telegramId
      });

      if (!player) {
        console.log(`🔍 [DEV AUTH] Creating new dev player...`);
        const playerData = await masterDataService.createNewPlayerData(devTelegramId, sanitizedUsername);
        
        // 🔧 DEV: Auto-unlock all characters
        const characters = getCharactersFromMemory();
        playerData.unlockedCharacters = characters.map(c => c.id);
        if (characters.length > 0) {
          playerData.selectedCharacterId = characters[0].id;
        }
        console.log(`🔓 [DEV AUTH] Auto-unlocked ${characters.length} characters`);
        
        player = await withTimeout(
          storage.createPlayer(playerData),
          5000,
          'create new dev player'
        );
        await savePlayerDataToJSON(player);
        console.log(`🎮 Created new dev player: ${sanitizedUsername} (${devTelegramId}_${sanitizedUsername})`);
      } else {
        console.log(`🔍 [DEV AUTH] Updating existing player login time...`);
        await withTimeout(
          storage.updatePlayer(player.id, { lastLogin: new Date() }),
          3000,
          'update player login time'
        );
        await savePlayerDataToJSON(player);
      }

      const sessionToken = generateSecureToken();
      console.log(`🔍 [DEV AUTH] Generated session token: ${sessionToken.slice(0, 8)}...`);
      
      await withTimeout(
        storage.createSession({
          playerId: player.id,
          token: sessionToken,
          expiresAt: getSessionExpiry(),
        }),
        3000,
        'create session'
      );
      
      console.log(`✅ [DEV AUTH] Session created for player ${player.username}`);
      logger.info('Dev auth successful', { username: player.username, playerId: player.id });

      res.json({ success: true, player, sessionToken });
    } catch (error) {
      console.error(`🔴 [DEV AUTH] Failed:`, error);
      logger.error('Dev auth error', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Authentication failed', details: (error as Error).message });
    }
  });

  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const { initData } = req.body;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        return res.status(500).json({ error: 'Telegram authentication not configured' });
      }

      if (!initData) {
        return res.status(400).json({ error: 'Missing initData' });
      }

      const validator = new AuthDataValidator({ botToken });
      const dataMap = new Map(new URLSearchParams(initData).entries());
      const validationResult = await validator.validate(dataMap);

      if (!validationResult || !validationResult.id) {
        return res.status(401).json({ error: 'Invalid Telegram authentication' });
      }

      const telegramId = validationResult.id.toString();
      const username = (validationResult as any).username || (validationResult as any).first_name || 'TelegramUser';

      let player = await withTimeout(
        storage.getPlayerByTelegramId(telegramId),
        3000,
        'get telegram player'
      );

      if (!player) {
        const playerData = await masterDataService.createNewPlayerData(telegramId, username);
        player = await withTimeout(
          storage.createPlayer(playerData),
          5000,
          'create telegram player'
        );
        await savePlayerDataToJSON(player);
        console.log(`🎮 Created new Telegram player: ${username} (${telegramId}_${username})`);
      } else {
        await withTimeout(
          storage.updatePlayer(player.id, { lastLogin: new Date() }),
          3000,
          'update telegram player login'
        );
        await savePlayerDataToJSON(player);
      }

      const sessionToken = generateSecureToken();
      await withTimeout(
        storage.createSession({
          playerId: player.id,
          token: sessionToken,
          expiresAt: getSessionExpiry(),
        }),
        3000,
        'create telegram session'
      );

      res.json({ success: true, player, sessionToken });
    } catch (error) {
      logger.error('Telegram auth error', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Authentication failed', details: (error as Error).message });
    }
  });

  // 🔍 DIAGNOSTIC: Enhanced auth/me endpoint with detailed logging
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      console.log(`🔍 [AUTH/ME] Request from player: ${req.player?.username || req.player?.id}`);
      console.log(`🔍 [AUTH/ME] Player data:`, {
        id: req.player?.id,
        telegramId: req.player?.telegramId,
        username: req.player?.username,
        isAdmin: req.player?.isAdmin
      });
      
      // 🎯 JSON-FIRST: Load from telegramId_username folder JSON
      const playerState = await withTimeout(
        getPlayerState(req.player!.id),
        5000,
        'get player state'
      );
      console.log(`✅ [AUTH/ME] Loaded player state for: ${playerState.username}`);
      
      res.json({ success: true, player: playerState });
    } catch (error) {
      console.error(`🔴 [AUTH/ME] Failed to load player ${req.player?.username}:`, error);
      logger.error('Auth/me error', { 
        playerId: req.player?.id,
        username: req.player?.username,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(500).json({ error: 'Failed to fetch player data' });
    }
  });

  // Get all upgrades (from memory)
  app.get("/api/upgrades", requireAuth, async (_req, res) => {
    try {
      const upgrades = getUpgradesFromMemory();
      res.json({ upgrades });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get all characters (from memory)
  app.get("/api/characters", requireAuth, async (_req, res) => {
    try {
      const characters = getCharactersFromMemory();
      res.json({ characters });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get specific character
  app.get("/api/characters/:id", requireAuth, async (req, res) => {
    try {
      const character = getCharacterFromMemory(req.params.id);
      if (!character) {
        return res.status(404).json({ error: 'Character not found' });
      }
      res.json(character);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get all levels (from memory) 
  app.get("/api/levels", requireAuth, async (_req, res) => {
    try {
      const levels = getLevelsFromMemory();
      res.json({ levels });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // 🎯 JSON-FIRST: Get player data (from telegramId_username folder) - ENHANCED DEBUGGING
  app.get("/api/player/me", requireAuth, async (req, res) => {
    try {
      console.log(`🔍 [PLAYER/ME] Request from: ${req.player?.username || req.player?.id}`);
      
      const playerState = await withTimeout(
        getPlayerState(req.player!.id),
        5000,
        'get player state'
      );
      console.log(`✅ [PLAYER/ME] Successfully loaded state for: ${playerState.username}`);
      console.log(`🔍 [PLAYER/ME] State summary:`, {
        points: playerState.points,
        level: playerState.level,
        experience: playerState.experience, // 🆕 Include experience in logs
        selectedCharacterId: playerState.selectedCharacterId,
        displayImage: playerState.displayImage ? 'set' : 'null',
        upgradesCount: Object.keys(playerState.upgrades || {}).length, // 🚨 SAFE: Add || {} to prevent crash
        unlockedCharacters: (playerState.unlockedCharacters || []).length // 🚨 SAFE: Add || [] to prevent crash
      });
      
      res.json({ player: playerState });
    } catch (error) {
      console.error(`🔴 [PLAYER/ME] Failed for ${req.player?.username}:`, error);
      logger.error('Player fetch error', { 
        playerId: req.player?.id,
        username: req.player?.username,
        error: error instanceof Error ? error.message : 'Unknown' 
      });
      res.status(500).json({ error: 'Failed to fetch player data' });
    }
  });

  // 🎯 JSON-FIRST: Update player data (immediate telegramId_username JSON + queued DB sync)
  app.patch("/api/player/me", requireAuth, async (req, res) => {
    try {
      const updates = req.body;
      console.log(`🔍 [PLAYER/ME PATCH] Update request from: ${req.player?.username}`, Object.keys(updates));
      
      // Security: prevent admin escalation
      if (updates.isAdmin !== undefined) {
        delete updates.isAdmin;
      }

      // Round integer fields to prevent PostgreSQL errors
      const integerFields = ['points', 'energy', 'energyMax', 'level', 'experience', 'passiveIncomeRate'];
      for (const field of integerFields) {
        if (updates[field] !== undefined && typeof updates[field] === 'number') {
          updates[field] = Math.round(updates[field]);
        }
      }

      // Apply updates via JSON-first manager
      const updatedState = await withTimeout(
        updatePlayerState(req.player!.id, updates),
        5000,
        'update player state'
      );
      console.log(`✅ [PLAYER/ME PATCH] Successfully updated: ${updatedState.username}`);

      // 🔄 Player sync is handled automatically in updatePlayerState via queuePlayerSync

      // Handle sendBeacon requests (no response expected)
      if (req.headers['content-type']?.includes('text/plain')) {
        res.status(204).end();
      } else {
        res.json({ player: updatedState });
      }
      
    } catch (error) {
      console.error(`🔴 [PLAYER/ME PATCH] Failed for ${req.player?.username}:`, error);
      logger.error('Player update error', { 
        playerId: req.player?.id,
        username: req.player?.username,
        error: error instanceof Error ? error.message : 'Unknown' 
      });
      res.status(500).json({ error: 'Failed to update player' });
    }
  });

  // 🎭 CHARACTER SELECT: Enhanced with retry logic for memory reload
  app.post("/api/player/select-character", requireAuth, async (req, res) => {
    try {
      const { characterId } = req.body;
      
      console.log(`🎭 [CHARACTER SELECT] Player ${req.player!.username || req.player!.id} selecting: ${characterId}`);
      
      if (!characterId) {
        console.log(`❌ [CHARACTER SELECT] No characterId provided`);
        return res.status(400).json({ error: 'Character ID is required' });
      }

      // Check if character exists in memory first
      let character = getCharacterFromMemory(characterId);
      if (!character) {
        console.log(`⚠️ [CHARACTER SELECT] Character ${characterId} not found in memory, reloading...`);
        try {
          await masterDataService.reloadCharacters();
          character = getCharacterFromMemory(characterId);
          if (!character) {
            console.log(`❌ [CHARACTER SELECT] Character ${characterId} still not found after reload`);
            return res.status(404).json({ error: `Character '${characterId}' not found` });
          }
          console.log(`✅ [CHARACTER SELECT] Character ${characterId} found after reload`);
        } catch (reloadError) {
          console.error(`🔴 [CHARACTER SELECT] Character reload failed:`, reloadError);
          return res.status(500).json({ error: 'Failed to reload character data' });
        }
      }

      console.log(`🔄 [CHARACTER SELECT] Calling selectCharacterForPlayer...`);
      const updatedState = await withTimeout(
        selectCharacterForPlayer(req.player!.id, characterId),
        5000,
        'select character for player'
      );
      
      console.log(`✅ [CHARACTER SELECT] SUCCESS: ${characterId} selected for ${updatedState.username}`);
      
      // 🔄 Player sync is handled automatically in selectCharacterForPlayer
      
      res.json({ success: true, player: updatedState });
    } catch (error) {
      console.error(`🔴 [CHARACTER SELECT] FAILED for ${req.player!.username || req.player!.id}:`, error);
      logger.error('Character selection error', { 
        playerId: req.player?.id,
        username: req.player?.username,
        characterId: req.body.characterId,
        error: error instanceof Error ? error.message : 'Unknown' 
      });
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to select character' });
    }
  });

  // 🖼️ FIXED: Set display image with telegramId_username folder JSON - ENHANCED LOGGING + TIMEOUT
  app.post("/api/player/set-display-image", requireAuth, async (req, res) => {
    try {
      const { imageUrl } = req.body;
      
      console.log(`🖼️ [DISPLAY IMAGE] Player ${req.player!.username || req.player!.id} setting: ${imageUrl}`);
      
      if (!imageUrl || typeof imageUrl !== 'string') {
        console.log(`❌ [DISPLAY IMAGE] Invalid or missing imageUrl:`, imageUrl);
        return res.status(400).json({ error: 'Valid image URL is required' });
      }

      // Security: ensure URL is from uploads
      if (!imageUrl.startsWith('/uploads/')) {
        console.log(`❌ [DISPLAY IMAGE] URL not from uploads directory: ${imageUrl}`);
        return res.status(400).json({ error: 'Image URL must be from uploads directory' });
      }
      
      console.log(`🔄 [DISPLAY IMAGE] Attempting to set display image...`);
      const updatedState = await withTimeout(
        setDisplayImageForPlayer(req.player!.id, imageUrl),
        5000,
        'set display image for player'
      );
      
      console.log(`✅ [DISPLAY IMAGE] SUCCESS: ${imageUrl} set for ${updatedState.username}`);
      
      // 🔄 Player sync is handled automatically in setDisplayImageForPlayer
      
      res.json({ success: true, player: updatedState });
    } catch (error) {
      console.error(`🔴 [DISPLAY IMAGE] FAILED:`, error);
      logger.error('Display image error', { 
        playerId: req.player?.id,
        username: req.player?.username,
        imageUrl: req.body.imageUrl,
        error: error instanceof Error ? error.message : 'Unknown' 
      });
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to set display image' });
    }
  });

  // 🎯 JSON-FIRST: Purchase upgrade - FIXED WITH TIMEOUT AND BETTER ERROR HANDLING
  app.post("/api/player/upgrades", requireAuth, async (req, res) => {
    try {
      const { upgradeId, level } = req.body;
      console.log(`🛒 [UPGRADE] Player ${req.player?.username} purchasing ${upgradeId} level ${level}`);
      
      const upgrade = getUpgradeFromMemory(upgradeId);
      
      if (!upgrade) {
        console.log(`❌ [UPGRADE] Invalid upgrade: ${upgradeId}`);
        return res.status(400).json({ error: 'Invalid upgrade' });
      }

      if (level > upgrade.maxLevel) {
        console.log(`❌ [UPGRADE] Level ${level} exceeds max ${upgrade.maxLevel} for ${upgradeId}`);
        return res.status(400).json({ error: 'Level exceeds maximum' });
      }

      const cost = upgrade.baseCost * Math.pow(upgrade.costMultiplier, level - 1);
      console.log(`💰 [UPGRADE] Cost calculated: ${cost} for ${upgradeId} level ${level}`);
      
      const updatedState = await withTimeout(
        purchaseUpgradeForPlayer(req.player!.id, upgradeId, level, cost),
        5000,
        'purchase upgrade for player'
      );
      
      console.log(`✅ [UPGRADE] Success for ${updatedState.username}`);
      console.log(`📊 [UPGRADE] New upgrade levels:`, Object.keys(updatedState.upgrades || {}).length); // 🚨 SAFE: Add || {} to prevent crash
      
      // 🔄 Player sync is handled automatically in purchaseUpgradeForPlayer
      
      res.json({ success: true, player: updatedState });
    } catch (error) {
      console.error(`🔴 [UPGRADE] Failed for ${req.player?.username}:`, error);
      logger.error('Upgrade purchase error', { 
        playerId: req.player?.id,
        username: req.player?.username,
        upgradeId: req.body.upgradeId,
        error: error instanceof Error ? error.message : 'Unknown' 
      });
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to purchase upgrade' });
    }
  });

  // 🚀 ENHANCED: Admin get all data (upgrades, characters, levels)
  app.get("/api/admin/all", requireAuth, requireAdmin, async (req, res) => {
    try {
      const [upgrades, characters, levels] = await Promise.all([
        storage.getUpgrades(true), // Include hidden
        storage.getCharacters(true), // Include hidden
        storage.getLevels()
      ]);
      
      res.json({
        success: true,
        upgrades,
        characters,
        levels,
        syncQueues: getAllQueueStatus() // 🔄 Include queue health for admin
      });
    } catch (error) {
      logger.error('Admin get all error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to fetch admin data' });
    }
  });

  // 🆕 FIXED: ADMIN UPGRADE ROUTES with sync queue
  app.post("/api/admin/upgrades", requireAuth, requireAdmin, async (req, res) => {
    try {
      const upgradeData = sanitizeUpgrade(req.body);
      console.log(`🔧 [ADMIN] Creating upgrade: ${upgradeData.name || upgradeData.id}`);
      console.log(`🔧 [ADMIN] Sanitized data:`, upgradeData);
      
      // 1. Save to main-gamedata JSON (runtime source)
      try {
        await saveUpgradeToJSON(upgradeData);
        console.log(`✅ [ADMIN] Upgrade saved to JSON successfully`);
      } catch (jsonError) {
        console.error(`❌ [ADMIN] JSON save failed:`, jsonError);
        return res.status(500).json({ 
          error: 'Failed to save upgrade to JSON', 
          details: jsonError instanceof Error ? jsonError.message : 'Unknown JSON error',
          stack: jsonError instanceof Error ? jsonError.stack : undefined,
          stage: 'json_save'
        });
      }
      
      // 2. 🔄 QUEUE for DB sync (throttled, no blocking)
      queueUpgradeSync(upgradeData.id, upgradeData, true);
      console.log(`🔄 [ADMIN] Upgrade queued for DB sync`);
      
      // 3. Refresh memory cache with error handling
      let reloadWarning = null;
      try {
        await masterDataService.reloadUpgrades();
        console.log(`✅ [ADMIN] Memory cache reloaded successfully`);
      } catch (reloadError) {
        console.error(`⚠️ [ADMIN] Memory reload failed:`, reloadError);
        reloadWarning = `Memory reload failed: ${reloadError instanceof Error ? reloadError.message : 'Unknown'}`;
      }
      
      // 4. Return fresh data for UI refresh
      const upgrades = getUpgradesFromMemory();
      console.log(`✅ [ADMIN] Upgrade ${upgradeData.id} created, returning ${upgrades.length} upgrades`);
      
      res.json({ 
        success: true, 
        upgrades, 
        message: `Upgrade ${upgradeData.name} created successfully`,
        warning: reloadWarning,
        syncQueued: true
      });
    } catch (error) {
      console.error(`❌ [ADMIN] Create upgrade failed:`, error);
      logger.error('Admin create upgrade error', { 
        error: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ 
        error: 'Failed to create upgrade', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  app.patch("/api/admin/upgrades/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = sanitizeUpgrade(req.body);
      console.log(`🔧 [ADMIN] Editing upgrade: ${id}`, Object.keys(updates));
      console.log(`🔧 [ADMIN] Sanitized updates:`, updates);
      
      // Get current upgrade
      const currentUpgrade = getUpgradeFromMemory(id);
      if (!currentUpgrade) {
        console.log(`❌ [ADMIN] Upgrade ${id} not found in memory`);
        return res.status(404).json({ error: 'Upgrade not found' });
      }
      
      const updatedUpgrade = { ...currentUpgrade, ...updates, updatedAt: new Date() };
      
      // 1. Save to main-gamedata JSON (runtime source)
      try {
        await saveUpgradeToJSON(updatedUpgrade);
        console.log(`✅ [ADMIN] Upgrade JSON updated successfully`);
      } catch (jsonError) {
        console.error(`❌ [ADMIN] JSON update failed:`, jsonError);
        return res.status(500).json({ 
          error: 'Failed to update upgrade JSON', 
          details: jsonError instanceof Error ? jsonError.message : 'Unknown JSON error',
          stack: jsonError instanceof Error ? jsonError.stack : undefined,
          stage: 'json_update'
        });
      }
      
      // 2. 🔄 QUEUE for DB sync (throttled)
      queueUpgradeSync(id, updatedUpgrade, false);
      console.log(`🔄 [ADMIN] Upgrade update queued for DB sync`);
      
      // 3. Refresh memory cache with error handling
      let reloadWarning = null;
      try {
        await masterDataService.reloadUpgrades();
        console.log(`✅ [ADMIN] Memory cache reloaded after update`);
      } catch (reloadError) {
        console.error(`⚠️ [ADMIN] Memory reload failed after update:`, reloadError);
        reloadWarning = `Memory reload failed: ${reloadError instanceof Error ? reloadError.message : 'Unknown'}`;
      }
      
      // 4. Return fresh data
      const upgrades = getUpgradesFromMemory();
      console.log(`✅ [ADMIN] Upgrade ${id} updated, returning ${upgrades.length} upgrades`);
      
      res.json({ 
        success: true, 
        upgrades, 
        message: `Upgrade ${currentUpgrade.name} updated successfully`,
        warning: reloadWarning,
        syncQueued: true
      });
    } catch (error) {
      console.error(`❌ [ADMIN] Update upgrade failed:`, error);
      logger.error('Admin update upgrade error', { 
        error: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ 
        error: 'Failed to update upgrade', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // 🆕 FIXED: ADMIN CHARACTER ROUTES with sync queue
  app.post("/api/admin/characters", requireAuth, requireAdmin, async (req, res) => {
    try {
      const characterData = sanitizeCharacter(req.body);
      console.log(`🎭 [ADMIN] Creating character: ${characterData.name || characterData.id}`);
      console.log(`🎭 [ADMIN] Sanitized data:`, characterData);
      
      // 1. Save to main-gamedata JSON
      try {
        await saveCharacterToJSON(characterData);
        console.log(`✅ [ADMIN] Character saved to JSON successfully`);
      } catch (jsonError) {
        console.error(`❌ [ADMIN] Character JSON save failed:`, jsonError);
        return res.status(500).json({ 
          error: 'Failed to save character to JSON', 
          details: jsonError instanceof Error ? jsonError.message : 'Unknown JSON error',
          stack: jsonError instanceof Error ? jsonError.stack : undefined,
          stage: 'json_save'
        });
      }
      
      // 2. 🔄 QUEUE for DB sync (throttled)
      queueCharacterSync(characterData.id, characterData, true);
      console.log(`🔄 [ADMIN] Character queued for DB sync`);
      
      // 3. Refresh memory cache with error handling
      let reloadWarning = null;
      try {
        await masterDataService.reloadCharacters();
        console.log(`✅ [ADMIN] Character memory cache reloaded`);
      } catch (reloadError) {
        console.error(`⚠️ [ADMIN] Character memory reload failed:`, reloadError);
        reloadWarning = `Memory reload failed: ${reloadError instanceof Error ? reloadError.message : 'Unknown'}`;
      }
      
      // 4. Return fresh data
      const characters = getCharactersFromMemory();
      console.log(`✅ [ADMIN] Character ${characterData.id} created, returning ${characters.length} characters`);
      
      res.json({ 
        success: true, 
        characters, 
        message: `Character ${characterData.name} created successfully`,
        warning: reloadWarning,
        syncQueued: true
      });
    } catch (error) {
      console.error(`❌ [ADMIN] Create character failed:`, error);
      logger.error('Admin create character error', { 
        error: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ 
        error: 'Failed to create character', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  app.patch("/api/admin/characters/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = sanitizeCharacter(req.body);
      console.log(`🎭 [ADMIN] Editing character: ${id}`, Object.keys(updates));
      console.log(`🎭 [ADMIN] Sanitized updates:`, updates);
      
      const currentCharacter = getCharacterFromMemory(id);
      if (!currentCharacter) {
        console.log(`❌ [ADMIN] Character ${id} not found in memory`);
        return res.status(404).json({ error: 'Character not found' });
      }
      
      const updatedCharacter = { ...currentCharacter, ...updates, updatedAt: new Date() };
      
      // 1. Save to JSON
      try {
        await saveCharacterToJSON(updatedCharacter);
        console.log(`✅ [ADMIN] Character JSON updated successfully`);
      } catch (jsonError) {
        console.error(`❌ [ADMIN] Character JSON update failed:`, jsonError);
        return res.status(500).json({ 
          error: 'Failed to update character JSON', 
          details: jsonError instanceof Error ? jsonError.message : 'Unknown JSON error',
          stack: jsonError instanceof Error ? jsonError.stack : undefined,
          stage: 'json_update'
        });
      }
      
      // 2. 🔄 QUEUE for DB sync (throttled)
      queueCharacterSync(id, updatedCharacter, false);
      console.log(`🔄 [ADMIN] Character update queued for DB sync`);
      
      // 3. Refresh memory cache with error handling
      let reloadWarning = null;
      try {
        await masterDataService.reloadCharacters();
        console.log(`✅ [ADMIN] Character memory reloaded after update`);
      } catch (reloadError) {
        console.error(`⚠️ [ADMIN] Character memory reload failed:`, reloadError);
        reloadWarning = `Memory reload failed: ${reloadError instanceof Error ? reloadError.message : 'Unknown'}`;
      }
      
      // 4. Return fresh data
      const characters = getCharactersFromMemory();
      console.log(`✅ [ADMIN] Character ${id} updated, returning ${characters.length} characters`);
      
      res.json({ 
        success: true, 
        characters, 
        message: `Character ${currentCharacter.name} updated successfully`,
        warning: reloadWarning,
        syncQueued: true
      });
    } catch (error) {
      console.error(`❌ [ADMIN] Update character failed:`, error);
      logger.error('Admin update character error', { 
        error: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ 
        error: 'Failed to update character', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // 🆕 FIXED: ADMIN LEVEL ROUTES with sync queue
  app.post("/api/admin/levels", requireAuth, requireAdmin, async (req, res) => {
    try {
      const levelData = sanitizeLevel(req.body);
      console.log(`🏆 [ADMIN] Creating level: ${levelData.level}`);
      console.log(`🏆 [ADMIN] Sanitized data:`, levelData);
      
      // 1. Save to JSON
      try {
        await saveLevelToJSON(levelData);
        console.log(`✅ [ADMIN] Level saved to JSON successfully`);
      } catch (jsonError) {
        console.error(`❌ [ADMIN] Level JSON save failed:`, jsonError);
        return res.status(500).json({ 
          error: 'Failed to save level to JSON', 
          details: jsonError instanceof Error ? jsonError.message : 'Unknown JSON error',
          stack: jsonError instanceof Error ? jsonError.stack : undefined,
          stage: 'json_save'
        });
      }
      
      // 2. 🔄 QUEUE for DB sync (throttled)
      queueLevelSync(levelData.level, levelData, true);
      console.log(`🔄 [ADMIN] Level queued for DB sync`);
      
      // 3. Refresh memory with error handling
      let reloadWarning = null;
      try {
        await masterDataService.reloadLevels();
        console.log(`✅ [ADMIN] Level memory cache reloaded`);
      } catch (reloadError) {
        console.error(`⚠️ [ADMIN] Level memory reload failed:`, reloadError);
        reloadWarning = `Memory reload failed: ${reloadError instanceof Error ? reloadError.message : 'Unknown'}`;
      }
      
      // 4. Return fresh data
      const levels = getLevelsFromMemory();
      console.log(`✅ [ADMIN] Level ${levelData.level} created, returning ${levels.length} levels`);
      
      res.json({ 
        success: true, 
        levels, 
        message: `Level ${levelData.level} created successfully`,
        warning: reloadWarning,
        syncQueued: true
      });
    } catch (error) {
      console.error(`❌ [ADMIN] Create level failed:`, error);
      logger.error('Admin create level error', { 
        error: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ 
        error: 'Failed to create level', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  app.patch("/api/admin/levels/:level", requireAuth, requireAdmin, async (req, res) => {
    try {
      const levelNum = parseInt(req.params.level);
      const updates = sanitizeLevel(req.body);
      console.log(`🏆 [ADMIN] Editing level: ${levelNum}`, Object.keys(updates));
      console.log(`🏆 [ADMIN] Sanitized updates:`, updates);
      
      const currentLevel = getLevelFromMemory(levelNum);
      if (!currentLevel) {
        console.log(`❌ [ADMIN] Level ${levelNum} not found in memory`);
        return res.status(404).json({ error: 'Level not found' });
      }
      
      const updatedLevel = { ...currentLevel, ...updates, updatedAt: new Date() };
      
      // 1. Save to JSON
      try {
        await saveLevelToJSON(updatedLevel);
        console.log(`✅ [ADMIN] Level JSON updated successfully`);
      } catch (jsonError) {
        console.error(`❌ [ADMIN] Level JSON update failed:`, jsonError);
        return res.status(500).json({ 
          error: 'Failed to update level JSON', 
          details: jsonError instanceof Error ? jsonError.message : 'Unknown JSON error',
          stack: jsonError instanceof Error ? jsonError.stack : undefined,
          stage: 'json_update'
        });
      }
      
      // 2. 🔄 QUEUE for DB sync (throttled)
      queueLevelSync(levelNum, updatedLevel, false);
      console.log(`🔄 [ADMIN] Level update queued for DB sync`);
      
      // 3. Refresh memory with error handling
      let reloadWarning = null;
      try {
        await masterDataService.reloadLevels();
        console.log(`✅ [ADMIN] Level memory reloaded after update`);
      } catch (reloadError) {
        console.error(`⚠️ [ADMIN] Level memory reload failed:`, reloadError);
        reloadWarning = `Memory reload failed: ${reloadError instanceof Error ? reloadError.message : 'Unknown'}`;
      }
      
      // 4. Return fresh data
      const levels = getLevelsFromMemory();
      console.log(`✅ [ADMIN] Level ${levelNum} updated, returning ${levels.length} levels`);
      
      res.json({ 
        success: true, 
        levels, 
        message: `Level ${levelNum} updated successfully`,
        warning: reloadWarning,
        syncQueued: true
      });
    } catch (error) {
      console.error(`❌ [ADMIN] Update level failed:`, error);
      logger.error('Admin update level error', { 
        error: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ 
        error: 'Failed to update level', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // 🔧 ENHANCED: Upload with better JSON parsing and error handling
  app.post("/api/upload", requireAuth, upload.single("image"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const body = req.body;
      console.log('📤 [UPLOAD] Request body:', body);
      
      let categoriesObj = {};
      let poses = [];
      
      // Better JSON parsing with error handling
      try {
        categoriesObj = typeof body.categories === 'string' ? JSON.parse(body.categories) : (body.categories || {});
      } catch (parseError) {
        console.error('❌ [UPLOAD] Categories parse error:', parseError);
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          error: "Invalid categories format",
          details: "Categories must be valid JSON",
          received: body.categories
        });
      }
      
      try {
        poses = typeof body.poses === 'string' ? JSON.parse(body.poses) : (body.poses || []);
      } catch (parseError) {
        console.error('❌ [UPLOAD] Poses parse error:', parseError);
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          error: "Invalid poses format",
          details: "Poses must be valid JSON array",
          received: body.poses
        });
      }
      
      const sanitizedCharacterName = body.characterName?.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
      const allowedImageTypes = ['character', 'avatar', 'vip', 'other'];
      const imageType = allowedImageTypes.includes(body.imageType) ? body.imageType : 'character';
      
      if (!Array.isArray(poses) || !poses.every((p: any) => typeof p === 'string')) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          error: "Poses must be an array of strings",
          received: poses
        });
      }
      
      const categories = [
        categoriesObj.nsfw ? 'nsfw' : null,
        categoriesObj.vip ? 'vip' : null,
        categoriesObj.event ? 'event' : null,
        categoriesObj.random ? 'random' : null
      ].filter((c): c is string => c !== null);
      
      const parsedData = {
        characterId: body.characterId,
        characterName: sanitizedCharacterName,
        imageType: imageType as 'character' | 'avatar' | 'vip' | 'other',
        unlockLevel: parseInt(body.unlockLevel) || 1,
        categories,
        poses,
        isHidden: body.isHidden === 'true',
        chatEnable: body.chatEnable === 'true',
        chatSendPercent: Math.min(100, Math.max(0, parseInt(body.chatSendPercent) || 0))
      };
      
      console.log('📤 [UPLOAD] Parsed data:', parsedData);

      if (!parsedData.characterId || !parsedData.characterName) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          error: "Character ID and name are required",
          received: { characterId: parsedData.characterId, characterName: parsedData.characterName }
        });
      }

      const finalDir = path.join(__dirname, "..", "uploads", "characters", parsedData.characterName, parsedData.imageType);
      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir, { recursive: true });
      }

      const finalPath = path.join(finalDir, req.file.filename);
      fs.renameSync(req.file.path, finalPath);

      const fileUrl = `/uploads/characters/${parsedData.characterName}/${parsedData.imageType}/${req.file.filename}`;
      console.log('📤 [UPLOAD] File moved to:', fileUrl);

      const mediaUpload = await withTimeout(
        storage.createMediaUpload({
          characterId: parsedData.characterId,
          url: fileUrl,
          type: parsedData.imageType,
          unlockLevel: parsedData.unlockLevel,
          categories: parsedData.categories,
          poses: parsedData.poses,
          isHidden: parsedData.isHidden,
          chatEnable: parsedData.chatEnable,
          chatSendPercent: parsedData.chatSendPercent,
        }),
        5000,
        'create media upload'
      );

      console.log('✅ [UPLOAD] Media upload created successfully');
      res.json({ url: fileUrl, media: mediaUpload });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error('❌ [UPLOAD] Upload error:', error);
      logger.error('Upload error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ 
        error: 'Failed to upload file', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Get all media uploads
  app.get("/api/media", requireAuth, async (req, res) => {
    try {
      const characterId = req.query.characterId as string | undefined;
      const includeHidden = req.query.includeHidden === 'true';
      const mediaUploads = await withTimeout(
        storage.getMediaUploads(characterId, includeHidden),
        5000,
        'get media uploads'
      );
      res.json({ media: mediaUploads });
    } catch (error: any) {
      logger.error('Media fetch error', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch media uploads' });
    }
  });

  // 🖼️ ENHANCED: Update media with poses and character reassignment
  app.patch("/api/media/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      console.log(`🖼️ [UPDATE MEDIA] Updating media ${id}...`, updates);
      
      const existingMedia = await withTimeout(
        storage.getMediaUpload(id),
        3000,
        'get existing media'
      );
      if (!existingMedia) {
        return res.status(404).json({ error: 'Media not found' });
      }
      
      // Validate poses array if provided
      if (updates.poses && !Array.isArray(updates.poses)) {
        return res.status(400).json({ error: 'Poses must be an array of strings' });
      }
      
      if (updates.poses && !updates.poses.every((p: any) => typeof p === 'string')) {
        return res.status(400).json({ error: 'All poses must be strings' });
      }
      
      // Log character reassignment
      if (updates.characterId && updates.characterId !== existingMedia.characterId) {
        console.log(`🎭 [UPDATE MEDIA] Reassigning from character ${existingMedia.characterId} to ${updates.characterId}`);
      }
      
      // Log pose updates
      if (updates.poses) {
        console.log(`🎪 [UPDATE MEDIA] Updating poses:`, {
          old: existingMedia.poses || [],
          new: updates.poses
        });
      }
      
      const updatedMedia = await withTimeout(
        storage.updateMediaUpload(id, {
          ...updates,
          updatedAt: new Date()
        }),
        5000,
        'update media'
      );
      
      console.log(`✅ [UPDATE MEDIA] Media ${id} updated successfully`);
      res.json({ success: true, media: updatedMedia });
    } catch (error: any) {
      logger.error('Media update error', { error: error.message });
      res.status(500).json({ error: 'Failed to update media' });
    }
  });

  // DELETE media upload
  app.delete("/api/media/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const media = await withTimeout(
        storage.getMediaUpload(id),
        3000,
        'get media for deletion'
      );
      if (!media) {
        return res.status(404).json({ error: 'Media not found' });
      }
      
      // Delete file from filesystem if it exists
      try {
        const filePath = path.join(__dirname, "..", media.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        logger.warn('Failed to delete media file', { url: media.url, error: fileError });
      }
      
      await withTimeout(
        storage.deleteMediaUpload(id),
        3000,
        'delete media from database'
      );
      res.json({ success: true });
    } catch (error: any) {
      logger.error('Media delete error', { error: error.message });
      res.status(500).json({ error: 'Failed to delete media' });
    }
  });
  
  const httpServer = createServer(app);
  
  console.log('✅ All routes registered successfully');
  console.log('🏆 NEW: Tasks API at GET /api/tasks and POST /api/tasks/:id/claim');
  console.log('🏅 NEW: Achievements API at GET /api/achievements and POST /api/achievements/:id/claim');
  console.log('🚀 NEW: Level-up endpoint at POST /api/player/level-up with DB sync');
  console.log('🎯 FIXED: Maximum level reached bug resolved');
  console.log('🔧 Timeout protection: 5s max for most operations, 3s for auth');
  console.log('🎯 JSON-FIRST: Player system using telegramId_username folders');
  console.log('🔄 SYNC QUEUES: JSON changes throttle-synced to Supabase DB');
  console.log('  - Players: 3s batches (high frequency) - FK constraint protected');
  console.log('  - Upgrades: 8s batches (admin changes)');
  console.log('  - Characters: 8s batches (admin changes)');
  console.log('  - Levels: 15s batches (less frequent changes)');
  console.log('🧹 FK CONSTRAINTS: Auto-cleanup with session management');
  console.log('🔧 Debug routes available at /api/debug (dev only)');
  console.log('🌙 Luna Learning System active with AsyncLock deadlock prevention');
  console.log('🔧 FIXED: Master-data directory path: main-gamedata/master-data/');
  console.log('🚨 CRITICAL: Object.keys undefined errors FIXED with safe defaults');
  console.log('🎮 GAME: Using GameInterfaceV2 with added Tasks & Achievements button');
  console.log('🏆 UI: Experience progress bar added to show level-up progress');
  return httpServer;
}