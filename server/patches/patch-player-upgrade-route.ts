import type { Express } from "express";
import { requireAuth } from "./middleware/auth";
import { getUpgradeFromMemory } from "./utils/dataLoader";
import { storage } from "./storage";
import { insertPlayerUpgradeSchema } from "@shared/schema";

// This snippet replaces the POST /api/player/upgrades handler portion
// Ensure this is merged into server/routes.ts in the existing registerRoutes function
export function patchPlayerUpgradeRoute(app: Express) {
  app.post("/api/player/upgrades", requireAuth, async (req, res) => {
    try {
      const base = { ...req.body, playerId: req.player!.id };

      // Fetch upgrade config to get authoritative type and cost
      const upgrade = getUpgradeFromMemory(base.upgradeId);
      if (!upgrade) {
        return res.status(404).json({ error: 'Upgrade not found' });
      }

      // Inject type from master upgrade config
      const payload = { ...base, type: upgrade.type };

      const validation = insertPlayerUpgradeSchema.safeParse(payload);
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid upgrade data', details: validation.error });
      }

      // Get current player and compute cost
      const player = await storage.getPlayer(req.player!.id);
      if (!player) return res.status(404).json({ error: 'Player not found' });

      const currentLevel = player.upgrades?.[validation.data.upgradeId] || 0;
      const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));

      const playerPoints = typeof player.points === 'string' ? parseFloat(player.points) : player.points;
      if (playerPoints < cost) {
        return res.status(400).json({ error: 'Insufficient points' });
      }

      if (validation.data.level !== currentLevel + 1) {
        return res.status(400).json({ error: 'Invalid level increment' });
      }

      // Persist player upgrade
      const playerUpgrade = await storage.setPlayerUpgrade(validation.data);

      // Update player's upgrades JSONB and deduct points
      const upgrades = player.upgrades || {};
      upgrades[validation.data.upgradeId] = validation.data.level;
      const updatedPlayer = await storage.updatePlayer(req.player!.id, {
        upgrades,
        points: playerPoints - cost,
      });

      if (updatedPlayer) {
        // Optional: save to JSON if needed
      }

      res.json({ upgrade: playerUpgrade });
    } catch (error) {
      console.error('Error setting player upgrade:', error);
      res.status(500).json({ error: 'Failed to set player upgrade' });
    }
  });
}
