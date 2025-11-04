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

// 📁 Directory constants for master-data template system
const MASTER_DATA_DIR = path.join(process.cwd(), 'master-data');
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

  // 🚀 FIXED: Level-up endpoint with DB sync to playerLevelUps
  app.post("/api/player/level-up", requireAuth, async (req, res) => {
    try {
      const { targetLevel } = req.body;
      console.log(`🆙 [LEVEL UP] Request from: ${req.player?.username} to level ${targetLevel}`);
      
      // Get current player state
      const playerState = await getPlayerState(req.player!.id);
      
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
      
      const updatedState = await updatePlayerState(req.player!.id, levelUpUpdates);
      
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

  const httpServer = createServer(app);
  
  console.log('✅ All routes registered successfully');
  console.log('🏆 NEW: Tasks API at GET /api/tasks and POST /api/tasks/:id/claim');
  console.log('🏅 NEW: Achievements API at GET /api/achievements and POST /api/achievements/:id/claim');
  console.log('🚀 NEW: Level-up endpoint at POST /api/player/level-up with DB sync');
  console.log('🔧 Task/Achievement system fully integrated');
  return httpServer;
}