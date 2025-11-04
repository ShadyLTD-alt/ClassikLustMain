import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import logger from "./logger";
import { requireAuth, requireAdmin } from "./middleware/auth";
import { getUpgradesFromMemory, getCharactersFromMemory, getLevelsFromMemory, getUpgradeFromMemory } from "./utils/dataLoader";
import { playerStateManager, getPlayerState, updatePlayerState, selectCharacterForPlayer, setDisplayImageForPlayer, purchaseUpgradeForPlayer } from "./utils/playerStateManager";
import masterDataService from "./utils/MasterDataService";

export async function registerRoutes(app: Express): Promise<Server> {
  const { createServer } = await import("http");
  const server = createServer(app);

  // Health
  app.get('/api/health', async (_req, res) => {
    try {
      const health = await playerStateManager.healthCheck();
      res.json({ status: 'ok', jsonFirst: health, timestamp: new Date().toISOString() });
    } catch (e:any) {
      res.status(500).json({ status: 'error', error: e.message });
    }
  });

  // Auth me
  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const player = await getPlayerState(req.player!.id);
      res.json({ success: true, player });
    } catch (e:any) { res.status(500).json({ error: e.message }); }
  });

  // Player
  app.get('/api/player/me', requireAuth, async (req, res) => {
    try { const player = await getPlayerState(req.player!.id); res.json({ player }); }
    catch(e:any){ res.status(500).json({ error: e.message }); }
  });
  app.patch('/api/player/me', requireAuth, async (req, res) => {
    try { const updated = await updatePlayerState(req.player!.id, req.body); res.json({ player: updated }); }
    catch(e:any){ res.status(500).json({ error: e.message }); }
  });
  app.post('/api/player/select-character', requireAuth, async (req, res) => {
    try { const updated = await selectCharacterForPlayer(req.player!.id, req.body.characterId); res.json({ success:true, player: updated }); }
    catch(e:any){ res.status(500).json({ error: e.message }); }
  });
  app.post('/api/player/set-display-image', requireAuth, async (req, res) => {
    try { const updated = await setDisplayImageForPlayer(req.player!.id, req.body.imageUrl); res.json({ success:true, player: updated }); }
    catch(e:any){ res.status(500).json({ error: e.message }); }
  });
  app.post('/api/player/upgrades', requireAuth, async (req, res) => {
    try {
      const { upgradeId, level } = req.body;
      const upgrade = getUpgradeFromMemory(upgradeId);
      if (!upgrade) return res.status(400).json({ error: 'Invalid upgrade' });
      const cost = Math.round(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level - 1));
      const updated = await purchaseUpgradeForPlayer(req.player!.id, upgradeId, level, cost);
      res.json({ success: true, player: updated });
    } catch(e:any){ res.status(500).json({ error: e.message }); }
  });

  // Data
  app.get('/api/upgrades', requireAuth, (_req, res)=>{ res.json({ upgrades: getUpgradesFromMemory() });});
  app.get('/api/characters', requireAuth, (_req, res)=>{ res.json({ characters: getCharactersFromMemory() });});
  app.get('/api/levels', requireAuth, (_req, res)=>{ res.json({ levels: getLevelsFromMemory() });});

  return server;
}
