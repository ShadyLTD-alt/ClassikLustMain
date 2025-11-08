import fs from 'fs/promises';
import path from 'path';
import { storage } from '../storage';

class PlayerStateManager {
  private cache = new Map();
  private syncQueue = new Map();
  private syncInProgress = new Set();
  private syncTimer: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL = 5000;
  private readonly DATA_DIR = path.join(process.cwd(), 'main-gamedata', 'player-data');

  constructor() { this.startSyncTimer(); this.ensureDataDirectory(); }
  private async ensureDataDirectory() { try { await fs.mkdir(this.DATA_DIR, { recursive: true }); } catch (e) {} }
  private async ensurePlayerDirectory(id: string) { try { await fs.mkdir(path.join(this.DATA_DIR, id), { recursive: true }); } catch (e) {} }
  private getPlayerFilePath(id: string) { return path.join(this.DATA_DIR, id, 'player-state.json'); }
  private createSafeDefaults() { return { id: '', username: 'Unknown', telegramId: '', points: 0, lustPoints: 0, lustGems: 0, energy: 3300, energyMax: 3300, level: 1, experience: 0, passiveIncomeRate: 0, lastTapValue: 1, selectedCharacterId: null, displayImage: null, upgrades: {}, unlockedCharacters: [], totalTapsAllTime: 0, totalTapsToday: 0, lpEarnedToday: 0, upgradesPurchasedToday: 0, consecutiveDays: 0, isAdmin: false, boostActive: false, boostMultiplier: 1, boostEndTime: null, claimedTasks: [], claimedAchievements: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; }
  private sanitizeForDatabase(data: any) { const s = { ...data }; ['createdAt','updatedAt','boostEndTime','lastActiveAt'].forEach(f => { if (s[f] && typeof s[f] !== 'string') s[f] = new Date(s[f]).toISOString(); }); ['points','lustPoints','lustGems','energy','energyMax','level','experience','passiveIncomeRate','lastTapValue','totalTapsAllTime','totalTapsToday','lpEarnedToday','upgradesPurchasedToday','consecutiveDays','boostMultiplier'].forEach(f => { if (typeof s[f] === 'number') s[f] = Math.round(s[f]); }); return s; }
  async loadPlayer(id: string) { await this.ensurePlayerDirectory(id); const fp = this.getPlayerFilePath(id); try { const d = JSON.parse(await fs.readFile(fp, 'utf8')); const wd = { ...this.createSafeDefaults(), ...d }; this.cache.set(id, wd); return wd; } catch { const def = this.createSafeDefaults(); def.id = id; await fs.writeFile(fp, JSON.stringify(def, null, 2)); this.cache.set(id, def); return def; } }
  async savePlayer(id: string, data: any) { await this.ensurePlayerDirectory(id); const sd = this.sanitizeForDatabase(data); await fs.writeFile(this.getPlayerFilePath(id), JSON.stringify(sd, null, 2)); this.cache.set(id, sd); }
  private startSyncTimer() { if (this.syncTimer) clearInterval(this.syncTimer); this.syncTimer = setInterval(async () => await this.processingSyncQueue(), this.SYNC_INTERVAL); }
  private async processingSyncQueue() { if (this.syncQueue.size === 0) return; const entries = Array.from(this.syncQueue.entries()); this.syncQueue.clear(); for (const [id, data] of entries) { if (this.syncInProgress.has(id)) continue; this.syncInProgress.add(id); try { const sd = this.sanitizeForDatabase(data); const u = await storage.updatePlayer(id, sd); if (!u) await storage.createPlayer(sd); } catch (e) { console.error('[DB SYNC] Error:', e); } finally { this.syncInProgress.delete(id); } } }
  queuePlayerSync(id: string, data: any) { this.syncQueue.set(id, data); }
  async healthCheck() { return { cacheSize: this.cache.size, syncQueueSize: this.syncQueue.size, dataDirectory: this.DATA_DIR, status: 'healthy' }; }
  destroy() { if (this.syncTimer) { clearInterval(this.syncTimer); this.syncTimer = null; } }
}

export const playerStateManager = new PlayerStateManager();
export async function getPlayerState(id: string) { return await playerStateManager.loadPlayer(id); }
export async function updatePlayerState(id: string, updates: any) { const c = await playerStateManager.loadPlayer(id); const u = { ...c, ...updates, updatedAt: new Date().toISOString() }; ['points','lustPoints','lustGems','energy','energyMax','level','experience','passiveIncomeRate','lastTapValue','totalTapsAllTime','totalTapsToday','lpEarnedToday','upgradesPurchasedToday','consecutiveDays','boostMultiplier'].forEach(f => { if (typeof u[f] === 'number') u[f] = Math.round(u[f]); }); await playerStateManager.savePlayer(id, u); playerStateManager.queuePlayerSync(id, u); return u; }
export async function selectCharacterForPlayer(id: string, charId: string) { return await updatePlayerState(id, { selectedCharacterId: charId, displayImage: null }); }
export async function setDisplayImageForPlayer(id: string, img: string) { return await updatePlayerState(id, { displayImage: img }); }
export async function purchaseUpgradeForPlayer(id: string, upId: string, lvl: number, cost: number) { const c = await playerStateManager.loadPlayer(id); const lp = Math.round(c.lustPoints || c.points || 0); if (lp < cost) throw new Error('Insufficient Lust Points'); const nu = { ...c.upgrades, [upId]: lvl }; const nlp = Math.round(lp - cost); return await updatePlayerState(id, { upgrades: nu, lustPoints: nlp, points: nlp, upgradesPurchasedToday: Math.round((c.upgradesPurchasedToday || 0) + 1) }); }