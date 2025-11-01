
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "../storage";
import type { InsertUpgrade, InsertCharacter, InsertLevel, Player } from "@shared/schema";
import type { UpgradeConfig, CharacterConfig, LevelConfig } from "@shared/gameConfig";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for game data
let upgradesCache: Map<string, UpgradeConfig> = new Map();
let charactersCache: Map<string, CharacterConfig> = new Map();
let levelsCache: Map<number, LevelConfig> = new Map();

async function loadJSONFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return null;
  }
}

async function syncUpgrades() {
  console.log("📦 Syncing upgrades from JSON files...");
  const upgradesDir = path.join(__dirname, "../../main-gamedata/progressive-data/upgrades");
  
  try {
    const files = await fs.readdir(upgradesDir);
    const jsonFiles = files.filter(f => f.endsWith(".json"));
    
    for (const file of jsonFiles) {
      const filePath = path.join(upgradesDir, file);
      const data = await loadJSONFile<any>(filePath);
      
      if (!data) continue;
      
      // Store in memory cache
      upgradesCache.set(data.id, data as UpgradeConfig);
      
      // Also sync to DB for persistence
      const upgradeData: InsertUpgrade = {
        id: data.id,
        name: data.name,
        description: data.description,
        type: data.type,
        icon: data.icon,
        maxLevel: data.maxLevel,
        baseCost: data.baseCost,
        costMultiplier: data.costMultiplier,
        baseValue: data.baseValue,
        valueIncrement: data.valueIncrement,
        isHidden: data.isHidden || false,
      };
      
      try {
        const existing = await storage.getUpgrade(data.id);
        if (existing) {
          await storage.updateUpgrade(data.id, upgradeData);
          console.log(`  ✓ Updated upgrade: ${data.name}`);
        } else {
          await storage.createUpgrade(upgradeData);
          console.log(`  ✓ Created upgrade: ${data.name}`);
        }
      } catch (dbError) {
        console.error(`  ⚠️ Failed to sync upgrade ${data.name}:`, dbError);
      }
    }
    console.log(`✅ Synced ${jsonFiles.length} upgrades to memory and DB`);
  } catch (error) {
    console.error("❌ Error syncing upgrades:", error);
    throw error;
  }
}

async function syncCharacters() {
  console.log("📦 Syncing characters from JSON files...");
  const charactersDir = path.join(__dirname, "../../main-gamedata/character-data");
  
  try {
    const files = await fs.readdir(charactersDir);
    const jsonFiles = files.filter(f => f.endsWith(".json"));
    
    for (const file of jsonFiles) {
      const filePath = path.join(charactersDir, file);
      const data = await loadJSONFile<any>(filePath);
      
      if (!data) continue;
      
      // Store in memory cache
      charactersCache.set(data.id, data as CharacterConfig);
      
      // Also sync to DB for persistence
      const characterData: InsertCharacter = {
        id: data.id,
        name: data.name,
        unlockLevel: data.unlockLevel,
        description: data.description,
        rarity: data.rarity,
        defaultImage: data.defaultImage || null,
        avatarImage: data.avatarImage || null,
        displayImage: data.displayImage || null,
        isHidden: data.isHidden || false,
      };
      
      try {
        const existing = await storage.getCharacter(data.id);
        if (existing) {
          await storage.updateCharacter(data.id, characterData);
          console.log(`  ✓ Updated character: ${data.name}`);
        } else {
          await storage.createCharacter(characterData);
          console.log(`  ✓ Created character: ${data.name}`);
        }
      } catch (dbError) {
        console.error(`  ⚠️ Failed to sync character ${data.name}:`, dbError);
      }
    }
    console.log(`✅ Synced ${jsonFiles.length} characters to memory and DB`);
  } catch (error) {
    console.error("❌ Error syncing characters:", error);
    throw error;
  }
}

async function syncLevels() {
  console.log("📦 Syncing levels from JSON files...");
  const levelsDir = path.join(__dirname, "../../main-gamedata/progressive-data/levelup");
  
  try {
    const files = await fs.readdir(levelsDir);
    const jsonFiles = files.filter(f => f.endsWith(".json"));
    
    for (const file of jsonFiles) {
      const filePath = path.join(levelsDir, file);
      const data = await loadJSONFile<any>(filePath);
      
      if (!data) continue;
      
      // Store in memory cache
      levelsCache.set(data.level, data as LevelConfig);
      
      // Also sync to DB for persistence
      const levelData: InsertLevel = {
        level: data.level,
        experienceRequired: data.experienceRequired,
        requirements: data.requirements || [],
        unlocks: data.unlocks || [],
      };
      
      const existing = await storage.getLevel(data.level);
      if (existing) {
        await storage.updateLevel(data.level, levelData);
        console.log(`  ✓ Updated level: ${data.level}`);
      } else {
        await storage.createLevel(levelData);
        console.log(`  ✓ Created level: ${data.level}`);
      }
    }
    console.log(`✅ Synced ${jsonFiles.length} levels to memory and DB`);
  } catch (error) {
    console.error("Error syncing levels:", error);
  }
}

export async function syncAllGameData() {
  console.log("🔄 Starting game data synchronization...");
  await syncUpgrades();
  await syncCharacters();
  await syncLevels();
  console.log("✅ Game data synchronization complete!");
}

