import AsyncLock from 'async-lock';
import lockfile from 'proper-lockfile';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { storage } from '../storage';
import { EventEmitter } from 'events';

interface PlayerState {
  id: string;
  telegramId: string;
  username: string;
  points: number;
  lustPoints: number;
  lustGems: number;
  energy: number;
  energyMax: number;
  energyRegenRate: number;
  level: number;
  selectedCharacterId: string;
  selectedImageId: string | null;
  displayImage: string | null;
  upgrades: Record<string, number>;
  unlockedCharacters: string[];
  unlockedImages: string[];
  passiveIncomeRate: number;
  isAdmin: boolean;
  boostActive: boolean;
  boostMultiplier: number;
  boostExpiresAt: Date | null;
  totalTapsToday: number;
  totalTapsAllTime: number;
  lastDailyReset: Date;
  lastWeeklyReset: Date;
  lastSync: { timestamp: number; hash: string };
  createdAt: Date;
  updatedAt: Date;
}

EventEmitter.defaultMaxListeners = 20;

class PlayerStateManager extends EventEmitter {
  private states = new Map<string, PlayerState>();
  private locks = new Map<string, AsyncLock>();
  private pendingSyncs = new Set<string>();
  private syncTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly playersRoot: string; // main-gamedata/player-data
  private readonly snapshotsDir: string; // uploads/snapshots/players

  constructor() {
    super();
    this.setMaxListeners(50);
    this.playersRoot = path.join(process.cwd(), 'main-gamedata', 'player-data');
    this.snapshotsDir = path.join(process.cwd(), 'uploads', 'snapshots', 'players');
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    await fs.mkdir(this.playersRoot, { recursive: true });
    await fs.mkdir(this.snapshotsDir, { recursive: true });
  }

  private getLock(playerId: string): AsyncLock {
    if (!this.locks.has(playerId)) this.locks.set(playerId, new AsyncLock());
    return this.locks.get(playerId)!;
  }

  // New: folder name and file name helpers
  private getFolderName(telegramId: string, username?: string | null): string {
    const clean = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (username && username.trim() && username !== 'null' && username !== 'undefined') {
      return `player-${clean(username.trim())}`;
    }
    return `player-${clean(telegramId)}`;
  }

  private getJsonPath(telegramId: string, username?: string | null): string {
    const folder = this.getFolderName(telegramId, username);
    return path.join(this.playersRoot, folder, 'player.json');
  }

  private hashState(state: Partial<PlayerState>): string {
    const critical = {
      points: state.points,
      energy: state.energy,
      energyMax: state.energyMax,
      selectedCharacterId: state.selectedCharacterId,
      displayImage: state.displayImage,
      upgrades: state.upgrades,
      unlockedCharacters: state.unlockedCharacters,
      level: state.level
    };
    return crypto.createHash('md5').update(JSON.stringify(critical)).digest('hex');
  }

  async loadPlayer(playerId: string): Promise<PlayerState> {
    const lock = this.getLock(playerId);
    return await lock.acquire(playerId, async () => {
      if (this.states.has(playerId)) return this.states.get(playerId)!;

      let state = await this.loadFromMainJson(playerId);
      if (!state) {
        state = await this.loadFromDatabase(playerId);
        if (state) {
          await this.saveMainJson(playerId, state);
          await this.createBackupSnapshot(playerId, state);
        }
      }
      if (!state) throw new Error(`Player ${playerId} not found`);
      this.states.set(playerId, state);
      return state;
    });
  }

  async updatePlayer(playerId: string, updates: Partial<PlayerState>): Promise<PlayerState> {
    const lock = this.getLock(playerId);
    return await lock.acquire(playerId, async () => {
      const current = await this.loadPlayer(playerId);
      const newState: PlayerState = {
        ...current,
        ...updates,
        updatedAt: new Date(),
        lastSync: { timestamp: Date.now(), hash: this.hashState({ ...current, ...updates }) }
      };
      await this.saveMainJson(playerId, newState);
      this.states.set(playerId, newState);
      this.queueDatabaseSync(playerId, newState);
      if (Math.random() < 0.1) this.createBackupSnapshot(playerId, newState);
      return newState;
    });
  }

