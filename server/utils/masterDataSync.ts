/**
 * Master Data Sync Utility
 * 
 * PURPOSE:
 * - Master JSON files (master-data/) are for ADMIN EDITING ONLY
 * - This utility COPIES/SYNCS from master-data/ to progressive-data/
 * - Game runtime ALWAYS reads from progressive-data/
 * 
 * WORKFLOW:
 * 1. Admin edits master-data/levelup-master.json (bulk edit UI)
 * 2. Admin clicks "Sync to Progressive Data"
 * 3. This utility reads master JSON and writes individual files to progressive-data/
 * 4. unifiedDataLoader picks up changes from progressive-data/
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fileLock from './fileLock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_DATA_DIR = path.join(__dirname, '../../main-gamedata/master-data');
const PROGRESSIVE_DATA_DIR = path.join(__dirname, '../../main-gamedata/progressive-data');

/**
 * Load master JSON file
 */
async function loadMasterJSON<T>(filename: string): Promise<T | null> {
  try {
    const filePath = path.join(MASTER_DATA_DIR, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load master JSON ${filename}:`, error);
    return null;
  }
}

/**
 * Sync levels from master to progressive
 */
export async function syncLevelsFromMaster(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log('🔄 Syncing levels from master-data to progressive-data...');
    
    const masterData = await loadMasterJSON<{ levels: any[] }>('levelup-master.json');
    if (!masterData?.levels) {
      return { success: false, count: 0, error: 'No levels found in master JSON' };
    }

    const progressiveDir = path.join(PROGRESSIVE_DATA_DIR, 'levelup');
    await fs.mkdir(progressiveDir, { recursive: true });

    let count = 0;
    for (const level of masterData.levels) {
      const filename = `level-${level.level}.json`;
      const filepath = path.join(progressiveDir, filename);
      
      await fileLock.withLock(filepath, async () => {
        await fs.writeFile(filepath, JSON.stringify(level, null, 2), 'utf-8');
      });
      
      count++;
    }

    console.log(`✅ Synced ${count} levels to progressive-data`);
    return { success: true, count };
  } catch (error: any) {
    console.error('❌ Error syncing levels:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Sync tasks from master to progressive
 */
export async function syncTasksFromMaster(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log('🔄 Syncing tasks from master-data to progressive-data...');
    
    const masterData = await loadMasterJSON<{ tasks: any[] }>('tasks-master.json');
    if (!masterData?.tasks) {
      return { success: false, count: 0, error: 'No tasks found in master JSON' };
    }

    const progressiveDir = path.join(PROGRESSIVE_DATA_DIR, 'tasks');
    await fs.mkdir(progressiveDir, { recursive: true });

    let count = 0;
    for (const task of masterData.tasks) {
      const filename = `${task.id}.json`;
      const filepath = path.join(progressiveDir, filename);
      
      await fileLock.withLock(filepath, async () => {
        await fs.writeFile(filepath, JSON.stringify(task, null, 2), 'utf-8');
      });
      
      count++;
    }

    console.log(`✅ Synced ${count} tasks to progressive-data`);
    return { success: true, count };
  } catch (error: any) {
    console.error('❌ Error syncing tasks:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Sync achievements from master to progressive
 */
export async function syncAchievementsFromMaster(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log('🔄 Syncing achievements from master-data to progressive-data...');
    
    const masterData = await loadMasterJSON<{ achievements: any[] }>('achievements-master.json');
    if (!masterData?.achievements) {
      return { success: false, count: 0, error: 'No achievements found in master JSON' };
    }

    const progressiveDir = path.join(PROGRESSIVE_DATA_DIR, 'achievements');
    await fs.mkdir(progressiveDir, { recursive: true });

    let count = 0;
    for (const achievement of masterData.achievements) {
      const filename = `${achievement.id}.json`;
      const filepath = path.join(progressiveDir, filename);
      
      await fileLock.withLock(filepath, async () => {
        await fs.writeFile(filepath, JSON.stringify(achievement, null, 2), 'utf-8');
      });
      
      count++;
    }

    console.log(`✅ Synced ${count} achievements to progressive-data`);
    return { success: true, count };
  } catch (error: any) {
    console.error('❌ Error syncing achievements:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Sync upgrades from master to progressive
 */
export async function syncUpgradesFromMaster(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log('🔄 Syncing upgrades from master-data to progressive-data...');
    
    const masterData = await loadMasterJSON<{ upgrades: any[] }>('upgrades-master.json');
    if (!masterData?.upgrades) {
      return { success: false, count: 0, error: 'No upgrades found in master JSON' };
    }

    const progressiveDir = path.join(PROGRESSIVE_DATA_DIR, 'upgrades');
    await fs.mkdir(progressiveDir, { recursive: true });

    let count = 0;
    for (const upgrade of masterData.upgrades) {
      const filename = `${upgrade.id}.json`;
      const filepath = path.join(progressiveDir, filename);
      
      await fileLock.withLock(filepath, async () => {
        await fs.writeFile(filepath, JSON.stringify(upgrade, null, 2), 'utf-8');
      });
      
      count++;
    }

    console.log(`✅ Synced ${count} upgrades to progressive-data`);
    return { success: true, count };
  } catch (error: any) {
    console.error('❌ Error syncing upgrades:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Sync characters from master to progressive
 */
export async function syncCharactersFromMaster(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log('🔄 Syncing characters from master-data to progressive-data...');
    
    const masterData = await loadMasterJSON<{ characters: any[] }>('character-master.json');
    if (!masterData?.characters) {
      return { success: false, count: 0, error: 'No characters found in master JSON' };
    }

    const progressiveDir = path.join(PROGRESSIVE_DATA_DIR, 'characters');
    await fs.mkdir(progressiveDir, { recursive: true });

    let count = 0;
    for (const character of masterData.characters) {
      const filename = `${character.id}.json`;
      const filepath = path.join(progressiveDir, filename);
      
      await fileLock.withLock(filepath, async () => {
        await fs.writeFile(filepath, JSON.stringify(character, null, 2), 'utf-8');
      });
      
      count++;
    }

    console.log(`✅ Synced ${count} characters to progressive-data`);
    return { success: true, count };
  } catch (error: any) {
    console.error('❌ Error syncing characters:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Sync ALL master data to progressive data
 */
export async function syncAllMasterData(): Promise<{
  success: boolean;
  results: Record<string, { count: number; error?: string }>;
}> {
  console.log('🚀 Starting full master-data sync to progressive-data...');
  
  const results: Record<string, { count: number; error?: string }> = {};
  
  const levelResult = await syncLevelsFromMaster();
  results.levels = { count: levelResult.count, error: levelResult.error };
  
  const taskResult = await syncTasksFromMaster();
  results.tasks = { count: taskResult.count, error: taskResult.error };
  
  const achResult = await syncAchievementsFromMaster();
  results.achievements = { count: achResult.count, error: achResult.error };
  
  const upgradeResult = await syncUpgradesFromMaster();
  results.upgrades = { count: upgradeResult.count, error: upgradeResult.error };
  
  const charResult = await syncCharactersFromMaster();
  results.characters = { count: charResult.count, error: charResult.error };
  
  const allSuccess = levelResult.success && taskResult.success && 
                      achResult.success && upgradeResult.success && charResult.success;
  
  console.log('✅ Master data sync complete!');
  console.log('Results:', results);
  
  return { success: allSuccess, results };
}

console.log('✅ [MASTER DATA SYNC] Utility loaded - use syncAllMasterData() to sync from master JSONs');
