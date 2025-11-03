import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "../storage";
import type { InsertUpgrade, InsertCharacter, Player } from "@shared/schema";
import type { UpgradeConfig, CharacterConfig } from "@shared/gameConfig";
import { syncLevels, getLevelsFromMemory, getLevelFromMemory } from "./levelsProgressive";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for game data
let upgradesCache: Map<string, UpgradeConfig> = new Map();
let charactersCache: Map<string, CharacterConfig> = new Map();

async function loadJSONFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return null;
  }
}

export async function syncUpgrades() { /* unchanged */ }
export async function syncCharacters() { /* unchanged */ }

export async function syncAllGameData() {
  console.log("🔄 Starting game data synchronization...");
  await syncUpgrades();
  await syncCharacters();
  await syncLevels();
  console.log("✅ Game data synchronization complete!");
}

export { getLevelsFromMemory, getLevelFromMemory };
