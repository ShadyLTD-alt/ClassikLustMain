import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from '../storage';
import fileLock from './fileLock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Unified Data Loader - Single Source of Truth Pattern
 * ALL game data reads from progressive-data ONLY
 * NO master JSON reading at runtime
 */

const PROGRESSIVE_DATA_ROOT = path.join(__dirname, '../../main-gamedata/progressive-data');

// In-memory caches for fast access
const dataCache = {
  levels: new Map<string, any>(),
  tasks: new Map<string, any>(),
  achievements: new Map<string, any>(),
  upgrades: new Map<string, any>(),
  characters: new Map<string, any>()
};

// Content type to folder mapping
const FOLDER_MAP = {
  levels: 'levelup',
  tasks: 'tasks',
  achievements: 'achievements',
  upgrades: 'upgrades',
  characters: 'characters'
} as const;

type ContentType = keyof typeof FOLDER_MAP;

/**
 * Load single JSON file
 */
async function loadJSONFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load ${filePath}:`, error);
    return null;
  }
}

/**
 * Load all files from a content type folder
 */
export async function loadGameData<T = any>(contentType: ContentType): Promise<T[]> {
  const folderName = FOLDER_MAP[contentType];
  const dirPath = path.join(PROGRESSIVE_DATA_ROOT, folderName);
  
  try {
    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });
    
    // Read all JSON files
    const files = await fs.readdir(dirPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const data: T[] = [];
    for (const file of jsonFiles) {
      const filePath = path.join(dirPath, file);
      const item = await loadJSONFile<T>(filePath);
      if (item) {
        data.push(item);
      }
    }
    
    console.log(`📦 Loaded ${data.length} ${contentType} from progressive-data/${folderName}`);
    return data;
  } catch (error) {
    console.error(`❌ Error loading ${contentType}:`, error);
    return [];
  }
}

/**
 * Load single item by ID
 */
export async function loadGameDataById<T = any>(
  contentType: ContentType,
  id: string
): Promise<T | null> {
  const folderName = FOLDER_MAP[contentType];
  let fileName: string;
  
  // Handle special naming for levels (level-X.json)
  if (contentType === 'levels') {
    fileName = `level-${id}.json`;
  } else {
    fileName = `${id}.json`;
  }
  
  const filePath = path.join(PROGRESSIVE_DATA_ROOT, folderName, fileName);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Save item to progressive-data + sync to DB
 */
export async function saveGameData<T extends { id: string } | { level: number }>(
  contentType: ContentType,
  data: T
): Promise<{ success: boolean; error?: string }> {
  const folderName = FOLDER_MAP[contentType];
  let fileName: string;
  let itemId: string;
  
  // Handle special naming for levels
  if (contentType === 'levels' && 'level' in data) {
    itemId = String(data.level);
    fileName = `level-${data.level}.json`;
  } else if ('id' in data) {
    itemId = data.id;
    fileName = `${data.id}.json`;
  } else {
    return { success: false, error: 'Data must have id or level field' };
  }
  
  const dirPath = path.join(PROGRESSIVE_DATA_ROOT, folderName);
  const filePath = path.join(dirPath, fileName);
  
  try {
    // 1. Write to file with lock protection
    await fileLock.withLock(filePath, async () => {
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    });
    
    console.log(`💾 Saved ${contentType}/${fileName}`);
    
    // 2. Update in-memory cache
    dataCache[contentType].set(itemId, data);
    
    // 3. Sync to database (non-blocking, log errors but don't fail)
    try {
      await syncToDatabase(contentType, data);
      console.log(`🔄 Synced ${contentType}/${itemId} to database`);
    } catch (dbError: any) {
      console.warn(`⚠️  DB sync warning for ${contentType}/${itemId}:`, dbError.message);
      // File is saved, DB sync failed - not critical
    }
    
    return { success: true };
  } catch (error: any) {
    console.error(`❌ Error saving ${contentType}:`, error);
    return { 
      success: false, 
      error: error.message || 'Unknown error' 
    };
  }
}

/**
 * Delete item from progressive-data + DB
 */
export async function deleteGameData(
  contentType: ContentType,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const folderName = FOLDER_MAP[contentType];
  const fileName = contentType === 'levels' ? `level-${id}.json` : `${id}.json`;
  const filePath = path.join(PROGRESSIVE_DATA_ROOT, folderName, fileName);
  
  try {
    // 1. Delete file
    try {
      await fs.unlink(filePath);
      console.log(`🗑️  Deleted ${contentType}/${fileName}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
    
    // 2. Remove from cache
    dataCache[contentType].delete(id);
    
    // 3. Delete from DB
    try {
      await deleteFromDatabase(contentType, id);
    } catch (dbError: any) {
      console.warn(`⚠️  DB delete warning:`, dbError.message);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error(`❌ Error deleting ${contentType}:`, error);
    return { 
      success: false, 
      error: error.message || 'Unknown error' 
    };
  }
}

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