  private async saveMainJson(playerId: string, state: PlayerState): Promise<void> {
    const filePath = this.getJsonPath(state.telegramId, state.username);
    const dir = path.dirname(filePath);
    const lockPath = `${filePath}.lock`;
    await fs.mkdir(dir, { recursive: true });
    const release = await lockfile.lock(filePath, { lockfilePath: lockPath, retries: 3, minTimeout: 50, maxTimeout: 500, realpath: false });
    try {
      const tmp = `${filePath}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
      await fs.rename(tmp, filePath);
      console.log(`💾 Player JSON saved: ${filePath}`);
    } finally {
      await release();
    }
  }

  private async loadFromMainJson(playerId: string): Promise<PlayerState | null> {
    try {
      const player = await storage.getPlayer(playerId);
      if (!player) return null;
      const filePath = this.getJsonPath(player.telegramId, player.username);
      const data = await fs.readFile(filePath, 'utf8');
      const state = JSON.parse(data);
      return {
        ...state,
        boostExpiresAt: state.boostExpiresAt ? new Date(state.boostExpiresAt) : null,
        lastDailyReset: new Date(state.lastDailyReset || Date.now()),
        lastWeeklyReset: new Date(state.lastWeeklyReset || Date.now()),
        createdAt: new Date(state.createdAt || Date.now()),
        updatedAt: new Date(state.updatedAt || Date.now())
      };
    } catch (err: any) {
      if (err.code === 'ENOENT') return null;
      console.error('Failed to load player JSON:', err);
      return null;
    }
  }

  private async loadFromDatabase(playerId: string): Promise<PlayerState | null> {
    try {
      const player = await storage.getPlayer(playerId);
      if (!player) return null;
      const upgrades = await storage.getPlayerUpgrades(playerId);
      const upgradesMap = upgrades.reduce((acc, u) => { acc[u.upgradeId] = u.level; return acc; }, {} as Record<string, number>);
      const state: PlayerState = {
        id: player.id,
        telegramId: player.telegramId,
        username: player.username,
        points: typeof player.points === 'string' ? parseFloat(player.points) : (player.points || 0),
        lustPoints: typeof player.lustPoints === 'string' ? parseFloat(player.lustPoints) : (player.lustPoints || player.points || 0),
        lustGems: player.lustGems || 0,
        energy: player.energy || 1000,
        energyMax: player.energyMax || 1000,
        energyRegenRate: player.energyRegenRate || 1,
        level: player.level || 1,
        selectedCharacterId: player.selectedCharacterId || 'shadow',
        selectedImageId: player.selectedImageId || null,
        displayImage: player.displayImage || null,
        upgrades: upgradesMap,
        unlockedCharacters: Array.isArray(player.unlockedCharacters) ? player.unlockedCharacters : ['shadow'],
        unlockedImages: Array.isArray(player.unlockedImages) ? player.unlockedImages : [],
        passiveIncomeRate: player.passiveIncomeRate || 0,
        isAdmin: player.isAdmin || false,
        boostActive: player.boostActive || false,
        boostMultiplier: player.boostMultiplier || 1.0,
        boostExpiresAt: player.boostExpiresAt ? new Date(player.boostExpiresAt) : null,
        totalTapsToday: player.totalTapsToday || 0,
        totalTapsAllTime: player.totalTapsAllTime || 0,
        lastDailyReset: player.lastDailyReset ? new Date(player.lastDailyReset) : new Date(),
        lastWeeklyReset: player.lastWeeklyReset ? new Date(player.lastWeeklyReset) : new Date(),
        lastSync: { timestamp: Date.now(), hash: '' },
        createdAt: player.createdAt ? new Date(player.createdAt) : new Date(),
        updatedAt: new Date()
      };
      state.lastSync.hash = this.hashState(state);
      return state;
    } catch (e) {
      console.error('Failed to load from DB:', e);
      return null;
    }
  }

  private queueDatabaseSync(playerId: string, state: PlayerState) {
    const existing = this.syncTimeouts.get(playerId);
    if (existing) { clearTimeout(existing); this.syncTimeouts.delete(playerId); }
    this.pendingSyncs.add(playerId);
    const t = setTimeout(async () => {
      try { await this.syncToDatabase(playerId, state); } catch (e) { this.emit('syncError', { playerId, error: e }); }
      finally { this.pendingSyncs.delete(playerId); this.syncTimeouts.delete(playerId); }
    }, 3000);
    this.syncTimeouts.set(playerId, t);
  }

  private async syncToDatabase(playerId: string, state: PlayerState) {
    const cached = this.states.get(playerId);
    if (!cached) return;
    const currentHash = this.hashState(cached);
    if (currentHash === state.lastSync.hash) return;
    await storage.updatePlayer(playerId, {
      points: state.points,
      lustPoints: state.lustPoints,
      lustGems: state.lustGems,
      energy: state.energy,
      energyMax: state.energyMax,
      energyRegenRate: state.energyRegenRate,
      level: state.level,
      selectedCharacterId: state.selectedCharacterId,
      selectedImageId: state.selectedImageId,
      displayImage: state.displayImage,
      unlockedCharacters: state.unlockedCharacters,
      unlockedImages: state.unlockedImages,
      passiveIncomeRate: state.passiveIncomeRate,
      isAdmin: state.isAdmin,
      boostActive: state.boostActive,
      boostMultiplier: state.boostMultiplier,
      boostExpiresAt: state.boostExpiresAt,
      totalTapsToday: state.totalTapsToday,
      totalTapsAllTime: state.totalTapsAllTime,
      lastDailyReset: state.lastDailyReset,
      lastWeeklyReset: state.lastWeeklyReset
    });
    for (const [id, lvl] of Object.entries(state.upgrades)) {
      await storage.setPlayerUpgrade(playerId, id, lvl);
    }
    cached.lastSync = { timestamp: Date.now(), hash: currentHash };
  }

  private async createBackupSnapshot(playerId: string, state: PlayerState) {
    const dir = path.join(this.snapshotsDir, playerId);
    await fs.mkdir(dir, { recursive: true });
    const backup = path.join(dir, `backup-${Date.now()}.json`);
    await fs.writeFile(backup, JSON.stringify(state, null, 2), 'utf8');
    try {
      const files = await fs.readdir(dir);
      const backups = files.filter(f => f.startsWith('backup-') && f.endsWith('.json')).sort();
      while (backups.length > 5) {
        const f = backups.shift();
        if (f) await fs.rm(path.join(dir, f));
      }
    } catch {}
  }

  getCachedState(playerId: string): PlayerState | null { return this.states.get(playerId) || null; }

  clearCache(playerId: string) {
    const t = this.syncTimeouts.get(playerId); if (t) clearTimeout(t);
    this.syncTimeouts.delete(playerId);
    this.states.delete(playerId);
    this.locks.delete(playerId);
    this.pendingSyncs.delete(playerId);
  }

  async forceDatabaseSync(playerId: string) {
    const state = this.states.get(playerId);
    if (!state) throw new Error('Player not in cache');
    await this.syncToDatabase(playerId, state);
  }
}

export const playerStateManager = new PlayerStateManager();
export default playerStateManager;
