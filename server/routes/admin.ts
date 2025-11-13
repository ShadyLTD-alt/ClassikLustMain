import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { storage } from '../storage';
import type { InsertUpgrade, InsertCharacter, InsertLevel } from '@shared/schema';

const router = Router();

// ============================================
// FILE LOCKING MECHANISM
// ============================================
const locks = new Map<string, Promise<void>>();

async function withFileLock<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
  while (locks.has(filePath)) {
    await locks.get(filePath);
  }

  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  locks.set(filePath, lockPromise);

  try {
    const result = await operation();
    return result;
  } finally {
    locks.delete(filePath);
    releaseLock!();
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function readJSONFile<T>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeJSONFile(filePath: string, data: any): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function getAllJSONFiles(dirPath: string): Promise<any[]> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    const files = await fs.readdir(dirPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const allData = await Promise.all(
      jsonFiles.map(async (file) => {
        const data = await readJSONFile(path.join(dirPath, file));
        return data;
      })
    );
    
    return allData.filter(d => d !== null);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// ============================================
// UPGRADES ROUTES
// Path: /api/admin/upgrades
// ============================================

router.get('/upgrades', async (req: Request, res: Response) => {
  try {
    const upgradesDir = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'upgrades');
    const upgrades = await getAllJSONFiles(upgradesDir);
    console.log(`✅ [ADMIN API] Loaded ${upgrades.length} upgrades`);
    res.json({ success: true, upgrades });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to load upgrades:', error);
    res.status(500).json({ success: false, error: 'Failed to load upgrades', details: error.message });
  }
});

router.post('/upgrades', async (req: Request, res: Response) => {
  try {
    const upgradeData = req.body;
    const upgradeId = upgradeData.id;
    
    if (!upgradeId || typeof upgradeId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid upgrade ID is required' });
    }

    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'upgrades', `${upgradeId}.json`);
    
    await withFileLock(filePath, async () => {
      const existing = await readJSONFile(filePath);
      if (existing) {
        throw new Error(`Upgrade '${upgradeId}' already exists`);
      }

      // Add timestamps
      const now = new Date().toISOString();
      const dataToSave = {
        ...upgradeData,
        createdAt: now,
        updatedAt: now
      };

      await writeJSONFile(filePath, dataToSave);
      console.log(`✅ [ADMIN API] Created upgrade: ${upgradeId}`);
      
      // Sync to database (optional)
      try {
        await storage.createUpgrade(dataToSave as InsertUpgrade);
      } catch (dbError) {
        console.warn('[ADMIN API] DB sync warning:', dbError);
      }
    });

    res.json({ success: true, upgrade: upgradeData });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to create upgrade:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create upgrade' });
  }
});

