var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { createClient } from "@supabase/supabase-js";
import { eq, and, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  characters: () => characters,
  insertCharacterSchema: () => insertCharacterSchema,
  insertLevelSchema: () => insertLevelSchema,
  insertMediaUploadSchema: () => insertMediaUploadSchema,
  insertPlayerCharacterSchema: () => insertPlayerCharacterSchema,
  insertPlayerLevelUpSchema: () => insertPlayerLevelUpSchema,
  insertPlayerSchema: () => insertPlayerSchema,
  insertPlayerUpgradeSchema: () => insertPlayerUpgradeSchema,
  insertSessionSchema: () => insertSessionSchema,
  insertUpgradeSchema: () => insertUpgradeSchema,
  levels: () => levels,
  mediaUploads: () => mediaUploads,
  playerCharacters: () => playerCharacters,
  playerLevelUps: () => playerLevelUps,
  playerUpgrades: () => playerUpgrades,
  players: () => players,
  sessions: () => sessions,
  upgrades: () => upgrades
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, real, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var players = pgTable("players", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  telegramId: text("telegramId").unique(),
  username: text("username").notNull(),
  points: integer("points").default(0).notNull(),
  energy: integer("energy").default(1e3).notNull(),
  maxEnergy: integer("maxEnergy").default(1e3).notNull(),
  level: integer("level").default(1).notNull(),
  experience: integer("experience").default(0).notNull(),
  passiveIncomeRate: integer("passiveIncomeRate").default(0).notNull(),
  isAdmin: boolean("isAdmin").default(false).notNull(),
  selectedCharacterId: text("selectedCharacterId"),
  selectedImageId: text("selectedImageId"),
  displayImage: text("displayImage"),
  upgrades: jsonb("upgrades").default("{}").notNull().$type(),
  unlockedCharacters: jsonb("unlockedCharacters").default("[]").notNull().$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastLogin: timestamp("lastLogin").defaultNow().notNull(),
  lastEnergyUpdate: timestamp("lastEnergyUpdate").defaultNow().notNull()
});
var upgrades = pgTable("upgrades", {
  id: text("id").primaryKey(),
  // perTap, perHour, energyMax, criticalChance, etc.
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  // perTap, perHour, energyMax
  icon: text("icon").notNull(),
  maxLevel: integer("maxLevel").notNull(),
  baseCost: integer("baseCost").notNull(),
  costMultiplier: real("costMultiplier").notNull(),
  baseValue: real("baseValue").notNull(),
  valueIncrement: real("valueIncrement").notNull(),
  isHidden: boolean("isHidden").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var characters = pgTable("characters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  unlockLevel: integer("unlockLevel").notNull(),
  description: text("description").notNull(),
  rarity: text("rarity").notNull(),
  defaultImage: text("defaultImage"),
  avatarImage: text("avatarImage"),
  displayImage: text("displayImage"),
  isHidden: boolean("isHidden").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var levels = pgTable("levels", {
  level: integer("level").primaryKey(),
  cost: integer("cost").notNull().default(100),
  // Points cost to level up
  experienceRequired: integer("experienceRequired"),
  // Optional/dormant XP system
  requirements: jsonb("requirements").notNull().default("[]").$type(),
  unlocks: jsonb("unlocks").notNull().default("[]").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var playerUpgrades = pgTable("playerUpgrades", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: varchar("playerId").notNull().references(() => players.id, { onDelete: "cascade" }),
  upgradeId: text("upgradeId").notNull().references(() => upgrades.id, { onDelete: "cascade" }),
  // perTap, perHour, etc.
  type: text("type"),
  // Store upgrade type for fast filtering - NULLABLE
  level: integer("level").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => ({
  // Ensure each player can only have one record per upgrade
  playerUpgradeUnique: unique().on(table.playerId, table.upgradeId)
}));
var playerLevelUps = pgTable("playerLevelUps", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: varchar("playerId").notNull().references(() => players.id, { onDelete: "cascade" }),
  level: integer("level").notNull(),
  unlockedAt: timestamp("unlockedAt").defaultNow().notNull(),
  source: text("source")
  // "requirements", "admin", "grant", etc.
}, (table) => ({
  // Ensure each player reaches each level only once
  playerLevelUnique: unique().on(table.playerId, table.level)
}));
var playerCharacters = pgTable("playerCharacters", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: varchar("playerId").notNull().references(() => players.id, { onDelete: "cascade" }),
  characterId: text("characterId").notNull().references(() => characters.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlockedAt").defaultNow().notNull()
});
var sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: varchar("playerId").notNull().references(() => players.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var mediaUploads = pgTable("mediaUploads", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: text("characterId").notNull().references(() => characters.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  type: text("type").notNull().default("character"),
  unlockLevel: integer("unlockLevel").notNull().default(1),
  categories: jsonb("categories").notNull().default(sql`'[]'::jsonb`).$type(),
  poses: jsonb("poses").notNull().default(sql`'[]'::jsonb`).$type(),
  isHidden: boolean("isHidden").notNull().default(false),
  chatEnable: boolean("chatEnable").notNull().default(false),
  chatSendPercent: integer("chatSendPercent").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow()
});
var insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
  lastEnergyUpdate: true
});
var insertUpgradeSchema = createInsertSchema(upgrades).omit({
  createdAt: true
});
var insertCharacterSchema = createInsertSchema(characters).omit({
  createdAt: true
});
var insertLevelSchema = createInsertSchema(levels).omit({
  createdAt: true
});
var insertPlayerUpgradeSchema = createInsertSchema(playerUpgrades).omit({
  id: true,
  updatedAt: true
});
var insertPlayerLevelUpSchema = createInsertSchema(playerLevelUps).omit({
  id: true,
  unlockedAt: true
});
var insertPlayerCharacterSchema = createInsertSchema(playerCharacters).omit({
  id: true,
  unlockedAt: true
});
var insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true
});
var insertMediaUploadSchema = createInsertSchema(mediaUploads).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  chatEnable: z.boolean().optional().default(false),
  chatSendPercent: z.number().int().min(0).max(100).optional().default(0)
});

