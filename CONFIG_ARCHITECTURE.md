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
│       ├── masterDataSync.ts     ✏️  Syncs master-data → progressive-data
│       └── unifiedDataLoader.ts  ✅ RUNTIME loader (progressive-data)
│
└── main-gamedata/
    ├── master-data/          ✏️  Admin bulk editing templates
    │   ├── achievements-master.json
    │   ├── character-master.json
    │   ├── levelup-master.json
    │   ├── tasks-master.json
    │   └── upgrades-master.json
    │
    └── progressive-data/     ✅ GAME RUNTIME (single source of truth)
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

### 2. **master-data/*.json** - Admin Bulk Edit Templates
- **Purpose**: Bulk editing interface for admins (via admin panel UI)
- **Format**: Arrays of all items in one file (e.g., `{"levels": [...]}`)
- **Example**: `levelup-master.json` contains ALL levels
- **Usage**: 
  1. Admin opens admin panel
  2. Edits master JSON via UI
  3. **Clicks "Sync to Progressive Data"**
  4. `masterDataSync.ts` copies to progressive-data/
- **NOT used for**: Game runtime

### 3. **masterDataSync.ts** - Sync Master → Progressive
- **Purpose**: Converts bulk master JSONs to individual progressive files
- **Trigger**: Admin clicks sync button in admin panel
- **Process**:
  ```typescript
  // Read master-data/levelup-master.json { levels: [...] }
  // Write progressive-data/levelup/level-1.json
  // Write progressive-data/levelup/level-2.json
  // etc.
  ```
- **Functions**:
  - `syncLevelsFromMaster()`
  - `syncTasksFromMaster()`
  - `syncAchievementsFromMaster()`
  - `syncUpgradesFromMaster()`
  - `syncCharactersFromMaster()`
  - `syncAllMasterData()` - syncs everything

### 4. **unifiedDataLoader.ts** - Runtime Data Loader
- **Purpose**: THE ONLY file that loads game data at runtime
- **Data Source**: `main-gamedata/progressive-data/` directories **ONLY**
- **Never reads from**: master-data/
- **Features**:
  - In-memory caching for fast access
  - File-lock protected writes
  - Database synchronization
  - CRUD operations for all content types
- **Used by**: All routes, game logic, admin panel for display

### 5. **progressive-data/** - Game Runtime Source (Single Source of Truth)
- **Purpose**: Contains ALL active game data that game actually uses
- **Structure**: Individual JSON files per item
- **Example**: `level-5.json`, `upgrade-energy-regen.json`
- **When modified**: Changes take effect immediately on next sync/restart
- **Backup**: Git-tracked, version-controlled
- **This is where the game reads from!**

---

## 🔄 Complete Data Flow

### ✏️ Admin Editing Workflow (Correct)
```
1. Admin opens Admin Panel
2. Admin edits master-data/levelup-master.json via UI
3. Admin clicks "Sync to Progressive Data" button
4. masterDataSync.syncLevelsFromMaster() executes:
   └─ Reads master-data/levelup-master.json
   └─ For each level:
       └─ Writes progressive-data/levelup/level-X.json
5. unifiedDataLoader.syncLevels() reloads from progressive-data/
6. Game now uses updated data
```

### 🎮 Game Runtime (What Players See)
```
Player Action → API Route → unifiedDataLoader.getLevelsFromMemory() 
              → Returns data from progressive-data/ cache → Response
```

### 🚀 Server Startup
```
index.ts → syncAllGameData() → unifiedDataLoader loads progressive-data/ into RAM
```

---

## 🛠️ Development Guidelines

### ✅ DO:

1. **Edit master JSONs via admin panel**
   - Open admin panel UI
   - Edit `master-data/*.json` files
   - Click "Sync to Progressive Data"

2. **Always read from `unifiedDataLoader` in code**
   ```typescript
   import { getLevelsFromMemory } from './utils/unifiedDataLoader';
   const levels = getLevelsFromMemory(); // Reads from progressive-data
   ```

3. **Use masterDataSync for bulk updates**
   ```typescript
   import { syncAllMasterData } from './utils/masterDataSync';
   await syncAllMasterData(); // Syncs master → progressive
   ```

4. **Use gameConfig.ts for types only**
   ```typescript
   import type { LevelConfig } from './gameConfig';
   ```

### ❌ DON'T:

1. ❌ Read from `master-data/` at runtime (use progressive-data via unifiedDataLoader)
2. ❌ Create new data loaders or config files
3. ❌ Hardcode game data in TypeScript files
4. ❌ Create data arrays in route files
5. ❌ Bypass `unifiedDataLoader` for data access
6. ❌ Edit progressive-data files manually (use admin panel + sync)

