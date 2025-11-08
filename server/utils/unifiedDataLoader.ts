import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from '../storage';
import fileLock from './fileLock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Unified Data Loader - Single Source of Truth Pattern
 * Game data reads from main-gamedata subdirectories
 */

const GAMEDATA_ROOT = path.join(__dirname, '../../main-gamedata');

// In-memory caches for fast access
const dataCache = {
  levels: new Map<string, any>(),
  tasks: new Map<string, any>(),
  achievements: new Map<string, any>(),
  upgrades: new Map<string, any>(),
  characters: new Map<string, any>()
};

// Content type to folder mapping - USING YOUR EXISTING DIRECTORY STRUCTURE
const FOLDER_MAP = {
  levels: 'progressive-data/levelup',
  tasks: 'progressive-data/tasks',
  achievements: 'progressive-data/achievements',
  upgrades: 'progressive-data/upgrades',
  characters: 'character-data'  // ✅ USE character-data, NOT progressive-data/characters
} as const;

// ...rest of the unchanged code above...

/**
 * Sync game data to database
 */
async function syncToDatabase(contentType: ContentType, data: any): Promise<void> {
  switch (contentType) {
    case 'levels':
      try {
        await storage.createLevel(data);
      } catch {
        await storage.updateLevel(data.level, data);
      }
      break;
      
    case 'upgrades':
      try {
        await storage.createUpgrade(data);
      } catch {
        await storage.updateUpgrade(data.id, data);
      }
      break;
      
    case 'characters':
      try {
        await storage.createCharacter(data);
      } catch {
        await storage.updateCharacter(data.id, data);
      }
      break;
      
    // Tasks and achievements don't have DB tables currently
    case 'tasks':
    case 'achievements':
      // These are file-only for now
      break;
  }
}

// ...rest of the unchanged code above...

/**
 * Load all game data into memory cache and sync DB for characters
 */
export async function syncAllGameData(): Promise<void> {
  console.log('🚀 Loading all game data from main-gamedata directories...');
  
  const types: ContentType[] = ['levels', 'tasks', 'achievements', 'upgrades', 'characters'];
  
  for (const type of types) {
    const data = await loadGameData(type);
    dataCache[type].clear();
    
    for (const item of data) {
      const key = 'level' in item ? String(item.level) : item.id;
      dataCache[type].set(key, item);
    }
    // ADD THIS BLOCK: bulk sync loaded characters to DB
    if (type === 'characters' && data.length > 0) {
      for (const character of data) {
        try {
          await storage.createCharacter(character);
        } catch {
          await storage.updateCharacter(character.id, character);
        }
      }
      console.log(`🔄 Synced ${data.length} characters to DB after file load`);
    }
  }
  
  console.log(`\n  ✅ Game Data Loaded:\n  - Levels: ${dataCache.levels.size}\n  - Tasks: ${dataCache.tasks.size}\n  - Achievements: ${dataCache.achievements.size}\n  - Upgrades: ${dataCache.upgrades.size}\n  - Characters: ${dataCache.characters.size}\n  `);
}

// ...rest of unchanged code...

//console.log('✅ [UNIFIED DATA LOADER] Using character-data and progressive-data directories');
