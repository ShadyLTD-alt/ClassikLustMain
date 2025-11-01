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
  console.log("📦 Syncing upgrades from master JSON file...");
  
  // Load from master-data/upgrades-master.json
  const masterFilePath = path.join(__dirname, "../../main-gamedata/master-data/upgrades-master.json");
  const masterData = await loadJSONFile<{ upgrades: any[] }>(masterFilePath);
  
  if (masterData && masterData.upgrades) {
    console.log(`📋 Loading ${masterData.upgrades.length} upgrades from master-data/upgrades-master.json`);
    for (const data of masterData.upgrades) {
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
    console.log(`✅ Synced ${masterData.upgrades.length} upgrades from master file`);
    return;
  }
  
  // Fallback to root upgrades-master.json
  console.log("📦 Fallback: Trying root upgrades-master.json...");
  const rootMasterPath = path.join(__dirname, "../../main-gamedata/upgrades-master.json");
  const rootMasterData = await loadJSONFile<{ upgrades: any[] }>(rootMasterPath);
  
  if (rootMasterData && rootMasterData.upgrades) {
    console.log(`📋 Loading ${rootMasterData.upgrades.length} upgrades from root upgrades-master.json`);
    for (const data of rootMasterData.upgrades) {
      upgradesCache.set(data.id, data as UpgradeConfig);
      
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
    console.log(`✅ Synced ${rootMasterData.upgrades.length} upgrades from root master file`);
    return;
  }
  
  // Final fallback to individual files in progressive-data/upgrades directory
  console.log("📦 Final fallback: Syncing upgrades from individual JSON files...");
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
    console.log(`✅ Synced ${jsonFiles.length} upgrades from individual files`);
  } catch (error) {
    console.error("❌ Error syncing upgrades:", error);
    throw error;
  }
}

