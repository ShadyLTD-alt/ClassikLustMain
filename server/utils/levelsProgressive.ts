import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "../storage";
import type { InsertLevel, Level } from "@shared/schema";
import type { LevelConfig } from "@shared/gameConfig";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for game data
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

// NEW: Progressive directory for levels only
const progressiveLevelsDir = path.join(__dirname, "../../main-gamedata/progressive-data/levelup");

export async function syncLevels() {
  console.log("📦 Syncing levels from progressive-data/levelup only...");

  try {
    const files = await fs.readdir(progressiveLevelsDir);
    const jsonFiles = files.filter(f => f.endsWith(".json"));

    levelsCache.clear();
    let count = 0;

    for (const file of jsonFiles) {
      const filePath = path.join(progressiveLevelsDir, file);
      const data = await loadJSONFile<any>(filePath);
      if (!data) continue;
      
      levelsCache.set(data.level, data as LevelConfig);

      const levelData: InsertLevel = {
        level: data.level,
        experienceRequired: data.experienceRequired || data.cost || 0,
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
        count++;
      } catch (dbError) {
        console.error(`  ⚠️ Failed to sync level ${data.level}:`, dbError);
      }
    }

    console.log(`✅ Synced ${count} levels from progressive-data/levelup`);
  } catch (error) {
    console.error("❌ Error syncing levels:", error);
    throw error;
  }
}

export function getLevelsFromMemory(): LevelConfig[] {
  return Array.from(levelsCache.values()).sort((a, b) => a.level - b.level);
}

export function getLevelFromMemory(level: number): LevelConfig | undefined {
  return levelsCache.get(level);
}
