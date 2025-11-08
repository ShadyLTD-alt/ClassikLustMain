# Game Configuration Architecture

## 🎯 Single Source of Truth Pattern

This project follows a **strict single source of truth** pattern for all game configuration and data.

---

## 📁 File Structure Overview

```
ClassikLustMain/
├── server/
│   ├── gameConfig.ts          ✅ Types, interfaces, constants ONLY
│   └── utils/
│       └── unifiedDataLoader.ts  ✅ SINGLE data loader (progressive-data)
│
└── main-gamedata/
    ├── master-data/          ✏️  Admin editing ONLY
    │   ├── achievements-master.json
    │   ├── character-master.json
    │   ├── levelup-master.json
    │   ├── tasks-master.json
    │   └── upgrades-master.json
    │
    └── progressive-data/     ✅ RUNTIME SOURCE (single source of truth)
        ├── levelup/
        │   ├── level-1.json
        │   ├── level-2.json
        │   └── ...
        ├── tasks/
        │   ├── task-id-1.json
        │   └── ...
        ├── achievements/
        │   ├── achievement-id-1.json
        │   └── ...
        ├── upgrades/
        │   ├── upgrade-id-1.json
        │   └── ...
        └── characters/
            ├── character-id-1.json
            └── ...
```

---

## ✅ Current Architecture (CORRECT)

### 1. **gameConfig.ts** - Type Definitions & Constants
- **Purpose**: Defines TypeScript interfaces and game constants
- **Contains**: 
  - Type definitions (`LevelConfig`, `UpgradeConfig`, etc.)
  - Game constants (`ENERGY_REGEN_RATE`, `BASE_EXP_REQUIREMENT`, etc.)
  - Helper functions (`calculateExpRequirement`, etc.)
- **Does NOT contain**: Actual game data arrays

### 2. **unifiedDataLoader.ts** - Single Data Loader
- **Purpose**: THE ONLY file that loads game data at runtime
- **Data Source**: `main-gamedata/progressive-data/` directories
- **Features**:
  - In-memory caching for fast access
  - File-lock protected writes
  - Database synchronization
  - CRUD operations for all content types
- **Used by**: All routes, game logic, admin panel

### 3. **progressive-data/** - Runtime Data (Single Source of Truth)
- **Purpose**: Contains ALL active game data
- **Structure**: Individual JSON files per item
- **Example**: `level-5.json`, `upgrade-energy-regen.json`
- **When modified**: Changes take effect immediately on next sync
- **Backup**: Git-tracked, version-controlled

### 4. **master-data/** - Admin UI Templates
- **Purpose**: Templates for bulk editing in admin panel
- **Usage**: Admin can edit these, then sync to progressive-data
- **NOT used**: For runtime game logic
- **Example workflow**:
  1. Admin edits `levelup-master.json` in admin panel
  2. Clicks "Sync to Progressive Data"
  3. System creates/updates individual files in `progressive-data/levelup/`
  4. Game runtime reads from `progressive-data/levelup/`

---

## ❌ Deleted Files (REMOVED)

These files were **redundant** and caused configuration conflicts:

- ❌ `server/utils/dataLoader.ts` - Replaced by unifiedDataLoader
- ❌ `server/utils/levelsProgressive.ts` - Levels now in unifiedDataLoader
- ❌ Any standalone `gameContext.ts` with hardcoded data arrays

---

## 🔄 Data Flow

### Runtime (Game Playing)
```
Game Request → unifiedDataLoader.getDataFromMemory() → progressive-data/ → Response
```

### Admin Editing
```
Admin UI → Edit master-data/*.json → Click Sync → Write to progressive-data/ → unifiedDataLoader syncs
```

### Server Startup
```
index.ts → syncAllGameData() → Load all progressive-data/ into memory cache
```

---

## 🛠️ Development Guidelines

### ✅ DO:
1. **Always read from `unifiedDataLoader`**
   ```typescript
   import { getLevelsFromMemory, getUpgradesFromMemory } from './utils/unifiedDataLoader';
   const levels = getLevelsFromMemory();
   ```

2. **Always write via `unifiedDataLoader`**
   ```typescript
   import { saveGameData } from './utils/unifiedDataLoader';
   await saveGameData('levels', levelConfig);
   ```

3. **Use gameConfig.ts for types only**
   ```typescript
   import type { LevelConfig, UpgradeConfig } from './gameConfig';
   ```

### ❌ DON'T:
1. ❌ Create new data loaders or config files
2. ❌ Hardcode game data in TypeScript files
3. ❌ Read from `master-data/` at runtime
4. ❌ Create data arrays in route files
5. ❌ Bypass `unifiedDataLoader` for data access

---

## 🔍 Debugging Config Issues

### Problem: "Data not loading"
**Check**:
1. Does the file exist in `progressive-data/`?
2. Is `syncAllGameData()` called in `index.ts`?
3. Check server logs for sync errors

### Problem: "Admin changes not reflected"
**Solution**:
1. Admin edits affect `master-data/` only
2. Must click "Sync to Progressive Data" button
3. Check that sync created files in `progressive-data/`

### Problem: "Conflicting data sources"
**This should NOT happen anymore** - we deleted all redundant loaders.

---

## 📚 API Reference

### unifiedDataLoader.ts

#### Load Data
```typescript
// Get all items of a type
getLevelsFromMemory(): LevelConfig[]
getTasksFromMemory(): TaskConfig[]
getAchievementsFromMemory(): AchievementConfig[]
getUpgradesFromMemory(): UpgradeConfig[]
getCharactersFromMemory(): CharacterConfig[]

// Get single item
getLevelFromMemory(id: string): LevelConfig | undefined
getTaskFromMemory(id: string): TaskConfig | undefined
// etc.
```

#### Save Data
```typescript
await saveGameData('levels', levelConfig);
await saveGameData('tasks', taskConfig);
await saveGameData('achievements', achievementConfig);
await saveGameData('upgrades', upgradeConfig);
await saveGameData('characters', characterConfig);
```

#### Sync Operations
```typescript
// Reload all data from disk
await syncAllGameData();

// Sync specific type
await syncLevels();
await syncTasks();
await syncAchievements();
await syncUpgrades();
await syncCharacters();
```

---

## 🔒 Benefits of This Architecture

1. **No Config Conflicts**: Single source = no sync issues
2. **Git-Friendly**: Each item is a separate file
3. **Easy Rollback**: Git history tracks every change
4. **Fast Performance**: In-memory cache for reads
5. **Safe Writes**: File locking prevents corruption
6. **Clear Separation**: Master templates vs runtime data
7. **Scalable**: Easy to add new content types

---

## 🚨 Critical Rules

1. **NEVER create arrays of game data in TypeScript files**
2. **NEVER read from master-data/ at runtime**
3. **ALWAYS use unifiedDataLoader for data access**
4. **ALWAYS sync master-data to progressive-data via admin UI**
5. **gameConfig.ts contains ONLY types and constants**

---

## ✉️ Questions?

If you need to:
- Add a new content type (e.g., "skills")
- Modify data structure
- Debug data loading

Refer to `unifiedDataLoader.ts` and follow existing patterns.

---

**Last Updated**: November 8, 2025  
**Architecture Version**: 2.0 (Unified Data Loader)
