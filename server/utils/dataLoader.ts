import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "../storage";
import type { InsertUpgrade, InsertCharacter, Player } from "@shared/schema";
import type { UpgradeConfig, CharacterConfig, LevelConfig } from "@shared/gameConfig";
import { syncLevels, getLevelsFromMemory, getLevelFromMemory } from "./levelsProgressive";
import { writeSnapshot, throttledInfo } from "./lunaSnapshots";
import masterDataService from "./MasterDataService";
import fileLock from "./fileLock";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let upgradesCache: Map<string, UpgradeConfig> = new Map();
let charactersCache: Map<string, CharacterConfig> = new Map();
let tasksCache: Map<string, any> = new Map();
let achievementsCache: Map<string, any> = new Map();

async function loadJSONFile<T>(filePath: string): Promise<T | null> {
  try { const content = await fs.readFile(filePath, "utf-8"); return JSON.parse(content); }
  catch { return null; }
}

export async function syncUpgrades() {
  const upgradesPath = path.join(__dirname, "../../main-gamedata/master-data/upgrades-master.json");
  const upgradesData = await loadJSONFile<{ upgrades: UpgradeConfig[] }>(upgradesPath);
  if (!upgradesData?.upgrades) return;
  upgradesCache.clear();
  for (const upgrade of upgradesData.upgrades) {
    upgradesCache.set(upgrade.id, upgrade);
    const toInsert: InsertUpgrade = { id: upgrade.id, name: upgrade.name, description: upgrade.description, type: upgrade.type, icon: upgrade.icon, maxLevel: upgrade.maxLevel, baseCost: upgrade.baseCost, costMultiplier: upgrade.costMultiplier, baseValue: upgrade.baseValue, valueIncrement: upgrade.valueIncrement, isHidden: upgrade.isHidden || false };
    try { await storage.createUpgrade(toInsert); } catch { await storage.updateUpgrade(upgrade.id, toInsert); }
  }
}

export async function syncCharacters() {
  const charactersPath = path.join(__dirname, "../../main-gamedata/master-data/character-master.json");
  const charactersData = await loadJSONFile<{ characters: CharacterConfig[] }>(charactersPath);
  if (!charactersData?.characters) return;
  charactersCache.clear();
  for (const character of charactersData.characters) {
    charactersCache.set(character.id, character);
    const toInsert: InsertCharacter = { id: character.id, name: character.name, unlockLevel: character.unlockLevel, description: character.description, rarity: character.rarity, defaultImage: character.defaultImage || '', avatarImage: character.avatarImage || '', displayImage: character.displayImage || '', isHidden: character.isHidden || false };
    try { await storage.createCharacter(toInsert); } catch { await storage.updateCharacter(character.id, toInsert); }
  }
}

export async function syncTasks() {
  try {
    console.log('📋 [SYNC] Loading tasks from JSON files...');
    const tasks = await masterDataService.getTasks();
    tasksCache.clear();
    for (const task of tasks) {
      tasksCache.set(task.id, task);
    }
    console.log(`✅ [SYNC] Loaded ${tasksCache.size} tasks into memory`);
  } catch (err) {
    console.error('❌ [SYNC] Failed to load tasks:', err);
  }
}

export async function syncAchievements() {
  try {
    console.log('🏆 [SYNC] Loading achievements from JSON files...');
    const achievements = await masterDataService.getAchievements();
    achievementsCache.clear();
    for (const achievement of achievements) {
      achievementsCache.set(achievement.id, achievement);
    }
    console.log(`✅ [SYNC] Loaded ${achievementsCache.size} achievements into memory`);
  } catch (err) {
    console.error('❌ [SYNC] Failed to load achievements:', err);
  }
}

export async function syncAllGameData() { 
  await syncUpgrades(); 
  await syncCharacters(); 
  await syncLevels(); 
  await syncTasks();
  await syncAchievements();
}

export function getUpgradesFromMemory(): UpgradeConfig[] { return Array.from(upgradesCache.values()); }
export function getUpgradeFromMemory(id: string): UpgradeConfig | undefined { return upgradesCache.get(id); }
export function getCharactersFromMemory(): CharacterConfig[] { return Array.from(charactersCache.values()); }
export function getCharacterFromMemory(id: string): CharacterConfig | undefined { return charactersCache.get(id); }
export function getTasksFromMemory(): any[] { return Array.from(tasksCache.values()); }
export function getTaskFromMemory(id: string): any | undefined { return tasksCache.get(id); }
export function getAchievementsFromMemory(): any[] { return Array.from(achievementsCache.values()); }
export function getAchievementFromMemory(id: string): any | undefined { return achievementsCache.get(id); }
export { getLevelsFromMemory, getLevelFromMemory };

