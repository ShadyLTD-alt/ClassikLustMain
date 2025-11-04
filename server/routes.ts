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
// 🎯 JSON-FIRST: Import new player state manager WITH FIXED EXPORTS
import { playerStateManager, getPlayerState, updatePlayerState, selectCharacterForPlayer, purchaseUpgradeForPlayer, setDisplayImageForPlayer } from "./utils/playerStateManager";
// 🌙 LUNA LEARNING: Import learning system (now fixed)
import { lunaLearning } from "./utils/lunaLearningSystem";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📁 Directory constants for master-data template system
const MASTER_DATA_DIR = path.join(process.cwd(), 'master-data');
const MAIN_GAMEDATA_DIR = path.join(process.cwd(), 'main-gamedata');

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

  // 🔧 REGISTER DEBUG ROUTES (development only) - FIXED IMPORT
  if (process.env.NODE_ENV !== 'production') {
    try {
      const debugRoutes = await import('./routes/debug.js');
      app.use('/api/debug', debugRoutes.default);
      console.log('🔧 Debug routes registered at /api/debug');
    } catch (error) {
      console.warn('⚠️ Debug routes not available:', error instanceof Error ? error.message : 'Unknown');
    }
  }

  // 🔍 DIAGNOSTIC: Enhanced health check with detailed debugging
  app.get("/api/health", async (req, res) => {
    try {
      const playerStateHealth = await playerStateManager.healthCheck();
      const timestamp = new Date().toISOString();
      
      // Check session token if provided
      let sessionInfo = null;
      const sessionToken = req.headers['authorization']?.replace('Bearer ', '');
      if (sessionToken) {
        try {
          const session = await storage.getSessionByToken(sessionToken);
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
        session: sessionInfo,
        logging: {
          logDir: path.resolve(process.cwd(), "logs"),
          fallbackActive: !fs.existsSync(path.resolve(process.cwd(), "logs")),
          lastHealthCheck: timestamp
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

  // 🔧 MIGRATION: Auto-migrate old player files to new telegramId_username structure
  app.post("/api/admin/migrate-player-files", requireAuth, requireAdmin, async (req, res) => {
    try {
      console.log('📦 Starting player file migration to telegramId_username structure...');
      logger.info('Player file migration started');
      
      const result = await playerStateManager.migrateOldPlayerFiles();
      
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

  // 🌙 LUNA LEARNING ENDPOINT (now fixed)
  app.get("/api/luna/learning-report", requireAuth, requireAdmin, async (req, res) => {
    try {
      const summary = await lunaLearning.getLearningSummary();
      const checklist = await lunaLearning.getPreventionChecklist();
      const scan = await lunaLearning.runPreventionScan();
      
      res.json({
        success: true,
        luna: {
          learning: summary,
          preventionChecklist: checklist,
          currentScan: scan,
          message: "Luna's accumulated knowledge from error patterns (JSON parsing fixed)"
        }
      });
    } catch (error) {
      logger.error('Luna learning report error', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Failed to generate Luna learning report' });
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
      const newCharacter = {
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
      };
      
      // Save to main-gamedata/characters/
      await saveCharacterToJSON(newCharacter);
      
      // Also save to database for compatibility
      try {
        const dbCharacter = await storage.createCharacter(newCharacter);
        console.log(`✅ [CREATE CHARACTER] Character created: ${newCharacter.name} (${newCharacter.id})`);
        console.log(`📁 [CREATE CHARACTER] Saved to: main-gamedata/characters/${newCharacter.id}.json`);
        res.json({ success: true, character: dbCharacter });
      } catch (dbError) {
        // Character saved to JSON successfully, DB save failed (not critical)
        console.log(`⚠️ [CREATE CHARACTER] JSON saved but DB failed - character will work from JSON`);
        res.json({ success: true, character: newCharacter, warning: 'DB save failed but JSON saved' });
      }
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
      const playerState = await getPlayerState(req.player!.id);
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

      let player = await storage.getPlayerByTelegramId(devTelegramId);
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
        
        player = await storage.createPlayer(playerData);
        await savePlayerDataToJSON(player);
        console.log(`🎮 Created new dev player: ${sanitizedUsername} (${devTelegramId}_${sanitizedUsername})`);
      } else {
        console.log(`🔍 [DEV AUTH] Updating existing player login time...`);
        await storage.updatePlayer(player.id, { lastLogin: new Date() });
        await savePlayerDataToJSON(player);
      }

      const sessionToken = generateSecureToken();
      console.log(`🔍 [DEV AUTH] Generated session token: ${sessionToken.slice(0, 8)}...`);
      
      await storage.createSession({
        playerId: player.id,
        token: sessionToken,
        expiresAt: getSessionExpiry(),
      });
      
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

      let player = await storage.getPlayerByTelegramId(telegramId);

      if (!player) {
        const playerData = await masterDataService.createNewPlayerData(telegramId, username);
        player = await storage.createPlayer(playerData);
        await savePlayerDataToJSON(player);
        console.log(`🎮 Created new Telegram player: ${username} (${telegramId}_${username})`);
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

  // 🖼️ ENHANCED: Update media with poses and character reassignment
  app.patch("/api/media/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      console.log(`🖼️ [UPDATE MEDIA] Updating media ${id}...`, updates);
      
      const existingMedia = await storage.getMediaUpload(id);
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
      
      const updatedMedia = await storage.updateMediaUpload(id, {
        ...updates,
        updatedAt: new Date()
      });
      
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
  
  // 🎯 JSON-FIRST: Get player data (from telegramId_username folder) - ENHANCED DEBUGGING
  app.get("/api/player/me", requireAuth, async (req, res) => {
    try {
      console.log(`🔍 [PLAYER/ME] Request from: ${req.player?.username || req.player?.id}`);
      
      const playerState = await getPlayerState(req.player!.id);
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

  // 🎯 JSON-FIRST: Update player data (immediate telegramId_username JSON + async DB)
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
      const updatedState = await updatePlayerState(req.player!.id, updates);
      console.log(`✅ [PLAYER/ME PATCH] Successfully updated: ${updatedState.username}`);

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

  // 🎭 CHARACTER SELECT: Now auto-unlocks in development
  app.post("/api/player/select-character", requireAuth, async (req, res) => {
    try {
      const { characterId } = req.body;
      
      console.log(`🎭 [CHARACTER SELECT] Player ${req.player!.username || req.player!.id} selecting: ${characterId}`);
      
      if (!characterId) {
        console.log(`❌ [CHARACTER SELECT] No characterId provided`);
        return res.status(400).json({ error: 'Character ID is required' });
      }

      const playerState = await getPlayerState(req.player!.id);
      console.log(`🎭 [CHARACTER SELECT] Current character: ${playerState.selectedCharacterId}`);
      console.log(`🎭 [CHARACTER SELECT] Unlocked characters: [${playerState.unlockedCharacters.join(', ')}]`);
      
      // 🔧 DEV: Auto-unlock character if not unlocked
      if (!playerState.unlockedCharacters.includes(characterId)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`🔓 [CHARACTER SELECT] DEV: Auto-unlocking ${characterId}`);
          playerState.unlockedCharacters.push(characterId);
        } else {
          console.log(`❌ [CHARACTER SELECT] Character ${characterId} not in unlocked list`);
          return res.status(403).json({ error: `Character ${characterId} is not unlocked` });
        }
      }

      console.log(`🔄 [CHARACTER SELECT] Attempting to select ${characterId}...`);
      const updatedState = await selectCharacterForPlayer(req.player!.id, characterId);
      
      console.log(`✅ [CHARACTER SELECT] SUCCESS: ${characterId} selected for ${updatedState.username}`);
      
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

  // 🖼️ FIXED: Set display image with telegramId_username folder JSON - ENHANCED LOGGING
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
      const updatedState = await setDisplayImageForPlayer(req.player!.id, imageUrl);
      
      console.log(`✅ [DISPLAY IMAGE] SUCCESS: ${imageUrl} set for ${updatedState.username}`);
      
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

  // 🎯 JSON-FIRST: Purchase upgrade
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
      const updatedState = await purchaseUpgradeForPlayer(req.player!.id, upgradeId, level, cost);
      
      console.log(`✅ [UPGRADE] Success for ${updatedState.username}`);
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
      const health = await playerStateManager.healthCheck();
      console.log(`🔍 [PLAYER HEALTH] Check requested by: ${req.player?.username}`);
      
      res.json({ 
        success: true, 
        health,
        message: 'JSON-first player state system status',
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

      console.log(`⚡ [FORCE SYNC] Admin forcing sync for player: ${playerId}`);
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

  // 🎯 JSON-FIRST: Admin endpoint to view system health + Luna learning
  app.get("/api/admin/system-health", requireAuth, requireAdmin, async (req, res) => {
    try {
      const playerHealth = await playerStateManager.healthCheck();
      const masterDataReport = await masterDataService.getDataIntegrityReport();
      const lunaLearningReport = await lunaLearning.getLearningSummary();
      
      console.log(`🔍 [SYSTEM HEALTH] Admin health check by: ${req.player?.username}`);
      
      res.json({ 
        success: true,
        system: {
          timestamp: new Date().toISOString(),
          jsonFirst: {
            active: true,
            ...playerHealth
          },
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
  console.log('🎯 JSON-FIRST: Player system using telegramId_username folders: main-gamedata/player-data/{telegramId}_{username}/player_{username}.json');
  console.log('🔧 Debug routes available at /api/debug (dev only)');
  console.log('📁 Master-data templates available for admin create flows');
  console.log('🌙 Luna Learning System active (JSON parsing fixed)');
  console.log('📦 Migration endpoint available: POST /api/admin/migrate-player-files');
  console.log('🔇 Winston logging active with enhanced error tracking');
  return httpServer;
}