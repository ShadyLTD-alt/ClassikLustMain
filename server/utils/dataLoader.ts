import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "../storage";
import type { InsertUpgrade, InsertCharacter, Player } from "@shared/schema";
import type { UpgradeConfig, CharacterConfig, LevelConfig } from "@shared/gameConfig";
// ✅ LUNA FIX: Import progressive levels module
import { syncLevels, getLevelsFromMemory, getLevelFromMemory } from "./levelsProgressive";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for game data
let upgradesCache: Map<string, UpgradeConfig> = new Map();
let charactersCache: Map<string, CharacterConfig> = new Map();
// ✅ LUNA NOTE: Levels cache now handled by levelsProgressive module

async function loadJSONFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return null;
  }
}

export async function syncUpgrades() {
  console.log("📈 Syncing upgrades from master-data...");

  try {
    const upgradesPath = path.join(__dirname, "../../main-gamedata/master-data/upgrades-master.json");
    const upgradesData = await loadJSONFile<{ upgrades: UpgradeConfig[] }>(upgradesPath);
    
    if (!upgradesData?.upgrades) {
      throw new Error("No upgrades found in master data");
    }

    upgradesCache.clear();
    let count = 0;

    for (const upgrade of upgradesData.upgrades) {
      upgradesCache.set(upgrade.id, upgrade);

      const upgradeToInsert: InsertUpgrade = {
        id: upgrade.id,
        name: upgrade.name,
        description: upgrade.description,
        type: upgrade.type,
        icon: upgrade.icon,
        maxLevel: upgrade.maxLevel,
        baseCost: upgrade.baseCost,
        costMultiplier: upgrade.costMultiplier,
        baseValue: upgrade.baseValue,
        valueIncrement: upgrade.valueIncrement,
        isHidden: upgrade.isHidden || false,
      };

      try {
        await storage.createUpgrade(upgradeToInsert);
        count++;
      } catch (dbError: any) {
        if (dbError.code === '23505') {
          await storage.updateUpgrade(upgrade.id, upgradeToInsert);
          console.log(`  ↻ Updated upgrade: ${upgrade.name}`);
        } else {
          console.error(`  ⚠️ Failed to sync upgrade ${upgrade.id}:`, dbError.message);
        }
      }
    }

    console.log(`✅ Synced ${count} upgrades`);
  } catch (error) {
    console.error("❌ Error syncing upgrades:", error);
    throw error;
  }
}

export async function syncCharacters() {
  console.log("👥 Syncing characters from master-data...");

  try {
    const charactersPath = path.join(__dirname, "../../main-gamedata/master-data/character-master.json");
    const charactersData = await loadJSONFile<{ characters: CharacterConfig[] }>(charactersPath);
    
    if (!charactersData?.characters) {
      throw new Error("No characters found in master data");
    }

    charactersCache.clear();
    let count = 0;

    for (const character of charactersData.characters) {
      charactersCache.set(character.id, character);

      const characterToInsert: InsertCharacter = {
        id: character.id,
        name: character.name,
        unlockLevel: character.unlockLevel,
        description: character.description,
        rarity: character.rarity,
        defaultImage: character.defaultImage || '',
        avatarImage: character.avatarImage || '',
        displayImage: character.displayImage || '',
        isHidden: character.isHidden || false,
      };

      try {
        await storage.createCharacter(characterToInsert);
        count++;
      } catch (dbError: any) {
        if (dbError.code === '23505') {
          await storage.updateCharacter(character.id, characterToInsert);
          console.log(`  ↻ Updated character: ${character.name}`);
        } else {
          console.error(`  ⚠️ Failed to sync character ${character.id}:`, dbError.message);
        }
      }
    }

    console.log(`✅ Synced ${count} characters`);
  } catch (error) {
    console.error("❌ Error syncing characters:", error);
    throw error;
  }
}

export async function syncAllGameData() {
  console.log("🔄 Starting complete game data synchronization...");
  try {
    await syncUpgrades();
    await syncCharacters();
    // ✅ LUNA FIX: Use progressive levels sync
    await syncLevels();
    console.log("✅ Game data synchronization complete!");
  } catch (error) {
    console.error("❌ Game data synchronization failed:", error);
    throw error;
  }
}

// ✅ LUNA FIX: Export all memory getters needed by routes
export function getUpgradesFromMemory(): UpgradeConfig[] {
  return Array.from(upgradesCache.values());
}

