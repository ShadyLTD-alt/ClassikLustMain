import fs from 'fs/promises';
import path from 'path';
import { storage } from '../storage';
import { getUpgradesFromMemory } from './unifiedDataLoader';

function resolvePlayerKey(player: any): string {
  if (player.telegramId && player.username) {
    const key = `${player.telegramId}_${player.username}`;
    console.log(`[KeyGen] telegramId: ${player.telegramId}, username: ${player.username}, key: ${key}`);
    return key;
  }
  if (player.id && player.username) {
    const key = `${player.id}_${player.username}`;
    console.log(`[KeyGen] id: ${player.id}, username: ${player.username}, key: ${key}`);
    return key;
  }
  const fallback = player.id || player.username || 'unknown';
  console.log(`[KeyGen] Fallback key: ${fallback}`);
  return fallback;
}

function calculateDerivedStats(playerUpgrades: Record<string, number>) {
  const upgrades = getUpgradesFromMemory();
  
  let energyMax = 1000;
  let energyRegenRate = 1;
  let passiveIncomeRate = 0;
  
  const energyMaxUpgrades = upgrades.filter(u => u.type === 'energyMax');
  energyMaxUpgrades.forEach(u => {
    const level = playerUpgrades[u.id] || 0;
    if (level > 0) {
      energyMax += (u.valueIncrement * level);
    }
  });
  
  const regenUpgrades = upgrades.filter(u => u.type === 'energyRegen');
  regenUpgrades.forEach(u => {
    const level = playerUpgrades[u.id] || 0;
    if (level > 0) {
      energyRegenRate += (u.valueIncrement * level);
    }
  });
  
  const incomeUpgrades = upgrades.filter(u => u.type === 'perHour');
  incomeUpgrades.forEach(u => {
    const level = playerUpgrades[u.id] || 0;
    if (level > 0) {
      passiveIncomeRate += (u.valueIncrement * level);
    }
  });
  
  console.log(`📊 [CALC STATS] energyMax: ${energyMax}, energyRegenRate: ${energyRegenRate}, passiveIncome: ${passiveIncomeRate}`);
  
  return { energyMax, energyRegenRate, passiveIncomeRate };
}

class PlayerStateManager {
  private cache = new Map<string, any>();
  private syncQueue = new Map<string, any>();
  private syncInProgress = new Set<string>();
  private syncTimer: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL = 5000;
  private readonly DATA_DIR = path.join(process.cwd(), 'main-gamedata', 'player-data');
  public playerFolders: string[] = [];
  public playerJsonFiles: string[] = [];
  public errorReports: string[] = [];
  
  constructor() {
    this.startSyncTimer();
    this.ensureDataDirectory().then(() => this.scanAllPlayerFolders());
  }
  
  private async ensureDataDirectory() {
    try { 
      await fs.mkdir(this.DATA_DIR, { recursive: true }); 
    } catch (e) {}
  }
  
  private async ensurePlayerDirectory(playerKey: string) {
    try { 
      await fs.mkdir(path.join(this.DATA_DIR, playerKey), { recursive: true }); 
    } catch (e) {}
  }
  
  private async findPlayerFolder(targetKey: string): Promise<string | null> {
    try {
      const folders = await fs.readdir(this.DATA_DIR);
      const targetLower = targetKey.toLowerCase();
      
      for (const folder of folders) {
        if (folder.toLowerCase() === targetLower) {
          return folder;
        }
      }
      
      return null;
    } catch (e) {
      return null;
    }
  }
  
  private getPlayerFilePath(playerKey: string) {
    return path.join(this.DATA_DIR, playerKey, 'player-state.json');
  }
  
  private createSafeDefaults() {
    return { 
      id: '', 
      username: 'Unknown', 
      telegramId: '', 
      points: 0, 
      lustPoints: 0, 
      lustGems: 0, 
      energy: 1000,
      energyMax: 1000,
      level: 1, 
      passiveIncomeRate: 0, 
      energyRegenRate: 1,
      lastTapValue: 1, 
      selectedCharacterId: 'aria',
      displayImage: null, 
      upgrades: {}, 
      unlockedCharacters: ['aria'],
      totalTapsAllTime: 0, 
      totalTapsToday: 0, 
      lpEarnedToday: 0, 
      upgradesPurchasedToday: 0, 
      consecutiveDays: 0, 
      isAdmin: false,
      boostActive: false, 
      boostMultiplier: 1, 
      boostEndTime: null, 
      claimedTasks: [], 
      claimedAchievements: [], 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString() 
    };
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
    ['points', 'lustPoints', 'lustGems', 'energy', 'energyMax', 'level', 'passiveIncomeRate', 'energyRegenRate', 'lastTapValue', 'totalTapsAllTime', 'totalTapsToday', 'lpEarnedToday', 'upgradesPurchasedToday', 'consecutiveDays', 'boostMultiplier'].forEach(f => { 
      if (typeof sanitized[f] === 'number') sanitized[f] = Math.round(sanitized[f]); 
    });
    return sanitized;
  }
  