// server/storage.ts
var supabaseUrl = process.env.SUPABASE_URL;
var supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set");
}
if (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://")) {
  throw new Error(`Invalid SUPABASE_URL format: "${supabaseUrl}". Must start with http:// or https://`);
}
var supabase = createClient(supabaseUrl, supabaseAnonKey);
var connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set for database connection");
}
if (!connectionString.startsWith("postgres://") && !connectionString.startsWith("postgresql://")) {
  throw new Error(`Invalid DATABASE_URL format: must start with postgresql://`);
}
var client = postgres(connectionString, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});
var db = drizzle(client, { schema: schema_exports });
var DatabaseStorage = class {
  async getPlayer(id) {
    const result = await db.select().from(players).where(eq(players.id, id)).limit(1);
    return result[0];
  }
  async getPlayerByTelegramId(telegramId) {
    const result = await db.select().from(players).where(eq(players.telegramId, telegramId)).limit(1);
    return result[0];
  }
  async createPlayer(playerData) {
    const result = await db.insert(players).values(playerData).returning();
    return result[0];
  }
  async updatePlayer(id, updates) {
    const result = await db.update(players).set(updates).where(eq(players.id, id)).returning();
    return result[0];
  }
  async getAllPlayers() {
    return await db.select().from(players);
  }
  async getUpgrades(includeHidden = false) {
    if (includeHidden) {
      return await db.select().from(upgrades);
    }
    return await db.select().from(upgrades).where(eq(upgrades.isHidden, false));
  }
  async getUpgrade(id) {
    const result = await db.select().from(upgrades).where(eq(upgrades.id, id)).limit(1);
    return result[0];
  }
  async createUpgrade(upgrade) {
    try {
      const result = await db.insert(upgrades).values(upgrade).returning();
      return result[0];
    } catch (error) {
      if (error?.code === "23505") {
        const result = await db.update(upgrades).set(upgrade).where(eq(upgrades.id, upgrade.id)).returning();
        return result[0];
      }
      throw error;
    }
  }
  async updateUpgrade(id, updates) {
    const result = await db.update(upgrades).set(updates).where(eq(upgrades.id, id)).returning();
    return result[0];
  }
  async deleteUpgrade(id) {
    const result = await db.delete(upgrades).where(eq(upgrades.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  async getCharacters(includeHidden = false) {
    if (includeHidden) {
      return await db.select().from(characters);
    }
    return await db.select().from(characters).where(eq(characters.isHidden, false));
  }
  async getCharacter(id) {
    const result = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
    return result[0];
  }
  async createCharacter(character) {
    try {
      const result = await db.insert(characters).values(character).returning();
      return result[0];
    } catch (error) {
      if (error?.code === "23505") {
        const result = await db.update(characters).set(character).where(eq(characters.id, character.id)).returning();
        return result[0];
      }
      throw error;
    }
  }
  async updateCharacter(id, updates) {
    const result = await db.update(characters).set(updates).where(eq(characters.id, id)).returning();
    return result[0];
  }
  async deleteCharacter(id) {
    const result = await db.delete(characters).where(eq(characters.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  async getLevels() {
    return await db.select().from(levels).orderBy(levels.level);
  }
  async getLevel(level) {
    const result = await db.select().from(levels).where(eq(levels.level, level)).limit(1);
    return result[0];
  }
  async createLevel(levelData) {
    try {
      const result = await db.insert(levels).values(levelData).returning();
      return result[0];
    } catch (error) {
      if (error?.code === "23505") {
        const result = await db.update(levels).set(levelData).where(eq(levels.level, levelData.level)).returning();
        return result[0];
      }
      throw error;
    }
  }
  async updateLevel(level, updates) {
    const result = await db.update(levels).set(updates).where(eq(levels.level, level)).returning();
    return result[0];
  }
  async deleteLevel(level) {
    const result = await db.delete(levels).where(eq(levels.level, level));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  async getPlayerUpgrades(playerId) {
    const results = await db.select().from(playerUpgrades).leftJoin(upgrades, eq(playerUpgrades.upgradeId, upgrades.id)).where(eq(playerUpgrades.playerId, playerId));
    return results.map((row) => ({
      ...row.playerUpgrades,
      upgrade: row.upgrades
    }));
  }
  async getPlayerUpgrade(playerId, upgradeId) {
    const result = await db.select().from(playerUpgrades).where(and(
      eq(playerUpgrades.playerId, playerId),
      eq(playerUpgrades.upgradeId, upgradeId)
    )).limit(1);
    return result[0];
  }
  async setPlayerUpgrade(data) {
    const existing = await this.getPlayerUpgrade(data.playerId, data.upgradeId);
    if (existing) {
      const result2 = await db.update(playerUpgrades).set({ level: data.level, type: data.type, updatedAt: /* @__PURE__ */ new Date() }).where(eq(playerUpgrades.id, existing.id)).returning();
      return result2[0];
    }
    const result = await db.insert(playerUpgrades).values(data).returning();
    return result[0];
  }
  async updatePlayerUpgrade(playerId, upgradeId, level) {
    const existing = await this.getPlayerUpgrade(playerId, upgradeId);
    if (!existing) return void 0;
    const result = await db.update(playerUpgrades).set({ level, updatedAt: /* @__PURE__ */ new Date() }).where(eq(playerUpgrades.id, existing.id)).returning();
    return result[0];
  }
  async getPlayerLevelUps(playerId) {
    return await db.select().from(playerLevelUps).where(eq(playerLevelUps.playerId, playerId));
  }
  async getPlayerLevelUp(playerId, level) {
    const result = await db.select().from(playerLevelUps).where(and(
      eq(playerLevelUps.playerId, playerId),
      eq(playerLevelUps.level, level)
    )).limit(1);
    return result[0];
  }
  async createPlayerLevelUp(data) {
    const result = await db.insert(playerLevelUps).values(data).returning();
    return result[0];
  }
  async getPlayerCharacters(playerId) {
    const results = await db.select().from(playerCharacters).leftJoin(characters, eq(playerCharacters.characterId, characters.id)).where(eq(playerCharacters.playerId, playerId));
    return results.map((row) => ({
      ...row.playerCharacters,
      character: row.characters
    }));
  }
  async unlockCharacter(data) {
    const result = await db.insert(playerCharacters).values(data).returning();
    return result[0];
  }
  async hasCharacter(playerId, characterId) {
    const result = await db.select().from(playerCharacters).where(and(
      eq(playerCharacters.playerId, playerId),
      eq(playerCharacters.characterId, characterId)
    )).limit(1);
    return result.length > 0;
  }
  async createSession(data) {
    const result = await db.insert(sessions).values(data).returning();
    return result[0];
  }
  async getSessionByToken(token) {
    const results = await db.select().from(sessions).leftJoin(players, eq(sessions.playerId, players.id)).where(eq(sessions.token, token)).limit(1);
    if (results.length === 0 || !results[0].players) {
      return void 0;
    }
    const session = results[0].sessions;
    if (new Date(session.expiresAt) < /* @__PURE__ */ new Date()) {
      await this.deleteSession(token);
      return void 0;
    }
    return {
      ...session,
      player: results[0].players
    };
  }
  async deleteSession(token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  async cleanupExpiredSessions() {
    await db.delete(sessions).where(lt(sessions.expiresAt, /* @__PURE__ */ new Date()));
  }
  async getMediaUploads(characterId, includeHidden = false) {
    if (characterId) {
      if (includeHidden) {
        return await db.select().from(mediaUploads).where(eq(mediaUploads.characterId, characterId));
      }
      return await db.select().from(mediaUploads).where(
        and(
          eq(mediaUploads.characterId, characterId),
          eq(mediaUploads.isHidden, false)
        )
      );
    }
    if (includeHidden) {
      return await db.select().from(mediaUploads);
    }
    return await db.select().from(mediaUploads).where(eq(mediaUploads.isHidden, false));
  }
  async getMediaUpload(id) {
    const result = await db.select().from(mediaUploads).where(eq(mediaUploads.id, id)).limit(1);
    return result[0];
  }
  async createMediaUpload(data) {
    const result = await db.insert(mediaUploads).values(data).returning();
    return result[0];
  }
  async updateMediaUpload(id, updates) {
    const result = await db.update(mediaUploads).set(updates).where(eq(mediaUploads.id, id)).returning();
    return result[0];
  }
  async deleteMediaUpload(id) {
    await db.delete(mediaUploads).where(eq(mediaUploads.id, id));
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import multer from "multer";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import fs2 from "fs";
import { AuthDataValidator } from "@telegram-auth/server";

// server/middleware/auth.ts
async function requireAuth(req, res, next) {
  const sessionToken = req.headers["authorization"]?.replace("Bearer ", "");
  if (!sessionToken) {
    return res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in to access this resource. Please authenticate with Telegram."
    });
  }
  try {
    const session = await storage.getSessionByToken(sessionToken);
    if (!session) {
      return res.status(401).json({
        error: "Invalid session",
        message: "Your session has expired or is invalid. Please log in again."
      });
    }
    req.player = {
      id: session.player.id,
      telegramId: session.player.telegramId,
      username: session.player.username,
      isAdmin: session.player.isAdmin
    };
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}
function requireAdmin(req, res, next) {
  const adminToken = req.headers["x-admin-token"];
  const envAdminToken = process.env.ADMIN_TOKEN;
  if (envAdminToken && adminToken === envAdminToken) {
    return next();
  }
  if (!req.player) {
    return res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in as an admin to access this resource."
    });
  }
  if (!req.player.isAdmin) {
    return res.status(403).json({
      error: "Forbidden",
      message: "Admin access required. This action is restricted to administrators."
    });
  }
  next();
}

// server/utils/dataLoader.ts
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var upgradesCache = /* @__PURE__ */ new Map();
var charactersCache = /* @__PURE__ */ new Map();
var levelsCache = /* @__PURE__ */ new Map();
async function loadJSONFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return null;
  }
}
async function syncUpgrades() {
  console.log("\u{1F4E6} Syncing upgrades from master JSON file...");
  const masterFilePath = path.join(__dirname, "../../main-gamedata/master-data/upgrades-master.json");
  const masterData = await loadJSONFile(masterFilePath);
  if (masterData && masterData.upgrades) {
    console.log(`\u{1F4CB} Loading ${masterData.upgrades.length} upgrades from master-data/upgrades-master.json`);
    for (const data of masterData.upgrades) {
      upgradesCache.set(data.id, data);
      const upgradeData = {
        id: data.id,
        name: data.name,
        description: data.description,
        type: data.type,
        icon: data.icon,
        maxLevel: data.maxLevel,
        baseCost: data.baseCost,
        costMultiplier: data.costMultiplier,
        baseValue: data.baseValue,
        valueIncrement: data.valueIncrement,
        isHidden: data.isHidden || false
      };
      try {
        const existing = await storage.getUpgrade(data.id);
        if (existing) {
          await storage.updateUpgrade(data.id, upgradeData);
          console.log(`  \u2713 Updated upgrade: ${data.name}`);
        } else {
          await storage.createUpgrade(upgradeData);
          console.log(`  \u2713 Created upgrade: ${data.name}`);
        }
      } catch (dbError) {
        console.error(`  \u26A0\uFE0F Failed to sync upgrade ${data.name}:`, dbError);
      }
    }
    console.log(`\u2705 Synced ${masterData.upgrades.length} upgrades from master file`);
    return;
  }
  console.log("\u{1F4E6} Fallback: Trying root upgrades-master.json...");
  const rootMasterPath = path.join(__dirname, "../../main-gamedata/upgrades-master.json");
  const rootMasterData = await loadJSONFile(rootMasterPath);
  if (rootMasterData && rootMasterData.upgrades) {
    console.log(`\u{1F4CB} Loading ${rootMasterData.upgrades.length} upgrades from root upgrades-master.json`);
    for (const data of rootMasterData.upgrades) {
      upgradesCache.set(data.id, data);
      const upgradeData = {
        id: data.id,
        name: data.name,
        description: data.description,
        type: data.type,
        icon: data.icon,
        maxLevel: data.maxLevel,
        baseCost: data.baseCost,
        costMultiplier: data.costMultiplier,
        baseValue: data.baseValue,
        valueIncrement: data.valueIncrement,
        isHidden: data.isHidden || false
      };
      try {
        const existing = await storage.getUpgrade(data.id);
        if (existing) {
          await storage.updateUpgrade(data.id, upgradeData);
          console.log(`  \u2713 Updated upgrade: ${data.name}`);
        } else {
          await storage.createUpgrade(upgradeData);
          console.log(`  \u2713 Created upgrade: ${data.name}`);
        }
      } catch (dbError) {
        console.error(`  \u26A0\uFE0F Failed to sync upgrade ${data.name}:`, dbError);
      }
    }
    console.log(`\u2705 Synced ${rootMasterData.upgrades.length} upgrades from root master file`);
    return;
  }
  console.log("\u{1F4E6} Final fallback: Syncing upgrades from individual JSON files...");
  const upgradesDir = path.join(__dirname, "../../main-gamedata/progressive-data/upgrades");
  try {
    const files = await fs.readdir(upgradesDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    for (const file of jsonFiles) {
      const filePath = path.join(upgradesDir, file);
      const data = await loadJSONFile(filePath);
      if (!data) continue;
      upgradesCache.set(data.id, data);
      const upgradeData = {
        id: data.id,
        name: data.name,
        description: data.description,
        type: data.type,
        icon: data.icon,
        maxLevel: data.maxLevel,
        baseCost: data.baseCost,
        costMultiplier: data.costMultiplier,
        baseValue: data.baseValue,
        valueIncrement: data.valueIncrement,
        isHidden: data.isHidden || false
      };
      try {
        const existing = await storage.getUpgrade(data.id);
        if (existing) {
          await storage.updateUpgrade(data.id, upgradeData);
          console.log(`  \u2713 Updated upgrade: ${data.name}`);
        } else {
          await storage.createUpgrade(upgradeData);
          console.log(`  \u2713 Created upgrade: ${data.name}`);
        }
      } catch (dbError) {
        console.error(`  \u26A0\uFE0F Failed to sync upgrade ${data.name}:`, dbError);
      }
    }
    console.log(`\u2705 Synced ${jsonFiles.length} upgrades from individual files`);
  } catch (error) {
    console.error("\u274C Error syncing upgrades:", error);
    throw error;
  }
}
async function syncCharacters() {
  console.log("\u{1F4E6} Syncing characters from master JSON file...");
  const masterFilePath = path.join(__dirname, "../../main-gamedata/master-data/character-master.json");
  const masterData = await loadJSONFile(masterFilePath);
  if (masterData && masterData.characters) {
    console.log(`\u{1F4CB} Loading ${masterData.characters.length} characters from master-data/character-master.json`);
    for (const data of masterData.characters) {
      charactersCache.set(data.id, data);
      const characterData = {
        id: data.id,
        name: data.name,
        unlockLevel: data.unlockLevel,
        description: data.description,
        rarity: data.rarity,
        defaultImage: data.defaultImage || null,
        avatarImage: data.avatarImage || null,
        displayImage: data.displayImage || null,
        isHidden: data.isHidden || false
      };
      try {
        const existing = await storage.getCharacter(data.id);
        if (existing) {
          await storage.updateCharacter(data.id, characterData);
          console.log(`  \u2713 Updated character: ${data.name}`);
        } else {
          await storage.createCharacter(characterData);
          console.log(`  \u2713 Created character: ${data.name}`);
        }
      } catch (dbError) {
        console.error(`  \u26A0\uFE0F Failed to sync character ${data.name}:`, dbError);
      }
    }
    console.log(`\u2705 Synced ${masterData.characters.length} characters from master file`);
    return;
  }
  console.log("\u{1F4E6} Fallback: Trying root character-master.json...");
  const rootMasterPath = path.join(__dirname, "../../main-gamedata/character-master.json");
  const rootMasterData = await loadJSONFile(rootMasterPath);
  if (rootMasterData && rootMasterData.characters) {
    console.log(`\u{1F4CB} Loading ${rootMasterData.characters.length} characters from root character-master.json`);
    for (const data of rootMasterData.characters) {
      charactersCache.set(data.id, data);
      const characterData = {
        id: data.id,
        name: data.name,
        unlockLevel: data.unlockLevel,
        description: data.description,
        rarity: data.rarity,
        defaultImage: data.defaultImage || null,
        avatarImage: data.avatarImage || null,
        displayImage: data.displayImage || null,
        isHidden: data.isHidden || false
      };
      try {
        const existing = await storage.getCharacter(data.id);
        if (existing) {
          await storage.updateCharacter(data.id, characterData);
          console.log(`  \u2713 Updated character: ${data.name}`);
        } else {
          await storage.createCharacter(characterData);
          console.log(`  \u2713 Created character: ${data.name}`);
        }
      } catch (dbError) {
        console.error(`  \u26A0\uFE0F Failed to sync character ${data.name}:`, dbError);
      }
    }
    console.log(`\u2705 Synced ${rootMasterData.characters.length} characters from root master file`);
    return;
  }
  console.log("\u{1F4E6} Final fallback: Syncing characters from individual JSON files...");
  const charactersDir = path.join(__dirname, "../../main-gamedata/character-data");
  try {
    const files = await fs.readdir(charactersDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    for (const file of jsonFiles) {
      const filePath = path.join(charactersDir, file);
      const data = await loadJSONFile(filePath);
      if (!data) continue;
      charactersCache.set(data.id, data);
      const characterData = {
        id: data.id,
        name: data.name,
        unlockLevel: data.unlockLevel,
        description: data.description,
        rarity: data.rarity,
        defaultImage: data.defaultImage || null,
        avatarImage: data.avatarImage || null,
        displayImage: data.displayImage || null,
        isHidden: data.isHidden || false
      };
      try {
        const existing = await storage.getCharacter(data.id);
        if (existing) {
          await storage.updateCharacter(data.id, characterData);
          console.log(`  \u2713 Updated character: ${data.name}`);
        } else {
          await storage.createCharacter(characterData);
          console.log(`  \u2713 Created character: ${data.name}`);
        }
      } catch (dbError) {
        console.error(`  \u26A0\uFE0F Failed to sync character ${data.name}:`, dbError);
      }
    }
    console.log(`\u2705 Synced ${jsonFiles.length} characters from individual files`);
  } catch (error) {
    console.error("\u274C Error syncing characters:", error);
    throw error;
  }
}
async function syncLevels() {
  console.log("\u{1F4E6} Syncing levels from master JSON file...");
  const masterFilePath = path.join(__dirname, "../../main-gamedata/master-data/levelup-master.json");
  const masterData = await loadJSONFile(masterFilePath);
  if (masterData && masterData.levels) {
    console.log(`\u{1F4CB} Loading ${masterData.levels.length} levels from master-data/levelup-master.json`);
    for (const data of masterData.levels) {
      levelsCache.set(data.level, data);
      const levelData = {
        level: data.level,
        experienceRequired: data.experienceRequired,
        requirements: data.requirements || [],
        unlocks: data.unlocks || []
      };
      try {
        const existing = await storage.getLevel(data.level);
        if (existing) {
          await storage.updateLevel(data.level, levelData);
          console.log(`  \u2713 Updated level: ${data.level}`);
        } else {
          await storage.createLevel(levelData);
          console.log(`  \u2713 Created level: ${data.level}`);
        }
      } catch (dbError) {
        console.error(`  \u26A0\uFE0F Failed to sync level ${data.level}:`, dbError);
      }
    }
    console.log(`\u2705 Synced ${masterData.levels.length} levels from master file`);
    return;
  }
  console.log("\u{1F4E6} Fallback: Trying root levelup-master.json...");
  const rootMasterPath = path.join(__dirname, "../../main-gamedata/levelup-master.json");
  const rootMasterData = await loadJSONFile(rootMasterPath);
  if (rootMasterData && rootMasterData.levels) {
    console.log(`\u{1F4CB} Loading ${rootMasterData.levels.length} levels from root levelup-master.json`);
    for (const data of rootMasterData.levels) {
      levelsCache.set(data.level, data);
      const levelData = {
        level: data.level,
        experienceRequired: data.experienceRequired,
        requirements: data.requirements || [],
        unlocks: data.unlocks || []
      };
      try {
        const existing = await storage.getLevel(data.level);
        if (existing) {
          await storage.updateLevel(data.level, levelData);
          console.log(`  \u2713 Updated level: ${data.level}`);
        } else {
          await storage.createLevel(levelData);
          console.log(`  \u2713 Created level: ${data.level}`);
        }
      } catch (dbError) {
        console.error(`  \u26A0\uFE0F Failed to sync level ${data.level}:`, dbError);
      }
    }
    console.log(`\u2705 Synced ${rootMasterData.levels.length} levels from root master file`);
    return;
  }
  console.log("\u{1F4E6} Final fallback: Syncing levels from individual JSON files...");
  const levelsDir = path.join(__dirname, "../../main-gamedata/progressive-data/levelup");
  try {
    const files = await fs.readdir(levelsDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    for (const file of jsonFiles) {
      const filePath = path.join(levelsDir, file);
      const data = await loadJSONFile(filePath);
      if (!data) continue;
      levelsCache.set(data.level, data);
      const levelData = {
        level: data.level,
        experienceRequired: data.experienceRequired,
        requirements: data.requirements || [],
        unlocks: data.unlocks || []
      };
      try {
        const existing = await storage.getLevel(data.level);
        if (existing) {
          await storage.updateLevel(data.level, levelData);
          console.log(`  \u2713 Updated level: ${data.level}`);
        } else {
          await storage.createLevel(levelData);
          console.log(`  \u2713 Created level: ${data.level}`);
        }
      } catch (dbError) {
        console.error(`  \u26A0\uFE0F Failed to sync level ${data.level}:`, dbError);
      }
    }
    console.log(`\u2705 Synced ${jsonFiles.length} levels from individual files`);
  } catch (error) {
    console.error("\u274C Error syncing levels:", error);
    throw error;
  }
}
async function syncAllGameData() {
  console.log("\u{1F504} Starting game data synchronization...");
  await syncUpgrades();
  await syncCharacters();
  await syncLevels();
  console.log("\u2705 Game data synchronization complete!");
}
function getUpgradesFromMemory(includeHidden = false) {
  const upgrades2 = Array.from(upgradesCache.values());
  if (includeHidden) {
    return upgrades2;
  }
  return upgrades2.filter((u) => !u.isHidden);
}
function getUpgradeFromMemory(id) {
  return upgradesCache.get(id);
}
function getCharactersFromMemory(includeHidden = false) {
  const characters2 = Array.from(charactersCache.values());
  if (includeHidden) {
    return characters2;
  }
  return characters2.filter((c) => !c.isHidden);
}
function getCharacterFromMemory(id) {
  return charactersCache.get(id);
}
function getLevelsFromMemory() {
  return Array.from(levelsCache.values()).sort((a, b) => a.level - b.level);
}
function getLevelFromMemory(level) {
  return levelsCache.get(level);
}
async function saveUpgradeToJSON(upgrade) {
  const masterFilePath = path.join(__dirname, "../../main-gamedata/master-data/upgrades-master.json");
  try {
    const masterData = await loadJSONFile(masterFilePath);
    const upgrades2 = masterData?.upgrades || [];
    const existingIndex = upgrades2.findIndex((u) => u.id === upgrade.id);
    const upgradeData = {
      id: upgrade.id,
      name: upgrade.name,
      description: upgrade.description,
      maxLevel: upgrade.maxLevel,
      baseCost: upgrade.baseCost,
      costMultiplier: upgrade.costMultiplier,
      baseValue: upgrade.baseValue,
      valueIncrement: upgrade.valueIncrement,
      icon: upgrade.icon,
      type: upgrade.type,
      ...upgrade.isHidden && { isHidden: upgrade.isHidden }
    };
    if (existingIndex >= 0) {
      upgrades2[existingIndex] = upgradeData;
    } else {
      upgrades2.push(upgradeData);
    }
    await fs.writeFile(masterFilePath, JSON.stringify({ upgrades: upgrades2 }, null, 2));
    upgradesCache.set(upgrade.id, upgradeData);
    console.log(`\u2713 Updated master-data/upgrades-master.json with upgrade: ${upgrade.name}`);
    return;
  } catch (error) {
    console.warn(`\u26A0\uFE0F Failed to save to master-data directory, trying root...`);
  }
  const rootMasterPath = path.join(__dirname, "../../main-gamedata/upgrades-master.json");
  try {
    const masterData = await loadJSONFile(rootMasterPath);
    const upgrades2 = masterData?.upgrades || [];
    const existingIndex = upgrades2.findIndex((u) => u.id === upgrade.id);
    const upgradeData = {
      id: upgrade.id,
      name: upgrade.name,
      description: upgrade.description,
      maxLevel: upgrade.maxLevel,
      baseCost: upgrade.baseCost,
      costMultiplier: upgrade.costMultiplier,
      baseValue: upgrade.baseValue,
      valueIncrement: upgrade.valueIncrement,
      icon: upgrade.icon,
      type: upgrade.type,
      ...upgrade.isHidden && { isHidden: upgrade.isHidden }
    };
    if (existingIndex >= 0) {
      upgrades2[existingIndex] = upgradeData;
    } else {
      upgrades2.push(upgradeData);
    }
    await fs.writeFile(rootMasterPath, JSON.stringify({ upgrades: upgrades2 }, null, 2));
    upgradesCache.set(upgrade.id, upgradeData);
    console.log(`\u2713 Updated root upgrades-master.json with upgrade: ${upgrade.name}`);
  } catch (error) {
    console.error(`\u274C Failed to save upgrade to master JSON:`, error);
    throw error;
  }
}
async function saveLevelToJSON(level) {
  const masterFilePath = path.join(__dirname, "../../main-gamedata/master-data/levelup-master.json");
  try {
    const masterData = await loadJSONFile(masterFilePath);
    const levels3 = masterData?.levels || [];
    const existingIndex = levels3.findIndex((l) => l.level === level.level);
    const levelData = {
      level: level.level,
      experienceRequired: level.experienceRequired,
      requirements: level.requirements,
      unlocks: level.unlocks
    };
    if (existingIndex >= 0) {
      levels3[existingIndex] = levelData;
    } else {
      levels3.push(levelData);
      levels3.sort((a, b) => a.level - b.level);
    }
    await fs.writeFile(masterFilePath, JSON.stringify({ levels: levels3 }, null, 2));
    levelsCache.set(level.level, levelData);
    console.log(`\u2713 Updated master-data/levelup-master.json with level: ${level.level}`);
    return;
  } catch (error) {
    console.warn(`\u26A0\uFE0F Failed to save to master-data directory, trying root...`);
  }
  const rootMasterPath = path.join(__dirname, "../../main-gamedata/levelup-master.json");
  try {
    const masterData = await loadJSONFile(rootMasterPath);
    const levels3 = masterData?.levels || [];
    const existingIndex = levels3.findIndex((l) => l.level === level.level);
    const levelData = {
      level: level.level,
      experienceRequired: level.experienceRequired,
      requirements: level.requirements,
      unlocks: level.unlocks
    };
    if (existingIndex >= 0) {
      levels3[existingIndex] = levelData;
    } else {
      levels3.push(levelData);
      levels3.sort((a, b) => a.level - b.level);
    }
    await fs.writeFile(rootMasterPath, JSON.stringify({ levels: levels3 }, null, 2));
    levelsCache.set(level.level, levelData);
    console.log(`\u2713 Updated root levelup-master.json with level: ${level.level}`);
  } catch (error) {
    console.error(`\u274C Failed to save level to master JSON:`, error);
    throw error;
  }
}
async function saveCharacterToJSON(character) {
  const masterFilePath = path.join(__dirname, "../../main-gamedata/master-data/character-master.json");
  try {
    const masterData = await loadJSONFile(masterFilePath);
    const characters2 = masterData?.characters || [];
    const existingIndex = characters2.findIndex((c) => c.id === character.id);
    const characterData = {
      id: character.id,
      name: character.name,
      unlockLevel: character.unlockLevel,
      description: character.description,
      rarity: character.rarity,
      ...character.defaultImage && { defaultImage: character.defaultImage },
      ...character.avatarImage && { avatarImage: character.avatarImage },
      ...character.displayImage && { displayImage: character.displayImage },
      ...character.isHidden && { isHidden: character.isHidden }
    };
    if (existingIndex >= 0) {
      characters2[existingIndex] = characterData;
    } else {
      characters2.push(characterData);
    }
    await fs.writeFile(masterFilePath, JSON.stringify({ characters: characters2 }, null, 2));
    charactersCache.set(character.id, characterData);
    console.log(`\u2713 Updated master-data/character-master.json with character: ${character.name}`);
    return;
  } catch (error) {
    console.warn(`\u26A0\uFE0F Failed to save to master-data directory, trying root...`);
  }
  const rootMasterPath = path.join(__dirname, "../../main-gamedata/character-master.json");
  try {
    const masterData = await loadJSONFile(rootMasterPath);
    const characters2 = masterData?.characters || [];
    const existingIndex = characters2.findIndex((c) => c.id === character.id);
    const characterData = {
      id: character.id,
      name: character.name,
      unlockLevel: character.unlockLevel,
      description: character.description,
      rarity: character.rarity,
      ...character.defaultImage && { defaultImage: character.defaultImage },
      ...character.avatarImage && { avatarImage: character.avatarImage },
      ...character.displayImage && { displayImage: character.displayImage },
      ...character.isHidden && { isHidden: character.isHidden }
    };
    if (existingIndex >= 0) {
      characters2[existingIndex] = characterData;
    } else {
      characters2.push(characterData);
    }
    await fs.writeFile(rootMasterPath, JSON.stringify({ characters: characters2 }, null, 2));
    charactersCache.set(character.id, characterData);
    console.log(`\u2713 Updated root character-master.json with character: ${character.name}`);
  } catch (error) {
    console.error(`\u274C Failed to save character to master JSON:`, error);
    throw error;
  }
}
async function savePlayerDataToJSON(player) {
  if (!player.telegramId) {
    console.warn("\u26A0\uFE0F Cannot save player data: missing telegramId");
    return;
  }
  const playerDir = path.join(__dirname, "../../main-gamedata/player-data", `telegram_${player.telegramId}`);
  const filePath = path.join(playerDir, "player.json");
  await fs.mkdir(playerDir, { recursive: true });
  const upgrades2 = typeof player.upgrades === "object" && player.upgrades !== null ? player.upgrades : {};
  const unlockedCharacters = Array.isArray(player.unlockedCharacters) ? player.unlockedCharacters : [];
  const playerData = {
    id: player.id,
    telegramId: player.telegramId,
    username: player.username,
    points: typeof player.points === "string" ? player.points : player.points.toString(),
    energy: player.energy,
    maxEnergy: player.maxEnergy,
    level: player.level,
    experience: player.experience,
    passiveIncomeRate: player.passiveIncomeRate,
    isAdmin: player.isAdmin,
    selectedCharacterId: player.selectedCharacterId,
    displayImage: player.displayImage,
    upgrades: upgrades2,
    unlockedCharacters,
    lastLogin: player.lastLogin,
    lastEnergyUpdate: player.lastEnergyUpdate
  };
  await fs.writeFile(filePath, JSON.stringify(playerData, null, 2));
  console.log(`\u2713 Saved player data: ${filePath}`);
}

// server/utils/auth.ts
import crypto2 from "crypto";
function generateSecureToken() {
  return crypto2.randomBytes(32).toString("hex");
}
function getSessionExpiry() {
  const expiry = /* @__PURE__ */ new Date();
  expiry.setDate(expiry.getDate() + 30);
  return expiry;
}

// server/routes.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var storageConfig = multer.diskStorage({
  destination: function(req, _file, cb) {
    const uploadPath = path2.join(__dirname2, "..", "uploads", "temp");
    if (!fs2.existsSync(uploadPath)) {
      fs2.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function(_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path2.extname(file.originalname));
  }
});
var upload = multer({
  storage: storageConfig,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path2.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});
async function registerRoutes(app2) {
  console.log("\u{1F527} Initializing routes...");
  console.log("\u{1F4E4} Setting up /api/upload route...");
  app2.post("/api/upload", requireAuth, upload.single("image"), async (req, res) => {
    console.log("\u{1F4E4} Upload request received");
    console.log("\u{1F4E6} Request body:", req.body);
    console.log("\u{1F4C1} File:", req.file ? req.file.filename : "No file");
    if (!req.file) {
      console.error("\u274C No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }
    try {
      const body = req.body;
      const categoriesObj = JSON.parse(body.categories);
      const poses = JSON.parse(body.poses);
      const sanitizedCharacterName = body.characterName?.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
      const allowedImageTypes = ["character", "avatar", "vip", "other"];
      const imageType = allowedImageTypes.includes(body.imageType) ? body.imageType : "character";
      if (!Array.isArray(poses) || !poses.every((p) => typeof p === "string")) {
        fs2.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Poses must be an array of strings" });
      }
      const categories = [
        categoriesObj.nsfw ? "nsfw" : null,
        categoriesObj.vip ? "vip" : null,
        categoriesObj.event ? "event" : null,
        categoriesObj.random ? "random" : null
      ].filter((c) => c !== null);
      const parsedData = {
        characterId: body.characterId,
        characterName: sanitizedCharacterName,
        imageType,
        unlockLevel: parseInt(body.unlockLevel) || 1,
        categories,
        poses,
        isHidden: body.isHidden === "true",
        chatEnable: body.chatEnable === "true",
        chatSendPercent: Math.min(100, Math.max(0, parseInt(body.chatSendPercent) || 0))
      };
      console.log("\u{1F4CB} Parsed data:", parsedData);
      if (!parsedData.characterId || !parsedData.characterName) {
        console.error("\u274C Missing character ID or name");
        fs2.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Character ID and name are required" });
      }
      const finalDir = path2.join(__dirname2, "..", "uploads", "characters", parsedData.characterName, parsedData.imageType);
      if (!fs2.existsSync(finalDir)) {
        fs2.mkdirSync(finalDir, { recursive: true });
        console.log("\u{1F4C1} Created directory:", finalDir);
      }
      const finalPath = path2.join(finalDir, req.file.filename);
      fs2.renameSync(req.file.path, finalPath);
      console.log("\u2705 File moved to:", finalPath);
      const fileUrl = `/uploads/characters/${parsedData.characterName}/${parsedData.imageType}/${req.file.filename}`;
      console.log("\u{1F4BE} Creating media upload in database...");
      const mediaUpload = await storage.createMediaUpload({
        characterId: parsedData.characterId,
        url: fileUrl,
        type: parsedData.imageType,
        unlockLevel: parsedData.unlockLevel,
        categories: parsedData.categories,
        poses: parsedData.poses,
        isHidden: parsedData.isHidden,
        chatEnable: parsedData.chatEnable,
        chatSendPercent: parsedData.chatSendPercent
      });
      console.log("\u2705 Media upload created:", mediaUpload.id);
      res.json({ url: fileUrl, media: mediaUpload });
    } catch (error) {
      if (req.file && fs2.existsSync(req.file.path)) {
        fs2.unlinkSync(req.file.path);
      }
      console.error("\u{1F4A5} Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file", details: error.message });
    }
  });
  console.log("\u{1F510} Setting up auth routes...");
  app2.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const player = await storage.getPlayer(req.player.id);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json({ success: true, player });
    } catch (error) {
      console.error("Error fetching current player:", error);
      res.status(500).json({ error: "Failed to fetch player data" });
    }
  });
  app2.post("/api/auth/dev", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Development login not available in production" });
    }
    console.log("\u{1F6E0}\uFE0F Dev auth request received");
    console.log("\u{1F4E6} Request body:", req.body);
    try {
      const { username } = req.body;
      if (!username || username.trim().length === 0) {
        console.log("\u274C No username provided");
        return res.status(400).json({ error: "Username is required" });
      }
      const sanitizedUsername = username.trim().substring(0, 50);
      const devTelegramId = `dev_${sanitizedUsername.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      console.log("\u{1F464} Dev login for:", sanitizedUsername);
      let player = await storage.getPlayerByTelegramId(devTelegramId);
      if (!player) {
        console.log("\u2795 Creating new dev player...");
        player = await storage.createPlayer({
          telegramId: devTelegramId,
          username: sanitizedUsername,
          points: 0,
          energy: 1e3,
          maxEnergy: 1e3,
          level: 1,
          experience: 0,
          passiveIncomeRate: 0,
          isAdmin: false
        });
        console.log("\u2705 New dev player created:", player.id);
        await savePlayerDataToJSON(player);
      } else {
        console.log("\u{1F44B} Existing dev player found, updating last login...");
        await storage.updatePlayer(player.id, {
          lastLogin: /* @__PURE__ */ new Date()
        });
        await savePlayerDataToJSON(player);
      }
      const sessionToken = generateSecureToken();
      await storage.createSession({
        playerId: player.id,
        token: sessionToken,
        expiresAt: getSessionExpiry()
      });
      console.log("\u{1F389} Dev auth successful for player:", player.username);
      res.json({
        success: true,
        player,
        sessionToken
      });
    } catch (error) {
      console.error("\u{1F4A5} Dev auth error:", error);
      console.error("\u{1F4CD} Error stack:", error.stack);
      res.status(500).json({ error: "Authentication failed", details: error.message });
    }
  });
  console.log("\u{1F4F1} Setting up Telegram auth...");
  app2.post("/api/auth/telegram", async (req, res) => {
    console.log("\u{1F510} Telegram auth request received");
    console.log("\u{1F4E6} Request body:", JSON.stringify(req.body, null, 2));
    try {
      const { initData } = req.body;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      console.log("\u{1F511} Bot token exists:", !!botToken);
      console.log("\u{1F4DD} InitData exists:", !!initData);
      console.log("\u{1F4DD} InitData length:", initData?.length || 0);
      if (!botToken) {
        console.error("\u274C Missing TELEGRAM_BOT_TOKEN");
        return res.status(500).json({ error: "Telegram authentication not configured" });
      }
      if (!initData) {
        console.error("\u274C Missing initData in request");
        return res.status(400).json({ error: "Missing initData" });
      }
      console.log("\u{1F50D} Parsing initData...");
      const validator = new AuthDataValidator({ botToken });
      const dataMap = new Map(new URLSearchParams(initData).entries());
      console.log("\u{1F4CA} Parsed data map entries:", Array.from(dataMap.entries()));
      console.log("\u2705 Validating Telegram data...");
      const validationResult = await validator.validate(dataMap);
      console.log("\u{1F4CB} Validation result:", JSON.stringify(validationResult, null, 2));
      if (!validationResult || !validationResult.id) {
        console.error("\u274C Invalid validation result or missing ID");
        return res.status(401).json({ error: "Invalid Telegram authentication" });
      }
      const telegramId = validationResult.id.toString();
      console.log("\u{1F464} Telegram ID:", telegramId);
      if (!telegramId) {
        console.error("\u274C Failed to extract Telegram ID");
        return res.status(400).json({ error: "Missing Telegram user ID" });
      }
      console.log("\u{1F50D} Looking up player by Telegram ID...");
      let player = await storage.getPlayerByTelegramId(telegramId);
      if (!player) {
        console.log("\u2795 Creating new player...");
        player = await storage.createPlayer({
          telegramId,
          username: validationResult.username || validationResult.first_name || "TelegramUser",
          points: 0,
          energy: 1e3,
          maxEnergy: 1e3,
          level: 1,
          passiveIncomeRate: 0,
          isAdmin: false
        });
        console.log("\u2705 New player created:", player.id);
        await savePlayerDataToJSON(player);
      } else {
        console.log("\u{1F44B} Existing player found, updating last login...");
        await storage.updatePlayer(player.id, {
          lastLogin: /* @__PURE__ */ new Date()
        });
        await savePlayerDataToJSON(player);
      }
      const sessionToken = generateSecureToken();
      const session = await storage.createSession({
        playerId: player.id,
        token: sessionToken,
        expiresAt: getSessionExpiry()
      });
      console.log("\u{1F389} Auth successful for player:", player.username);
      res.json({
        success: true,
        player,
        sessionToken
      });
    } catch (error) {
      console.error("\u{1F4A5} Telegram auth error:", error);
      console.error("\u{1F4CD} Error stack:", error.stack);
      res.status(500).json({ error: "Authentication failed", details: error.message });
    }
  });
  console.log("\u2699\uFE0F Setting up game data routes...");
  app2.get("/api/upgrades", requireAuth, async (_req, res) => {
    try {
      const upgrades2 = getUpgradesFromMemory();
      res.json({ upgrades: upgrades2 });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
  app2.get("/api/characters", requireAuth, async (_req, res) => {
    try {
      const characters2 = getCharactersFromMemory();
      res.json({ characters: characters2 });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
  app2.get("/api/levels", requireAuth, async (_req, res) => {
    try {
      const levels3 = getLevelsFromMemory();
      res.json({ levels: levels3 });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
  app2.get("/api/media", requireAuth, async (req, res) => {
    try {
      const characterId = req.query.characterId;
      const includeHidden = req.query.includeHidden === "true";
      const mediaUploads2 = await storage.getMediaUploads(characterId, includeHidden);
      res.json({ media: mediaUploads2 });
    } catch (error) {
      console.error("Error fetching media uploads:", error);
      res.status(500).json({ error: "Failed to fetch media uploads" });
    }
  });
  console.log("\u{1F464} Setting up player routes...");
  app2.get("/api/player/me", requireAuth, async (req, res) => {
    try {
      const player = await storage.getPlayer(req.player.id);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json({ player });
    } catch (error) {
      console.error("Error fetching player:", error);
      res.status(500).json({ error: "Failed to fetch player data" });
    }
  });
  app2.patch("/api/player/me", requireAuth, async (req, res) => {
    try {
      const updates = req.body;
      if (updates.isAdmin !== void 0) {
        delete updates.isAdmin;
      }
      const integerFields = ["points", "energy", "maxEnergy", "level", "experience", "passiveIncomeRate"];
      for (const field of integerFields) {
        if (updates[field] !== void 0 && typeof updates[field] === "number") {
          updates[field] = Math.round(updates[field]);
        }
      }
      const currentPlayer = await storage.getPlayer(req.player.id);
      if (!currentPlayer) {
        return res.status(404).json({ error: "Player not found" });
      }
      if (updates.upgrades) {
        updates.upgrades = { ...currentPlayer.upgrades, ...updates.upgrades };
      }
      if (updates.unlockedCharacters) {
        const current = Array.isArray(currentPlayer.unlockedCharacters) ? currentPlayer.unlockedCharacters : [];
        const incoming = Array.isArray(updates.unlockedCharacters) ? updates.unlockedCharacters : [];
        updates.unlockedCharacters = Array.from(/* @__PURE__ */ new Set([...current, ...incoming]));
      }
      const updatedPlayer = await storage.updatePlayer(req.player.id, updates);
      if (updatedPlayer) {
        await savePlayerDataToJSON(updatedPlayer);
      }
      if (req.headers["content-type"]?.includes("text/plain")) {
        res.status(204).end();
      } else {
        res.json({ player: updatedPlayer });
      }
    } catch (error) {
      console.error("Error updating player:", error);
      res.status(500).json({ error: "Failed to update player" });
    }
  });
  app2.get("/api/player/upgrades", requireAuth, async (req, res) => {
    try {
      const playerUpgrades2 = await storage.getPlayerUpgrades(req.player.id);
      res.json({ upgrades: playerUpgrades2 });
    } catch (error) {
      console.error("Error fetching player upgrades:", error);
      res.status(500).json({ error: "Failed to fetch player upgrades" });
    }
  });
  app2.post("/api/player/upgrades", requireAuth, async (req, res) => {
    try {
      const validation = insertPlayerUpgradeSchema.safeParse({
        ...req.body,
        playerId: req.player.id
      });
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid upgrade data", details: validation.error });
      }
      const player = await storage.getPlayer(req.player.id);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      const upgrade = getUpgradeFromMemory(validation.data.upgradeId);
      if (!upgrade) {
        return res.status(404).json({ success: false, message: "Upgrade not found" });
      }
      const currentLevel = player.upgrades?.[validation.data.upgradeId] || 0;
      const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
      const playerPoints = typeof player.points === "string" ? parseFloat(player.points) : player.points;
      if (playerPoints < cost) {
        return res.status(400).json({ error: "Insufficient points" });
      }
      if (validation.data.level !== currentLevel + 1) {
        return res.status(400).json({ error: "Invalid level increment" });
      }
      const playerUpgrade = await storage.setPlayerUpgrade(validation.data);
      const upgrades2 = player.upgrades || {};
      upgrades2[validation.data.upgradeId] = validation.data.level;
      const updatedPlayer = await storage.updatePlayer(req.player.id, {
        upgrades: upgrades2,
        points: playerPoints - cost
      });
      if (updatedPlayer) {
        await savePlayerDataToJSON(updatedPlayer);
      }
      res.json({ upgrade: playerUpgrade });
    } catch (error) {
      console.error("Error setting player upgrade:", error);
      res.status(500).json({ error: "Failed to set player upgrade" });
    }
  });
  app2.get("/api/player/characters", requireAuth, async (req, res) => {
    try {
      const playerCharacters2 = await storage.getPlayerCharacters(req.player.id);
      res.json({ characters: playerCharacters2 });
    } catch (error) {
      console.error("Error fetching player characters:", error);
      res.status(500).json({ error: "Failed to fetch player characters" });
    }
  });
  app2.post("/api/player/characters/:characterId/unlock", requireAuth, async (req, res) => {
    try {
      const { characterId } = req.params;
      const hasCharacter = await storage.hasCharacter(req.player.id, characterId);
      if (hasCharacter) {
        return res.status(400).json({ error: "Character already unlocked" });
      }
      const character = getCharacterFromMemory(characterId);
      if (!character) {
        return res.status(404).json({ success: false, message: "Character not found" });
      }
      const playerCharacter = await storage.unlockCharacter({
        playerId: req.player.id,
        characterId
      });
      const player = await storage.getPlayer(req.player.id);
      if (player) {
        const unlockedCharacters = Array.isArray(player.unlockedCharacters) ? player.unlockedCharacters : [];
        if (!unlockedCharacters.includes(characterId)) {
          unlockedCharacters.push(characterId);
          const updatedPlayer = await storage.updatePlayer(req.player.id, { unlockedCharacters });
          if (updatedPlayer) {
            await savePlayerDataToJSON(updatedPlayer);
          }
        }
      }
      res.json({ character: playerCharacter });
    } catch (error) {
      console.error("Error unlocking character:", error);
      res.status(500).json({ error: "Failed to unlock character" });
    }
  });
  console.log("\u{1F451} Setting up admin routes...");
  app2.post("/api/admin/sync-data", requireAuth, requireAdmin, async (_req, res) => {
    try {
      await syncAllGameData();
      res.json({ success: true, message: "Game data synchronized successfully" });
    } catch (error) {
      console.error("Error syncing game data:", error);
      res.status(500).json({ error: "Failed to sync game data" });
    }
  });
  app2.get("/api/admin/upgrades", requireAuth, requireAdmin, async (req, res) => {
    try {
      const includeHidden = req.query.includeHidden === "true";
      const upgrades2 = getUpgradesFromMemory(includeHidden);
      res.json({ upgrades: upgrades2 });
    } catch (error) {
      console.error("Error fetching upgrades for admin:", error);
      res.status(500).json({ error: "Failed to fetch upgrades" });
    }
  });
  app2.post("/api/admin/upgrades", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validation = insertUpgradeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid upgrade data", details: validation.error });
      }
      const upgrade = await storage.createUpgrade(validation.data);
      await saveUpgradeToJSON(validation.data);
      res.json({ upgrade, message: "Upgrade created, saved to JSON and DB" });
    } catch (error) {
      console.error("Error creating upgrade:", error);
      res.status(500).json({ error: "Failed to create upgrade" });
    }
  });
  app2.get("/api/admin/upgrades/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const upgrade = getUpgradeFromMemory(id);
      if (!upgrade) {
        return res.status(404).json({ error: "Upgrade not found" });
      }
      res.json({ upgrade });
    } catch (error) {
      console.error("Error fetching upgrade:", error);
      res.status(500).json({ error: "Failed to fetch upgrade" });
    }
  });
  app2.patch("/api/admin/upgrades/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedUpgrade = await storage.updateUpgrade(id, updates);
      if (!updatedUpgrade) {
        return res.status(404).json({ error: "Upgrade not found" });
      }
      await saveUpgradeToJSON(updatedUpgrade);
      res.json({ upgrade: updatedUpgrade });
    } catch (error) {
      console.error("Error updating upgrade:", error);
      res.status(500).json({ error: "Failed to update upgrade" });
    }
  });
  app2.delete("/api/admin/upgrades/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteUpgrade(id);
      if (!deleted) {
        return res.status(404).json({ error: "Upgrade not found" });
      }
      res.json({ success: true, message: "Upgrade deleted" });
    } catch (error) {
      console.error("Error deleting upgrade:", error);
      res.status(500).json({ error: "Failed to delete upgrade" });
    }
  });
  app2.get("/api/admin/characters", requireAuth, requireAdmin, async (req, res) => {
    try {
      const includeHidden = req.query.includeHidden === "true";
      const characters2 = getCharactersFromMemory(includeHidden);
      res.json({ characters: characters2 });
    } catch (error) {
      console.error("Error fetching characters for admin:", error);
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });
  app2.post("/api/admin/characters", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validation = insertCharacterSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid character data", details: validation.error });
      }
      const character = await storage.createCharacter(validation.data);
      await saveCharacterToJSON(validation.data);
      res.json({ character, message: "Character created, saved to JSON and DB" });
    } catch (error) {
      console.error("Error creating character:", error);
      res.status(500).json({ error: "Failed to create character" });
    }
  });
  app2.get("/api/admin/characters/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const character = getCharacterFromMemory(id);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      res.json({ character });
    } catch (error) {
      console.error("Error fetching character:", error);
      res.status(500).json({ error: "Failed to fetch character" });
    }
  });
  app2.patch("/api/admin/characters/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedCharacter = await storage.updateCharacter(id, updates);
      if (!updatedCharacter) {
        return res.status(404).json({ error: "Character not found" });
      }
      await saveCharacterToJSON(updatedCharacter);
      res.json({ character: updatedCharacter });
    } catch (error) {
      console.error("Error updating character:", error);
      res.status(500).json({ error: "Failed to update character" });
    }
  });
  app2.delete("/api/admin/characters/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCharacter(id);
      if (!deleted) {
        return res.status(404).json({ error: "Character not found" });
      }
      res.json({ success: true, message: "Character deleted" });
    } catch (error) {
      console.error("Error deleting character:", error);
      res.status(500).json({ error: "Failed to delete character" });
    }
  });
  app2.get("/api/admin/levels", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const levels3 = getLevelsFromMemory();
      res.json({ levels: levels3 });
    } catch (error) {
      console.error("Error fetching levels for admin:", error);
      res.status(500).json({ error: "Failed to fetch levels" });
    }
  });
  app2.post("/api/admin/levels", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validation = insertLevelSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid level data", details: validation.error });
      }
      const level = await storage.createLevel(validation.data);
      await saveLevelToJSON(validation.data);
      res.json({ level, message: "Level created, saved to JSON and DB" });
    } catch (error) {
      console.error("Error creating level:", error);
      res.status(500).json({ error: "Failed to create level" });
    }
  });
  app2.get("/api/admin/levels/:level", requireAuth, requireAdmin, async (req, res) => {
    try {
      const level = parseInt(req.params.level);
      const levelData = getLevelFromMemory(level);
      if (!levelData) {
        return res.status(404).json({ error: "Level not found" });
      }
      res.json({ level: levelData });
    } catch (error) {
      console.error("Error fetching level:", error);
      res.status(500).json({ error: "Failed to fetch level" });
    }
  });
  app2.patch("/api/admin/levels/:level", requireAuth, requireAdmin, async (req, res) => {
    try {
      const level = parseInt(req.params.level);
      const updates = req.body;
      updates.level = level;
      const updatedLevel = await storage.updateLevel(level, updates);
      if (!updatedLevel) {
        return res.status(404).json({ error: "Level not found" });
      }
      await saveLevelToJSON(updatedLevel);
      res.json({ level: updatedLevel });
    } catch (error) {
      console.error("Error updating level:", error);
      res.status(500).json({ error: "Failed to update level" });
    }
  });
  app2.delete("/api/admin/levels/:level", requireAuth, requireAdmin, async (req, res) => {
    try {
      const level = parseInt(req.params.level);
      const deleted = await storage.deleteLevel(level);
      if (!deleted) {
        return res.status(404).json({ error: "Level not found" });
      }
      res.json({ success: true, message: "Level deleted" });
    } catch (error) {
      console.error("Error deleting level:", error);
      res.status(500).json({ error: "Failed to delete level" });
    }
  });
  console.log("\u{1F527} Creating HTTP server...");
  const httpServer = createServer(app2);
  console.log("\u2705 All routes registered successfully");
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath as fileURLToPath3 } from "node:url";
var r = (...segs) => path3.resolve(path3.dirname(fileURLToPath3(import.meta.url)), ...segs);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
      await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner())
    ] : []
  ],
  resolve: {
    alias: {
      "@": r("client", "src"),
      "@shared": r("shared"),
      "@assets": r("attached_assets"),
      // New: single source of truth for game data JSONs
      "@data": r("main-gamedata"),
      // Optional: direct shortcuts
      "@master": r("main-gamedata", "master-data")
    }
  },
  root: r("client"),
  build: {
    outDir: r("dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      // Allow serving JSON from main-gamedata via the new aliases
      allow: [r("main-gamedata")],
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/utils/logger.ts
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path5 from "path";
import { fileURLToPath as fileURLToPath4 } from "url";
var __filename3 = fileURLToPath4(import.meta.url);
var __dirname3 = path5.dirname(__filename3);
var levels2 = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};
var colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white"
};
winston.addColors(colors);
var format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);
var transports = [
  // Console transport
  new winston.transports.Console(),
  // Error logs
  new DailyRotateFile({
    filename: path5.join(__dirname3, "../../logs/error-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    level: "error",
    maxFiles: "14d",
    maxSize: "20m"
  }),
  // All logs
  new DailyRotateFile({
    filename: path5.join(__dirname3, "../../logs/combined-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxFiles: "14d",
    maxSize: "20m"
  }),
  // MCP-specific logs for Perplexity
  new DailyRotateFile({
    filename: path5.join(__dirname3, "../../logs/mcp-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    level: "info",
    maxFiles: "30d",
    maxSize: "50m",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  })
];
var logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  levels: levels2,
  format,
  transports
});
var logger_default = logger;

// server/index.ts
import path6 from "path";
import { fileURLToPath as fileURLToPath5 } from "url";
import fs4 from "fs";
var __filename4 = fileURLToPath5(import.meta.url);
var __dirname4 = path6.dirname(__filename4);
var logsDir = path6.join(__dirname4, "..", "logs");
if (!fs4.existsSync(logsDir)) {
  fs4.mkdirSync(logsDir, { recursive: true });
}
var app = express2();
process.on("unhandledRejection", (reason, promise) => {
  logger_default.error("\u{1F4A5} Unhandled Rejection at:", { promise, reason });
});
process.on("uncaughtException", (error) => {
  logger_default.error("\u{1F4A5} Uncaught Exception:", error);
  process.exit(1);
});
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${req.url}`);
  const start = Date.now();
  const path7 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path7.startsWith("/api")) {
      let logLine = `${req.method} ${path7} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  setTimeout(() => {
    if (!res.headersSent) {
      console.error(`\u26A0\uFE0F REQUEST HANGING: ${req.method} ${req.url} - ${Date.now() - start}ms`);
    }
  }, 5e3);
  next();
});
(async () => {
  logger_default.info("\u{1F680} Starting server initialization...");
  logger_default.info("\u{1F504} Starting game data sync...");
  try {
    await syncAllGameData();
    logger_default.info("\u2705 Game data synced successfully - memory cache populated");
  } catch (err) {
    logger_default.error("\u274C CRITICAL: Failed to sync game data on startup:", err);
    logger_default.warn("\u26A0\uFE0F Server may not work correctly without game data");
  }
  logger_default.info("\u{1F4DD} Registering routes...");
  const server = await registerRoutes(app);
  logger_default.info("\u2705 Routes registered successfully");
  logger_default.info("\u{1F4C1} Setting up static file serving...");
  app.use("/uploads", express2.static(path6.join(__dirname4, "..", "uploads")));
  logger_default.info("\u2705 Static files configured");
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    logger_default.error("\u{1F4A5} ERROR:", {
      status,
      message,
      stack: err.stack,
      ...err
    });
    res.status(status).json({ message, error: err.message });
  });
  if (app.get("env") === "development") {
    logger_default.info("\u2699\uFE0F Setting up Vite dev server...");
    await setupVite(app, server);
    logger_default.info("\u2705 Vite dev server ready");
  } else {
    logger_default.info("\u{1F4E6} Serving static files (production mode)...");
    serveStatic(app);
    logger_default.info("\u2705 Static files ready");
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  logger_default.info(`\u{1F310} Starting server on port ${port}...`);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`\u2705 Server listening on port ${port}`);
    logger_default.info(`\u2705 Server is ready and accepting connections on http://0.0.0.0:${port}`);
  });
})();