/**
 * Delete from database
 */
async function deleteFromDatabase(contentType: ContentType, id: string): Promise<void> {
  switch (contentType) {
    case 'levels':
      await storage.deleteLevel(Number(id));
      break;
    case 'upgrades':
      await storage.deleteUpgrade(id);
      break;
    case 'characters':
      await storage.deleteCharacter(id);
      break;
  }
}

/**
 * Load all game data into memory cache
 */
export async function syncAllGameData(): Promise<void> {
  console.log('🚀 Loading all game data from progressive-data...');
  
  const types: ContentType[] = ['levels', 'tasks', 'achievements', 'upgrades', 'characters'];
  
  for (const type of types) {
    const data = await loadGameData(type);
    dataCache[type].clear();
    
    for (const item of data) {
      const key = 'level' in item ? String(item.level) : item.id;
      dataCache[type].set(key, item);
    }
  }
  
  console.log(`
  ✅ Game Data Loaded:
  - Levels: ${dataCache.levels.size}
  - Tasks: ${dataCache.tasks.size}
  - Achievements: ${dataCache.achievements.size}
  - Upgrades: ${dataCache.upgrades.size}
  - Characters: ${dataCache.characters.size}
  `);
}

/**
 * Get data from memory cache
 */
export function getDataFromMemory<T = any>(contentType: ContentType): T[] {
  return Array.from(dataCache[contentType].values());
}

export function getDataByIdFromMemory<T = any>(contentType: ContentType, id: string): T | undefined {
  return dataCache[contentType].get(id);
}

// Re-export specific getters for backwards compatibility
export const getLevelsFromMemory = () => getDataFromMemory('levels');
export const getTasksFromMemory = () => getDataFromMemory('tasks');
export const getAchievementsFromMemory = () => getDataFromMemory('achievements');
export const getUpgradesFromMemory = () => getDataFromMemory('upgrades');
export const getCharactersFromMemory = () => getDataFromMemory('characters');

export const getLevelFromMemory = (id: string) => getDataByIdFromMemory('levels', id);
export const getTaskFromMemory = (id: string) => getDataByIdFromMemory('tasks', id);
export const getAchievementFromMemory = (id: string) => getDataByIdFromMemory('achievements', id);
export const getUpgradeFromMemory = (id: string) => getDataByIdFromMemory('upgrades', id);
export const getCharacterFromMemory = (id: string) => getDataByIdFromMemory('characters', id);

// Re-export save functions for backwards compatibility
export const saveLevelToJSON = (level: any) => saveGameData('levels', level);
export const saveTaskToJSON = (task: any) => saveGameData('tasks', task);
export const saveAchievementToJSON = (achievement: any) => saveGameData('achievements', achievement);
export const saveUpgradeToJSON = (upgrade: any) => saveGameData('upgrades', upgrade);
export const saveCharacterToJSON = (character: any) => saveGameData('characters', character);

// Export sync functions
export const syncLevels = () => loadGameData('levels').then(data => {
  dataCache.levels.clear();
  data.forEach(item => dataCache.levels.set(String(item.level), item));
});

export const syncTasks = () => loadGameData('tasks').then(data => {
  dataCache.tasks.clear();
  data.forEach(item => dataCache.tasks.set(item.id, item));
});

export const syncAchievements = () => loadGameData('achievements').then(data => {
  dataCache.achievements.clear();
  data.forEach(item => dataCache.achievements.set(item.id, item));
});

export const syncUpgrades = () => loadGameData('upgrades').then(data => {
  dataCache.upgrades.clear();
  data.forEach(item => dataCache.upgrades.set(item.id, item));
});

export const syncCharacters = () => loadGameData('characters').then(data => {
  dataCache.characters.clear();
  data.forEach(item => dataCache.characters.set(item.id, item));
});

console.log('✅ [UNIFIED DATA LOADER] Progressive-data is now single source of truth');
