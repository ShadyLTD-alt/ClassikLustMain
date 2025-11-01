import { pgTable, text, integer, boolean, timestamp, uuid, bigint, jsonb } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const players = pgTable('players', {
  id: uuid('id').defaultRandom().primaryKey(),
  telegramId: text('telegram_id').unique(),
  username: text('username').notNull(),
  points: bigint('points', { mode: 'number' }).default(0).notNull(),
  energy: integer('energy').default(1000).notNull(),
  maxEnergy: integer('max_energy').default(1000).notNull(),
  level: integer('level').default(1).notNull(),
  experience: bigint('experience', { mode: 'number' }).default(0).notNull(),
  passiveIncomeRate: integer('passive_income_rate').default(0).notNull(),
  upgrades: jsonb('upgrades').$type<Record<string, number>>().default({}).notNull(),
  unlockedCharacters: jsonb('unlocked_characters').$type<string[]>().default([]).notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  displayImage: text('display_image'),
  selectedCharacterId: text('selected_character_id'),
  lastLogin: timestamp('last_login', { mode: 'date' }),
  lastEnergyUpdate: timestamp('last_energy_update', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const upgrades = pgTable('upgrades', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(),
  icon: text('icon').notNull(),
  maxLevel: integer('max_level').notNull(),
  baseCost: integer('base_cost').notNull(),
  costMultiplier: integer('cost_multiplier').notNull(),
  baseValue: integer('base_value').notNull(),
  valueIncrement: integer('value_increment').notNull(),
  isHidden: boolean('is_hidden').default(false).notNull(),
});

export const characters = pgTable('characters', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  unlockLevel: integer('unlock_level').default(1).notNull(),
  description: text('description').notNull(),
  rarity: text('rarity').notNull(),
  defaultImage: text('default_image'),
  avatarImage: text('avatar_image'),
  displayImage: text('display_image'),
  isHidden: boolean('is_hidden').default(false).notNull(),
});

export const levels = pgTable('levels', {
  level: integer('level').primaryKey(),
  cost: integer('cost').notNull(),
  experienceRequired: bigint('experience_required', { mode: 'number' }),
  requirements: jsonb('requirements').$type<Array<{ upgradeId: string; minLevel: number }>>().default([]).notNull(),
  unlocks: jsonb('unlocks').$type<string[]>().default([]).notNull(),
});

export const playerUpgrades = pgTable('player_upgrades', {
  id: uuid('id').defaultRandom().primaryKey(),
  playerId: uuid('player_id').notNull(),
  upgradeId: text('upgrade_id').notNull(),
  level: integer('level').default(1).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const playerCharacters = pgTable('player_characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  playerId: uuid('player_id').notNull(),
  characterId: text('character_id').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  playerId: uuid('player_id').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const mediaUploads = pgTable('media_uploads', {
  id: uuid('id').defaultRandom().primaryKey(),
  characterId: text('character_id').notNull(),
  url: text('url').notNull(),
  type: text('type').notNull(),
  unlockLevel: integer('unlock_level').default(1).notNull(),
  categories: jsonb('categories').$type<string[]>().default([]).notNull(),
  poses: jsonb('poses').$type<string[]>().default([]),
  isHidden: boolean('is_hidden').default(false).notNull(),
  chatEnable: boolean('chat_enable').default(false).notNull(),
  chatSendPercent: integer('chat_send_percent').default(0).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Zod schemas for inserts
export const insertLevelSchema = z.object({
  level: z.number().int().min(1),
  cost: z.number().int().min(0),
  experienceRequired: z.number().int().optional(),
  requirements: z.array(z.object({ upgradeId: z.string(), minLevel: z.number().int().min(1) })).default([]),
  unlocks: z.array(z.string()).default([]),
});

export type Level = typeof levels.$inferSelect;
export type InsertLevel = z.infer<typeof insertLevelSchema>;