  async scanAllPlayerFolders() {
    this.errorReports = [];
    try {
      this.playerFolders = await fs.readdir(this.DATA_DIR);
      this.playerJsonFiles = [];
      for (const folder of this.playerFolders) {
        const folderPath = path.join(this.DATA_DIR, folder);
        const files = await fs.readdir(folderPath).catch(() => []);
        for (const file of files) {
          if (file.endsWith('player-state.json')) {
            const jsonPath = path.join(folderPath, file);
            this.playerJsonFiles.push(jsonPath);
            try {
              const data = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
              const templ = this.createSafeDefaults();
              let repaired = false;
              for (const key of Object.keys(templ)) {
                if (!(key in data)) { 
                  data[key] = templ[key]; 
                  repaired = true; 
                }
              }
              if (repaired) {
                await fs.writeFile(jsonPath, JSON.stringify(data, null, 2));
                this.errorReports.push(`Luna: Repaired ${jsonPath} (added missing keys)`);
                console.warn(`🌙 Luna: Repaired ${jsonPath} (added missing keys)`);
              }
            } catch (e: any) {
              await fs.writeFile(jsonPath, JSON.stringify(this.createSafeDefaults(), null, 2));
              this.errorReports.push(`Luna: Fixed corrupt ${jsonPath} (${e.message})`);
              console.error(`🌙 Luna: Fixed corrupt ${jsonPath} (${e.message})`);
            }
          }
        }
      }
    } catch (e: any) {
      this.errorReports.push(`Luna: Error scanning player data folders: ${e.message}`);
      console.error('🌙 Luna: Error scanning player data folders:', e.message);
    }
    console.info(`🌙 Luna diagnostics: Player folders=${this.playerFolders.length}, playerJsonFiles=${this.playerJsonFiles.length}, problems=${this.errorReports.length}`);
    if (this.errorReports.length) {
      console.info('🌙 Luna: Detected and fixed these issues:', this.errorReports);
    }
  }
  
  async loadPlayer(player: any) {
    const playerKey = resolvePlayerKey(player);
    const existingFolder = await this.findPlayerFolder(playerKey);
    const actualPlayerKey = existingFolder || playerKey;
    
    console.log(`🔍 [PLAYER LOAD] Looking for: ${playerKey}, Found: ${actualPlayerKey || 'NEW'}`);
    
    await this.ensurePlayerDirectory(actualPlayerKey);
    const filePath = this.getPlayerFilePath(actualPlayerKey);
    let data: any;
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      data = JSON.parse(fileContent);
      console.log(`✅ [PLAYER LOAD] Loaded existing save for ${actualPlayerKey} - isAdmin: ${data.isAdmin}`);
      
      const derived = calculateDerivedStats(data.upgrades || {});
      data.energyMax = derived.energyMax;
      data.energyRegenRate = derived.energyRegenRate;
      data.passiveIncomeRate = derived.passiveIncomeRate;
      
      if (data.energy > data.energyMax) {
        data.energy = data.energyMax;
      }
      
      console.log(`📊 [PLAYER LOAD] Recalculated stats - energyMax: ${data.energyMax}, energyRegen: ${data.energyRegenRate}, passiveIncome: ${data.passiveIncomeRate}`);
    } catch (e: any) {
      this.errorReports.push(`Luna: rebuilt ${filePath} for new or broken profile (${e.message})`);
      data = this.createSafeDefaults();
      data.id = player.id;
      data.username = player.username;
      data.telegramId = player.telegramId || '';
      data.isAdmin = player.isAdmin || false;
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      console.warn(`🌙 Luna: created new save file for ${actualPlayerKey}: ${e.message}`);
    }
    const withDefaults = { ...this.createSafeDefaults(), ...data };
    this.cache.set(actualPlayerKey, withDefaults);
    return withDefaults;
  }
  
  async savePlayer(player: any, data: any) {
    const playerKey = resolvePlayerKey(player);
    const existingFolder = await this.findPlayerFolder(playerKey);
    const actualPlayerKey = existingFolder || playerKey;
    
    console.log(`💾 [PLAYER SAVE] Saving to key: ${actualPlayerKey}`);
    
    await this.ensurePlayerDirectory(actualPlayerKey);
    
    const derived = calculateDerivedStats(data.upgrades || {});
    data.energyMax = derived.energyMax;
    data.energyRegenRate = derived.energyRegenRate;
    data.passiveIncomeRate = derived.passiveIncomeRate;
    
    if (data.energy > data.energyMax) {
      data.energy = data.energyMax;
    }
    
    const sanitizedData = this.sanitizeForDatabase(data);
    const filePath = this.getPlayerFilePath(actualPlayerKey);
    await fs.writeFile(filePath, JSON.stringify(sanitizedData, null, 2));
    console.log(`✅ [PLAYER SAVE] Written to: ${filePath}`);
    console.log(`🖼️ [PLAYER SAVE] displayImage value: ${sanitizedData.displayImage}`);
    this.cache.set(actualPlayerKey, sanitizedData);
  }
  
  private startSyncTimer() { 
    if (this.syncTimer) clearInterval(this.syncTimer); 
    this.syncTimer = setInterval(async () => await this.processingSyncQueue(), this.SYNC_INTERVAL); 
  }
  
  private async processingSyncQueue() { 
    if (this.syncQueue.size === 0) return; 
    const entries = Array.from(this.syncQueue.entries()); 
    this.syncQueue.clear(); 
    
    for (const [playerKey, playerData] of entries) { 
      if (this.syncInProgress.has(playerKey)) continue; 
      this.syncInProgress.add(playerKey); 
      
      try { 
        const sd = this.sanitizeForDatabase(playerData);
        const dbData = {
          ...sd,
          createdAt: sd.createdAt instanceof Date ? sd.createdAt : new Date(sd.createdAt),
          updatedAt: sd.updatedAt instanceof Date ? sd.updatedAt : new Date(sd.updatedAt)
        };
        
        const updated = await storage.updatePlayer(playerData.id, dbData); 
        if (!updated) {
          await storage.createPlayer(dbData); 
        }
      } catch (e: any) { 
        console.error('[DB SYNC] Error:', e.message); 
      } finally { 
        this.syncInProgress.delete(playerKey); 
      } 
    } 
  }
  
  queuePlayerSync(player: any, playerData: any) { 
    const playerKey = resolvePlayerKey(player);
    this.syncQueue.set(playerKey, playerData); 
  }
  
  async healthCheck() {
    await this.scanAllPlayerFolders();
    return {
      cacheSize: this.cache.size,
      syncQueueSize: this.syncQueue.size,
      dataDirectory: this.DATA_DIR,
      playerFolders: this.playerFolders.length,
      playerJsonFiles: this.playerJsonFiles.length,
      errorReports: this.errorReports,
      status: 'healthy',
    };
  }
  
  async cleanup() {
    console.log('🧹 [PLAYER STATE] Starting cleanup...');
    
    if (this.syncQueue.size > 0) {
      console.log(`📦 [PLAYER STATE] Processing ${this.syncQueue.size} pending syncs...`);
      await this.processingSyncQueue();
    }
    
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('⏸️ [PLAYER STATE] Stopped sync timer');
    }
    
    console.log('✅ [PLAYER STATE] Cleanup complete');
  }
  
  destroy() { 
    if (this.syncTimer) { 
      clearInterval(this.syncTimer); 
      this.syncTimer = null; 
    } 
  }
}

