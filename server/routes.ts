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
        upgradesCount: Object.keys(playerState.upgrades).length,
        unlockedCharacters: playerState.unlockedCharacters.length
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
      console.log(`📊 [UPGRADE] New upgrade levels:`, Object.keys(updatedState.upgrades).length);
      
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

  const httpServer = createServer(app);
  
  console.log('✅ All routes registered successfully');
  console.log('🆕 NEW: Level-up endpoint at POST /api/player/level-up');
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
  return httpServer;
}