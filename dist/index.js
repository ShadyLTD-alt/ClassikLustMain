var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/routes/lunabug.mjs
var lunabug_exports = {};
__export(lunabug_exports, {
  default: () => lunabug_default
});
import express from "express";
import fetch from "node-fetch";
function checkCircuitBreaker(provider) {
  const health = providerHealth[provider];
  if (health.circuitOpen && Date.now() - health.lastFailure > CIRCUIT_BREAKER_TIMEOUT) {
    health.circuitOpen = false;
    health.failures = 0;
    console.log(`\u{1F319} [${provider}] Circuit breaker reset`);
  }
  return !health.circuitOpen;
}
function recordFailure(provider, error) {
  const health = providerHealth[provider];
  health.failures++;
  health.lastFailure = Date.now();
  if (health.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    health.circuitOpen = true;
    console.log(`\u{1F319} [${provider}] Circuit breaker OPEN after ${health.failures} failures`);
  }
}
function recordSuccess(provider) {
  const health = providerHealth[provider];
  health.failures = Math.max(0, health.failures - 1);
}
function generateLocalFallback(message, code, error, context) {
  if (message && /^(hi|hello|hey|ping|test)\b/i.test(message.trim())) {
    return `\u{1F319} Hello! LunaBug here running in local fallback mode. 

My AI providers are currently unavailable, but I'm still actively monitoring your ClassikLust game systems!

Available commands:
\u2022 window.LunaBug.status() - System health
\u2022 window.LunaBug.emergency() - Emergency mode
\u2022 window.LunaBug.functions.list() - Available tools

Add MISTRAL_API_KEY or PERPLEXITY_API_KEY to Replit Secrets for full AI capabilities!`;
  }
  if (error && code) {
    const errorPatterns = [
      {
        pattern: /(undefined|cannot read property|cannot access)/i,
        fix: `**Issue:** Null/undefined reference
        
**Quick Fix:**
\u2022 Add null checks: \`if (object && object.property)\`
\u2022 Use optional chaining: \`object?.property\`
\u2022 Provide defaults: \`const value = data?.field || 'default'\`

**Prevention:**
\u2022 Always validate API responses
\u2022 Use TypeScript for compile-time checking
\u2022 Add defensive programming patterns`
      },
      {
        pattern: /(import|module not found|require.*not defined)/i,
        fix: `**Issue:** Import/Module resolution failure

**Quick Fix:**
\u2022 Check file path: \`../../path/to/file\`
\u2022 Verify file exists and has correct extension
\u2022 For Node modules: \`npm install missing-package\`
\u2022 Check package.json dependencies

**ESM/CJS Issues:**
\u2022 Use .mjs for ES modules in mixed projects
\u2022 Convert require() to import statements
\u2022 Check "type": "module" in package.json`
      },
      {
        pattern: /(fetch.*failed|network.*error|cors)/i,
        fix: `**Issue:** Network/API failure

**Quick Fix:**
\u2022 Check API endpoint URL and method
\u2022 Verify CORS settings on server
\u2022 Add proper error handling with try/catch
\u2022 Check network connectivity

**For APIs:**
\u2022 Add timeout configurations
\u2022 Implement retry logic
\u2022 Validate response status codes`
      }
    ];
    const matchedPattern = errorPatterns.find((p) => p.pattern.test(error));
    if (matchedPattern) {
      return `\u{1F319} **LunaBug Local Analysis**

**Error:** ${error}

${matchedPattern.fix}

**Code Context:**
\`\`\`
${code.slice(0, 300)}${code.length > 300 ? "..." : ""}
\`\`\`

*This is a local heuristic response. Add API keys to Secrets for advanced AI debugging.*`;
    }
    return `\u{1F319} **LunaBug Local Analysis**

**Error:** ${error}

**General Debugging Steps:**
1. Check browser console for additional error details
2. Verify all imports and dependencies are correct
3. Add error handling with try/catch blocks
4. Use debugger statements or console.log for step-by-step debugging
5. Review recent code changes that might have introduced the issue

**Code:**
\`\`\`
${code.slice(0, 400)}${code.length > 400 ? "..." : ""}
\`\`\`

**Need more help?** Add MISTRAL_API_KEY or PERPLEXITY_API_KEY to Replit Secrets for advanced AI-powered debugging assistance.`;
  }
  if (message) {
    return `\u{1F319} **LunaBug Local Response**

Message received: "${message.slice(0, 150)}${message.length > 150 ? "..." : ""}"

I'm currently running in local fallback mode. For full AI-powered responses, add your API keys to Replit Secrets:

**Required Secrets:**
\u2022 \`MISTRAL_API_KEY\` - Primary AI provider
\u2022 \`PERPLEXITY_API_KEY\` - Fallback AI provider

**What I can still do:**
\u2022 System monitoring and health checks
\u2022 Function discovery and execution
\u2022 Basic error pattern matching
\u2022 Emergency debugging mode
\u2022 Console spam filtering

**Quick Access:**
\u2022 \`window.LunaBug.status()\` - Check system status
\u2022 \`window.LunaBug.functions.list()\` - See available tools`;
  }
  return "\u{1F319} LunaBug local mode active. Send a message or debugging request to get help!";
}
var router, providerHealth, CIRCUIT_BREAKER_THRESHOLD, CIRCUIT_BREAKER_TIMEOUT, lunabug_default;
var init_lunabug = __esm({
  "server/routes/lunabug.mjs"() {
    "use strict";
    router = express.Router();
    providerHealth = {
      mistral: { failures: 0, lastFailure: 0, circuitOpen: false },
      perplexity: { failures: 0, lastFailure: 0, circuitOpen: false }
    };
    CIRCUIT_BREAKER_THRESHOLD = 3;
    CIRCUIT_BREAKER_TIMEOUT = 6e4;
    router.post("/ai", async (req, res) => {
      const { message, code, error, context, system } = req.body;
      const startTime = Date.now();
      console.log(`\u{1F319} AI request: ${message?.slice(0, 40) || "debug request"}...`);
      try {
        if (process.env.MISTRAL_API_KEY && checkCircuitBreaker("mistral")) {
          try {
            const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`
              },
              body: JSON.stringify({
                model: "mistral-large-latest",
                messages: [
                  { role: "system", content: system || "You are LunaBug, a helpful AI assistant for ClassikLust game development. Be concise and practical." },
                  { role: "user", content: message || `Debug this code:

${code}

Error: ${error}` }
                ],
                max_tokens: 1200,
                temperature: 0.3
              }),
              timeout: 12e3
            });
            if (response.ok) {
              const data = await response.json();
              recordSuccess("mistral");
              console.log(`\u{1F319} \u2705 Mistral responded (${Date.now() - startTime}ms)`);
              return res.json({
                provider: "mistral",
                response: data.choices[0]?.message?.content || "Empty response from Mistral",
                fallbackCount: 0,
                metrics: {
                  latency: Date.now() - startTime,
                  provider: "mistral",
                  tokens: data.usage?.total_tokens || 0
                }
              });
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (err) {
            recordFailure("mistral", err);
            console.log(`\u{1F319} \u26A0\uFE0F Mistral failed (${err.message}), trying Perplexity...`);
          }
        }
        if (process.env.PERPLEXITY_API_KEY && checkCircuitBreaker("perplexity")) {
          try {
            const response = await fetch("https://api.perplexity.ai/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`
              },
              body: JSON.stringify({
                model: "llama-3.1-sonar-small-128k-online",
                messages: [
                  { role: "system", content: system || "You are LunaBug, a concise AI debugging assistant. Provide practical solutions." },
                  { role: "user", content: message || `Debug: ${code}
Error: ${error}` }
                ],
                max_tokens: 800,
                temperature: 0.2
              }),
              timeout: 1e4
            });
            if (response.ok) {
              const data = await response.json();
              recordSuccess("perplexity");
              console.log(`\u{1F319} \u2705 Perplexity responded (${Date.now() - startTime}ms, fallback used)`);
              return res.json({
                provider: "perplexity",
                response: data.choices[0]?.message?.content || "Empty response from Perplexity",
                fallbackCount: 1,
                metrics: {
                  latency: Date.now() - startTime,
                  provider: "perplexity",
                  tokens: data.usage?.total_tokens || 0
                }
              });
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (err) {
            recordFailure("perplexity", err);
            console.log(`\u{1F319} \u26A0\uFE0F Perplexity failed (${err.message}), using local fallback...`);
          }
        }
        const localResponse = generateLocalFallback(message, code, error, context);
        console.log(`\u{1F319} \u{1F4BB} Using local fallback (${Date.now() - startTime}ms)`);
        res.json({
          provider: "local",
          response: localResponse,
          fallbackCount: 2,
          metrics: {
            latency: Date.now() - startTime,
            provider: "local",
            apiKeysAvailable: {
              mistral: !!process.env.MISTRAL_API_KEY,
              perplexity: !!process.env.PERPLEXITY_API_KEY
            }
          }
        });
      } catch (error2) {
        console.error(`\u{1F319} \u274C AI endpoint failed completely:`, error2.message);
        res.status(500).json({
          provider: "error",
          response: "LunaBug AI system temporarily unavailable. Check server logs for details.",
          error: error2.message,
          fallbackCount: 3
        });
      }
    });
    router.get("/status", (req, res) => {
      const uptime = process.uptime();
      const health = {
        mistral: checkCircuitBreaker("mistral"),
        perplexity: checkCircuitBreaker("perplexity"),
        local: true
      };
      res.json({
        status: "online",
        version: "1.0.1",
        uptime: Math.round(uptime),
        providers: {
          mistral: {
            available: !!process.env.MISTRAL_API_KEY,
            healthy: health.mistral,
            failures: providerHealth.mistral.failures
          },
          perplexity: {
            available: !!process.env.PERPLEXITY_API_KEY,
            healthy: health.perplexity,
            failures: providerHealth.perplexity.failures
          },
          local: {
            available: true,
            healthy: true,
            failures: 0
          }
        },
        routes: ["POST /ai", "GET /status", "GET /functions", "GET /health"],
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        metrics: {
          totalFailures: providerHealth.mistral.failures + providerHealth.perplexity.failures,
          circuitBreakersOpen: Object.values(providerHealth).filter((h) => h.circuitOpen).length
        }
      });
    });
    router.get("/functions", (req, res) => {
      res.json({
        functions: [
          {
            name: "javascript_error_analysis",
            description: "Analyze JavaScript/TypeScript errors and provide specific fixes",
            triggers: ["TypeError", "ReferenceError", "SyntaxError", "undefined", "null"],
            category: "debugging",
            enabled: true,
            priority: "high"
          },
          {
            name: "import_resolver",
            description: "Resolve import/export issues and module dependencies",
            triggers: ["import", "export", "module not found", "require"],
            category: "dependencies",
            enabled: true,
            priority: "high"
          },
          {
            name: "api_diagnostics",
            description: "Diagnose API and network related issues",
            triggers: ["fetch", "cors", "network", "404", "500"],
            category: "networking",
            enabled: true,
            priority: "medium"
          },
          {
            name: "performance_analyzer",
            description: "Analyze performance issues and suggest optimizations",
            triggers: ["slow", "performance", "memory", "lag", "fps"],
            category: "performance",
            enabled: true,
            priority: "medium"
          },
          {
            name: "console_spam_filter",
            description: "Filter and reduce console spam automatically",
            triggers: ["spam", "debug", "[object Object]", "verbose"],
            category: "cleanup",
            enabled: true,
            priority: "low"
          },
          {
            name: "database_helper",
            description: "Help with PostgreSQL and Supabase database issues",
            triggers: ["database", "postgresql", "supabase", "sql", "migration"],
            category: "database",
            enabled: true,
            priority: "high"
          }
        ],
        autoDiscovery: true,
        jsonFunctionLoader: "Available via LunaBug FunctionLoader module",
        totalFunctions: 6,
        categories: ["debugging", "dependencies", "networking", "performance", "cleanup", "database"]
      });
    });
    router.get("/health", (req, res) => {
      res.json({
        service: "LunaBug",
        status: "healthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        uptime: Math.round(process.uptime()),
        memory: process.memoryUsage(),
        env: process.env.NODE_ENV || "development"
      });
    });
    router.post("/providers/reset", (req, res) => {
      const { provider } = req.body;
      if (provider && providerHealth[provider]) {
        providerHealth[provider].failures = 0;
        providerHealth[provider].circuitOpen = false;
        console.log(`\u{1F319} Manually reset ${provider} circuit breaker`);
        res.json({ success: true, provider, status: "reset" });
      } else if (!provider) {
        Object.keys(providerHealth).forEach((key) => {
          providerHealth[key].failures = 0;
          providerHealth[key].circuitOpen = false;
        });
        console.log("\u{1F319} All provider circuit breakers reset");
        res.json({ success: true, providers: Object.keys(providerHealth), status: "all_reset" });
      } else {
        res.status(400).json({ error: "Invalid provider name" });
      }
    });
    console.log("\u{1F319} \u2705 LunaBug ESM routes initialized successfully");
    lunabug_default = router;
  }
});

