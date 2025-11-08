import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { storage } from '../storage';
import type { InsertUpgrade, InsertCharacter, InsertLevel } from '@shared/schema';

const router = Router();

// File locking utilities
const locks = new Map<string, Promise<void>>();

async function withFileLock<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
  // Wait for any existing lock on this file
  while (locks.has(filePath)) {
    await locks.get(filePath);
  }

  // Create a new lock
  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  locks.set(filePath, lockPromise);

  try {
    // Perform the operation
    const result = await operation();
    return result;
  } finally {
    // Release the lock
    locks.delete(filePath);
    releaseLock!();
  }
}

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
// ============================================

// GET /api/admin/upgrades - List all upgrades
router.get('/upgrades', async (req: Request, res: Response) => {
  try {
    const upgradesDir = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'upgrades');
    const upgrades = await getAllJSONFiles(upgradesDir);
    res.json({ upgrades });
  } catch (error) {
    console.error('Failed to load upgrades:', error);
    res.status(500).json({ error: 'Failed to load upgrades' });
  }
});

// POST /api/admin/upgrades - Create new upgrade
router.post('/upgrades', async (req: Request, res: Response) => {
  try {
    const upgradeData = req.body;
    const upgradeId = upgradeData.id;
    
    if (!upgradeId) {
      return res.status(400).json({ error: 'Upgrade ID is required' });
    }

    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'upgrades', `${upgradeId}.json`);
    
    await withFileLock(filePath, async () => {
      // Check if upgrade already exists
      const existing = await readJSONFile(filePath);
      if (existing) {
        throw new Error(`Upgrade ${upgradeId} already exists`);
      }

      // Write to JSON file
      await writeJSONFile(filePath, upgradeData);
      
      // Sync to database
      try {
        await storage.createUpgrade(upgradeData as InsertUpgrade);
      } catch (dbError) {
        console.warn('Failed to sync upgrade to database:', dbError);
      }
    });

    res.json({ success: true, upgrade: upgradeData });
  } catch (error: any) {
    console.error('Failed to create upgrade:', error);
    res.status(500).json({ error: error.message || 'Failed to create upgrade' });
  }
});

