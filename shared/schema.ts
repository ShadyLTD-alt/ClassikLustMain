import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, real, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const players = pgTable("players", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  telegramId: text("telegramId").unique(),
  username: text("username").notNull(),
  points: numeric("points", { precision: 10, scale: 2 }).default("0").notNull(),
  energy: integer("energy").default(1000).notNull(),
  maxEnergy: integer("maxEnergy").default(1000).notNull(),
  level: integer("level").default(1).notNull(),
  experience: integer("experience").default(0).notNull(),
  passiveIncomeRate: integer("passiveIncomeRate").default(0).notNull(),
  isAdmin: boolean("isAdmin").default(false).notNull(),
  selectedCharacterId: text("selectedCharacterId"),
  displayImage: text("displayImage"),
  upgrades: jsonb("upgrades").default("{}").notNull().$type<Record<string, number>>(), // Store upgrade levels as { upgradeId: level }
  unlockedCharacters: jsonb("unlockedCharacters").default("[]").notNull().$type<string[]>(), // Store unlocked character IDs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastLogin: timestamp("lastLogin").defaultNow().notNull(),
  lastEnergyUpdate: timestamp("lastEnergyUpdate").defaultNow().notNull(),
});

export const upgrades = pgTable("upgrades", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
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

export const levels = pgTable("levels", {
  level: integer("level").primaryKey(),
  experienceRequired: integer("experienceRequired").notNull(),
  requirements: jsonb("requirements").notNull().$type<Array<{ upgradeId: string; minLevel: number }>>(),
  unlocks: text("unlocks").array().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const playerUpgrades = pgTable("playerUpgrades", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: varchar("playerId").notNull().references(() => players.id, { onDelete: 'cascade' }),
  upgradeId: text("upgradeId").notNull().references(() => upgrades.id, { onDelete: 'cascade' }),
  level: integer("level").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

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
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  characterId: text("characterId").notNull().references(() => characters.id, { onDelete: 'cascade' }),
  url: text("url").notNull(),
  type: text("type").notNull(),
  unlockLevel: integer("unlockLevel").default(1).notNull(),
  categories: text("categories").array().default(sql`'{}'::text[]`).notNull(),
  poses: text("poses").array().default(sql`'{}'::text[]`).notNull(),
  isHidden: boolean("isHidden").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
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
  createdAt: true,
});

export const insertPlayerUpgradeSchema = createInsertSchema(playerUpgrades).omit({
  id: true,
  updatedAt: true,
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

export type PlayerCharacter = typeof playerCharacters.$inferSelect;
export type InsertPlayerCharacter = z.infer<typeof insertPlayerCharacterSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type MediaUpload = typeof mediaUploads.$inferSelect;
export type InsertMediaUpload = z.infer<typeof insertMediaUploadSchema>;
