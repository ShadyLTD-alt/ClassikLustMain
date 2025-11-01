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
import { insertUpgradeSchema, insertCharacterSchema, insertLevelSchema, insertPlayerUpgradeSchema, insertMediaUploadSchema } from "@shared/schema";
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
  app.post("/api/upload", requireAuth, upload.single("image"), async (req, res) => {
    console.log('📤 Upload request received');
    console.log('📦 Request body:', req.body);
    console.log('📁 File:', req.file ? req.file.filename : 'No file');

    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const body = req.body;
      const categoriesObj = JSON.parse(body.categories);
      const parsedData = {
        characterId: body.characterId,
        characterName: body.characterName,
        imageType: body.imageType as 'character' | 'avatar' | 'vip' | 'other',
        unlockLevel: parseInt(body.unlockLevel),
        categories: [
          categoriesObj.nsfw ? 'nsfw' : null,
          categoriesObj.vip ? 'vip' : null,
          categoriesObj.event ? 'event' : null,
          categoriesObj.random ? 'random' : null
        ].filter(Boolean),
        poses: JSON.parse(body.poses),
        isHidden: body.isHidden === 'true',
        chatEnable: body.chatEnable === 'true',
        chatSendPercent: parseInt(body.chatSendPercent) || 0
      };

      console.log('📋 Parsed data:', parsedData);

      if (!parsedData.characterId || !parsedData.characterName) {
        console.error('❌ Missing character ID or name');
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Character ID and name are required" });
      }

      const finalDir = path.join(__dirname, "..", "uploads", "characters", parsedData.characterName, parsedData.imageType);
      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir, { recursive: true });
        console.log('📁 Created directory:', finalDir);
      }

      const finalPath = path.join(finalDir, req.file.filename);
      fs.renameSync(req.file.path, finalPath);
      console.log('✅ File moved to:', finalPath);

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

      console.log('✅ Media upload created:', mediaUpload.id);
      res.json({ url: fileUrl, media: mediaUpload });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error('💥 Error uploading file:', error);
      res.status(500).json({ error: 'Failed to upload file', details: (error as Error).message });
    }
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
    console.log('📦 Request body:', req.body);

    try {
      const { username } = req.body;

      if (!username || username.trim().length === 0) {
        console.log('❌ No username provided');
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
      console.error('📍 Error stack:', (error as Error).stack);
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

      // Get current player data to merge upgrades and unlockedCharacters
      const currentPlayer = await storage.getPlayer(req.player!.id);
      if (!currentPlayer) {
        return res.status(404).json({ error: 'Player not found' });
      }

      // Merge upgrades if provided
      if (updates.upgrades) {
        updates.upgrades = { ...currentPlayer.upgrades, ...updates.upgrades };
      }

      // Merge unlockedCharacters if provided
      if (updates.unlockedCharacters) {
        const current = Array.isArray(currentPlayer.unlockedCharacters) ? currentPlayer.unlockedCharacters : [];
        const incoming = Array.isArray(updates.unlockedCharacters) ? updates.unlockedCharacters : [];
        updates.unlockedCharacters = [...new Set([...current, ...incoming])];
      }

      const updatedPlayer = await storage.updatePlayer(req.player!.id, updates);
      if (updatedPlayer) {
        await savePlayerDataToJSON(updatedPlayer);
      }

      // Handle sendBeacon requests (no response expected)
      if (req.headers['content-type']?.includes('text/plain')) {
        res.status(204).end();
      } else {
        res.json({ player: updatedPlayer });
      }
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

      // Get current player state and validate purchase
      const player = await storage.getPlayer(req.player!.id);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      // Get upgrade config to calculate cost
      const upgrade = await storage.getUpgrade(validation.data.upgradeId);
      if (!upgrade) {
        return res.status(404).json({ error: 'Upgrade not found' });
      }

      const currentLevel = player.upgrades?.[validation.data.upgradeId] || 0;
      const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));

      // Validate player has enough points
      const playerPoints = typeof player.points === 'string' ? parseFloat(player.points) : player.points;
      if (playerPoints < cost) {
        return res.status(400).json({ error: 'Insufficient points' });
      }

      // Validate level increment
      if (validation.data.level !== currentLevel + 1) {
        return res.status(400).json({ error: 'Invalid level increment' });
      }

      // Save to playerUpgrades table
      const playerUpgrade = await storage.setPlayerUpgrade(validation.data);

      // Update player's upgrades JSONB field and deduct points
      const upgrades = player.upgrades || {};
      upgrades[validation.data.upgradeId] = validation.data.level;

      const updatedPlayer = await storage.updatePlayer(req.player!.id, { 
        upgrades,
        points: playerPoints - cost
      });

      if (updatedPlayer) {
        await savePlayerDataToJSON(updatedPlayer);
      }

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

      // Save to playerCharacters table
      const character = await storage.unlockCharacter({
        playerId: req.player!.id,
        characterId,
      });

      // Also update the player's unlockedCharacters JSONB field
      const player = await storage.getPlayer(req.player!.id);
      if (player) {
        const unlockedCharacters = Array.isArray(player.unlockedCharacters) ? player.unlockedCharacters : [];
        if (!unlockedCharacters.includes(characterId)) {
          unlockedCharacters.push(characterId);
          const updatedPlayer = await storage.updatePlayer(req.player!.id, { unlockedCharacters });
          if (updatedPlayer) {
            await savePlayerDataToJSON(updatedPlayer);
          }
        }
      }

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

  app.get("/api/media", requireAuth, async (req, res) => {
    try {
      const characterId = req.query.characterId as string | undefined;
      const includeHidden = req.player?.isAdmin || false;
      const media = await storage.getMediaUploads(characterId, includeHidden);
      res.json({ media });
    } catch (error) {
      console.error('Error fetching media uploads:', error);
      res.status(500).json({ error: 'Failed to fetch media uploads' });
    }
  });

  app.patch("/api/media/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedMedia = await storage.updateMediaUpload(id, updates);

      if (!updatedMedia) {
        return res.status(404).json({ error: 'Media upload not found' });
      }

      res.json({ media: updatedMedia });
    } catch (error) {
      console.error('Error updating media upload:', error);
      res.status(500).json({ error: 'Failed to update media upload' });
    }
  });

  app.delete("/api/media/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const media = await storage.getMediaUpload(id);

      if (!media) {
        return res.status(404).json({ error: 'Media upload not found' });
      }

      const filePath = path.join(__dirname, "..", media.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await storage.deleteMediaUpload(id);

      res.json({ success: true, message: 'Media upload deleted' });
    } catch (error) {
      console.error('Error deleting media upload:', error);
      res.status(500).json({ error: 'Failed to delete media upload' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}