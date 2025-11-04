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
// 🔄 NEW: Import sync queue system for throttled DB updates
import { 
  queuePlayerSync, 
  queueUpgradeSync, 
  queueCharacterSync, 
  queueLevelSync, 
  forceFlushAllQueues, 
  getAllQueueStatus 
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
        syncQueues: queueStatus, // 🔄 NEW: Show queue status
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

  // 🔄 NEW: Sync queue status endpoint for admin monitoring
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

  // 🔄 NEW: Force flush all queues (admin tool)
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

  // 🆕 NEW: Config diff endpoint for debugging admin issues
  app.get("/api/admin/config-diff", requireAuth, requireAdmin, async (req, res) => {
    try {
      const upgradesInMemory = getUpgradesFromMemory();
      const charactersInMemory = getCharactersFromMemory();
      const levelsInMemory = getLevelsFromMemory();
      
      const mainGameDataDir = path.join(process.cwd(), 'main-gamedata');
      let jsonUpgrades = [];
      let jsonCharacters = [];
      let jsonLevels = [];
      let errors = [];
      
      try {
        const upgradesFile = path.join(mainGameDataDir, 'upgrades', 'upgrades-master.json');
        if (fs.existsSync(upgradesFile)) {
          const data = await fs.promises.readFile(upgradesFile, 'utf8');
          jsonUpgrades = JSON.parse(data);
        } else {
          errors.push('upgrades-master.json not found');
        }
      } catch (err) {
        errors.push(`Upgrades JSON error: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
      
      try {
        const charactersDir = path.join(mainGameDataDir, 'characters');
        if (fs.existsSync(charactersDir)) {
          const files = await fs.promises.readdir(charactersDir);
          for (const file of files.filter(f => f.endsWith('.json'))) {
            const data = await fs.promises.readFile(path.join(charactersDir, file), 'utf8');
            jsonCharacters.push(JSON.parse(data));
          }
        } else {
          errors.push('characters directory not found');
        }
      } catch (err) {
        errors.push(`Characters JSON error: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
      
      res.json({
        success: true,
        comparison: {
          upgrades: {
            memoryCount: upgradesInMemory.length,
            jsonCount: jsonUpgrades.length,
            memoryIds: upgradesInMemory.map(u => u.id),
            jsonIds: jsonUpgrades.map((u: any) => u.id)
          },
          characters: {
            memoryCount: charactersInMemory.length,
            jsonCount: jsonCharacters.length,
            memoryIds: charactersInMemory.map(c => c.id),
            jsonIds: jsonCharacters.map((c: any) => c.id)
          },
          levels: {
            memoryCount: levelsInMemory.length,
            jsonCount: jsonLevels.length,
            memoryLevels: levelsInMemory.map(l => l.level),
            jsonLevels: jsonLevels.map((l: any) => l.level)
          }
        },
        syncQueues: getAllQueueStatus(), // 🔄 Include queue status
        errors,
        paths: {
          mainGameData: mainGameDataDir,
          upgrades: path.join(mainGameDataDir, 'upgrades', 'upgrades-master.json'),
          characters: path.join(mainGameDataDir, 'characters'),
          levels: path.join(mainGameDataDir, 'levels', 'levels.json')
        }
      });
    } catch (error) {
      logger.error('Config diff error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to generate config diff' });
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
      
      // 3. Refresh memory with error handling
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

  // 🔧 MIGRATION: Auto-migrate old player files to new telegramId_username structure
  app.post("/api/admin/migrate-player-files", requireAuth, requireAdmin, async (req, res) => {
    try {
      console.log('📦 Starting player file migration to telegramId_username structure...');
      logger.info('Player file migration started');
      
      const result = await withTimeout(
        playerStateManager.migrateOldPlayerFiles(),
        30000,
        'player file migration'
      );
      
      console.log(`✅ Migration complete: ${result.moved} moved, ${result.errors} errors`);
      logger.info('Player file migration completed', result);
      
      res.json({
        success: true,
        migration: {
          moved: result.moved,
          errors: result.errors,
          message: `Migration complete: ${result.moved} files moved to telegramId_username structure`
        }
      });
    } catch (error) {
      logger.error('Player file migration error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to migrate player files' });
    }
  });

  // 📁 ADMIN: Load master-data templates
  app.get("/api/admin/master/characters", requireAuth, requireAdmin, async (req, res) => {
    try {
      const templatesDir = path.join(MASTER_DATA_DIR, 'characters');
      const files = await fs.promises.readdir(templatesDir).catch(() => []);
      const templates = [];
      
      for (const file of files.filter(f => f.endsWith('.json'))) {
        try {
          const data = await fs.promises.readFile(path.join(templatesDir, file), 'utf8');
          const template = JSON.parse(data);
          templates.push(template);
        } catch (error) {
          logger.warn(`Failed to load character template ${file}`);
        }
      }
      
      console.log(`📂 [ADMIN] Loaded ${templates.length} character templates from master-data`);
      res.json({ success: true, templates });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load character templates' });
    }
  });

  // 🎭 ADMIN: Create character (master-data template → main-gamedata save)
  app.post("/api/admin/characters/create", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { templateId, ...customFields } = req.body;
      
      console.log(`🎭 [CREATE CHARACTER] Loading template ${templateId || 'default'} from master-data...`);
      
      // Load template from master-data
      let template = {};
      if (templateId) {
        try {
          const templatePath = path.join(MASTER_DATA_DIR, 'characters', `${templateId}.json`);
          const templateData = await fs.promises.readFile(templatePath, 'utf8');
          template = JSON.parse(templateData);
          console.log(`📂 [CREATE CHARACTER] Template loaded: ${templateId}`);
        } catch (error) {
          console.warn(`⚠️ [CREATE CHARACTER] Template ${templateId} not found, using defaults`);
        }
      }
      
      // Merge template with custom fields
      const newCharacter = sanitizeCharacter({
        id: customFields.id || `char_${Date.now()}`,
        name: customFields.name || 'New Character',
        description: customFields.description || 'A mysterious character',
        unlockLevel: customFields.unlockLevel || 1,
        avatarImage: customFields.avatarImage || null,
        defaultImage: customFields.defaultImage || null,
        categories: customFields.categories || [],
        poses: customFields.poses || [],
        isHidden: customFields.isHidden || false,
        ...template, // Apply template defaults first
        ...customFields, // Override with user input
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Save to main-gamedata/characters/
      await saveCharacterToJSON(newCharacter);
      
      // 🔄 QUEUE for DB sync
      queueCharacterSync(newCharacter.id, newCharacter, true);
      
      console.log(`✅ [CREATE CHARACTER] Character created: ${newCharacter.name} (${newCharacter.id})`);
      console.log(`📁 [CREATE CHARACTER] Saved to: main-gamedata/characters/${newCharacter.id}.json`);
      console.log(`🔄 [CREATE CHARACTER] Queued for DB sync`);
      
      res.json({ success: true, character: newCharacter, syncQueued: true });
    } catch (error) {
      logger.error('Create character failed', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to create character' });
    }
  });

  // 🌙 LUNABUG ROUTES
  try {
    const lunaBugRoutes = await import('./routes/lunabug.mjs');
    app.use('/api/lunabug', lunaBugRoutes.default);
    console.log('✅ LunaBug routes registered at /api/lunabug');
  } catch (error) {
    console.error(`❌ LunaBug routes failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('🌙 LunaBug will use client-side fallback mode');
  }

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

      // 🔄 QUEUE player for DB sync (throttled)
      queuePlayerSync(req.player!.id, updatedState);

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
      
      // 🔄 QUEUE player for DB sync after character selection
      queuePlayerSync(req.player!.id, updatedState);
      
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
      
      // 🔄 QUEUE player for DB sync after display image change
      queuePlayerSync(req.player!.id, updatedState);
      
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
      
      // 🔄 QUEUE player for DB sync after upgrade purchase
      queuePlayerSync(req.player!.id, updatedState);
      
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

  // 🎯 JSON-FIRST: Health check for player state system
  app.get("/api/player/health", requireAuth, async (req, res) => {
    try {
      const health = await withTimeout(
        playerStateManager.healthCheck(),
        5000,
        'player state health check'
      );
      console.log(`🔍 [PLAYER HEALTH] Check requested by: ${req.player?.username}`);
      
      res.json({ 
        success: true, 
        health,
        message: 'Simplified JSON-first player state system (AsyncLock removed)',
        requestedBy: req.player?.username
      });
    } catch (error) {
      logger.error('Player state health check error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to check player state health' });
    }
  });

  // ✅ LUNA DIAGNOSTIC ROUTE: Check master data integrity
  app.get("/api/luna/master-data-report", requireAuth, async (req, res) => {
    try {
      const report = await withTimeout(
        masterDataService.getDataIntegrityReport(),
        10000,
        'master data integrity report'
      );
      res.json({ 
        success: true, 
        report,
        message: "Luna's Master Data Integrity Report with AsyncLock prevention active"
      });
    } catch (error) {
      logger.error('Master data report error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to generate master data report' });
    }
  });

  // 🎯 JSON-FIRST: Admin endpoint to force DB sync for a player
  app.post("/api/admin/sync-player", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { playerId } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ error: 'Player ID is required' });
      }

      console.log(`⚡ [FORCE SYNC] Admin forcing sync for player: ${playerId}`);
      await withTimeout(
        playerStateManager.forceDatabaseSync(playerId),
        10000,
        'force database sync'
      );
      
      res.json({ 
        success: true, 
        message: `Player ${playerId} force-synced to database`
      });
    } catch (error) {
      logger.error('Force sync error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to force sync player' });
    }
  });

  // 🎯 JSON-FIRST: Admin endpoint to view system health + Luna learning
  app.get("/api/admin/system-health", requireAuth, requireAdmin, async (req, res) => {
    try {
      const playerHealth = await withTimeout(
        playerStateManager.healthCheck(),
        5000,
        'player health check'
      );
      const masterDataReport = await withTimeout(
        masterDataService.getDataIntegrityReport(),
        5000,
        'master data report'
      );
      const lunaLearningReport = await withTimeout(
        lunaLearning.getLearningSummary(),
        5000,
        'luna learning summary'
      );
      
      console.log(`🔍 [SYSTEM HEALTH] Admin health check by: ${req.player?.username}`);
      
      res.json({ 
        success: true,
        system: {
          timestamp: new Date().toISOString(),
          jsonFirst: {
            active: true,
            ...playerHealth
          },
          syncQueues: getAllQueueStatus(), // 🔄 Include queue health
          masterData: masterDataReport,
          lunaLearning: lunaLearningReport,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          env: process.env.NODE_ENV,
          requestedBy: req.player?.username
        }
      });
    } catch (error) {
      logger.error('System health error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to get system health' });
    }
  });
  
  const httpServer = createServer(app);
  
  console.log('✅ All routes registered successfully');
  console.log('🔧 Timeout protection: 5s max for most operations, 3s for auth');
  console.log('🎯 JSON-FIRST: Player system using telegramId_username folders');
  console.log('🔄 SYNC QUEUES: JSON changes throttle-synced to Supabase DB');
  console.log('  - Players: 3s batches (high frequency)');
  console.log('  - Upgrades: 8s batches (admin changes)');
  console.log('  - Characters: 8s batches (admin changes)');
  console.log('  - Levels: 15s batches (less frequent changes)');
  console.log('🔧 Debug routes available at /api/debug (dev only)');
  console.log('📁 Master-data templates available for admin create flows');
  console.log('🌙 Luna Learning System active with AsyncLock deadlock prevention');
  console.log('📦 Migration endpoint available: POST /api/admin/migrate-player-files');
  console.log('🔍 Winston logging active with enhanced error tracking');
  console.log('🆕 FIXED: Admin CRUD routes with detailed error handling and type coercion');
  console.log('🔄 ENHANCED: Character selection with memory reload retry logic');
  console.log('📤 IMPROVED: Upload endpoint with better JSON parsing');
  console.log('🔍 NEW: Config diff endpoint at GET /api/admin/config-diff');
  console.log('🔄 NEW: Sync queue endpoints at /api/admin/sync-queues');
  return httpServer;
}