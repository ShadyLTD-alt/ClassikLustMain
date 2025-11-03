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
import { insertUpgradeSchema, insertCharacterSchema, insertLevelSchema, insertPlayerUpgradeSchema, insertMediaUploadSchema } from "@shared/schema";
import { generateSecureToken, getSessionExpiry } from "./utils/auth";
import logger from "./logger";
// ✅ LUNA FIX: Import MasterDataService for single source of truth
import masterDataService from "./utils/MasterDataService";
// 🎯 JSON-FIRST: Import new player state manager
import { playerStateManager, getPlayerState, updatePlayerState, selectCharacterForPlayer, purchaseUpgradeForPlayer } from "./utils/playerStateManager";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Health check endpoint - MUST BE FIRST
  logger.info('✅ Setting up /api/health route...');
  app.get("/api/health", async (req, res) => {
    try {
      const playerStateHealth = await playerStateManager.healthCheck();
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development',
        port: process.env.PORT || '5000',
        jsonFirst: {
          active: true,
          ...playerStateHealth
        }
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'error', 
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed'
      });
    }
  });

  // 🌙 LUNABUG ROUTES - Now using ESM compatible .mjs file!
  logger.info('🌙 Setting up LunaBug routes...');
  try {
    const lunaBugRoutes = await import('./routes/lunabug.mjs');
    app.use('/api/lunabug', lunaBugRoutes.default);
    logger.info('✅ LunaBug routes registered at /api/lunabug');
  } catch (error) {
    logger.error(`❌ LunaBug routes failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    logger.info('🌙 LunaBug will use client-side fallback mode');
  }

  logger.info('📁 Setting up /api/upload route...');
  app.post("/api/upload", requireAuth, upload.single("image"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const body = req.body;
      const categoriesObj = JSON.parse(body.categories);
      const poses = JSON.parse(body.poses);
      
      const sanitizedCharacterName = body.characterName?.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
      const allowedImageTypes = ['character', 'avatar', 'vip', 'other'];
      const imageType = allowedImageTypes.includes(body.imageType) ? body.imageType : 'character';
      
      if (!Array.isArray(poses) || !poses.every((p: any) => typeof p === 'string')) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Poses must be an array of strings" });
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

      if (!parsedData.characterId || !parsedData.characterName) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Character ID and name are required" });
      }

      const finalDir = path.join(__dirname, "..", "uploads", "characters", parsedData.characterName, parsedData.imageType);
      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir, { recursive: true });
      }

      const finalPath = path.join(finalDir, req.file.filename);
      fs.renameSync(req.file.path, finalPath);

      const fileUrl = `/uploads/characters/${parsedData.characterName}/${parsedData.imageType}/${req.file.filename}`;

      const mediaUpload = await storage.createMediaUpload({
        characterId: parsedData.characterId,
        url: fileUrl,
        type: parsedData.imageType,
        unlockLevel: parsedData.unlockLevel,
        categories: parsedData.categories,
        poses: parsedData.poses,
        isHidden: parsedData.isHidden,
        chatEnable: parsedData.chatEnable,
        chatSendPercent: parsedData.chatSendPercent,
      });

      res.json({ url: fileUrl, media: mediaUpload });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      logger.error('Upload error', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Failed to upload file', details: (error as Error).message });
    }
  });

  logger.info('🔐 Setting up auth routes...');
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      // 🎯 JSON-FIRST: Load from JSON state manager
      const playerState = await getPlayerState(req.player!.id);
      res.json({ success: true, player: playerState });
    } catch (error) {
      logger.error('Auth error', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Failed to fetch player data' });
    }
  });

  app.post("/api/auth/dev", async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Development login not available in production' });
    }

    try {
      const { username } = req.body;
      if (!username || username.trim().length === 0) {
        return res.status(400).json({ error: 'Username is required' });
      }

      const sanitizedUsername = username.trim().substring(0, 50);
      const devTelegramId = `dev_${sanitizedUsername.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

      let player = await storage.getPlayerByTelegramId(devTelegramId);

      if (!player) {
        // ✅ LUNA FIX: Use MasterDataService instead of hardcoded values
        const playerData = await masterDataService.createNewPlayerData(devTelegramId, sanitizedUsername);
        
        player = await storage.createPlayer(playerData);
        await savePlayerDataToJSON(player);
        
        logger.info(`🎮 Luna: Created new dev player using master defaults for ${sanitizedUsername}`);
      } else {
        await storage.updatePlayer(player.id, { lastLogin: new Date() });
        await savePlayerDataToJSON(player);
      }

      const sessionToken = generateSecureToken();
      await storage.createSession({
        playerId: player.id,
        token: sessionToken,
        expiresAt: getSessionExpiry(),
      });

      res.json({ success: true, player, sessionToken });
    } catch (error) {
      logger.error('Dev auth error', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Authentication failed', details: (error as Error).message });
    }
  });

  logger.info('📨 Setting up Telegram auth...');
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

      let player = await storage.getPlayerByTelegramId(telegramId);

      if (!player) {
        // ✅ LUNA FIX: Use MasterDataService instead of hardcoded values  
        const playerData = await masterDataService.createNewPlayerData(telegramId, username);
        
        player = await storage.createPlayer(playerData);
        await savePlayerDataToJSON(player);
        
        logger.info(`🎮 Luna: Created new Telegram player using master defaults for ${username}`);
      } else {
        await storage.updatePlayer(player.id, { lastLogin: new Date() });
        await savePlayerDataToJSON(player);
      }

      const sessionToken = generateSecureToken();
      await storage.createSession({
        playerId: player.id,
        token: sessionToken,
        expiresAt: getSessionExpiry(),
      });

      res.json({ success: true, player, sessionToken });
    } catch (error) {
      logger.error('Telegram auth error', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Authentication failed', details: (error as Error).message });
    }
  });

  logger.info('🎮 Setting up game data routes...');
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
      const mediaUploads = await storage.getMediaUploads(characterId, includeHidden);
      res.json({ media: mediaUploads });
    } catch (error: any) {
      logger.error('Media fetch error', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch media uploads' });
    }
  });

  // UPDATE media upload
  app.patch("/api/media/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedMedia = await storage.updateMediaUpload(id, updates);
      if (!updatedMedia) {
        return res.status(404).json({ error: 'Media not found' });
      }
      
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
      
      const media = await storage.getMediaUpload(id);
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
      
      await storage.deleteMediaUpload(id);
      res.json({ success: true });
    } catch (error: any) {
      logger.error('Media delete error', { error: error.message });
      res.status(500).json({ error: 'Failed to delete media' });
    }
  });

  logger.info('👤 Setting up JSON-FIRST player routes...');
  
  // 🎯 JSON-FIRST: Get player data (from JSON snapshots)
  app.get("/api/player/me", requireAuth, async (req, res) => {
    try {
      const playerState = await getPlayerState(req.player!.id);
      res.json({ player: playerState });
      console.log(`📤 Player ${req.player!.username || req.player!.id} data served from JSON`);
    } catch (error) {
      logger.error('Player fetch error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to fetch player data' });
    }
  });

  // 🎯 JSON-FIRST: Update player data (immediate JSON + async DB)
  app.patch("/api/player/me", requireAuth, async (req, res) => {
    try {
      const updates = req.body;
      
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
      const updatedState = await updatePlayerState(req.player!.id, updates);

      // Handle sendBeacon requests (no response expected)
      if (req.headers['content-type']?.includes('text/plain')) {
        res.status(204).end();
      } else {
        res.json({ player: updatedState });
      }
      
      console.log(`💾 Player ${req.player!.username || req.player!.id} updated via JSON-first system`);
    } catch (error) {
      logger.error('Player update error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to update player' });
    }
  });

  // 🎯 JSON-FIRST: Character selection (dedicated endpoint) 🎭
  app.post("/api/player/select-character", requireAuth, async (req, res) => {
    try {
      const { characterId } = req.body;
      
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }

      // Verify character exists and is unlocked
      const playerState = await getPlayerState(req.player!.id);
      if (!playerState.unlockedCharacters.includes(characterId)) {
        return res.status(403).json({ error: 'Character not unlocked' });
      }

      const updatedState = await selectCharacterForPlayer(req.player!.id, characterId);
      
      res.json({ success: true, player: updatedState });
      console.log(`🎭 Player ${req.player!.username || req.player!.id} selected character ${characterId} via JSON-first`);
    } catch (error) {
      logger.error('Character selection error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to select character' });
    }
  });

  // 🎯 JSON-FIRST: Purchase upgrade
  app.post("/api/player/upgrades", requireAuth, async (req, res) => {
    try {
      const { upgradeId, level } = req.body;
      const upgrade = getUpgradeFromMemory(upgradeId);
      
      if (!upgrade) {
        return res.status(400).json({ error: 'Invalid upgrade' });
      }

      if (level > upgrade.maxLevel) {
        return res.status(400).json({ error: 'Level exceeds maximum' });
      }

      // Calculate cost (you'll need to import/implement this)
      const cost = upgrade.baseCost * Math.pow(upgrade.costMultiplier, level - 1);
      
      const updatedState = await purchaseUpgradeForPlayer(req.player!.id, upgradeId, level, cost);
      
      res.json({ success: true, player: updatedState });
      console.log(`🛒 Player ${req.player!.username || req.player!.id} purchased upgrade ${upgradeId} level ${level} via JSON-first`);
    } catch (error) {
      logger.error('Upgrade purchase error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to purchase upgrade' });
    }
  });

  // 🎯 JSON-FIRST: Health check for player state system
  app.get("/api/player/health", requireAuth, async (req, res) => {
    try {
      const health = await playerStateManager.healthCheck();
      res.json({ 
        success: true, 
        health,
        message: 'JSON-first player state system status'
      });
    } catch (error) {
      logger.error('Player state health check error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to check player state health' });
    }
  });

  // ✅ LUNA DIAGNOSTIC ROUTE: Check master data integrity
  app.get("/api/luna/master-data-report", requireAuth, async (req, res) => {
    try {
      const report = await masterDataService.getDataIntegrityReport();
      res.json({ 
        success: true, 
        report,
        message: "Luna's Master Data Integrity Report"
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

      await playerStateManager.forceDatabaseSync(playerId);
      
      res.json({ 
        success: true, 
        message: `Player ${playerId} force-synced to database`
      });
    } catch (error) {
      logger.error('Force sync error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to force sync player' });
    }
  });

  // 🎯 JSON-FIRST: Admin endpoint to view system health
  app.get("/api/admin/system-health", requireAuth, requireAdmin, async (req, res) => {
    try {
      const playerHealth = await playerStateManager.healthCheck();
      const masterDataReport = await masterDataService.getDataIntegrityReport();
      
      res.json({ 
        success: true,
        system: {
          timestamp: new Date().toISOString(),
          jsonFirst: {
            active: true,
            ...playerHealth
          },
          masterData: masterDataReport,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          env: process.env.NODE_ENV
        }
      });
    } catch (error) {
      logger.error('System health error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to get system health' });
    }
  });
  
  logger.info('🚀 Creating HTTP server...');
  const httpServer = createServer(app);
  
  logger.info('✅ All routes registered successfully');
  logger.info('🎯 JSON-FIRST: Player state system initialized with atomic writes and delta syncing');
  return httpServer;
}