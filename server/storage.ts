
import { createClient } from '@supabase/supabase-js';
import { eq, and } from "drizzle-orm";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import {
  type Player,
  type InsertPlayer,
  type Upgrade,
  type InsertUpgrade,
  type Character,
  type InsertCharacter,
  type Level,
  type InsertLevel,
  type PlayerUpgrade,
  type InsertPlayerUpgrade,
  type PlayerCharacter,
  type InsertPlayerCharacter,
} from "@shared/schema";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set");
}

// Validate URL format
if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  throw new Error(`Invalid SUPABASE_URL format: "${supabaseUrl}". Must start with http:// or https://`);
}

// Initialize Supabase client
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// Get the connection string for Drizzle
// Use the SUPABASE_URL secret which should be the full database connection string
const connectionString = process.env.SUPABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("SUPABASE_URL or DATABASE_URL must be set for database connection");
}

// Use postgres.js for Drizzle with Supabase with connection pooling settings
const client = postgres(connectionString, {
  max: 1, // Limit connections in serverless environment
  idle_timeout: 20,
  connect_timeout: 10,
});
export const db = drizzle(client, { schema });

export interface IStorage {
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayerByTelegramId(telegramId: string): Promise<Player | undefined>;
  createPlayer(player: Partial<InsertPlayer>): Promise<Player>;
  updatePlayer(id: string, updates: Partial<Player>): Promise<Player | undefined>;
  getAllPlayers(): Promise<Player[]>;
  
  getUpgrades(includeHidden?: boolean): Promise<Upgrade[]>;
  getUpgrade(id: string): Promise<Upgrade | undefined>;
  createUpgrade(upgrade: InsertUpgrade): Promise<Upgrade>;
  updateUpgrade(id: string, updates: Partial<Upgrade>): Promise<Upgrade | undefined>;
  
