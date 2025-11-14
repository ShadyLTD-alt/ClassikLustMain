import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from '../storage';
import fileLock from './fileLock';
import { ensureDate, sanitizeDateFields } from './dateHelper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GAMEDATA_ROOT = path.join(__dirname, '../../main-gamedata');

const dataCache = {
  levels: new Map<string, any>(),
  tasks: new Map<string, any>(),
  achievements: new Map<string, any>(),
  upgrades: new Map<string, any>(),
  characters: new Map<string, any>()
};

const FOLDER_MAP = {
  levels: 'progressive-data/levelup',
  tasks: 'progressive-data/tasks',
  achievements: 'progressive-data/achievements',
  upgrades: 'progressive-data/upgrades',
  characters: 'progressive-data/characters'
} as const;

type ContentType = keyof typeof FOLDER_MAP;

async function loadJSONFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    // 🔧 FIXED: Sanitize dates on load
    return sanitizeDateFields(parsed) as T;
  } catch (error) {
    console.error(`Failed to load ${filePath}:`, error);
    return null;
  }
}

export async function loadGameData<T = any>(contentType: ContentType): Promise<T[]> {
  const folderName = FOLDER_MAP[contentType];
  const dirPath = path.join(GAMEDATA_ROOT, folderName);
  
  try {
    await fs.mkdir(dirPath, { recursive: true });
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
    
    console.log(`📦 Loaded ${data.length} ${contentType} from ${folderName}`);
    return data;
  } catch (error) {
    console.error(`❌ Error loading ${contentType}:`, error);
    return [];
  }
}

export async function loadGameDataById<T = any>(
  contentType: ContentType,
  id: string
): Promise<T | null> {
  const folderName = FOLDER_MAP[contentType];
  let fileName: string;
  
  if (contentType === 'levels') {
    fileName = `level-${id}.json`;
  } else {
    fileName = `${id}.json`;
  }
  
  const filePath = path.join(GAMEDATA_ROOT, folderName, fileName);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    return sanitizeDateFields(parsed) as T;
  } catch (error) {
    return null;
  }
}

export async function saveGameData<T extends { id: string } | { level: number }>(
  contentType: ContentType,
  data: T
): Promise<{ success: boolean; error?: string }> {
  const folderName = FOLDER_MAP[contentType];
  let fileName: string;
  let itemId: string;
  
  if (contentType === 'levels' && 'level' in data) {
    itemId = String(data.level);
    fileName = `level-${data.level}.json`;
  } else if ('id' in data) {
    itemId = data.id;
    fileName = `${data.id}.json`;
  } else {
    return { success: false, error: 'Data must have id or level field' };
  }
  
  const dirPath = path.join(GAMEDATA_ROOT, folderName);
  const filePath = path.join(dirPath, fileName);
  
  try {
    // 🔧 FIXED: Sanitize dates before saving
    const sanitized = sanitizeDateFields(data);
    
    await fileLock.withLock(filePath, async () => {
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(sanitized, null, 2), 'utf-8');
    });
    
    console.log(`💾 Saved ${contentType}/${fileName}`);
    
    dataCache[contentType].set(itemId, sanitized);
    
    try {
      await syncToDatabase(contentType, sanitized);
      console.log(`🔄 Synced ${contentType}/${itemId} to database`);
    } catch (dbError: any) {
      console.warn(`⚠️  DB sync warning for ${contentType}/${itemId}:`, dbError.message);
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

export async function deleteGameData(
  contentType: ContentType,
  id: string
): Promise<{ success: boolean; error?: string }> {
  // 🔧 CRITICAL FIX: Validate ID before using in file path
  if (!id || id === 'undefined' || id === 'null') {
    console.error(`❌ [DELETE] Invalid ID: "${id}"`);
    return { success: false, error: `Invalid ${contentType} ID: "${id}"` };
  }
  
  const folderName = FOLDER_MAP[contentType];
  const fileName = contentType === 'levels' ? `level-${id}.json` : `${id}.json`;
  const filePath = path.join(GAMEDATA_ROOT, folderName, fileName);
  
  console.log(`🗑️ [DELETE] Attempting to delete: ${filePath}`);
  
  try {
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ Deleted ${contentType}/${fileName}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
      console.warn(`⚠️  File not found: ${filePath}`);
    }
    
    dataCache[contentType].delete(id);
    
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
      
    case 'tasks':
    case 'achievements':
      break;
  }
}

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
    
    if (type === 'characters' && data.length > 0) {
      console.log(`🔄 Syncing ${data.length} characters to database...`);
      for (const character of data) {
        try {
          await storage.createCharacter(character);
        } catch {
          await storage.updateCharacter(character.id, character);
        }
      }
      console.log(`✅ All ${data.length} characters synced to database`);
    }
  }
  
  console.log(`
  ✅ Game Data Loaded (progressive-data ONLY):
  - Levels: ${dataCache.levels.size}
  - Tasks: ${dataCache.tasks.size}
  - Achievements: ${dataCache.achievements.size}
  - Upgrades: ${dataCache.upgrades.size}
  - Characters: ${dataCache.characters.size}
  `);
}

export function getDataFromMemory<T = any>(contentType: ContentType): T[] {
  return Array.from(dataCache[contentType].values());
}

export function getDataByIdFromMemory<T = any>(contentType: ContentType, id: string): T | undefined {
  return dataCache[contentType].get(id);
}

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

export const saveLevelToJSON = (level: any) => saveGameData('levels', level);
export const saveTaskToJSON = (task: any) => saveGameData('tasks', task);
export const saveAchievementToJSON = (achievement: any) => saveGameData('achievements', achievement);
export const saveUpgradeToJSON = (upgrade: any) => saveGameData('upgrades', upgrade);
export const saveCharacterToJSON = (character: any) => saveGameData('characters', character);

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

console.log('✅ [UNIFIED DATA LOADER] Using progressive-data for ALL game data');