// server/index.ts
import express3 from "express";

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
import path3 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import fs3 from "fs";
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
function getCharactersFromMemory(includeHidden = false) {
  const characters2 = Array.from(charactersCache.values());
  if (includeHidden) {
    return characters2;
  }
  return characters2.filter((c) => !c.isHidden);
}
function getLevelsFromMemory() {
  return Array.from(levelsCache.values()).sort((a, b) => a.level - b.level);
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

// server/logger.ts
import fs2 from "fs";
import path2 from "path";
import winston from "winston";
var logDir = path2.resolve(process.cwd(), "logs");
try {
  if (!fs2.existsSync(logDir)) {
    fs2.mkdirSync(logDir, { recursive: true });
  }
} catch (err) {
  console.error("Failed to create logs directory:", err);
}
var UltraSpamKiller = class {
  seenMessages = /* @__PURE__ */ new Map();
  maxRepeats = 2;
  // Allow 2 duplicates then suppress
  timeWindow = 8e3;
  // 8 second window
  blacklist = [
    /\[object Object\]/i,
    /PostCSS plugin.*autoprefixer/i,
    /Re-optimizing dependencies/i,
    /dependencies.*changed/i,
    /Vite dev server ready/i,
    /require is not defined in ES module scope/i,
    /Failed to register LunaBug routes.*Cannot find module/i,
    /vite.*config.*changed/i,
    /hmr.*update/i,
    /internal.*server.*error/i
  ];
  shouldAllow(level, message) {
    if (this.blacklist.some((pattern) => pattern.test(message))) {
      return false;
    }
    if (process.env.NODE_ENV === "production" && !["warn", "error"].includes(level)) {
      return false;
    }
    const fingerprint = this.generateFingerprint(level, message);
    const now = Date.now();
    const existing = this.seenMessages.get(fingerprint);
    if (!existing) {
      this.seenMessages.set(fingerprint, { count: 1, lastSeen: now, hash: fingerprint });
      return true;
    }
    if (now - existing.lastSeen > this.timeWindow) {
      existing.count = 1;
      existing.lastSeen = now;
      return true;
    }
    existing.count++;
    existing.lastSeen = now;
    return existing.count <= this.maxRepeats;
  }
  generateFingerprint(level, message) {
    const normalized = message.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, "[timestamp]").replace(/\d+ms/g, "[duration]").replace(/port \d+/g, "port [num]").replace(/\s+/g, " ").trim().slice(0, 80);
    return `${level}:${normalized}`;
  }
  cleanup() {
    const now = Date.now();
    const cutoff = now - this.timeWindow * 2;
    for (const [key, entry] of this.seenMessages.entries()) {
      if (entry.lastSeen < cutoff) {
        this.seenMessages.delete(key);
      }
    }
  }
  getStats() {
    return {
      trackedMessages: this.seenMessages.size,
      totalSuppressed: Array.from(this.seenMessages.values()).reduce(
        (sum, entry) => sum + Math.max(0, entry.count - this.maxRepeats),
        0
      )
    };
  }
};
var spamKiller = new UltraSpamKiller();
var ultraCleanFormat = winston.format.printf(({ level, message, timestamp: timestamp2, ...meta }) => {
  const time = new Date(timestamp2).toLocaleTimeString();
  let cleanMsg;
  if (typeof message === "string") {
    cleanMsg = message;
  } else if (message && typeof message === "object") {
    try {
      cleanMsg = JSON.stringify(message, null, 0);
      if (cleanMsg === "{}" || cleanMsg.includes("[object")) {
        cleanMsg = `[${message.constructor?.name || "Object"}]`;
      }
    } catch {
      cleanMsg = `[${typeof message}]`;
    }
  } else {
    cleanMsg = String(message);
  }
  if (cleanMsg.length > 250) {
    cleanMsg = cleanMsg.slice(0, 250) + "...";
  }
  let metaStr = "";
  if (meta && Object.keys(meta).length > 0) {
    try {
      const metaJson = JSON.stringify(meta, null, 0);
      if (metaJson !== "{}" && metaJson.length < 150) {
        metaStr = ` ${metaJson}`;
      }
    } catch {
    }
  }
  return `${time} [${level.toUpperCase()}] ${cleanMsg}${metaStr}`;
});
var logger;
try {
  const isDev = process.env.NODE_ENV !== "production";
  const logLevel = process.env.LOG_LEVEL || (isDev ? "info" : "warn");
  logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true })
    ),
    transports: [
      // Console with spam filtering
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          ultraCleanFormat
        ),
        // Override log method to add spam filtering
        log(info, callback) {
          if (spamKiller.shouldAllow(info.level, info.message)) {
            return winston.transports.Console.prototype.log.call(this, info, callback);
          }
          callback();
          return true;
        }
      }),
      // Error log file
      new winston.transports.File({
        filename: path2.join(logDir, "error.log"),
        level: "error",
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: 5242880,
        // 5MB
        maxFiles: 3
      })
    ],
    // Handle exceptions without spam
    exceptionHandlers: [
      new winston.transports.File({
        filename: path2.join(logDir, "exceptions.log"),
        maxsize: 2097152,
        // 2MB
        maxFiles: 2
      })
    ],
    exitOnError: false
  });
  if (isDev) {
    logger.add(new winston.transports.File({
      filename: path2.join(logDir, "combined.log"),
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxsize: 10485760,
      // 10MB
      maxFiles: 2
    }));
  }
  console.log("\u{1F319} Ultra-clean logger initialized");
} catch (err) {
  console.error("Logger initialization failed:", err);
  logger = {
    info: (msg, meta) => spamKiller.shouldAllow("info", String(msg)) ? console.log(msg, meta) : void 0,
    error: (msg, meta) => console.error(msg, meta),
    warn: (msg, meta) => spamKiller.shouldAllow("warn", String(msg)) ? console.warn(msg, meta) : void 0,
    debug: (msg, meta) => process.env.NODE_ENV === "development" && spamKiller.shouldAllow("debug", String(msg)) ? console.debug(msg, meta) : void 0
  };
}
setInterval(() => {
  spamKiller.cleanup();
}, 3e4);
logger.getSpamStats = () => spamKiller.getStats();
logger.cleanup = () => spamKiller.cleanup();
process.on("unhandledRejection", (reason) => {
  if (spamKiller.shouldAllow("error", String(reason))) {
    logger.error("Unhandled Rejection", { reason });
  }
});
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", { err, stack: err.stack });
});
var logger_default = logger;

