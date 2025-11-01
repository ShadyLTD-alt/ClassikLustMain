
import { createClient } from '@supabase/supabase-js';
import { eq, and, lt } from "drizzle-orm";
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
  type Session,
  type InsertSession,
  type MediaUpload,
  type InsertMediaUpload,
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
// DATABASE_URL should contain the PostgreSQL connection pooler URL from Supabase
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set for database connection");
}

// Validate it's a postgres connection string
if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
  throw new Error(`Invalid DATABASE_URL format: must start with postgresql://`);
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
  
  createSession(data: InsertSession): Promise<Session>;
  getSessionByToken(token: string): Promise<(Session & { player: Player }) | undefined>;
  deleteSession(token: string): Promise<void>;
  cleanupExpiredSessions(): Promise<void>;
  
  getMediaUploads(characterId?: string, includeHidden?: boolean): Promise<MediaUpload[]>;
  getMediaUpload(id: string): Promise<MediaUpload | undefined>;
  createMediaUpload(data: InsertMediaUpload): Promise<MediaUpload>;
  updateMediaUpload(id: string, updates: Partial<MediaUpload>): Promise<MediaUpload | undefined>;
  deleteMediaUpload(id: string): Promise<void>;
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
      ...row.playerUpgrades,
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
      ...row.playerCharacters,
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

  async createSession(data: InsertSession): Promise<Session> {
    const result = await db.insert(schema.sessions).values(data).returning();
    return result[0];
  }

  async getSessionByToken(token: string): Promise<(Session & { player: Player }) | undefined> {
    const results = await db
      .select()
      .from(schema.sessions)
      .leftJoin(schema.players, eq(schema.sessions.playerId, schema.players.id))
      .where(eq(schema.sessions.token, token))
      .limit(1);
    
    if (results.length === 0 || !results[0].players) {
      return undefined;
    }

    const session = results[0].sessions;
    if (new Date(session.expiresAt) < new Date()) {
      await this.deleteSession(token);
      return undefined;
    }

    return {
      ...session,
      player: results[0].players,
    };
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
  }

  async cleanupExpiredSessions(): Promise<void> {
    await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
  }

  async getMediaUploads(characterId?: string, includeHidden = false): Promise<MediaUpload[]> {
    if (characterId) {
      if (includeHidden) {
        return await db.select().from(schema.mediaUploads).where(eq(schema.mediaUploads.characterId, characterId));
      }
      return await db.select().from(schema.mediaUploads).where(
        and(
          eq(schema.mediaUploads.characterId, characterId),
          eq(schema.mediaUploads.isHidden, false)
        )
      );
    }
    if (includeHidden) {
      return await db.select().from(schema.mediaUploads);
    }
    return await db.select().from(schema.mediaUploads).where(eq(schema.mediaUploads.isHidden, false));
  }

  async getMediaUpload(id: string): Promise<MediaUpload | undefined> {
    const result = await db.select().from(schema.mediaUploads).where(eq(schema.mediaUploads.id, id)).limit(1);
    return result[0];
  }

  async createMediaUpload(data: InsertMediaUpload): Promise<MediaUpload> {
    const result = await db.insert(schema.mediaUploads).values(data).returning();
    return result[0];
  }

  async updateMediaUpload(id: string, updates: Partial<MediaUpload>): Promise<MediaUpload | undefined> {
    const result = await db.update(schema.mediaUploads).set(updates).where(eq(schema.mediaUploads.id, id)).returning();
    return result[0];
  }

  async deleteMediaUpload(id: string): Promise<void> {
    await db.delete(schema.mediaUploads).where(eq(schema.mediaUploads.id, id));
  }
}

export const storage = new DatabaseStorage();