// PUT /api/admin/upgrades/:id - Update upgrade
router.put('/upgrades/:id', async (req: Request, res: Response) => {
  try {
    const upgradeId = req.params.id;
    const updates = req.body;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'upgrades', `${upgradeId}.json`);

    await withFileLock(filePath, async () => {
      // Read current data
      const current = await readJSONFile(filePath);
      if (!current) {
        throw new Error(`Upgrade ${upgradeId} not found`);
      }

      // Merge updates
      const updated = { ...current, ...updates, id: upgradeId };
      
      // Write to JSON file
      await writeJSONFile(filePath, updated);
      
      // Sync to database
      try {
        await storage.updateUpgrade(upgradeId, updates);
      } catch (dbError) {
        console.warn('Failed to sync upgrade to database:', dbError);
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update upgrade:', error);
    res.status(500).json({ error: error.message || 'Failed to update upgrade' });
  }
});

// DELETE /api/admin/upgrades/:id - Delete upgrade
router.delete('/upgrades/:id', async (req: Request, res: Response) => {
  try {
    const upgradeId = req.params.id;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'upgrades', `${upgradeId}.json`);

    await withFileLock(filePath, async () => {
      // Delete JSON file
      await fs.unlink(filePath);
      
      // Delete from database
      try {
        await storage.deleteUpgrade(upgradeId);
      } catch (dbError) {
        console.warn('Failed to delete upgrade from database:', dbError);
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete upgrade:', error);
    res.status(500).json({ error: error.message || 'Failed to delete upgrade' });
  }
});

// ============================================
// LEVELS ROUTES
// ============================================

router.get('/levels', async (req: Request, res: Response) => {
  try {
    const levelsDir = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'levelup');
    const levels = await getAllJSONFiles(levelsDir);
    res.json({ levels });
  } catch (error) {
    console.error('Failed to load levels:', error);
    res.status(500).json({ error: 'Failed to load levels' });
  }
});

router.post('/levels', async (req: Request, res: Response) => {
  try {
    const levelData = req.body;
    const levelId = levelData.id;

    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'levelup', `${levelId}.json`);
    
    await withFileLock(filePath, async () => {
      await writeJSONFile(filePath, levelData);
      try {
        await storage.createLevel(levelData as InsertLevel);
      } catch (dbError) {
        console.warn('Failed to sync level to database:', dbError);
      }
    });

    res.json({ success: true, level: levelData });
  } catch (error: any) {
    console.error('Failed to create level:', error);
    res.status(500).json({ error: error.message || 'Failed to create level' });
  }
});

router.put('/levels/:id', async (req: Request, res: Response) => {
  try {
    const levelId = req.params.id;
    const updates = req.body;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'levelup', `${levelId}.json`);

    await withFileLock(filePath, async () => {
      const current = await readJSONFile(filePath);
      if (!current) throw new Error(`Level ${levelId} not found`);

      const updated = { ...current, ...updates, id: parseInt(levelId) };
      await writeJSONFile(filePath, updated);
      
      try {
        await storage.updateLevel(parseInt(levelId), updates);
      } catch (dbError) {
        console.warn('Failed to sync level to database:', dbError);
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update level:', error);
    res.status(500).json({ error: error.message || 'Failed to update level' });
  }
});

router.delete('/levels/:id', async (req: Request, res: Response) => {
  try {
    const levelId = req.params.id;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'levelup', `${levelId}.json`);

    await withFileLock(filePath, async () => {
      await fs.unlink(filePath);
      try {
        await storage.deleteLevel(parseInt(levelId));
      } catch (dbError) {
        console.warn('Failed to delete level from database:', dbError);
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete level:', error);
    res.status(500).json({ error: error.message || 'Failed to delete level' });
  }
});

// ============================================
// CHARACTERS ROUTES
// ============================================

router.get('/characters', async (req: Request, res: Response) => {
  try {
    const charactersDir = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'characters');
    const characters = await getAllJSONFiles(charactersDir);
    res.json({ characters });
  } catch (error) {
    console.error('Failed to load characters:', error);
    res.status(500).json({ error: 'Failed to load characters' });
  }
});

router.post('/characters', async (req: Request, res: Response) => {
  try {
    const characterData = req.body;
    const characterId = characterData.id;

    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'characters', `${characterId}.json`);
    
    await withFileLock(filePath, async () => {
      await writeJSONFile(filePath, characterData);
      try {
        await storage.createCharacter(characterData as InsertCharacter);
      } catch (dbError) {
        console.warn('Failed to sync character to database:', dbError);
      }
    });

    res.json({ success: true, character: characterData });
  } catch (error: any) {
    console.error('Failed to create character:', error);
    res.status(500).json({ error: error.message || 'Failed to create character' });
  }
});

router.put('/characters/:id', async (req: Request, res: Response) => {
  try {
    const characterId = req.params.id;
    const updates = req.body;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'characters', `${characterId}.json`);

    await withFileLock(filePath, async () => {
      const current = await readJSONFile(filePath);
      if (!current) throw new Error(`Character ${characterId} not found`);

      const updated = { ...current, ...updates, id: characterId };
      await writeJSONFile(filePath, updated);
      
      try {
        await storage.updateCharacter(characterId, updates);
      } catch (dbError) {
        console.warn('Failed to sync character to database:', dbError);
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update character:', error);
    res.status(500).json({ error: error.message || 'Failed to update character' });
  }
});

router.delete('/characters/:id', async (req: Request, res: Response) => {
  try {
    const characterId = req.params.id;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'characters', `${characterId}.json`);

    await withFileLock(filePath, async () => {
      await fs.unlink(filePath);
      try {
        await storage.deleteCharacter(characterId);
      } catch (dbError) {
        console.warn('Failed to delete character from database:', dbError);
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete character:', error);
    res.status(500).json({ error: error.message || 'Failed to delete character' });
  }
});

// ============================================
// ACHIEVEMENTS ROUTES
// ============================================

router.get('/achievements', async (req: Request, res: Response) => {
  try {
    const achievementsDir = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'achievements');
    const achievements = await getAllJSONFiles(achievementsDir);
    res.json({ achievements });
  } catch (error) {
    console.error('Failed to load achievements:', error);
    res.status(500).json({ error: 'Failed to load achievements' });
  }
});

router.post('/achievements', async (req: Request, res: Response) => {
  try {
    const achievementData = req.body;
    const achievementId = achievementData.id;

    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'achievements', `${achievementId}.json`);
    
    await withFileLock(filePath, async () => {
      await writeJSONFile(filePath, achievementData);
    });

    res.json({ success: true, achievement: achievementData });
  } catch (error: any) {
    console.error('Failed to create achievement:', error);
    res.status(500).json({ error: error.message || 'Failed to create achievement' });
  }
});

router.put('/achievements/:id', async (req: Request, res: Response) => {
  try {
    const achievementId = req.params.id;
    const updates = req.body;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'achievements', `${achievementId}.json`);

    await withFileLock(filePath, async () => {
      const current = await readJSONFile(filePath);
      if (!current) throw new Error(`Achievement ${achievementId} not found`);

      const updated = { ...current, ...updates, id: achievementId };
      await writeJSONFile(filePath, updated);
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update achievement:', error);
    res.status(500).json({ error: error.message || 'Failed to update achievement' });
  }
});

router.delete('/achievements/:id', async (req: Request, res: Response) => {
  try {
    const achievementId = req.params.id;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'achievements', `${achievementId}.json`);

    await withFileLock(filePath, async () => {
      await fs.unlink(filePath);
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete achievement:', error);
    res.status(500).json({ error: error.message || 'Failed to delete achievement' });
  }
});

// ============================================
// TASKS ROUTES
// ============================================

router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const tasksDir = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'tasks');
    const tasks = await getAllJSONFiles(tasksDir);
    res.json({ tasks });
  } catch (error) {
    console.error('Failed to load tasks:', error);
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const taskData = req.body;
    const taskId = taskData.id;

    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'tasks', `${taskId}.json`);
    
    await withFileLock(filePath, async () => {
      await writeJSONFile(filePath, taskData);
    });

    res.json({ success: true, task: taskData });
  } catch (error: any) {
    console.error('Failed to create task:', error);
    res.status(500).json({ error: error.message || 'Failed to create task' });
  }
});

router.put('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.id;
    const updates = req.body;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'tasks', `${taskId}.json`);

    await withFileLock(filePath, async () => {
      const current = await readJSONFile(filePath);
      if (!current) throw new Error(`Task ${taskId} not found`);

      const updated = { ...current, ...updates, id: taskId };
      await writeJSONFile(filePath, updated);
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update task:', error);
    res.status(500).json({ error: error.message || 'Failed to update task' });
  }
});

router.delete('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.id;
    const filePath = path.join(process.cwd(), 'main-gamedata', 'progressive-data', 'tasks', `${taskId}.json`);

    await withFileLock(filePath, async () => {
      await fs.unlink(filePath);
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete task:', error);
    res.status(500).json({ error: error.message || 'Failed to delete task' });
  }
});

// ============================================
// IMAGES ROUTES  
// ============================================

router.get('/images', async (req: Request, res: Response) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const files = await fs.readdir(uploadsDir);
    
    const images = await Promise.all(
      files
        .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
        .map(async (filename) => {
          const filePath = path.join(uploadsDir, filename);
          const stats = await fs.stat(filePath);
          return {
            filename,
            path: `/uploads/${filename}`,
            size: stats.size,
            uploadedAt: stats.mtime,
          };
        })
    );
    
    res.json({ images });
  } catch (error) {
    console.error('Failed to load images:', error);
    res.status(500).json({ error: 'Failed to load images' });
  }
});

router.delete('/images/:filename', async (req: Request, res: Response) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    await fs.unlink(filePath);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete image:', error);
    res.status(500).json({ error: error.message || 'Failed to delete image' });
  }
});

export default router;