---

## 🧪 Why This Two-Step System?

### Master JSONs (Bulk Templates)
**Advantages**:
- ✅ Easy to edit all items at once in admin UI
- ✅ Can see relationships between items
- ✅ Copy/paste friendly
- ✅ Good for initial setup

### Progressive Data (Individual Files)
**Advantages**:
- ✅ Git-friendly (each change = one file)
- ✅ Easy rollback (git history per item)
- ✅ Parallel editing (no conflicts)
- ✅ Scalable (thousands of items)
- ✅ Fast loading (can lazy-load)

**Result**: Best of both worlds! Bulk editing + granular version control.

---

## 🔍 Debugging Config Issues

### Problem: "Data not loading in game"
**Check**:
1. Does the data exist in `progressive-data/` (NOT just master-data/)?
2. If not, run sync: `syncAllMasterData()` or use admin panel sync button
3. Check server logs for `unifiedDataLoader` errors
4. Verify `syncAllGameData()` is called in `index.ts`

### Problem: "Admin edits not reflected in game"
**Solution**:
1. Admin edits affect `master-data/` **only**
2. **Must click "Sync to Progressive Data" button**
3. Verify sync created/updated files in `progressive-data/`
4. May need to restart server to reload cache

### Problem: "Changes lost after restart"
**Cause**: You edited progressive-data directly, but master-data still has old values  
**Solution**: Always edit via master JSON + sync, so both stay in sync

---

## 📚 API Reference

### masterDataSync.ts (Admin Panel Backend)

```typescript
// Sync specific type from master to progressive
await syncLevelsFromMaster();
await syncTasksFromMaster();
await syncAchievementsFromMaster();
await syncUpgradesFromMaster();
await syncCharactersFromMaster();

// Sync everything
await syncAllMasterData();

// Returns:
// {
//   success: boolean,
//   results: {
//     levels: { count: 50, error?: string },
//     tasks: { count: 20, error?: string },
//     ...
//   }
// }
```

### unifiedDataLoader.ts (Game Runtime)

#### Load Data (Always from progressive-data)
```typescript
// Get all items
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

#### Save Data (Writes to progressive-data)
```typescript
// These write directly to progressive-data/
// Use when creating/editing individual items
await saveGameData('levels', levelConfig);
await saveGameData('tasks', taskConfig);
await saveGameData('achievements', achievementConfig);
await saveGameData('upgrades', upgradeConfig);
await saveGameData('characters', characterConfig);
```

#### Reload from Disk
```typescript
// Reload all data from progressive-data/ into memory
await syncAllGameData();

// Sync specific type
await syncLevels();
await syncTasks();
// etc.
```

---

## 🔒 Benefits of This Architecture

1. **No Config Conflicts**: Progressive-data is single source for runtime
2. **Easy Bulk Editing**: Master JSONs for admin convenience
3. **Git-Friendly**: Individual files in progressive-data
4. **Easy Rollback**: Git history tracks every item change
5. **Fast Performance**: In-memory cache from progressive-data
6. **Safe Writes**: File locking prevents corruption
7. **Clear Workflow**: Edit master → Sync → Progressive → Game
8. **Scalable**: Works with thousands of items

---

## 🚨 Critical Rules

1. **master-data/**: Admin editing ONLY, never used by game runtime
2. **progressive-data/**: SINGLE source of truth for game runtime
3. **Always sync**: After editing master, sync to progressive
4. **unifiedDataLoader**: ONLY reads from progressive-data
5. **gameConfig.ts**: Types and constants ONLY, no data
6. **Never hardcode**: Game data always comes from JSON files

---

## 👥 Quick Reference for Different Roles

### For Game Developers (Coding)
- Use `unifiedDataLoader` for ALL data access
- Import types from `gameConfig.ts`
- Never hardcode game data

### For Content Designers (Admin Panel)
- Edit `master-data/*.json` via admin UI
- Click "Sync to Progressive Data" after changes
- Changes appear in game after sync

### For DevOps/Deployment
- Ensure both `master-data/` and `progressive-data/` are deployed
- Server startup calls `syncAllGameData()` (loads progressive)
- Can run `syncAllMasterData()` to rebuild progressive from master

---

## ✉️ Questions?

If you need to:
- **Add new content**: Edit master JSON → Sync → Done
- **Add new content type**: Update both `masterDataSync.ts` and `unifiedDataLoader.ts`
- **Restore from backup**: Copy progressive-data files from git history
- **Bulk import**: Edit master JSON with all items → Sync once

---

**Last Updated**: November 8, 2025  
**Architecture Version**: 2.0 (Master → Progressive → Runtime)