export const playerStateManager = new PlayerStateManager();

export async function getPlayerState(player: any) { 
  return await playerStateManager.loadPlayer(player); 
}

export async function updatePlayerState(player: any, updates: any) { 
  const current = await playerStateManager.loadPlayer(player); 
  const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
  // PATCH SAFETY: preserve current.displayImage if not provided in update/patch
  if (typeof updates.displayImage === 'undefined') {
    updated.displayImage = current.displayImage;
  }
  ['points', 'lustPoints', 'lustGems', 'energy', 'energyMax', 'level', 'passiveIncomeRate', 'energyRegenRate', 'lastTapValue', 'totalTapsAllTime', 'totalTapsToday', 'lpEarnedToday', 'upgradesPurchasedToday', 'consecutiveDays', 'boostMultiplier'].forEach(field => { 
    if (typeof updated[field] === 'number') updated[field] = Math.round(updated[field]); 
  }); 
  await playerStateManager.savePlayer(player, updated); 
  playerStateManager.queuePlayerSync(player, updated); 
  return updated; 
}

export async function selectCharacterForPlayer(player: any, characterId: string) { 
  return await updatePlayerState(player, { selectedCharacterId: characterId, displayImage: null }); 
}

export async function setDisplayImageForPlayer(player: any, imageUrl: string): Promise<any> {
  console.log(`🖼️ [SET DISPLAY] Player object:`, { id: player.id, username: player.username, telegramId: player.telegramId });
  console.log(`🖼️ [SET DISPLAY] Setting display image to: ${imageUrl}`);

  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new Error('Valid image URL is required');
  }

  const normalizedUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  console.log(`🖼️ [SET DISPLAY] Normalized URL: ${normalizedUrl}`);

  const updated = await updatePlayerState(player, { displayImage: normalizedUrl });
  
  console.log(`✅ [SET DISPLAY] Successfully updated displayImage via updatePlayerState`);
  
  return updated;
}

export async function purchaseUpgradeForPlayer(player: any, upgradeId: string, level: number, cost: number) { 
  const current = await playerStateManager.loadPlayer(player); 
  const currentLP = Math.round(current.lustPoints || current.points || 0); 
  if (currentLP < cost) throw new Error('Insufficient Lust Points'); 
  const newUpgrades = { ...current.upgrades, [upgradeId]: level }; 
  const newLP = Math.round(currentLP - cost); 
  
  const derived = calculateDerivedStats(newUpgrades);
  
  return await updatePlayerState(player, { 
    upgrades: newUpgrades, 
    lustPoints: newLP, 
    points: newLP, 
    upgradesPurchasedToday: Math.round((current.upgradesPurchasedToday || 0) + 1),
    energyMax: derived.energyMax,
    energyRegenRate: derived.energyRegenRate,
    passiveIncomeRate: derived.passiveIncomeRate
  }); 
}
