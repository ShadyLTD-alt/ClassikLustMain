import { createClient } from '@supabase/supabase-js';
import { eq, and, lt, sql } from "drizzle-orm";
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
  type PlayerLevelUp,
  type InsertPlayerLevelUp,
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

if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  throw new Error(`Invalid SUPABASE_URL format: "${supabaseUrl}". Must start with http:// or https://`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set for database connection");
}

if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
  throw new Error(`Invalid DATABASE_URL format: must start with postgresql://`);
}

const client = postgres(connectionString, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});
export const db = drizzle(client, { schema });

// 🔧 HELPER: Sanitize data for database insertion/update
function sanitizeForDB(data: any): any {
  const sanitized = { ...data };
  
  // Handle timestamp fields - convert to Date objects
  const timestampFields = [
    'createdAt', 'updatedAt', 'lastLogin', 'lastEnergyUpdate',
    'lastWeeklyReset', 'lastDailyReset', 'boostExpiresAt', 'boostEndTime',
    'lastActiveAt', 'unlockedAt', 'expiresAt'
  ];
  
  timestampFields.forEach(field => {
    if (field in sanitized && sanitized[field] !== null && sanitized[field] !== undefined) {
      // If it's already a Date, keep it
      if (sanitized[field] instanceof Date) {
        // Validate it's not Invalid Date
        if (isNaN(sanitized[field].getTime())) {
          sanitized[field] = new Date();
        }
      }
      // If it's a string, convert to Date
      else if (typeof sanitized[field] === 'string') {
        try {
          sanitized[field] = new Date(sanitized[field]);
          // Validate the conversion
          if (isNaN(sanitized[field].getTime())) {
            sanitized[field] = new Date();
          }
        } catch (e) {
          sanitized[field] = new Date();
        }
      }
      // If it's a number (timestamp), convert to Date
      else if (typeof sanitized[field] === 'number') {
        sanitized[field] = new Date(sanitized[field]);
      }
      // Otherwise, set to current date
      else {
        sanitized[field] = new Date();
      }
    }
  });
  
  // Ensure numeric fields are actual numbers (not strings)
  const numericFields = [
    'points', 'lustPoints', 'lustGems', 'energy', 'energyMax', 'level',
    'experience', 'passiveIncomeRate', 'lastTapValue', 'totalTapsAllTime',
    'totalTapsToday', 'lpEarnedToday', 'upgradesPurchasedToday',
    'consecutiveDays', 'boostMultiplier'
  ];
  
  numericFields.forEach(field => {
    if (field in sanitized && sanitized[field] !== null && sanitized[field] !== undefined) {
      const val = typeof sanitized[field] === 'string' ? parseFloat(sanitized[field]) : sanitized[field];
      sanitized[field] = Math.round(val);
    }
  });
  
  return sanitized;
}

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
  deleteUpgrade(id: string): Promise<boolean>;
  
  getCharacters(includeHidden?: boolean): Promise<Character[]>;
  getCharacter(id: string): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: string, updates: Partial<Character>): Promise<Character | undefined>;
  deleteCharacter(id: string): Promise<boolean>;
  
  getLevels(): Promise<Level[]>;
  getLevel(level: number): Promise<Level | undefined>;
  createLevel(levelData: InsertLevel): Promise<Level>;
  updateLevel(level: number, updates: Partial<Level>): Promise<Level | undefined>;
  deleteLevel(level: number): Promise<boolean>;
  
  getPlayerUpgrades(playerId: string): Promise<(PlayerUpgrade & { upgrade: Upgrade })[]>;
  getPlayerUpgrade(playerId: string, upgradeId: string): Promise<PlayerUpgrade | undefined>;
  setPlayerUpgrade(data: InsertPlayerUpgrade): Promise<PlayerUpgrade>;
  updatePlayerUpgrade(playerId: string, upgradeId: string, level: number): Promise<PlayerUpgrade | undefined>;
  getPlayerUpgradesJSON(playerId: string): Promise<Record<string, number>>;
  setPlayerUpgradesJSON(playerId: string, upgrades: Record<string, number>): Promise<PlayerUpgrade>;
  
  getPlayerLevelUps(playerId: string): Promise<PlayerLevelUp[]>;
  getPlayerLevelUp(playerId: string, level: number): Promise<PlayerLevelUp | undefined>;
  createPlayerLevelUp(data: InsertPlayerLevelUp): Promise<PlayerLevelUp>;
  recordPlayerLevelUp(playerId: string, level: number, source?: string): Promise<PlayerLevelUp>;
  
  getPlayerCharacters(playerId: string): Promise<(PlayerCharacter & { character: Character })[]>;
  unlockCharacter(data: InsertPlayerCharacter): Promise<PlayerCharacter>;
  hasCharacter(playerId: string, characterId: string): Promise<boolean>;
  
  createSession(data: InsertSession): Promise<Session>;
  getSessionByToken(token: string): Promise<(Session & { player: Player }) | undefined>;
  deleteSession(token: string): Promise<void>;
  deletePlayerSessions(playerId: string): Promise<number>;
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
    const sanitized = sanitizeForDB(playerData);
    const result = await db.insert(schema.players).values(sanitized as InsertPlayer).returning();
    return result[0];
  }

  // 🔧 FIXED: Properly handle all date conversions
  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player | undefined> {
    try {
      const sanitized = sanitizeForDB(updates);
      
      // Remove undefined and null values
      Object.keys(sanitized).forEach(key => {
        if (sanitized[key] === undefined) {
          delete sanitized[key];
        }
      });
      
      console.log(`📦 [STORAGE] Updating player ${id}`);
      
      const result = await db.update(schema.players).set(sanitized).where(eq(schema.players.id, id)).returning();
      
      if (result.length > 0) {
        console.log(`✅ [STORAGE] Player ${id} updated successfully`);
        return result[0];
      }
      
      console.log(`⚠️ [STORAGE] Player ${id} not found for update`);
      return undefined;
    } catch (error: any) {
      console.error(`❌ [STORAGE] Failed to update player ${id}:`, error.message);
      throw error;
    }
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
    try {
      const result = await db.insert(schema.upgrades).values(upgrade).returning();
      return result[0];
    } catch (error: any) {
      if (error?.code === '23505') {
        const result = await db.update(schema.upgrades).set(upgrade).where(eq(schema.upgrades.id, upgrade.id)).returning();
        return result[0];
      }
      throw error;
    }
  }

  async updateUpgrade(id: string, updates: Partial<Upgrade>): Promise<Upgrade | undefined> {
    const result = await db.update(schema.upgrades).set(updates).where(eq(schema.upgrades.id, id)).returning();
    return result[0];
  }

  async deleteUpgrade(id: string): Promise<boolean> {
    const result = await db.delete(schema.upgrades).where(eq(schema.upgrades.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
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
    try {
      const result = await db.insert(schema.characters).values(character).returning();
      return result[0];
    } catch (error: any) {
      if (error?.code === '23505') {
        const result = await db.update(schema.characters).set(character).where(eq(schema.characters.id, character.id)).returning();
        return result[0];
      }
      throw error;
    }
  }

  async updateCharacter(id: string, updates: Partial<Character>): Promise<Character | undefined> {
    const result = await db.update(schema.characters).set(updates).where(eq(schema.characters.id, id)).returning();
    return result[0];
  }

  async deleteCharacter(id: string): Promise<boolean> {
    const result = await db.delete(schema.characters).where(eq(schema.characters.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getLevels(): Promise<Level[]> {
    return await db.select().from(schema.levels).orderBy(schema.levels.level);
  }

  async getLevel(level: number): Promise<Level | undefined> {
    const result = await db.select().from(schema.levels).where(eq(schema.levels.level, level)).limit(1);
    return result[0];
  }

  async createLevel(levelData: InsertLevel): Promise<Level> {
    try {
      const result = await db.insert(schema.levels).values(levelData).returning();
      return result[0];
    } catch (error: any) {
      if (error?.code === '23505') {
        const result = await db.update(schema.levels).set(levelData).where(eq(schema.levels.level, levelData.level)).returning();
        return result[0];
      }
      throw error;
    }
  }

  async updateLevel(level: number, updates: Partial<Level>): Promise<Level | undefined> {
    const result = await db.update(schema.levels).set(updates).where(eq(schema.levels.level, level)).returning();
    return result[0];
  }

  async deleteLevel(level: number): Promise<boolean> {
    const result = await db.delete(schema.levels).where(eq(schema.levels.level, level));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getPlayerUpgrades(playerId: string): Promise<(PlayerUpgrade & { upgrade: Upgrade })[]> {
    const playerUpgradeRecord = await db
      .select()
      .from(schema.playerUpgrades)
      .where(eq(schema.playerUpgrades.playerId, playerId))
      .limit(1);
    
    if (playerUpgradeRecord.length === 0) return [];
    
    const upgradesData = playerUpgradeRecord[0].upgrades as Record<string, number>;
    const upgradeIds = Object.keys(upgradesData || {});
    if (upgradeIds.length === 0) return [];
    
    const upgradeDefs = await db
      .select()
      .from(schema.upgrades)
      .where(sql`${schema.upgrades.id} = ANY(${upgradeIds})`);
    
    const results: (PlayerUpgrade & { upgrade: Upgrade })[] = [];
    
    for (const upgradeDef of upgradeDefs) {
      const level = upgradesData[upgradeDef.id] || 0;
      if (level > 0) {
        results.push({
          ...playerUpgradeRecord[0],
          upgrade: upgradeDef
        } as PlayerUpgrade & { upgrade: Upgrade });
      }
    }
    
    return results;
  }

  async getPlayerUpgrade(playerId: string, upgradeId: string): Promise<PlayerUpgrade | undefined> {
    const result = await db
      .select()
      .from(schema.playerUpgrades)
      .where(eq(schema.playerUpgrades.playerId, playerId))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    const upgradesData = result[0].upgrades as Record<string, number>;
    const level = upgradesData[upgradeId] || 0;
    
    if (level === 0) return undefined;
    
    return result[0];
  }

  async setPlayerUpgrade(data: InsertPlayerUpgrade): Promise<PlayerUpgrade> {
    if (data.upgrades) {
      return await this.setPlayerUpgradesJSON(data.playerId, data.upgrades as Record<string, number>);
    }
    throw new Error('setPlayerUpgrade requires upgrades JSON data');
  }

  async updatePlayerUpgrade(playerId: string, upgradeId: string, level: number): Promise<PlayerUpgrade | undefined> {
    try {
      const existing = await db
        .select()
        .from(schema.playerUpgrades)
        .where(eq(schema.playerUpgrades.playerId, playerId))
        .limit(1);
      
      let currentUpgrades: Record<string, number> = {};
      
      if (existing.length > 0) {
        currentUpgrades = (existing[0].upgrades as Record<string, number>) || {};
      }
      
      const newUpgrades = { ...currentUpgrades, [upgradeId]: level };
      const result = await this.setPlayerUpgradesJSON(playerId, newUpgrades);
      
      return result;
    } catch (error) {
      console.error(`❌ [STORAGE] Failed to update player upgrade:`, error);
      return undefined;
    }
  }

  async getPlayerUpgradesJSON(playerId: string): Promise<Record<string, number>> {
    const result = await db
      .select()
      .from(schema.playerUpgrades)
      .where(eq(schema.playerUpgrades.playerId, playerId))
      .limit(1);
    
    if (result.length === 0) {
      return {};
    }
    
    return (result[0].upgrades as Record<string, number>) || {};
  }

  async setPlayerUpgradesJSON(playerId: string, upgrades: Record<string, number>): Promise<PlayerUpgrade> {
    try {
      const updateResult = await db
        .update(schema.playerUpgrades)
        .set({ 
          upgrades: upgrades,
          updatedAt: new Date() 
        })
        .where(eq(schema.playerUpgrades.playerId, playerId))
        .returning();
      
      if (updateResult.length > 0) {
        return updateResult[0];
      }
      
      const insertResult = await db
        .insert(schema.playerUpgrades)
        .values({
          playerId,
          upgrades,
          updatedAt: new Date()
        })
        .returning();
      
      return insertResult[0];
      
    } catch (error) {
      console.error(`❌ [STORAGE] Failed to set player upgrades:`, error);
      throw error;
    }
  }

  async getPlayerLevelUps(playerId: string): Promise<PlayerLevelUp[]> {
    return await db.select().from(schema.playerLevelUps).where(eq(schema.playerLevelUps.playerId, playerId));
  }

  async getPlayerLevelUp(playerId: string, level: number): Promise<PlayerLevelUp | undefined> {
    const result = await db
      .select()
      .from(schema.playerLevelUps)
      .where(and(
        eq(schema.playerLevelUps.playerId, playerId),
        eq(schema.playerLevelUps.level, level)
      ))
      .limit(1);
    return result[0];
  }

  async createPlayerLevelUp(data: InsertPlayerLevelUp): Promise<PlayerLevelUp> {
    const result = await db.insert(schema.playerLevelUps).values(data).returning();
    return result[0];
  }

  async recordPlayerLevelUp(playerId: string, level: number, source = 'progression'): Promise<PlayerLevelUp> {
    try {
      const existing = await this.getPlayerLevelUp(playerId, level);
      if (existing) return existing;
      
      const newLevelUp = await this.createPlayerLevelUp({
        playerId,
        level,
        source,
        unlockedAt: new Date()
      });
      
      return newLevelUp;
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('unique')) {
        const existing = await this.getPlayerLevelUp(playerId, level);
        if (existing) return existing;
      }
      throw error;
    }
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
    const sanitized = sanitizeForDB(data);
    const result = await db.insert(schema.sessions).values(sanitized as InsertSession).returning();
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

  async deletePlayerSessions(playerId: string): Promise<number> {
    try {
      const result = await db
        .delete(schema.sessions)
        .where(eq(schema.sessions.playerId, playerId));
      
      const deletedCount = result.rowCount || 0;
      return deletedCount;
    } catch (error) {
      console.error(`❌ [STORAGE] Failed to delete sessions for player ${playerId}:`, error);
      throw error;
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    const result = await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      console.log(`🧹 [STORAGE] Cleaned up ${deletedCount} expired sessions`);
    }
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