router.put('/upgrades/:id', async (req: Request, res: Response) => {
  try {
    const upgradeId = req.params.id;
    const updates = req.body;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'upgrades', `${upgradeId}.json`);

    await withFileLock(filePath, async () => {
      const current = await readJSONFile(filePath);
      if (!current) {
        throw new Error(`Upgrade '${upgradeId}' not found`);
      }

      const updated = { 
        ...current, 
        ...updates, 
        id: upgradeId,
        updatedAt: new Date().toISOString()
      };
      await writeJSONFile(filePath, updated);
      console.log(`✅ [ADMIN API] Updated upgrade: ${upgradeId}`);
      
      try {
        await storage.updateUpgrade(upgradeId, updates);
      } catch (dbError) {
        console.warn('[ADMIN API] DB sync warning:', dbError);
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to update upgrade:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update upgrade' });
  }
});

router.delete('/upgrades/:id', async (req: Request, res: Response) => {
  try {
    const upgradeId = req.params.id;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'upgrades', `${upgradeId}.json`);

    await withFileLock(filePath, async () => {
      await fs.unlink(filePath);
      console.log(`✅ [ADMIN API] Deleted upgrade: ${upgradeId}`);
      
      try {
        await storage.deleteUpgrade(upgradeId);
      } catch (dbError) {
        console.warn('[ADMIN API] DB sync warning:', dbError);
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to delete upgrade:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete upgrade' });
  }
});

// ============================================
// CHARACTERS ROUTES
// Path: /api/admin/characters
// ============================================

router.get('/characters', async (req: Request, res: Response) => {
  try {
    const charactersDir = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'characters');
    const characters = await getAllJSONFiles(charactersDir);
    console.log(`✅ [ADMIN API] Loaded ${characters.length} characters`);
    res.json({ success: true, characters });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to load characters:', error);
    res.status(500).json({ success: false, error: 'Failed to load characters', details: error.message });
  }
});

router.post('/characters', async (req: Request, res: Response) => {
  try {
    const characterData = req.body;
    const characterId = characterData.id;

    if (!characterId || typeof characterId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid character ID is required' });
    }

    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'characters', `${characterId}.json`);
    
    await withFileLock(filePath, async () => {
      const existing = await readJSONFile(filePath);
      if (existing) {
        throw new Error(`Character '${characterId}' already exists`);
      }

      const now = new Date().toISOString();
      const dataToSave = {
        ...characterData,
        createdAt: now,
        updatedAt: now
      };

      await writeJSONFile(filePath, dataToSave);
      console.log(`✅ [ADMIN API] Created character: ${characterId}`);
      
      try {
        await storage.createCharacter(dataToSave as InsertCharacter);
      } catch (dbError) {
        console.warn('[ADMIN API] DB sync warning:', dbError);
      }
    });

    res.json({ success: true, character: characterData });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to create character:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create character' });
  }
});

router.put('/characters/:id', async (req: Request, res: Response) => {
  try {
    const characterId = req.params.id;
    const updates = req.body;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'characters', `${characterId}.json`);

    await withFileLock(filePath, async () => {
      const current = await readJSONFile(filePath);
      if (!current) {
        throw new Error(`Character '${characterId}' not found`);
      }

      const updated = { 
        ...current, 
        ...updates, 
        id: characterId,
        updatedAt: new Date().toISOString()
      };
      await writeJSONFile(filePath, updated);
      console.log(`✅ [ADMIN API] Updated character: ${characterId}`);
      
      try {
        await storage.updateCharacter(characterId, updates);
      } catch (dbError) {
        console.warn('[ADMIN API] DB sync warning:', dbError);
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to update character:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update character' });
  }
});

router.delete('/characters/:id', async (req: Request, res: Response) => {
  try {
    const characterId = req.params.id;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'characters', `${characterId}.json`);

    await withFileLock(filePath, async () => {
      await fs.unlink(filePath);
      console.log(`✅ [ADMIN API] Deleted character: ${characterId}`);
      
      try {
        await storage.deleteCharacter(characterId);
      } catch (dbError) {
        console.warn('[ADMIN API] DB sync warning:', dbError);
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to delete character:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete character' });
  }
});

// ============================================
// LEVELS ROUTES
// Path: /api/admin/levels
// ============================================

router.get('/levels', async (req: Request, res: Response) => {
  try {
    const levelsDir = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'levelup');
    const levels = await getAllJSONFiles(levelsDir);
    console.log(`✅ [ADMIN API] Loaded ${levels.length} levels`);
    res.json({ success: true, levels });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to load levels:', error);
    res.status(500).json({ success: false, error: 'Failed to load levels', details: error.message });
  }
});

router.post('/levels', async (req: Request, res: Response) => {
  try {
    const levelData = req.body;
    const levelId = levelData.id || levelData.level;

    if (!levelId) {
      return res.status(400).json({ success: false, error: 'Level ID or level number is required' });
    }

    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'levelup', `level-${levelId}.json`);
    
    await withFileLock(filePath, async () => {
      const now = new Date().toISOString();
      const dataToSave = {
        ...levelData,
        requirements: Array.isArray(levelData.requirements) ? levelData.requirements : [],
        unlocks: Array.isArray(levelData.unlocks) ? levelData.unlocks : [],
        rewards: levelData.rewards || {},
        createdAt: now,
        updatedAt: now
      };

      await writeJSONFile(filePath, dataToSave);
      console.log(`✅ [ADMIN API] Created level: ${levelId}`);
      
      try {
        await storage.createLevel(dataToSave as InsertLevel);
      } catch (dbError) {
        console.warn('[ADMIN API] DB sync warning:', dbError);
      }
    });

    res.json({ success: true, level: levelData });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to create level:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create level' });
  }
});

router.put('/levels/:id', async (req: Request, res: Response) => {
  try {
    const levelId = req.params.id;
    const updates = req.body;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'levelup', `level-${levelId}.json`);

    await withFileLock(filePath, async () => {
      const current = await readJSONFile(filePath);
      if (!current) {
        throw new Error(`Level ${levelId} not found`);
      }

      const updated = { 
        ...current, 
        ...updates,
        requirements: Array.isArray(updates.requirements) ? updates.requirements : (current as any).requirements || [],
        unlocks: Array.isArray(updates.unlocks) ? updates.unlocks : (current as any).unlocks || [],
        rewards: updates.rewards || (current as any).rewards || {},
        level: parseInt(levelId),
        updatedAt: new Date().toISOString()
      };
      await writeJSONFile(filePath, updated);
      console.log(`✅ [ADMIN API] Updated level: ${levelId}`);
      
      try {
        await storage.updateLevel(parseInt(levelId), updates);
      } catch (dbError) {
        console.warn('[ADMIN API] DB sync warning:', dbError);
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to update level:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update level' });
  }
});

router.delete('/levels/:id', async (req: Request, res: Response) => {
  try {
    const levelId = req.params.id;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'levelup', `level-${levelId}.json`);

    await withFileLock(filePath, async () => {
      await fs.unlink(filePath);
      console.log(`✅ [ADMIN API] Deleted level: ${levelId}`);
      
      try {
        await storage.deleteLevel(parseInt(levelId));
      } catch (dbError) {
        console.warn('[ADMIN API] DB sync warning:', dbError);
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to delete level:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete level' });
  }
});

// ============================================
// TASKS ROUTES
// Path: /api/admin/tasks
// ============================================

router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const tasksDir = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'tasks');
    const tasks = await getAllJSONFiles(tasksDir);
    console.log(`✅ [ADMIN API] Loaded ${tasks.length} tasks`);
    res.json({ success: true, tasks });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to load tasks:', error);
    res.status(500).json({ success: false, error: 'Failed to load tasks', details: error.message });
  }
});

router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const taskData = req.body;
    const taskId = taskData.id;

    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid task ID is required' });
    }

    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'tasks', `${taskId}.json`);
    
    await withFileLock(filePath, async () => {
      const now = new Date().toISOString();
      const dataToSave = {
        ...taskData,
        createdAt: now,
        updatedAt: now
      };

      await writeJSONFile(filePath, dataToSave);
      console.log(`✅ [ADMIN API] Created task: ${taskId}`);
    });

    res.json({ success: true, task: taskData });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to create task:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create task' });
  }
});