// Getter functions for in-memory data
export function getUpgradesFromMemory(includeHidden = false): UpgradeConfig[] {
  const upgrades = Array.from(upgradesCache.values());
  if (includeHidden) {
    return upgrades;
  }
  return upgrades.filter(u => !u.isHidden);
}

export function getUpgradeFromMemory(id: string): UpgradeConfig | undefined {
  return upgradesCache.get(id);
}

export function getCharactersFromMemory(includeHidden = false): CharacterConfig[] {
  const characters = Array.from(charactersCache.values());
  if (includeHidden) {
    return characters;
  }
  return characters.filter(c => !c.isHidden);
}

export function getCharacterFromMemory(id: string): CharacterConfig | undefined {
  return charactersCache.get(id);
}

export function getLevelsFromMemory(): LevelConfig[] {
  return Array.from(levelsCache.values()).sort((a, b) => a.level - b.level);
}

export function getLevelFromMemory(level: number): LevelConfig | undefined {
  return levelsCache.get(level);
}

// Save functions to JSON
export async function saveUpgradeToJSON(upgrade: InsertUpgrade): Promise<void> {
  const upgradesDir = path.join(__dirname, "../../main-gamedata/progressive-data/upgrades");
  const filePath = path.join(upgradesDir, `${upgrade.id}.json`);
  
  await fs.mkdir(upgradesDir, { recursive: true });
  
  const data = {
    id: upgrade.id,
    name: upgrade.name,
    description: upgrade.description,
    maxLevel: upgrade.maxLevel,
    baseCost: upgrade.baseCost,
    costMultiplier: upgrade.costMultiplier,
    baseValue: upgrade.baseValue,
    valueIncrement: upgrade.valueIncrement,
    icon: upgrade.icon,
    type: upgrade.type,
    ...(upgrade.isHidden && { isHidden: upgrade.isHidden }),
  };
  
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  
  // Update memory cache
  upgradesCache.set(upgrade.id, data as UpgradeConfig);
  
  console.log(`✓ Saved upgrade JSON: ${filePath}`);
}

export async function saveLevelToJSON(level: InsertLevel): Promise<void> {
  const levelsDir = path.join(__dirname, "../../main-gamedata/progressive-data/levelup");
  const filePath = path.join(levelsDir, `level-${level.level}.json`);
  
  await fs.mkdir(levelsDir, { recursive: true });
  
  const data = {
    level: level.level,
    requirements: level.requirements,
    experienceRequired: level.experienceRequired,
    unlocks: level.unlocks,
  };
  
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  
  // Update memory cache
  levelsCache.set(level.level, data as LevelConfig);
  
  console.log(`✓ Saved level JSON: ${filePath}`);
}

export async function saveCharacterToJSON(character: InsertCharacter): Promise<void> {
  const charactersDir = path.join(__dirname, "../../main-gamedata/character-data");
  const filePath = path.join(charactersDir, `${character.id}.json`);
  
  await fs.mkdir(charactersDir, { recursive: true });
  
  const data = {
    id: character.id,
    name: character.name,
    unlockLevel: character.unlockLevel,
    description: character.description,
    rarity: character.rarity,
    ...(character.defaultImage && { defaultImage: character.defaultImage }),
    ...(character.avatarImage && { avatarImage: character.avatarImage }),
    ...(character.displayImage && { displayImage: character.displayImage }),
    ...(character.isHidden && { isHidden: character.isHidden }),
  };
  
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  
  // Update memory cache
  charactersCache.set(character.id, data as CharacterConfig);
  
  console.log(`✓ Saved character JSON: ${filePath}`);
}

export async function savePlayerDataToJSON(player: Player): Promise<void> {
  if (!player.telegramId) {
    console.warn("⚠️ Cannot save player data: missing telegramId");
    return;
  }
  
  const playerDir = path.join(__dirname, "../../main-gamedata/player-data", `telegram_${player.telegramId}`);
  const filePath = path.join(playerDir, "player.json");
  
  await fs.mkdir(playerDir, { recursive: true });
  
  const upgrades = typeof player.upgrades === 'object' && player.upgrades !== null 
    ? player.upgrades 
    : {};
  
  const unlockedCharacters = Array.isArray(player.unlockedCharacters) 
    ? player.unlockedCharacters 
    : [];
  
  const playerData = {
    id: player.id,
    telegramId: player.telegramId,
    username: player.username,
    points: typeof player.points === 'string' ? player.points : player.points.toString(),
    energy: player.energy,
    maxEnergy: player.maxEnergy,
    level: player.level,
    experience: player.experience,
    passiveIncomeRate: player.passiveIncomeRate,
    isAdmin: player.isAdmin,
    selectedCharacterId: player.selectedCharacterId,
    displayImage: player.displayImage,
    upgrades,
    unlockedCharacters,
    lastLogin: player.lastLogin,
    lastEnergyUpdate: player.lastEnergyUpdate,
  };
  
  await fs.writeFile(filePath, JSON.stringify(playerData, null, 2));
  console.log(`✓ Saved player data: ${filePath}`);
}

export async function loadPlayerDataFromJSON(telegramId: string): Promise<any | null> {
  const playerDir = path.join(__dirname, "../../main-gamedata/player-data", `telegram_${telegramId}`);
  const filePath = path.join(playerDir, "player.json");
  
  return await loadJSONFile(filePath);
}