export function getUpgradeFromMemory(id: string): UpgradeConfig | undefined {
  return upgradesCache.get(id);
}

export function getCharactersFromMemory(): CharacterConfig[] {
  return Array.from(charactersCache.values());
}

export function getCharacterFromMemory(id: string): CharacterConfig | undefined {
  return charactersCache.get(id);
}

// ✅ LUNA FIX: Re-export levels functions from progressive module
export { getLevelsFromMemory, getLevelFromMemory };

// Save functions for JSON persistence
export async function saveUpgradeToJSON(upgrade: UpgradeConfig): Promise<void> {
  try {
    const upgradesPath = path.join(__dirname, "../../main-gamedata/master-data/upgrades-master.json");
    const current = await loadJSONFile<{ upgrades: UpgradeConfig[] }>(upgradesPath);
    
    if (!current) {
      console.error("❌ Could not load upgrades master file for saving");
      return;
    }
    
    const index = current.upgrades.findIndex(u => u.id === upgrade.id);
    if (index >= 0) {
      current.upgrades[index] = upgrade;
    } else {
      current.upgrades.push(upgrade);
    }
    
    await fs.writeFile(upgradesPath, JSON.stringify(current, null, 2));
    upgradesCache.set(upgrade.id, upgrade);
    console.log(`✅ Saved upgrade to master JSON: ${upgrade.name}`);
  } catch (error) {
    console.error("❌ Failed to save upgrade to JSON:", error);
  }
}

export async function saveCharacterToJSON(character: CharacterConfig): Promise<void> {
  try {
    const charactersPath = path.join(__dirname, "../../main-gamedata/master-data/character-master.json");
    const current = await loadJSONFile<{ characters: CharacterConfig[] }>(charactersPath);
    
    if (!current) {
      console.error("❌ Could not load characters master file for saving");
      return;
    }
    
    const index = current.characters.findIndex(c => c.id === character.id);
    if (index >= 0) {
      current.characters[index] = character;
    } else {
      current.characters.push(character);
    }
    
    await fs.writeFile(charactersPath, JSON.stringify(current, null, 2));
    charactersCache.set(character.id, character);
    console.log(`✅ Saved character to master JSON: ${character.name}`);
  } catch (error) {
    console.error("❌ Failed to save character to JSON:", error);
  }
}

// ✅ LUNA FIX: Add level save function that uses progressive-data
export async function saveLevelToJSON(level: LevelConfig): Promise<void> {
  try {
    const levelFilePath = path.join(__dirname, `../../main-gamedata/progressive-data/levelup/level-${level.level}.json`);
    
    // Ensure directory exists
    const levelDir = path.dirname(levelFilePath);
    await fs.mkdir(levelDir, { recursive: true });
    
    await fs.writeFile(levelFilePath, JSON.stringify(level, null, 2));
    console.log(`✅ Saved level to progressive JSON: level-${level.level}.json`);
  } catch (error) {
    console.error("❌ Failed to save level to JSON:", error);
  }
}

export async function savePlayerDataToJSON(player: Player): Promise<void> {
  try {
    // Save to progressive player data (for tracking purposes)
    const playerDir = path.join(__dirname, "../../main-gamedata/progressive-data/players");
    await fs.mkdir(playerDir, { recursive: true });
    
    const playerFilePath = path.join(playerDir, `${player.username || player.id}.json`);
    const playerData = {
      id: player.id,
      telegramId: player.telegramId,
      username: player.username,
      points: player.points,
      lustPoints: player.points, // Keep in sync
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
      // ✅ NEW FIELDS
      boostActive: (player as any).boostActive || false,
      boostMultiplier: (player as any).boostMultiplier || 1.0,
      boostExpiresAt: (player as any).boostExpiresAt || null,
      boostEnergy: (player as any).boostEnergy || 0,
      totalTapsToday: (player as any).totalTapsToday || 0,
      totalTapsAllTime: (player as any).totalTapsAllTime || 0
    };
    
    await fs.writeFile(playerFilePath, JSON.stringify(playerData, null, 2));
    console.log(`✅ Saved player data: ${player.username}`);
  } catch (error) {
    console.error("❌ Failed to save player data to JSON:", error);
  }
}

console.log('✅ Luna: DataLoader restored with all required exports');