// 🔒 PROTECTED: File-locked JSON save operations
export async function saveUpgradeToJSON(upgrade: UpgradeConfig): Promise<void> {
  const upgradesPath = path.join(__dirname, "../../main-gamedata/master-data/upgrades-master.json");
  
  await fileLock.withLock(upgradesPath, async () => {
    const current = await loadJSONFile<{ upgrades: UpgradeConfig[] }>(upgradesPath);
    if (!current) return;
    const i = current.upgrades.findIndex(u => u.id === upgrade.id);
    if (i>=0) current.upgrades[i] = upgrade; else current.upgrades.push(upgrade);
    await fs.writeFile(upgradesPath, JSON.stringify(current, null, 2));
    upgradesCache.set(upgrade.id, upgrade);
    console.log(`✅ [SAVE] Upgrade ${upgrade.id} saved to JSON with file lock`);
  });
}

export async function saveCharacterToJSON(character: CharacterConfig): Promise<void> {
  const charactersPath = path.join(__dirname, "../../main-gamedata/master-data/character-master.json");
  
  await fileLock.withLock(charactersPath, async () => {
    const current = await loadJSONFile<{ characters: CharacterConfig[] }>(charactersPath);
    if (!current) return;
    const i = current.characters.findIndex(c => c.id === character.id);
    if (i>=0) current.characters[i] = character; else current.characters.push(character);
    await fs.writeFile(charactersPath, JSON.stringify(current, null, 2));
    charactersCache.set(character.id, character);
    console.log(`✅ [SAVE] Character ${character.id} saved to JSON with file lock`);
  });
}

export async function saveLevelToJSON(level: LevelConfig): Promise<void> {
  const levelDir = path.join(__dirname, "../../main-gamedata/progressive-data/levelup");
  const levelPath = path.join(levelDir, `level-${level.level}.json`);
  
  await fileLock.withLock(levelPath, async () => {
    await fs.mkdir(levelDir, { recursive: true });
    await fs.writeFile(levelPath, JSON.stringify(level, null, 2));
    console.log(`✅ [SAVE] Level ${level.level} saved to JSON with file lock`);
  });
}

// ✅ FIXED: Changed from 'task' (singular) to 'tasks' (plural)
export async function saveTaskToJSON(task: any): Promise<void> {
  const taskDir = path.join(__dirname, "../../main-gamedata/progressive-data/tasks");  // ← FIXED: tasks (plural)
  const taskPath = path.join(taskDir, `${task.id}.json`);
  
  await fileLock.withLock(taskPath, async () => {
    await fs.mkdir(taskDir, { recursive: true });
    await fs.writeFile(taskPath, JSON.stringify(task, null, 2));
    tasksCache.set(task.id, task);
    console.log(`✅ [SAVE] Task ${task.id} saved to JSON with file lock`);
  });
}

export async function saveAchievementToJSON(achievement: any): Promise<void> {
  const achDir = path.join(__dirname, "../../main-gamedata/progressive-data/achievements");
  const achPath = path.join(achDir, `${achievement.id}.json`);
  
  await fileLock.withLock(achPath, async () => {
    await fs.mkdir(achDir, { recursive: true });
    await fs.writeFile(achPath, JSON.stringify(achievement, null, 2));
    achievementsCache.set(achievement.id, achievement);
    console.log(`✅ [SAVE] Achievement ${achievement.id} saved to JSON with file lock`);
  });
}

export async function savePlayerDataToJSON(player: Player): Promise<void> {
  try {
    const snapshotName = `${player.username || player.id}.json`;
    const data = {
      id: player.id,
      telegramId: player.telegramId,
      username: player.username,
      points: player.points,
      lustPoints: player.points,
      lustGems: (player as any).lustGems || 0,
      energy: player.energy,
      energyMax: player.energyMax,
      level: player.level,
      experience: player.experience,
      passiveIncomeRate: player.passiveIncomeRate,
      upgrades: player.upgrades,
      unlockedCharacters: player.unlockedCharacters,
      selectedCharacterId: player.selectedCharacterId,
      selectedImageId: player.selectedImageId,
      displayImage: player.displayImage,
      isAdmin: player.isAdmin,
      lastLogin: player.lastLogin,
      createdAt: player.createdAt,
      boostActive: (player as any).boostActive || false,
      boostMultiplier: (player as any).boostMultiplier || 1.0,
      boostExpiresAt: (player as any).boostExpiresAt || null,
      boostEnergy: (player as any).boostEnergy || 0,
      totalTapsToday: (player as any).totalTapsToday || 0,
      totalTapsAllTime: (player as any).totalTapsAllTime || 0
    };
    await writeSnapshot(snapshotName, data);
    throttledInfo('Saved player snapshot', { user: player.username, points: player.points, energy: player.energy });
  } catch {}
}

console.log('✅ [DATA LOADER] All save operations now protected with file locking');
