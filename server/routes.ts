import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { AuthDataValidator } from "@telegram-auth/server";

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

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const adminToken = req.headers['x-admin-token'];
  const envAdminToken = process.env.ADMIN_TOKEN;
  
  if (!envAdminToken) {
    return res.status(500).json({ error: 'Admin authentication not configured' });
  }
  
  if (adminToken !== envAdminToken) {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/upload", upload.single("image"), (req, res) => {
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
      } else {
        console.log('👋 Existing player found, updating last login...');
        await storage.updatePlayer(player.id, {
          lastLogin: new Date(),
        });
      }

      console.log('🎉 Auth successful for player:', player.username);
      res.json({
        success: true,
        player,
      });
    } catch (error) {
      console.error('💥 Telegram auth error:', error);
      console.error('📍 Error stack:', (error as Error).stack);
      res.status(500).json({ error: 'Authentication failed', details: (error as Error).message });
    }
  });

  app.get("/api/admin/players", requireAdmin, async (_req, res) => {
    try {
      const players = await storage.getAllPlayers();
      res.json({ players });
    } catch (error) {
      console.error('Error fetching players:', error);
      res.status(500).json({ error: 'Failed to fetch players' });
    }
  });

  app.patch("/api/admin/players/:id", requireAdmin, async (req, res) => {
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