// server/routes.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
var storageConfig = multer.diskStorage({
  destination: function(req, _file, cb) {
    const uploadPath = path3.join(__dirname2, "..", "uploads", "temp");
    if (!fs3.existsSync(uploadPath)) {
      fs3.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function(_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path3.extname(file.originalname));
  }
});
var upload = multer({
  storage: storageConfig,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path3.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});
async function registerRoutes(app2) {
  logger_default.info("\u26A1 Registering routes...");
  logger_default.info("\u2705 Setting up /api/health route...");
  app2.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      env: process.env.NODE_ENV || "development",
      port: process.env.PORT || "5000"
    });
  });
  logger_default.info("\u{1F319} Setting up LunaBug routes...");
  try {
    const lunaBugRoutes = await Promise.resolve().then(() => (init_lunabug(), lunabug_exports));
    app2.use("/api/lunabug", lunaBugRoutes.default);
    logger_default.info("\u2705 LunaBug routes registered at /api/lunabug");
  } catch (error) {
    logger_default.error(`\u274C LunaBug routes failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    logger_default.info("\u{1F319} LunaBug will use client-side fallback mode");
  }
  logger_default.info("\u{1F4C1} Setting up /api/upload route...");
  app2.post("/api/upload", requireAuth, upload.single("image"), async (req, res) => {
    if (!req.file) {
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
        fs3.unlinkSync(req.file.path);
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
      if (!parsedData.characterId || !parsedData.characterName) {
        fs3.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Character ID and name are required" });
      }
      const finalDir = path3.join(__dirname2, "..", "uploads", "characters", parsedData.characterName, parsedData.imageType);
      if (!fs3.existsSync(finalDir)) {
        fs3.mkdirSync(finalDir, { recursive: true });
      }
      const finalPath = path3.join(finalDir, req.file.filename);
      fs3.renameSync(req.file.path, finalPath);
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
        chatSendPercent: parsedData.chatSendPercent
      });
      res.json({ url: fileUrl, media: mediaUpload });
    } catch (error) {
      if (req.file && fs3.existsSync(req.file.path)) {
        fs3.unlinkSync(req.file.path);
      }
      logger_default.error("Upload error", { error: error instanceof Error ? error.message : "Unknown error" });
      res.status(500).json({ error: "Failed to upload file", details: error.message });
    }
  });
  logger_default.info("\u{1F510} Setting up auth routes...");
  app2.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const player = await storage.getPlayer(req.player.id);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json({ success: true, player });
    } catch (error) {
      logger_default.error("Auth error", { error: error instanceof Error ? error.message : "Unknown error" });
      res.status(500).json({ error: "Failed to fetch player data" });
    }
  });
  app2.post("/api/auth/dev", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Development login not available in production" });
    }
    try {
      const { username } = req.body;
      if (!username || username.trim().length === 0) {
        return res.status(400).json({ error: "Username is required" });
      }
      const sanitizedUsername = username.trim().substring(0, 50);
      const devTelegramId = `dev_${sanitizedUsername.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      let player = await storage.getPlayerByTelegramId(devTelegramId);
      if (!player) {
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
        await savePlayerDataToJSON(player);
      } else {
        await storage.updatePlayer(player.id, { lastLogin: /* @__PURE__ */ new Date() });
        await savePlayerDataToJSON(player);
      }
      const sessionToken = generateSecureToken();
      await storage.createSession({
        playerId: player.id,
        token: sessionToken,
        expiresAt: getSessionExpiry()
      });
      res.json({ success: true, player, sessionToken });
    } catch (error) {
      logger_default.error("Dev auth error", { error: error instanceof Error ? error.message : "Unknown error" });
      res.status(500).json({ error: "Authentication failed", details: error.message });
    }
  });
  logger_default.info("\u{1F4E8} Setting up Telegram auth...");
  app2.post("/api/auth/telegram", async (req, res) => {
    try {
      const { initData } = req.body;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return res.status(500).json({ error: "Telegram authentication not configured" });
      }
      if (!initData) {
        return res.status(400).json({ error: "Missing initData" });
      }
      const validator = new AuthDataValidator({ botToken });
      const dataMap = new Map(new URLSearchParams(initData).entries());
      const validationResult = await validator.validate(dataMap);
      if (!validationResult || !validationResult.id) {
        return res.status(401).json({ error: "Invalid Telegram authentication" });
      }
      const telegramId = validationResult.id.toString();
      let player = await storage.getPlayerByTelegramId(telegramId);
      if (!player) {
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
        await savePlayerDataToJSON(player);
      } else {
        await storage.updatePlayer(player.id, { lastLogin: /* @__PURE__ */ new Date() });
        await savePlayerDataToJSON(player);
      }
      const sessionToken = generateSecureToken();
      await storage.createSession({
        playerId: player.id,
        token: sessionToken,
        expiresAt: getSessionExpiry()
      });
      res.json({ success: true, player, sessionToken });
    } catch (error) {
      logger_default.error("Telegram auth error", { error: error instanceof Error ? error.message : "Unknown error" });
      res.status(500).json({ error: "Authentication failed", details: error.message });
    }
  });
  logger_default.info("\u{1F3AE} Setting up game data routes...");
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
      const levels2 = getLevelsFromMemory();
      res.json({ levels: levels2 });
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
      logger_default.error("Media fetch error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch media uploads" });
    }
  });
  logger_default.info("\u{1F464} Setting up player routes...");
  app2.get("/api/player/me", requireAuth, async (req, res) => {
    try {
      const player = await storage.getPlayer(req.player.id);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json({ player });
    } catch (error) {
      logger_default.error("Player fetch error", { error: error instanceof Error ? error.message : "Unknown" });
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
      logger_default.error("Player update error", { error: error instanceof Error ? error.message : "Unknown" });
      res.status(500).json({ error: "Failed to update player" });
    }
  });
  logger_default.info("\u{1F680} Creating HTTP server...");
  const httpServer = createServer(app2);
  logger_default.info("\u2705 All routes registered successfully");
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs4 from "fs";
import path5 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path4 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath as fileURLToPath3 } from "node:url";
var r = (...segs) => path4.resolve(path4.dirname(fileURLToPath3(import.meta.url)), ...segs);
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
      // Game data aliases
      "@data": r("main-gamedata"),
      "@master": r("main-gamedata", "master-data"),
      // 🌙 LUNABUG ALIAS - Use path.resolve for absolute path
      "@lunabug": path4.resolve(r(), "LunaBug"),
      // Alternative: direct file alias for init.js
      "@lunabug/init": path4.resolve(r(), "LunaBug", "init.js")
    }
  },
  root: r("client"),
  build: {
    outDir: r("dist/public"),
    emptyOutDir: true,
    // Add rollup options to handle external dependencies
    rollupOptions: {
      // Don't bundle LunaBug - let it be external
      external: (id) => {
        return false;
      }
    }
  },
  server: {
    fs: {
      strict: false,
      // Allow access to parent directories
      // Allow serving files from these directories
      allow: [r(), r("main-gamedata"), r("LunaBug")],
      deny: ["**/node_modules/**", "**/.git/**"]
    },
    // Add more lenient CORS for development
    cors: true
  },
  // Optimize deps to prevent reload issues
  optimizeDeps: {
    include: [],
    exclude: ["@lunabug/init"]
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
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
      const clientTemplate = path5.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs4.promises.readFile(clientTemplate, "utf-8");
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
  const distPath = path5.resolve(import.meta.dirname, "public");
  if (!fs4.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path5.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import path6 from "path";
import { fileURLToPath as fileURLToPath4 } from "url";
import fs5 from "fs";
var __filename3 = fileURLToPath4(import.meta.url);
var __dirname3 = path6.dirname(__filename3);
var logsDir = path6.join(__dirname3, "..", "logs");
if (!fs5.existsSync(logsDir)) {
  fs5.mkdirSync(logsDir, { recursive: true });
}
var app = express3();
process.on("unhandledRejection", (reason, promise) => {
  logger_default.error("\u{1F4A5} Unhandled Rejection at:", { promise, reason });
});
process.on("uncaughtException", (error) => {
  logger_default.error("\u{1F4A5} Uncaught Exception:", error);
  process.exit(1);
});
app.use(express3.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const p = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    const base = { method: req.method, path: p, status: res.statusCode, duration };
    if (p.startsWith("/api")) {
      const payload = capturedJsonResponse && JSON.stringify(capturedJsonResponse).slice(0, 500);
      logger_default.info({ ...base, payload });
    } else {
      logger_default.debug(base);
    }
  });
  setTimeout(() => {
    if (!res.headersSent) {
      logger_default.warn({ msg: "REQUEST HANGING", method: req.method, url: req.url, ms: Date.now() - start });
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
  app.use("/uploads", express3.static(path6.join(__dirname3, "..", "uploads")));
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
    logger_default.error("ERROR handler", { status, message, stack: err.stack, ...err });
    res.status(status).json({ message, error: err.message });
  });
  if (app.get("env") === "development") {
    logger_default.info("Setting up Vite dev server...");
    await setupVite(app, server);
    logger_default.info("Vite dev server ready");
  } else {
    logger_default.info("Serving static files (production mode)...");
    serveStatic(app);
    logger_default.info("Static files ready");
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  logger_default.info(`\u{1F310} Starting server on port ${port}...`);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    logger_default.info(`\u2705 Server listening on port ${port}`);
    logger_default.info(`\u2705 Server is ready and accepting connections on http://0.0.0.0:${port}`);
  });
})();
