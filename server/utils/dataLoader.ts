import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "../storage";
import type { InsertUpgrade, InsertCharacter, InsertLevel } from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const upgradesDir = path.join(__dirname, "../../client/src/game-data/upgrades");
  
  try {
    const files = await fs.readdir(upgradesDir);
    const jsonFiles = files.filter(f => f.endsWith(".json"));
    
    for (const file of jsonFiles) {
      const filePath = path.join(upgradesDir, file);
      const data = await loadJSONFile<any>(filePath);
      
      if (!data) continue;
      
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
      
      const existing = await storage.getUpgrade(data.id);
      if (existing) {
        await storage.updateUpgrade(data.id, upgradeData);
        console.log(`  ✓ Updated upgrade: ${data.name}`);
      } else {
        await storage.createUpgrade(upgradeData);
        console.log(`  ✓ Created upgrade: ${data.name}`);
      }
    }
    console.log(`✅ Synced ${jsonFiles.length} upgrades`);
  } catch (error) {
    console.error("Error syncing upgrades:", error);
  }
}

async function syncCharacters() {
  console.log("📦 Syncing characters from JSON files...");
  const charactersDir = path.join(__dirname, "../../client/src/character-data");
  
  try {
    const files = await fs.readdir(charactersDir);
    const jsonFiles = files.filter(f => f.endsWith(".json"));
    
    for (const file of jsonFiles) {
      const filePath = path.join(charactersDir, file);
      const data = await loadJSONFile<any>(filePath);
      
      if (!data) continue;
      
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
      
      const existing = await storage.getCharacter(data.id);
      if (existing) {
        await storage.updateCharacter(data.id, characterData);
        console.log(`  ✓ Updated character: ${data.name}`);
      } else {
        await storage.createCharacter(characterData);
        console.log(`  ✓ Created character: ${data.name}`);
      }
    }
    console.log(`✅ Synced ${jsonFiles.length} characters`);
  } catch (error) {
    console.error("Error syncing characters:", error);
  }
}

async function syncLevels() {
  console.log("📦 Syncing levels from JSON files...");
  const levelsDir = path.join(__dirname, "../../client/src/game-data/levelup");
  
  try {
    const files = await fs.readdir(levelsDir);
    const jsonFiles = files.filter(f => f.endsWith(".json"));
    
    for (const file of jsonFiles) {
      const filePath = path.join(levelsDir, file);
      const data = await loadJSONFile<any>(filePath);
      
      if (!data) continue;
      
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
    console.log(`✅ Synced ${jsonFiles.length} levels`);
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

export async function saveUpgradeToJSON(upgrade: InsertUpgrade): Promise<void> {
  const upgradesDir = path.join(__dirname, "../../client/src/game-data/upgrades");
  const filePath = path.join(upgradesDir, `${upgrade.id}.json`);
  
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
  console.log(`✓ Saved upgrade JSON: ${filePath}`);
}

export async function saveLevelToJSON(level: InsertLevel): Promise<void> {
  const levelsDir = path.join(__dirname, "../../client/src/game-data/levelup");
  const filePath = path.join(levelsDir, `level-${level.level}.json`);
  
  const data = {
    level: level.level,
    requirements: level.requirements,
    experienceRequired: level.experienceRequired,
    unlocks: level.unlocks,
  };
  
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  console.log(`✓ Saved level JSON: ${filePath}`);
}

export async function saveCharacterToJSON(character: InsertCharacter): Promise<void> {
  const charactersDir = path.join(__dirname, "../../client/src/character-data");
  const filePath = path.join(charactersDir, `${character.id}.json`);
  
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
  console.log(`✓ Saved character JSON: ${filePath}`);
}
