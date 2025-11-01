import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramId: text("telegram_id").unique(),
  username: text("username").notNull(),
  points: integer("points").default(0).notNull(),
  energy: integer("energy").default(1000).notNull(),
  maxEnergy: integer("max_energy").default(1000).notNull(),
  level: integer("level").default(1).notNull(),
  experience: integer("experience").default(0).notNull(),
  passiveIncomeRate: integer("passive_income_rate").default(0).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  selectedCharacterId: text("selected_character_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login").defaultNow().notNull(),
  lastEnergyUpdate: timestamp("last_energy_update").defaultNow().notNull(),
});

export const upgrades = pgTable("upgrades", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  icon: text("icon").notNull(),
  maxLevel: integer("max_level").notNull(),
  baseCost: integer("base_cost").notNull(),
  costMultiplier: real("cost_multiplier").notNull(),
  baseValue: real("base_value").notNull(),
  valueIncrement: real("value_increment").notNull(),
  isHidden: boolean("is_hidden").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const characters = pgTable("characters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  unlockLevel: integer("unlock_level").notNull(),
  description: text("description").notNull(),
  rarity: text("rarity").notNull(),
  defaultImage: text("default_image"),
  avatarImage: text("avatar_image"),
  displayImage: text("display_image"),
  isHidden: boolean("is_hidden").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const levels = pgTable("levels", {
  level: integer("level").primaryKey(),
  experienceRequired: integer("experience_required").notNull(),
  requirements: jsonb("requirements").notNull().$type<Array<{ upgradeId: string; minLevel: number }>>(),
  unlocks: text("unlocks").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playerUpgrades = pgTable("player_upgrades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: 'cascade' }),
  upgradeId: text("upgrade_id").notNull().references(() => upgrades.id, { onDelete: 'cascade' }),
  level: integer("level").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const playerCharacters = pgTable("player_characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: 'cascade' }),
  characterId: text("character_id").notNull().references(() => characters.id, { onDelete: 'cascade' }),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
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
