import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { AuthDataValidator } from "@telegram-auth/server";
import { requireAuth, requireAdmin } from "./middleware/auth";
import { syncAllGameData, saveUpgradeToJSON, saveLevelToJSON, saveCharacterToJSON, savePlayerDataToJSON } from "./utils/dataLoader";
import { insertUpgradeSchema, insertCharacterSchema, insertLevelSchema, insertPlayerUpgradeSchema } from "@shared/schema";
import { generateSecureToken, getSessionExpiry } from "./utils/auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storageConfig = multer.diskStorage({
  destination: function (req, _file, cb) {
    // Character name will be available in req.body after multer processes the form
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
  app.post("/api/upload", requireAuth, upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const characterName = req.body.characterName;
    const imageType = req.body.imageType || 'character';

    if (!characterName) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Character name is required" });
    }

    const finalDir = path.join(__dirname, "..", "uploads", "characters", characterName, imageType);
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }

    const finalPath = path.join(finalDir, req.file.filename);
    fs.renameSync(req.file.path, finalPath);

    const fileUrl = `/uploads/characters/${characterName}/${imageType}/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const player = await storage.getPlayer(req.player!.id);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      res.json({ success: true, player });
    } catch (error) {
      console.error('Error fetching current player:', error);
      res.status(500).json({ error: 'Failed to fetch player data' });
    }
  });

  app.post("/api/auth/dev", async (req, res) => {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Development login not available in production' });
    }

    console.log('🛠️ Dev auth request received');

    try {
      const { username } = req.body;

      if (!username || username.trim().length === 0) {
        return res.status(400).json({ error: 'Username is required' });
      }

      const sanitizedUsername = username.trim().substring(0, 50);
      const devTelegramId = `dev_${sanitizedUsername.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

      console.log('👤 Dev login for:', sanitizedUsername);

      let player = await storage.getPlayerByTelegramId(devTelegramId);

      if (!player) {
        console.log('➕ Creating new dev player...');
        player = await storage.createPlayer({
          telegramId: devTelegramId,
          username: sanitizedUsername,
          points: 0,
          energy: 1000,
          maxEnergy: 1000,
          level: 1,
          experience: 0,
          passiveIncomeRate: 0,
          isAdmin: false,
        });
        console.log('✅ New dev player created:', player.id);
        await savePlayerDataToJSON(player);
      } else {
        console.log('👋 Existing dev player found, updating last login...');
        await storage.updatePlayer(player.id, {
          lastLogin: new Date(),
        });
        await savePlayerDataToJSON(player);
      }

      const sessionToken = generateSecureToken();
      await storage.createSession({
        playerId: player.id,
        token: sessionToken,
        expiresAt: getSessionExpiry(),
      });

      console.log('🎉 Dev auth successful for player:', player.username);
      res.json({
        success: true,
        player,
        sessionToken,
      });
    } catch (error) {
      console.error('💥 Dev auth error:', error);
      res.status(500).json({ error: 'Authentication failed', details: (error as Error).message });
    }
  });

  app.post("/api/auth/telegram", async (req, res) => {
    console.log('🔐 Telegram auth request received');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

    try {
      const { initData } = req.body;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      console.log('🔑 Bot token exists:', !!botToken);
      console.log('📝 InitData exists:', !!initData);
      console.log('📝 InitData length:', initData?.length || 0);

      if (!botToken) {
        console.error('❌ Missing TELEGRAM_BOT_TOKEN');
        return res.status(500).json({ error: 'Telegram authentication not configured' });
      }

      if (!initData) {
        console.error('❌ Missing initData in request');
        return res.status(400).json({ error: 'Missing initData' });
      }

      console.log('🔍 Parsing initData...');
      const validator = new AuthDataValidator({ botToken });
      const dataMap = new Map(new URLSearchParams(initData).entries());

      console.log('📊 Parsed data map entries:', Array.from(dataMap.entries()));

      console.log('✅ Validating Telegram data...');
      const validationResult = await validator.validate(dataMap);

      console.log('📋 Validation result:', JSON.stringify(validationResult, null, 2));

      if (!validationResult || !validationResult.id) {
        console.error('❌ Invalid validation result or missing ID');
        return res.status(401).json({ error: 'Invalid Telegram authentication' });
      }

      const telegramId = validationResult.id.toString();
      console.log('👤 Telegram ID:', telegramId);

      if (!telegramId) {
        console.error('❌ Failed to extract Telegram ID');
        return res.status(400).json({ error: 'Missing Telegram user ID' });
      }

      console.log('🔍 Looking up player by Telegram ID...');
      let player = await storage.getPlayerByTelegramId(telegramId);

      if (!player) {
        console.log('➕ Creating new player...');
        player = await storage.createPlayer({
          telegramId,
          username: (validationResult as any).username || (validationResult as any).first_name || 'TelegramUser',
          points: 0,
          energy: 1000,
          maxEnergy: 1000,
          level: 1,
          passiveIncomeRate: 0,
          isAdmin: false,
        });
        console.log('✅ New player created:', player.id);
        await savePlayerDataToJSON(player);
      } else {
        console.log('👋 Existing player found, updating last login...');
        await storage.updatePlayer(player.id, {
          lastLogin: new Date(),
        });
        await savePlayerDataToJSON(player);
      }

      const sessionToken = generateSecureToken();
      const session = await storage.createSession({
        playerId: player.id,
        token: sessionToken,
        expiresAt: getSessionExpiry(),
      });

      console.log('🎉 Auth successful for player:', player.username);
      res.json({
        success: true,
        player,
        sessionToken,
      });
    } catch (error) {
      console.error('💥 Telegram auth error:', error);
      console.error('📍 Error stack:', (error as Error).stack);
      res.status(500).json({ error: 'Authentication failed', details: (error as Error).message });
    }
  });

  app.get("/api/upgrades", requireAuth, async (req, res) => {
    try {
      const includeHidden = req.player?.isAdmin || false;
      const upgrades = await storage.getUpgrades(includeHidden);
      res.json({ upgrades });
    } catch (error) {
      console.error('Error fetching upgrades:', error);
      res.status(500).json({ error: 'Failed to fetch upgrades' });
    }
  });

  app.get("/api/characters", requireAuth, async (req, res) => {
    try {
      const includeHidden = req.player?.isAdmin || false;
      const characters = await storage.getCharacters(includeHidden);
      res.json({ characters });
    } catch (error) {
      console.error('Error fetching characters:', error);
      res.status(500).json({ error: 'Failed to fetch characters' });
    }
  });

  app.get("/api/levels", requireAuth, async (_req, res) => {
    try {
      const levels = await storage.getLevels();
      res.json({ levels });
    } catch (error) {
      console.error('Error fetching levels:', error);
      res.status(500).json({ error: 'Failed to fetch levels' });
    }
  });

  app.get("/api/player/me", requireAuth, async (req, res) => {
    try {
      const player = await storage.getPlayer(req.player!.id);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      res.json({ player });
    } catch (error) {
      console.error('Error fetching player:', error);
      res.status(500).json({ error: 'Failed to fetch player data' });
    }
  });

  app.patch("/api/player/me", requireAuth, async (req, res) => {
    try {
      const updates = req.body;
      if (updates.isAdmin !== undefined) {
        delete updates.isAdmin;
      }

      const updatedPlayer = await storage.updatePlayer(req.player!.id, updates);
      if (updatedPlayer) {
        await savePlayerDataToJSON(updatedPlayer);
      }
      res.json({ player: updatedPlayer });
    } catch (error) {
      console.error('Error updating player:', error);
      res.status(500).json({ error: 'Failed to update player' });
    }
  });

  app.get("/api/player/upgrades", requireAuth, async (req, res) => {
    try {
      const playerUpgrades = await storage.getPlayerUpgrades(req.player!.id);
      res.json({ upgrades: playerUpgrades });
    } catch (error) {
      console.error('Error fetching player upgrades:', error);
      res.status(500).json({ error: 'Failed to fetch player upgrades' });
    }
  });

  app.post("/api/player/upgrades", requireAuth, async (req, res) => {
    try {
      const validation = insertPlayerUpgradeSchema.safeParse({
        ...req.body,
        playerId: req.player!.id,
      });

      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid upgrade data', details: validation.error });
      }

      const playerUpgrade = await storage.setPlayerUpgrade(validation.data);
      res.json({ upgrade: playerUpgrade });
    } catch (error) {
      console.error('Error setting player upgrade:', error);
      res.status(500).json({ error: 'Failed to set player upgrade' });
    }
  });

  app.get("/api/player/characters", requireAuth, async (req, res) => {
    try {
      const playerCharacters = await storage.getPlayerCharacters(req.player!.id);
      res.json({ characters: playerCharacters });
    } catch (error) {
      console.error('Error fetching player characters:', error);
      res.status(500).json({ error: 'Failed to fetch player characters' });
    }
  });

  app.post("/api/player/characters/:characterId/unlock", requireAuth, async (req, res) => {
    try {
      const { characterId } = req.params;

      const hasCharacter = await storage.hasCharacter(req.player!.id, characterId);
      if (hasCharacter) {
        return res.status(400).json({ error: 'Character already unlocked' });
      }

      const character = await storage.unlockCharacter({
        playerId: req.player!.id,
        characterId,
      });

      res.json({ character });
    } catch (error) {
      console.error('Error unlocking character:', error);
      res.status(500).json({ error: 'Failed to unlock character' });
    }
  });

  app.post("/api/admin/sync-data", requireAuth, requireAdmin, async (_req, res) => {
    try {
      await syncAllGameData();
      res.json({ success: true, message: 'Game data synchronized from JSON files' });
    } catch (error) {
      console.error('Error syncing game data:', error);
      res.status(500).json({ error: 'Failed to sync game data' });
    }
  });

  app.post("/api/admin/upgrades", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validation = insertUpgradeSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid upgrade data', details: validation.error });
      }

      const upgrade = await storage.createUpgrade(validation.data);

      await saveUpgradeToJSON(validation.data);

      res.json({ upgrade, message: 'Upgrade created and JSON file generated' });
    } catch (error) {
      console.error('Error creating upgrade:', error);
      res.status(500).json({ error: 'Failed to create upgrade' });
    }
  });

  app.patch("/api/admin/upgrades/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedUpgrade = await storage.updateUpgrade(id, updates);

      if (!updatedUpgrade) {
        return res.status(404).json({ error: 'Upgrade not found' });
      }

      await saveUpgradeToJSON(updatedUpgrade);

      res.json({ upgrade: updatedUpgrade, message: 'Upgrade updated and JSON file synced' });
    } catch (error) {
      console.error('Error updating upgrade:', error);
      res.status(500).json({ error: 'Failed to update upgrade' });
    }
  });

  app.delete("/api/admin/upgrades/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const upgradesDir = path.join(__dirname, "../main-gamedata/progressive-data/upgrades");
      const filePath = path.join(upgradesDir, `${id}.json`);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({ success: true, message: 'Upgrade deleted and JSON file removed' });
    } catch (error) {
      console.error('Error deleting upgrade:', error);
      res.status(500).json({ error: 'Failed to delete upgrade' });
    }
  });

  app.post("/api/admin/characters", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validation = insertCharacterSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid character data', details: validation.error });
      }

      const character = await storage.createCharacter(validation.data);

      await saveCharacterToJSON(validation.data);

      res.json({ character, message: 'Character created and JSON file generated' });
    } catch (error) {
      console.error('Error creating character:', error);
      res.status(500).json({ error: 'Failed to create character' });
    }
  });

  app.patch("/api/admin/characters/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedCharacter = await storage.updateCharacter(id, updates);

      if (!updatedCharacter) {
        return res.status(404).json({ error: 'Character not found' });
      }

      await saveCharacterToJSON(updatedCharacter);

      res.json({ character: updatedCharacter, message: 'Character updated and JSON file synced' });
    } catch (error) {
      console.error('Error updating character:', error);
      res.status(500).json({ error: 'Failed to update character' });
    }
  });

  app.delete("/api/admin/characters/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const charactersDir = path.join(__dirname, "../main-gamedata/character-data");
      const filePath = path.join(charactersDir, `${id}.json`);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({ success: true, message: 'Character deleted and JSON file removed' });
    } catch (error) {
      console.error('Error deleting character:', error);
      res.status(500).json({ error: 'Failed to delete character' });
    }
  });

  app.post("/api/admin/levels", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validation = insertLevelSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid level data', details: validation.error });
      }

      const level = await storage.createLevel(validation.data);

      await saveLevelToJSON(validation.data);

      res.json({ level, message: 'Level created and JSON file generated' });
    } catch (error) {
      console.error('Error creating level:', error);
      res.status(500).json({ error: 'Failed to create level' });
    }
  });

  app.patch("/api/admin/levels/:level", requireAuth, requireAdmin, async (req, res) => {
    try {
      const level = parseInt(req.params.level);
      const updates = req.body;

      const updatedLevel = await storage.updateLevel(level, updates);

      if (!updatedLevel) {
        return res.status(404).json({ error: 'Level not found' });
      }

      await saveLevelToJSON(updatedLevel);

      res.json({ level: updatedLevel, message: 'Level updated and JSON file synced' });
    } catch (error) {
      console.error('Error updating level:', error);
      res.status(500).json({ error: 'Failed to update level' });
    }
  });

  app.delete("/api/admin/levels/:level", requireAuth, requireAdmin, async (req, res) => {
    try {
      const level = parseInt(req.params.level);
      const levelsDir = path.join(__dirname, "../main-gamedata/progressive-data/levelup");
      const filePath = path.join(levelsDir, `level-${level}.json`);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({ success: true, message: 'Level deleted and JSON file removed' });
    } catch (error) {
      console.error('Error deleting level:', error);
      res.status(500).json({ error: 'Failed to delete level' });
    }
  });

  app.get("/api/admin/players", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const players = await storage.getAllPlayers();
      res.json({ players });
    } catch (error) {
      console.error('Error fetching players:', error);
      res.status(500).json({ error: 'Failed to fetch players' });
    }
  });

  app.patch("/api/admin/players/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedPlayer = await storage.updatePlayer(id, updates);

      if (!updatedPlayer) {
        return res.status(404).json({ error: 'Player not found' });
      }

      res.json({ player: updatedPlayer });
    } catch (error) {
      console.error('Error updating player:', error);
      res.status(500).json({ error: 'Failed to update player' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}