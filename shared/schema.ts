import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, real, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const players = pgTable("players", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  telegramId: text("telegramId").unique(),
  username: text("username").notNull(),
  points: integer("points").default(0).notNull(),
  lustPoints: integer("lustPoints").default(0).notNull(),
  lustGems: integer("lustGems").default(0).notNull(),
  energy: integer("energy").default(1000).notNull(),
  energyMax: integer("energyMax").default(1000).notNull(),
  level: integer("level").default(1).notNull(),
  experience: integer("experience").default(0).notNull(),
  passiveIncomeRate: integer("passiveIncomeRate").default(0).notNull(),
  lastTapValue: integer("lastTapValue").default(1).notNull(),
  isAdmin: boolean("isAdmin").default(false).notNull(),
  selectedCharacterId: text("selectedCharacterId"),
  selectedImageId: text("selectedImageId"),
  displayImage: text("displayImage"),
  upgrades: jsonb("upgrades").default("{}").notNull().$type<Record<string, number>>(),
  unlockedCharacters: jsonb("unlockedCharacters").default("[]").notNull().$type<string[]>(),
  totalTapsAllTime: integer("totalTapsAllTime").default(0).notNull(),
  totalTapsToday: integer("totalTapsToday").default(0).notNull(),
  lpEarnedToday: integer("lpEarnedToday").default(0).notNull(),
  upgradesPurchasedToday: integer("upgradesPurchasedToday").default(0).notNull(),
  consecutiveDays: integer("consecutiveDays").default(0).notNull(),
  claimedTasks: jsonb("claimedTasks").default("[]").notNull().$type<string[]>(),
  claimedAchievements: jsonb("claimedAchievements").default("[]").notNull().$type<string[]>(),
  boostExpiresAt: timestamp("boostExpiresAt"),
  boostEndTime: timestamp("boostEndTime"),
  boostMultiplier: real("boostMultiplier").default(1.0).notNull(),
  boostActive: boolean("boostActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastLogin: timestamp("lastLogin").defaultNow().notNull(),
  lastEnergyUpdate: timestamp("lastEnergyUpdate").defaultNow().notNull(),
  lastWeeklyReset: timestamp("lastWeeklyReset").defaultNow().notNull(),
  lastDailyReset: timestamp("lastDailyReset").defaultNow().notNull()
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Levels EXCLUDING experienceRequired and xpRequired, rewards includes character/unlocks
export const levels = pgTable("levels", {
  level: integer("level").primaryKey(),
  cost: integer("cost").notNull().default(100),
  pointsReward: integer("pointsReward").default(0).notNull(),
  // rewards: object -- can contain lustPoints, lustGems, characterUnlocks, upgradeUnlocks
  rewards: jsonb("rewards").notNull().default('{}').$type<{ lustPoints?: number, lustGems?: number, characterUnlocks?: string[], upgradeUnlocks?: string[] }>(),
  requirements: jsonb("requirements").notNull().default('[]').$type<{ upgradeId: string; minLevel: number }[]>(),
  unlocks: jsonb("unlocks").notNull().default('[]').$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const insertLevelSchema = createInsertSchema(levels).omit({
  createdAt: true,
  updatedAt: true,
});

export type Level = typeof levels.$inferSelect;
export type InsertLevel = z.infer<typeof insertLevelSchema>;
