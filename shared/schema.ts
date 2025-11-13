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
  passiveIncomeRate: integer("passiveIncomeRate").default(0).notNull(),
  lastTapValue: integer("lastTapValue").default(1).notNull(),
  isAdmin: boolean("isAdmin").default(false).notNull(),
  selectedCharacterId: text("selectedCharacterId").notNull(),
  selectedImageId: text("selectedImageId").notNull(),
  displayImage: text("displayImage").notNull(),
  activeCharacter: text("activeCharacter").notNull(),
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
  defaultImage: text("defaultImage").notNull(),
  avatarImage: text("avatarImage").notNull(),
  displayImage: text("displayImage").notNull(),
  activeCharacter: text("activeCharacter").notNull(),
  isHidden: boolean("isHidden").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Levels (NO xpRequired, experienceRequired, or pointsReward)
export const levels = pgTable("levels", {
  level: integer("level").primaryKey(),
  cost: integer("cost").notNull().default(100),
  rewards: jsonb("rewards").notNull().default('{}').$type<{ lustPoints?: number, lustGems?: number, characterUnlocks?: string[], upgradeUnlocks?: string[] }>(),
  requirements: jsonb("requirements").notNull().default('[]').$type<{ upgradeId: string; minLevel: number }[]>(),
  unlocks: jsonb("unlocks").notNull().default('[]').$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  unlockedAt: timestamp("unlockedAt").defaultNow().notNull()
});

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  requirementType: text("requirementType").notNull(),
  target: integer("target").notNull(),
  rewardType: text("rewardType").notNull(),
  rewardAmount: integer("rewardAmount").notNull(),
  icon: text("icon"),
  resetType: text("resetType").notNull().default('daily'),
  sortOrder: integer("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isHidden: boolean("isHidden").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const achievements = pgTable("achievements", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  requirementType: text("requirementType").notNull(),
  target: integer("target").notNull(),
  rewardType: text("rewardType").notNull(),
  rewardAmount: integer("rewardAmount").notNull(),
  rewardData: jsonb("rewardData").$type<Record<string, any>>(),
  icon: text("icon"),
  rarity: text("rarity").default('common').notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  isSecret: boolean("isSecret").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const playerTaskProgress = pgTable("playerTaskProgress", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: varchar("playerId").notNull().references(() => players.id, { onDelete: 'cascade' }),
  taskId: text("taskId").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  progress: integer("progress").default(0).notNull(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  isClaimed: boolean("isClaimed").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  claimedAt: timestamp("claimedAt"),
  lastResetAt: timestamp("lastResetAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  playerTaskUnique: unique().on(table.playerId, table.taskId),
}));

export const playerAchievementProgress = pgTable("playerAchievementProgress", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: varchar("playerId").notNull().references(() => players.id, { onDelete: 'cascade' }),
  achievementId: text("achievementId").notNull().references(() => achievements.id, { onDelete: 'cascade' }),
  progress: integer("progress").default(0).notNull(),
  isUnlocked: boolean("isUnlocked").default(false).notNull(),
  isClaimed: boolean("isClaimed").default(false).notNull(),
  unlockedAt: timestamp("unlockedAt"),
  claimedAt: timestamp("claimedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  playerAchievementUnique: unique().on(table.playerId, table.achievementId),
}));

export const playerUpgrades = pgTable("playerUpgrades", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: varchar("playerId").notNull().references(() => players.id, { onDelete: 'cascade' }),
  upgrades: jsonb("upgrades").default('{}').notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  playerUpgradeUnique: unique().on(table.playerId),
}));

export const playerLevelUps = pgTable("playerLevelUps", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: varchar("playerId").notNull().references(() => players.id, { onDelete: 'cascade' }),
  level: integer("level").notNull(),
  unlockedAt: timestamp("unlockedAt").defaultNow().notNull(),
  source: text("source"),
}, (table) => ({
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
  updatedAt: true,
  lastLogin: true,
  lastEnergyUpdate: true,
});

export const insertUpgradeSchema = createInsertSchema(upgrades).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCharacterSchema = createInsertSchema(characters).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertLevelSchema = createInsertSchema(levels).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertPlayerTaskProgressSchema = createInsertSchema(playerTaskProgress).omit({
  id: true,
  updatedAt: true,
});

export const insertPlayerAchievementProgressSchema = createInsertSchema(playerAchievementProgress).omit({
  id: true,
  updatedAt: true,
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

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

export type PlayerTaskProgress = typeof playerTaskProgress.$inferSelect;
export type InsertPlayerTaskProgress = z.infer<typeof insertPlayerTaskProgressSchema>;

export type PlayerAchievementProgress = typeof playerAchievementProgress.$inferSelect;
export type InsertPlayerAchievementProgress = z.infer<typeof insertPlayerAchievementProgressSchema>;

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