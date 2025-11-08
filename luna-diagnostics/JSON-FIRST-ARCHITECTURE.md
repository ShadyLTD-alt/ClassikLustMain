# 🤖 Luna Diagnostic Report: JSON-First Architecture

## 🚨 CRITICAL ARCHITECTURAL REQUIREMENT

**THE GOLDEN RULE:**  
**NO GAME DATA SHALL EVER BE HARDCODED ANYWHERE IN THE CODEBASE**

All game data must reside in `main-gamedata/` JSON files.  
The database is **SECONDARY** - it's a failsafe/backup only.

---

## 📁 Correct Directory Structure

```
main-gamedata/
├── master-data/                  # Master templates for admin creation/editing
│   ├── character-master.json
│   ├── upgrades-master.json
│   ├── levelup-master.json
│   └── player-master.json
│
├── progressive-data/             # Individual entity JSON files
│   ├── task/                     # Individual task files
│   │   ├── daily-tap-100.json
│   │   └── daily-upgrade-buy.json
│   │
│   ├── achievements/             # Individual achievement files
│   │   ├── first-million.json
│   │   └── upgrade-master.json
│   │
│   └── levelup/                  # Individual level files
│       ├── level-2.json
│       ├── level-3.json
│       └── level-10.json
│
└── player-data/                  # Player-specific JSON-first data
    └── {telegramId}_{username}/
        ├── player-state.json
        └── player-upgrades.json
```

---

## ✅ How Data Should Be Loaded

### 1. **Server Startup**
```typescript
// server/index.ts
import { syncAllGameData } from './utils/dataLoader';

// On server start, load ALL game data from JSON into memory
await syncAllGameData();
```

### 2. **MasterDataService**
```typescript
// server/utils/MasterDataService.ts
class MasterDataService {
  private loadProgressiveData(dirPath: string) {
    // Reads all .json files from directory
    // Returns array of parsed JSON objects
  }
  
  async getTasks(): Promise<any[]> {
    // Loads from progressive-data/task/*.json
  }
  
  async getAchievements(): Promise<any[]> {
    // Loads from progressive-data/achievements/*.json
  }
}
```

### 3. **DataLoader**
```typescript
// server/utils/dataLoader.ts
let tasksCache: Map<string, any> = new Map();
let achievementsCache: Map<string, any> = new Map();

export async function syncTasks() {
  const tasks = await masterDataService.getTasks();
  tasksCache.clear();
  for (const task of tasks) {
    tasksCache.set(task.id, task);
  }
}

export function getTasksFromMemory(): any[] {
  return Array.from(tasksCache.values());
}
```

### 4. **Routes (API Endpoints)**
```typescript
// server/routes.ts
import { getTasksFromMemory, getAchievementsFromMemory } from './utils/dataLoader';

app.get('/api/tasks', requireAuth, async (req, res) => {
  const tasksFromJSON = getTasksFromMemory();  // ✅ Load from JSON!
  res.json({ tasks: tasksFromJSON });
});

app.get('/api/achievements', requireAuth, async (req, res) => {
  const achievementsFromJSON = getAchievementsFromMemory();  // ✅ Load from JSON!
  res.json({ achievements: achievementsFromJSON });
});
```

---

## ❌ What Should NEVER Happen

### 🚨 VIOLATION EXAMPLE (NEVER DO THIS!):

```typescript
// ❌ WRONG - Hardcoded game data in routes.ts
app.get('/api/tasks', requireAuth, async (req, res) => {
  const tasks = [
    { id: 'daily-tap-100', name: 'Daily Tapper', ... },  // ❌ HARDCODED!
    { id: 'daily-upgrade-buy', name: 'Upgrade Hunter', ... }  // ❌ HARDCODED!
  ];
  res.json({ tasks });
});
```

**Why this is wrong:**
1. 🚫 Game data is not in JSON files
2. 🚫 Admin cannot edit it through the admin panel
3. 🚫 Changes require code changes and redeployment
4. 🚫 Violates JSON-first architecture principle

---

## ✅ Correct Pattern (ALL Game Data)

| Data Type    | Source                                  | Loaded By              | Accessed Via                    |
|--------------|----------------------------------------|------------------------|---------------------------------|
| Upgrades     | `master-data/upgrades-master.json`      | `syncUpgrades()`       | `getUpgradesFromMemory()`       |
| Characters   | `master-data/character-master.json`     | `syncCharacters()`     | `getCharactersFromMemory()`     |
| Levels       | `progressive-data/levelup/*.json`       | `syncLevels()`         | `getLevelsFromMemory()`         |
| Tasks        | `progressive-data/task/*.json`          | `syncTasks()`          | `getTasksFromMemory()`          |
| Achievements | `progressive-data/achievements/*.json`  | `syncAchievements()`   | `getAchievementsFromMemory()`   |

---

## 📝 Admin Edit Workflow

### When Admin Edits Game Data:

1. **Admin makes changes in UI**
2. **Server receives update request**
3. **Server updates JSON file** (primary source of truth)
4. **Server reloads memory cache** (for immediate use)
5. **Server optionally syncs to DB** (backup/failsafe)

**Example:**
```typescript
app.post('/api/admin/tasks', requireAdmin, async (req, res) => {
  const task = req.body;
  
  // 1. Save to JSON file (PRIMARY)
  await saveTaskToJSON(task);
  
  // 2. Reload memory cache (IMMEDIATE USE)
  await syncTasks();
  
  // 3. Optionally sync to database (BACKUP)
  await storage.createOrUpdateTask(task);
  
  res.json({ success: true, task });
});
```

---

## 🧠 Luna's Learned Lessons

### Violation History:

#### **Incident 2025-11-07:**
- **Issue:** Tasks and achievements were hardcoded in `routes.ts`
- **Impact:** Admin couldn't edit them, violated architecture
- **Fix:** Created JSON files, updated loaders, removed hardcoded data
- **Prevention:** This document created to prevent recurrence

### Key Takeaways:

1. ✅ **ALWAYS** check if new game data type has JSON files
2. ✅ **ALWAYS** load game data through `MasterDataService`
3. ✅ **NEVER** hardcode game data in any server or client file
4. ✅ **ALWAYS** save admin edits to JSON files first
5. ✅ **ALWAYS** reload memory cache after JSON changes

---

## 🔍 Quick Checklist (Before Code Commit)

- [ ] No hardcoded arrays of game entities in routes/handlers
- [ ] All game data loaded from `main-gamedata/` JSON files
- [ ] `MasterDataService` loads the new data type
- [ ] `dataLoader.ts` caches the data in memory
- [ ] Routes access data via `getXFromMemory()` functions
- [ ] Admin edits save to JSON files (not just DB)
- [ ] Database is used only as secondary/failsafe

---

## 📚 References

- **MasterDataService:** `server/utils/MasterDataService.ts`
- **DataLoader:** `server/utils/dataLoader.ts`
- **Routes:** `server/routes.ts`
- **JSON Files:** `main-gamedata/progressive-data/`
- **Admin Save Functions:** `saveTaskToJSON()`, `saveAchievementToJSON()`, etc.

---

## 🔥 Final Word

**JSON is KING. Database is the BACKUP. Hardcoding is FORBIDDEN.**

If you ever find yourself typing game data directly into a `.ts` file instead of loading it from a `.json` file, **STOP IMMEDIATELY** and refactor to use the JSON-first pattern.

---

*Generated: 2025-11-07*  
*Status: ✅ JSON-First Architecture Fully Enforced*  
*Next Audit: Before any new game data type is added*
