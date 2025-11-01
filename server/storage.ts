import { type User, type InsertUser, type Player, type InsertPlayer } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayerByTelegramId(telegramId: string): Promise<Player | undefined>;
  createPlayer(player: Partial<InsertPlayer>): Promise<Player>;
  updatePlayer(id: string, updates: Partial<Player>): Promise<Player | undefined>;
  getAllPlayers(): Promise<Player[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private players: Map<string, Player>;

  constructor() {
    this.users = new Map();
    this.players = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getPlayer(id: string): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async getPlayerByTelegramId(telegramId: string): Promise<Player | undefined> {
    return Array.from(this.players.values()).find(
      (player) => player.telegramId === telegramId,
    );
  }

  async createPlayer(playerData: Partial<InsertPlayer>): Promise<Player> {
    const id = randomUUID();
    const now = new Date();
    const player: Player = {
      id,
      telegramId: playerData.telegramId || null,
      username: playerData.username || 'Guest',
      points: playerData.points || 0,
      energy: playerData.energy || 1000,
      maxEnergy: playerData.maxEnergy || 1000,
      level: playerData.level || 1,
      passiveIncomeRate: playerData.passiveIncomeRate || 0,
      isAdmin: playerData.isAdmin || false,
      createdAt: now,
      lastLogin: now,
    };
    this.players.set(id, player);
    return player;
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;
    
    const updatedPlayer = { ...player, ...updates };
    this.players.set(id, updatedPlayer);
    return updatedPlayer;
  }

  async getAllPlayers(): Promise<Player[]> {
    return Array.from(this.players.values());
  }
}

export const storage = new MemStorage();
