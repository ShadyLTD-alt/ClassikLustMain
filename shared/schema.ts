import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, real, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const players = pgTable("players", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  telegramId: text("telegramId").unique(),
  username: text("username").notNull(),
  points: integer("points").default(0).notNull(),
  lustGems: integer("lustGems").default(0).notNull(),
  energy: integer("energy").default(1000).notNull(),
  energyMax: integer("energyMax").default(1000).notNull(),
  level: integer("level").default(1).notNull(),
  experience: integer("experience").default(0).notNull(),
  passiveIncomeRate: integer("passiveIncomeRate").default(0).notNull(),
  isAdmin: boolean("isAdmin").default(false).notNull(),
  selectedCharacterId: text("selectedCharacterId"),
  selectedImageId: text("selectedImageId"),
  displayImage: text("displayImage"),
  upgrades: jsonb("upgrades").default("{}").notNull().$type<Record<string, number>>(),
  unlockedCharacters: jsonb("unlockedCharacters").default("[]").notNull().$type<string[]>(),
  totalTapsAllTime: integer("totalTapsAllTime").default(0).notNull(),
  totalTapsToday: integer("totalTapsToday").default(0).notNull(),
  boostExpiresAt: timestamp("boostExpiresAt"),
  boostMultiplier: real("boostMultiplier").default(1.0).notNull(),
  boostActive: boolean("boostActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastLogin: timestamp("lastLogin").defaultNow().notNull(),
  lastEnergyUpdate: timestamp("lastEnergyUpdate").defaultNow().notNull(),
  lastWeeklyReset: timestamp("lastWeeklyReset").defaultNow().notNull(),
  lastDailyReset: timestamp("lastDailyReset").defaultNow().notNull()
  
});

// Match upgrades-master.json exactly
export const upgrades = pgTable("upgrades", {
  id: text("id").primaryKey(), // perTap, perHour, energyMax, criticalChance, etc.
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // perTap, perHour, energyMax
  icon: text("icon").notNull(),
  maxLevel: integer("maxLevel").notNull(),
  baseCost: integer("baseCost").notNull(),
  costMultiplier: real("costMultiplier").notNull(),
  baseValue: real("baseValue").notNull(),
  valueIncrement: real("valueIncrement").notNull(),
  isHidden: boolean("isHidden").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const characters = pgTable("characters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  unlockLevel: integer("unlockLevel").notNull(),
  description: text("description").notNull(),
  rarity: text("rarity").notNull(),
  defaultImage: text("defaultImage"),
  avatarImage: text("avatarImage"),
  displayImage: text("displayImage"),
  isHidden: boolean("isHidden").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Enhanced levels for admin editor with cost and requirements
export const levels = pgTable("levels", {
  level: integer("level").primaryKey(),
  cost: integer("cost").notNull().default(100), // Points cost to level up
  experienceRequired: integer("experienceRequired"), // Optional/dormant XP system
  requirements: jsonb("requirements").notNull().default("[]").$type<Array<{ upgradeId: string; minLevel: number }>>(),
  unlocks: jsonb("unlocks").notNull().default("[]").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Fixed playerUpgrades to mirror JSON structure exactly
export const playerUpgrades = pgTable("playerUpgrades", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: varchar("playerId").notNull().references(() => players.id, { onDelete: 'cascade' }),
  upgradeId: text("upgradeId").notNull().references(() => upgrades.id, { onDelete: 'cascade' }), // perTap, perHour, etc.
  type: text("type"), // Store upgrade type for fast filtering - NULLABLE
  level: integer("level").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  // Ensure each player can only have one record per upgrade
  playerUpgradeUnique: unique().on(table.playerId, table.upgradeId),
}));

// New: Track player level progression (requirements-based)
export const playerLevelUps = pgTable("playerLevelUps", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: varchar("playerId").notNull().references(() => players.id, { onDelete: 'cascade' }),
  level: integer("level").notNull(),
  unlockedAt: timestamp("unlockedAt").defaultNow().notNull(),
  source: text("source"), // "requirements", "admin", "grant", etc.
}, (table) => ({
  // Ensure each player reaches each level only once
  playerLevelUnique: unique().on(table.playerId, table.level),
}));

export const playerCharacters = pgTable("playerCharacters", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: varchar("playerId").notNull().references(() => players.id, { onDelete: 'cascade' }),
  characterId: text("characterId").notNull().references(() => characters.id, { onDelete: 'cascade' }),
  unlockedAt: timestamp("unlockedAt").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: varchar("playerId").notNull().references(() => players.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const mediaUploads = pgTable("mediaUploads", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: text("characterId").notNull().references(() => characters.id, { onDelete: 'cascade' }),
  url: text("url").notNull(),
  type: text("type").notNull().default('character'),
  unlockLevel: integer("unlockLevel").notNull().default(1),
  categories: jsonb("categories").notNull().default(sql`'[]'::jsonb`).$type<string[]>(),
  poses: jsonb("poses").notNull().default(sql`'[]'::jsonb`).$type<string[]>(),
  isHidden: boolean("isHidden").notNull().default(false),
  chatEnable: boolean("chatEnable").notNull().default(false),
  chatSendPercent: integer("chatSendPercent").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
  lastEnergyUpdate: true,
});

export const insertUpgradeSchema = createInsertSchema(upgrades).omit({
  createdAt: true,
});

export const insertCharacterSchema = createInsertSchema(characters).omit({
  createdAt: true,
});

export const insertLevelSchema = createInsertSchema(levels).omit({
  createdAt: true
});

export const insertPlayerUpgradeSchema = createInsertSchema(playerUpgrades).omit({
  id: true,
  updatedAt: true,
});

export const insertPlayerLevelUpSchema = createInsertSchema(playerLevelUps).omit({
  id: true,
  unlockedAt: true,
});

export const insertPlayerCharacterSchema = createInsertSchema(playerCharacters).omit({
  id: true,
  unlockedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertMediaUploadSchema = createInsertSchema(mediaUploads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  chatEnable: z.boolean().optional().default(false),
  chatSendPercent: z.number().int().min(0).max(100).optional().default(0),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;

export type Upgrade = typeof upgrades.$inferSelect;
export type InsertUpgrade = z.infer<typeof insertUpgradeSchema>;

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;

export type Level = typeof levels.$inferSelect;
export type InsertLevel = z.infer<typeof insertLevelSchema>;

export type PlayerUpgrade = typeof playerUpgrades.$inferSelect;
export type InsertPlayerUpgrade = z.infer<typeof insertPlayerUpgradeSchema>;

export type PlayerLevelUp = typeof playerLevelUps.$inferSelect;
export type InsertPlayerLevelUp = z.infer<typeof insertPlayerLevelUpSchema>;

export type PlayerCharacter = typeof playerCharacters.$inferSelect;
export type InsertPlayerCharacter = z.infer<typeof insertPlayerCharacterSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type MediaUpload = typeof mediaUploads.$inferSelect;
export type InsertMediaUpload = z.infer<typeof insertMediaUploadSchema>;