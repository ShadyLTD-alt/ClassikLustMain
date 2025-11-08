import fs from 'fs/promises';
import path from 'path';
import { storage } from '../storage';

// Patch: always resolves player key by telegramId, username, or id
function resolvePlayerKey(player: any) {
  return player.telegramId || player.username || player.id;
}

class PlayerStateManager {
  private cache = new Map<string, any>();
  private syncQueue = new Map<string, any>();
  private syncInProgress = new Set<string>();
  private syncTimer: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL = 5000;
  private readonly DATA_DIR = path.join(process.cwd(), 'main-gamedata', 'player-data');

  constructor() {
    this.startSyncTimer();
    this.ensureDataDirectory();
  }
  private async ensureDataDirectory() {
    try { await fs.mkdir(this.DATA_DIR, { recursive: true }); } catch (e) {}
  }
  private async ensurePlayerDirectory(playerKey: string) {
    try { await fs.mkdir(path.join(this.DATA_DIR, playerKey), { recursive: true }); } catch (e) {}
  }
  private getPlayerFilePath(playerKey: string) {
    return path.join(this.DATA_DIR, playerKey, 'player-state.json');
  }
  private createSafeDefaults() {
    return { id: '', username: 'Unknown', telegramId: '', points: 0, lustPoints: 0, lustGems: 0, energy: 3300, energyMax: 3300, level: 1, experience: 0, passiveIncomeRate: 0, lastTapValue: 1, selectedCharacterId: null, displayImage: null, upgrades: {}, unlockedCharacters: [], totalTapsAllTime: 0, totalTapsToday: 0, lpEarnedToday: 0, upgradesPurchasedToday: 0, consecutiveDays: 0, isAdmin: false, boostActive: false, boostMultiplier: 1, boostEndTime: null, claimedTasks: [], claimedAchievements: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  private sanitizeForDatabase(data: any) {
    const sanitized = { ...data };
    const dateFields = ['createdAt', 'updatedAt', 'boostEndTime', 'lastActiveAt'];
    dateFields.forEach(field => {
      if (sanitized[field]) {
        if (typeof sanitized[field] === 'string') return;
        if (typeof sanitized[field] === 'number') {
          sanitized[field] = new Date(sanitized[field]).toISOString();
        } else if (sanitized[field] instanceof Date) {
          sanitized[field] = sanitized[field].toISOString();
        } else {
          sanitized[field] = new Date().toISOString();
        }
      } else {
        sanitized[field] = new Date().toISOString();
      }
    });
    ['points', 'lustPoints', 'lustGems', 'energy', 'energyMax', 'level', 'experience', 'passiveIncomeRate', 'lastTapValue', 'totalTapsAllTime', 'totalTapsToday', 'lpEarnedToday', 'upgradesPurchasedToday', 'consecutiveDays', 'boostMultiplier'].forEach(f => { if (typeof sanitized[f] === 'number') sanitized[f] = Math.round(sanitized[f]); });
    return sanitized;
  }
  async loadPlayer(player: any) {
    const playerKey = resolvePlayerKey(player);
    await this.ensurePlayerDirectory(playerKey);
    const filePath = this.getPlayerFilePath(playerKey);
    try {
      const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
      const withDefaults = { ...this.createSafeDefaults(), ...data };
      this.cache.set(playerKey, withDefaults);
      return withDefaults;
    } catch {
      const defaults = this.createSafeDefaults();
      defaults.id = player.id;
      defaults.username = player.username;
      defaults.telegramId = player.telegramId || '';
      await fs.writeFile(filePath, JSON.stringify(defaults, null, 2));
      this.cache.set(playerKey, defaults);
      return defaults;
    }
  }
  async savePlayer(player: any, data: any) {
    const playerKey = resolvePlayerKey(player);
    await this.ensurePlayerDirectory(playerKey);
    const sanitizedData = this.sanitizeForDatabase(data);
    await fs.writeFile(this.getPlayerFilePath(playerKey), JSON.stringify(sanitizedData, null, 2));
    this.cache.set(playerKey, sanitizedData);
  }
  private startSyncTimer() { if (this.syncTimer) clearInterval(this.syncTimer); this.syncTimer = setInterval(async () => await this.processingSyncQueue(), this.SYNC_INTERVAL); }
  private async processingSyncQueue() { if (this.syncQueue.size === 0) return; const entries = Array.from(this.syncQueue.entries()); this.syncQueue.clear(); for (const [playerKey, playerData] of entries) { if (this.syncInProgress.has(playerKey)) continue; this.syncInProgress.add(playerKey); try { const sd = this.sanitizeForDatabase(playerData); const updated = await storage.updatePlayer(playerKey, sd); if (!updated) await storage.createPlayer(sd); } catch (e) { console.error('[DB SYNC] Error:', e); } finally { this.syncInProgress.delete(playerKey); } } }
  queuePlayerSync(player: any, playerData: any) { this.syncQueue.set(resolvePlayerKey(player), playerData); }
  async healthCheck() { return { cacheSize: this.cache.size, syncQueueSize: this.syncQueue.size, dataDirectory: this.DATA_DIR, status: 'healthy' }; }
  destroy() { if (this.syncTimer) { clearInterval(this.syncTimer); this.syncTimer = null; } }
}

export const playerStateManager = new PlayerStateManager();
export async function getPlayerState(player: any) { return await playerStateManager.loadPlayer(player); }
export async function updatePlayerState(player: any, updates: any) { const current = await playerStateManager.loadPlayer(player); const updated = { ...current, ...updates, updatedAt: new Date().toISOString() }; ['points', 'lustPoints', 'lustGems', 'energy', 'energyMax', 'level', 'experience', 'passiveIncomeRate', 'lastTapValue', 'totalTapsAllTime', 'totalTapsToday', 'lpEarnedToday', 'upgradesPurchasedToday', 'consecutiveDays', 'boostMultiplier'].forEach(field => { if (typeof updated[field] === 'number') updated[field] = Math.round(updated[field]); }); await playerStateManager.savePlayer(player, updated); playerStateManager.queuePlayerSync(player, updated); return updated; }
export async function selectCharacterForPlayer(player: any, characterId: string) { return await updatePlayerState(player, { selectedCharacterId: characterId, displayImage: null }); }
export async function setDisplayImageForPlayer(player: any, imageUrl: string) { return await updatePlayerState(player, { displayImage: imageUrl }); }
export async function purchaseUpgradeForPlayer(player: any, upgradeId: string, level: number, cost: number) { const current = await playerStateManager.loadPlayer(player); const currentLP = Math.round(current.lustPoints || current.points || 0); if (currentLP < cost) throw new Error('Insufficient Lust Points'); const newUpgrades = { ...current.upgrades, [upgradeId]: level }; const newLP = Math.round(currentLP - cost); return await updatePlayerState(player, { upgrades: newUpgrades, lustPoints: newLP, points: newLP, upgradesPurchasedToday: Math.round((current.upgradesPurchasedToday || 0) + 1) }); }