router.put('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.id;
    const updates = req.body;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'tasks', `${taskId}.json`);

    await withFileLock(filePath, async () => {
      const current = await readJSONFile(filePath);
      if (!current) {
        throw new Error(`Task '${taskId}' not found`);
      }

      const updated = { 
        ...current, 
        ...updates, 
        id: taskId,
        updatedAt: new Date().toISOString()
      };
      await writeJSONFile(filePath, updated);
      console.log(`✅ [ADMIN API] Updated task: ${taskId}`);
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to update task:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update task' });
  }
});

router.delete('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.id;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'tasks', `${taskId}.json`);

    await withFileLock(filePath, async () => {
      await fs.unlink(filePath);
      console.log(`✅ [ADMIN API] Deleted task: ${taskId}`);
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to delete task:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete task' });
  }
});

// ============================================
// ACHIEVEMENTS ROUTES
// Path: /api/admin/achievements
// ============================================

router.get('/achievements', async (req: Request, res: Response) => {
  try {
    const achievementsDir = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'achievements');
    const achievements = await getAllJSONFiles(achievementsDir);
    console.log(`✅ [ADMIN API] Loaded ${achievements.length} achievements`);
    res.json({ success: true, achievements });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to load achievements:', error);
    res.status(500).json({ success: false, error: 'Failed to load achievements', details: error.message });
  }
});

router.post('/achievements', async (req: Request, res: Response) => {
  try {
    const achievementData = req.body;
    const achievementId = achievementData.id;

    if (!achievementId || typeof achievementId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid achievement ID is required' });
    }

    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'achievements', `${achievementId}.json`);
    
    await withFileLock(filePath, async () => {
      const now = new Date().toISOString();
      const dataToSave = {
        ...achievementData,
        createdAt: now,
        updatedAt: now
      };

      await writeJSONFile(filePath, dataToSave);
      console.log(`✅ [ADMIN API] Created achievement: ${achievementId}`);
    });

    res.json({ success: true, achievement: achievementData });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to create achievement:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create achievement' });
  }
});

router.put('/achievements/:id', async (req: Request, res: Response) => {
  try {
    const achievementId = req.params.id;
    const updates = req.body;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'achievements', `${achievementId}.json`);

    await withFileLock(filePath, async () => {
      const current = await readJSONFile(filePath);
      if (!current) {
        throw new Error(`Achievement '${achievementId}' not found`);
      }

      const updated = { 
        ...current, 
        ...updates, 
        id: achievementId,
        updatedAt: new Date().toISOString()
      };
      await writeJSONFile(filePath, updated);
      console.log(`✅ [ADMIN API] Updated achievement: ${achievementId}`);
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to update achievement:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update achievement' });
  }
});

router.delete('/achievements/:id', async (req: Request, res: Response) => {
  try {
    const achievementId = req.params.id;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'achievements', `${achievementId}.json`);

    await withFileLock(filePath, async () => {
      await fs.unlink(filePath);
      console.log(`✅ [ADMIN API] Deleted achievement: ${achievementId}`);
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to delete achievement:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete achievement' });
  }
});

// ============================================
// IMAGES ROUTES
// Path: /api/admin/images
// ============================================

router.get('/images', async (req: Request, res: Response) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    const files = await fs.readdir(uploadsDir);
    
    const images = await Promise.all(
      files
        .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
        .map(async (filename) => {
          const filePath = path.join(uploadsDir, filename);
          const stats = await fs.stat(filePath);
          return {
            filename,
            path: `/uploads/characters/${filename}`,
            size: stats.size,
            uploadedAt: stats.mtime,
          };
        })
    );
    
    console.log(`✅ [ADMIN API] Loaded ${images.length} images`);
    res.json({ success: true, images });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to load images:', error);
    res.status(500).json({ success: false, error: 'Failed to load images', details: error.message });
  }
});

router.delete('/images/:filename', async (req: Request, res: Response) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    await fs.unlink(filePath);
    console.log(`✅ [ADMIN API] Deleted image: ${filename}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN API] Failed to delete image:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete image' });
  }
});

export default router;

console.log('✅ [ADMIN ROUTES] Admin API initialized - Full CRUD available for all entities');
console.log('📍 [ADMIN ROUTES] Data source: main-gamedata/progressive-data/ (Single Source of Truth)');
console.log('🔒 [ADMIN ROUTES] File locking enabled to prevent race conditions');