async function syncCharacters() {
  console.log("📦 Syncing characters from master JSON file...");
  
  // Load from master-data/character-master.json
  const masterFilePath = path.join(__dirname, "../../main-gamedata/master-data/character-master.json");
  const masterData = await loadJSONFile<{ characters: any[] }>(masterFilePath);
  
  if (masterData && masterData.characters) {
    console.log(`📋 Loading ${masterData.characters.length} characters from master-data/character-master.json`);
    for (const data of masterData.characters) {
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
    console.log(`✅ Synced ${masterData.characters.length} characters from master file`);
    return;
  }
  
  // Fallback to root character-master.json
  console.log("📦 Fallback: Trying root character-master.json...");
  const rootMasterPath = path.join(__dirname, "../../main-gamedata/character-master.json");
  const rootMasterData = await loadJSONFile<{ characters: any[] }>(rootMasterPath);
  
  if (rootMasterData && rootMasterData.characters) {
    console.log(`📋 Loading ${rootMasterData.characters.length} characters from root character-master.json`);
    for (const data of rootMasterData.characters) {
      charactersCache.set(data.id, data as CharacterConfig);
      
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
    console.log(`✅ Synced ${rootMasterData.characters.length} characters from root master file`);
    return;
  }
  
  // Final fallback to individual files in character-data directory
  console.log("📦 Final fallback: Syncing characters from individual JSON files...");
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
    console.log(`✅ Synced ${jsonFiles.length} characters from individual files`);
  } catch (error) {
    console.error("❌ Error syncing characters:", error);
    throw error;
  }
}

async function syncLevels() {
  console.log("📦 Syncing levels from master JSON file...");
  
  // Load from master-data/levelup-master.json
  const masterFilePath = path.join(__dirname, "../../main-gamedata/master-data/levelup-master.json");
  const masterData = await loadJSONFile<{ levels: any[] }>(masterFilePath);
  
  if (masterData && masterData.levels) {
    console.log(`📋 Loading ${masterData.levels.length} levels from master-data/levelup-master.json`);
    for (const data of masterData.levels) {
      // Store in memory cache
      levelsCache.set(data.level, data as LevelConfig);
      
      // Also sync to DB for persistence
      const levelData: InsertLevel = {
        level: data.level,
        experienceRequired: data.experienceRequired,
        requirements: data.requirements || [],
        unlocks: data.unlocks || [],
      };
      
      try {
        const existing = await storage.getLevel(data.level);
        if (existing) {
          await storage.updateLevel(data.level, levelData);
          console.log(`  ✓ Updated level: ${data.level}`);
        } else {
          await storage.createLevel(levelData);
          console.log(`  ✓ Created level: ${data.level}`);
        }
      } catch (dbError) {
        console.error(`  ⚠️ Failed to sync level ${data.level}:`, dbError);
      }
    }
    console.log(`✅ Synced ${masterData.levels.length} levels from master file`);
    return;
  }
  
  // Fallback to root levelup-master.json
  console.log("📦 Fallback: Trying root levelup-master.json...");
  const rootMasterPath = path.join(__dirname, "../../main-gamedata/levelup-master.json");
  const rootMasterData = await loadJSONFile<{ levels: any[] }>(rootMasterPath);
  
  if (rootMasterData && rootMasterData.levels) {
    console.log(`📋 Loading ${rootMasterData.levels.length} levels from root levelup-master.json`);
    for (const data of rootMasterData.levels) {
      levelsCache.set(data.level, data as LevelConfig);
      
      const levelData: InsertLevel = {
        level: data.level,
        experienceRequired: data.experienceRequired,
        requirements: data.requirements || [],
        unlocks: data.unlocks || [],
      };
      
      try {
        const existing = await storage.getLevel(data.level);
        if (existing) {
          await storage.updateLevel(data.level, levelData);
          console.log(`  ✓ Updated level: ${data.level}`);
        } else {
          await storage.createLevel(levelData);
          console.log(`  ✓ Created level: ${data.level}`);
        }
      } catch (dbError) {
        console.error(`  ⚠️ Failed to sync level ${data.level}:`, dbError);
      }
    }
    console.log(`✅ Synced ${rootMasterData.levels.length} levels from root master file`);
    return;
  }
  
  // Final fallback to individual files in progressive-data/levelup directory
  console.log("📦 Final fallback: Syncing levels from individual JSON files...");
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
      
      try {
        const existing = await storage.getLevel(data.level);
        if (existing) {
          await storage.updateLevel(data.level, levelData);
          console.log(`  ✓ Updated level: ${data.level}`);
        } else {
          await storage.createLevel(levelData);
          console.log(`  ✓ Created level: ${data.level}`);
        }
      } catch (dbError) {
        console.error(`  ⚠️ Failed to sync level ${data.level}:`, dbError);
      }
    }
    console.log(`✅ Synced ${jsonFiles.length} levels from individual files`);
  } catch (error) {
    console.error("❌ Error syncing levels:", error);
    throw error;
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

// Save functions to JSON - Update master files (prioritize master-data directory)
export async function saveUpgradeToJSON(upgrade: InsertUpgrade): Promise<void> {
  // Try master-data directory first
  const masterFilePath = path.join(__dirname, "../../main-gamedata/master-data/upgrades-master.json");
  
  try {
    // Load existing master data
    const masterData = await loadJSONFile<{ upgrades: any[] }>(masterFilePath);
    const upgrades = masterData?.upgrades || [];
    
    // Find existing upgrade or add new one
    const existingIndex = upgrades.findIndex(u => u.id === upgrade.id);
    
    const upgradeData = {
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
    
    if (existingIndex >= 0) {
      upgrades[existingIndex] = upgradeData;
    } else {
      upgrades.push(upgradeData);
    }
    
    // Write back to master file
    await fs.writeFile(masterFilePath, JSON.stringify({ upgrades }, null, 2));
    
    // Update memory cache
    upgradesCache.set(upgrade.id, upgradeData as UpgradeConfig);
    
    console.log(`✓ Updated master-data/upgrades-master.json with upgrade: ${upgrade.name}`);
    return;
  } catch (error) {
    console.warn(`⚠️ Failed to save to master-data directory, trying root...`);
  }
  
  // Fallback to root upgrades-master.json
  const rootMasterPath = path.join(__dirname, "../../main-gamedata/upgrades-master.json");
  
  try {
    const masterData = await loadJSONFile<{ upgrades: any[] }>(rootMasterPath);
    const upgrades = masterData?.upgrades || [];
    
    const existingIndex = upgrades.findIndex(u => u.id === upgrade.id);
    
    const upgradeData = {
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
    
    if (existingIndex >= 0) {
      upgrades[existingIndex] = upgradeData;
    } else {
      upgrades.push(upgradeData);
    }
    
    await fs.writeFile(rootMasterPath, JSON.stringify({ upgrades }, null, 2));
    upgradesCache.set(upgrade.id, upgradeData as UpgradeConfig);
    
    console.log(`✓ Updated root upgrades-master.json with upgrade: ${upgrade.name}`);
  } catch (error) {
    console.error(`❌ Failed to save upgrade to master JSON:`, error);
    throw error;
  }
}

export async function saveLevelToJSON(level: InsertLevel): Promise<void> {
  // Try master-data directory first
  const masterFilePath = path.join(__dirname, "../../main-gamedata/master-data/levelup-master.json");
  
  try {
    const masterData = await loadJSONFile<{ levels: any[] }>(masterFilePath);
    const levels = masterData?.levels || [];
    
    const existingIndex = levels.findIndex(l => l.level === level.level);
    
    const levelData = {
      level: level.level,
      experienceRequired: level.experienceRequired,
      requirements: level.requirements,
      unlocks: level.unlocks,
    };
    
    if (existingIndex >= 0) {
      levels[existingIndex] = levelData;
    } else {
      levels.push(levelData);
      levels.sort((a, b) => a.level - b.level);
    }
    
    await fs.writeFile(masterFilePath, JSON.stringify({ levels }, null, 2));
    levelsCache.set(level.level, levelData as LevelConfig);
    
    console.log(`✓ Updated master-data/levelup-master.json with level: ${level.level}`);
    return;
  } catch (error) {
    console.warn(`⚠️ Failed to save to master-data directory, trying root...`);
  }
  
  // Fallback to root levelup-master.json
  const rootMasterPath = path.join(__dirname, "../../main-gamedata/levelup-master.json");
  
  try {
    const masterData = await loadJSONFile<{ levels: any[] }>(rootMasterPath);
    const levels = masterData?.levels || [];
    
    const existingIndex = levels.findIndex(l => l.level === level.level);
    
    const levelData = {
      level: level.level,
      experienceRequired: level.experienceRequired,
      requirements: level.requirements,
      unlocks: level.unlocks,
    };
    
    if (existingIndex >= 0) {
      levels[existingIndex] = levelData;
    } else {
      levels.push(levelData);
      levels.sort((a, b) => a.level - b.level);
    }
    
    await fs.writeFile(rootMasterPath, JSON.stringify({ levels }, null, 2));
    levelsCache.set(level.level, levelData as LevelConfig);
    
    console.log(`✓ Updated root levelup-master.json with level: ${level.level}`);
  } catch (error) {
    console.error(`❌ Failed to save level to master JSON:`, error);
    throw error;
  }
}

export async function saveCharacterToJSON(character: InsertCharacter): Promise<void> {
  // Try master-data directory first
  const masterFilePath = path.join(__dirname, "../../main-gamedata/master-data/character-master.json");
  
  try {
    const masterData = await loadJSONFile<{ characters: any[] }>(masterFilePath);
    const characters = masterData?.characters || [];
    
    const existingIndex = characters.findIndex(c => c.id === character.id);
    
    const characterData = {
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
    
    if (existingIndex >= 0) {
      characters[existingIndex] = characterData;
    } else {
      characters.push(characterData);
    }
    
    await fs.writeFile(masterFilePath, JSON.stringify({ characters }, null, 2));
    charactersCache.set(character.id, characterData as CharacterConfig);
    
    console.log(`✓ Updated master-data/character-master.json with character: ${character.name}`);
    return;
  } catch (error) {
    console.warn(`⚠️ Failed to save to master-data directory, trying root...`);
  }
  
  // Fallback to root character-master.json
  const rootMasterPath = path.join(__dirname, "../../main-gamedata/character-master.json");
  
  try {
    const masterData = await loadJSONFile<{ characters: any[] }>(rootMasterPath);
    const characters = masterData?.characters || [];
    
    const existingIndex = characters.findIndex(c => c.id === character.id);
    
    const characterData = {
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
    
    if (existingIndex >= 0) {
      characters[existingIndex] = characterData;
    } else {
      characters.push(characterData);
    }
    
    await fs.writeFile(rootMasterPath, JSON.stringify({ characters }, null, 2));
    charactersCache.set(character.id, characterData as CharacterConfig);
    
    console.log(`✓ Updated root character-master.json with character: ${character.name}`);
  } catch (error) {
    console.error(`❌ Failed to save character to master JSON:`, error);
    throw error;
  }
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