  getCharacters(includeHidden?: boolean): Promise<Character[]>;
  getCharacter(id: string): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: string, updates: Partial<Character>): Promise<Character | undefined>;
  
  getLevels(): Promise<Level[]>;
  getLevel(level: number): Promise<Level | undefined>;
  createLevel(levelData: InsertLevel): Promise<Level>;
  updateLevel(level: number, updates: Partial<Level>): Promise<Level | undefined>;
  
  getPlayerUpgrades(playerId: string): Promise<(PlayerUpgrade & { upgrade: Upgrade })[]>;
  getPlayerUpgrade(playerId: string, upgradeId: string): Promise<PlayerUpgrade | undefined>;
  setPlayerUpgrade(data: InsertPlayerUpgrade): Promise<PlayerUpgrade>;
  updatePlayerUpgrade(playerId: string, upgradeId: string, level: number): Promise<PlayerUpgrade | undefined>;
  
  getPlayerCharacters(playerId: string): Promise<(PlayerCharacter & { character: Character })[]>;
  unlockCharacter(data: InsertPlayerCharacter): Promise<PlayerCharacter>;
  hasCharacter(playerId: string, characterId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getPlayer(id: string): Promise<Player | undefined> {
    const result = await db.select().from(schema.players).where(eq(schema.players.id, id)).limit(1);
    return result[0];
  }

  async getPlayerByTelegramId(telegramId: string): Promise<Player | undefined> {
    const result = await db.select().from(schema.players).where(eq(schema.players.telegramId, telegramId)).limit(1);
    return result[0];
  }

  async createPlayer(playerData: Partial<InsertPlayer>): Promise<Player> {
    const result = await db.insert(schema.players).values(playerData as InsertPlayer).returning();
    return result[0];
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player | undefined> {
    const result = await db.update(schema.players).set(updates).where(eq(schema.players.id, id)).returning();
    return result[0];
  }

  async getAllPlayers(): Promise<Player[]> {
    return await db.select().from(schema.players);
  }

  async getUpgrades(includeHidden = false): Promise<Upgrade[]> {
    if (includeHidden) {
      return await db.select().from(schema.upgrades);
    }
    return await db.select().from(schema.upgrades).where(eq(schema.upgrades.isHidden, false));
  }

  async getUpgrade(id: string): Promise<Upgrade | undefined> {
    const result = await db.select().from(schema.upgrades).where(eq(schema.upgrades.id, id)).limit(1);
    return result[0];
  }

  async createUpgrade(upgrade: InsertUpgrade): Promise<Upgrade> {
    const result = await db.insert(schema.upgrades).values(upgrade).returning();
    return result[0];
  }

  async updateUpgrade(id: string, updates: Partial<Upgrade>): Promise<Upgrade | undefined> {
    const result = await db.update(schema.upgrades).set(updates).where(eq(schema.upgrades.id, id)).returning();
    return result[0];
  }

  async getCharacters(includeHidden = false): Promise<Character[]> {
    if (includeHidden) {
      return await db.select().from(schema.characters);
    }
    return await db.select().from(schema.characters).where(eq(schema.characters.isHidden, false));
  }

  async getCharacter(id: string): Promise<Character | undefined> {
    const result = await db.select().from(schema.characters).where(eq(schema.characters.id, id)).limit(1);
    return result[0];
  }

  async createCharacter(character: InsertCharacter): Promise<Character> {
    const result = await db.insert(schema.characters).values(character).returning();
    return result[0];
  }

  async updateCharacter(id: string, updates: Partial<Character>): Promise<Character | undefined> {
    const result = await db.update(schema.characters).set(updates).where(eq(schema.characters.id, id)).returning();
    return result[0];
  }

  async getLevels(): Promise<Level[]> {
    return await db.select().from(schema.levels);
  }

  async getLevel(level: number): Promise<Level | undefined> {
    const result = await db.select().from(schema.levels).where(eq(schema.levels.level, level)).limit(1);
    return result[0];
  }

  async createLevel(levelData: InsertLevel): Promise<Level> {
    const result = await db.insert(schema.levels).values(levelData).returning();
    return result[0];
  }

  async updateLevel(level: number, updates: Partial<Level>): Promise<Level | undefined> {
    const result = await db.update(schema.levels).set(updates).where(eq(schema.levels.level, level)).returning();
    return result[0];
  }

  async getPlayerUpgrades(playerId: string): Promise<(PlayerUpgrade & { upgrade: Upgrade })[]> {
    const results = await db
      .select()
      .from(schema.playerUpgrades)
      .leftJoin(schema.upgrades, eq(schema.playerUpgrades.upgradeId, schema.upgrades.id))
      .where(eq(schema.playerUpgrades.playerId, playerId));
    
    return results.map(row => ({
      ...row.player_upgrades,
      upgrade: row.upgrades!,
    }));
  }

  async getPlayerUpgrade(playerId: string, upgradeId: string): Promise<PlayerUpgrade | undefined> {
    const result = await db
      .select()
      .from(schema.playerUpgrades)
      .where(and(
        eq(schema.playerUpgrades.playerId, playerId),
        eq(schema.playerUpgrades.upgradeId, upgradeId)
      ))
      .limit(1);
    return result[0];
  }

  async setPlayerUpgrade(data: InsertPlayerUpgrade): Promise<PlayerUpgrade> {
    const existing = await this.getPlayerUpgrade(data.playerId, data.upgradeId);
    if (existing) {
      const result = await db
        .update(schema.playerUpgrades)
        .set({ level: data.level, updatedAt: new Date() })
        .where(eq(schema.playerUpgrades.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db.insert(schema.playerUpgrades).values(data).returning();
    return result[0];
  }

  async updatePlayerUpgrade(playerId: string, upgradeId: string, level: number): Promise<PlayerUpgrade | undefined> {
    const existing = await this.getPlayerUpgrade(playerId, upgradeId);
    if (!existing) return undefined;
    
    const result = await db
      .update(schema.playerUpgrades)
      .set({ level, updatedAt: new Date() })
      .where(eq(schema.playerUpgrades.id, existing.id))
      .returning();
    return result[0];
  }

  async getPlayerCharacters(playerId: string): Promise<(PlayerCharacter & { character: Character })[]> {
    const results = await db
      .select()
      .from(schema.playerCharacters)
      .leftJoin(schema.characters, eq(schema.playerCharacters.characterId, schema.characters.id))
      .where(eq(schema.playerCharacters.playerId, playerId));
    
    return results.map(row => ({
      ...row.player_characters,
      character: row.characters!,
    }));
  }

  async unlockCharacter(data: InsertPlayerCharacter): Promise<PlayerCharacter> {
    const result = await db.insert(schema.playerCharacters).values(data).returning();
    return result[0];
  }

  async hasCharacter(playerId: string, characterId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(schema.playerCharacters)
      .where(and(
        eq(schema.playerCharacters.playerId, playerId),
        eq(schema.playerCharacters.characterId, characterId)
      ))
      .limit(1);
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
