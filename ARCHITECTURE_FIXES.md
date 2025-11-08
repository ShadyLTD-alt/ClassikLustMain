# Luna Data Architecture Fixes

## 📝 Summary

This PR fixes critical data architecture issues with **tasks folder path** while **preserving the working upgrades/characters/levels/achievements systems**.

## 🐞 The Bug

**Problem:** Tasks were being saved to `progressive-data/task/` (singular) but the code was trying to read from `progressive-data/tasks/` (plural), causing a mismatch.

**Result:**
- New tasks saved in admin panel went to `task/` folder
- Game tried to load tasks from `tasks/` folder
- Tasks appeared to save but didn't show up in game

## ✅ What Was Fixed

### Core Files Updated

1. **`server/utils/dataLoader.ts`**
   - 🔧 Fixed `saveTaskToJSON` to use `tasks/` (plural) instead of `task/` (singular)
   - Line changed: `const taskDir = path.join(__dirname, "../../main-gamedata/progressive-data/tasks");`

2. **`server/utils/MasterDataService.ts`**  
   - 🔧 Fixed `progressivePaths.tasks` to point to `tasks/` (plural)
   - Line changed: `tasks: path.join(__dirname, '../../main-gamedata/progressive-data/tasks')`

### What Still Works

✅ **Upgrades** - Continue using `master-data/upgrades-master.json` (perfect, no changes)  
✅ **Characters** - Continue using `master-data/character-master.json` (perfect, no changes)  
✅ **Levels** - Continue using `progressive-data/levelup/` (working, no changes)  
✅ **Achievements** - Continue using `progressive-data/achievements/` (working, no changes)  
✅ **Tasks** - NOW FIXED to use `progressive-data/tasks/` consistently

## 📁 Correct Folder Structure

```
main-gamedata/
├── progressive-data/          ← Runtime game data (single source of truth)
│   ├── levelup/              ← Level JSON files (level-1.json, level-2.json, etc.)
│   ├── tasks/                ← ✅ FIXED: Task JSON files (now consistent)
│   ├── achievements/         ← Achievement JSON files
│   └── upgrades/             ← Empty (optional future migration)
└── master-data/              ← Master templates (used by upgrades/characters)
    ├── upgrades-master.json  ← Upgrades (working perfectly)
    └── character-master.json ← Characters (working perfectly)
```

## 🚀 Testing the Fix

### Before Merging

1. Check if you have files in the old `task/` folder:
   ```bash
   ls main-gamedata/progressive-data/task/
   ```

2. If files exist there, **move them** to `tasks/`:
   ```bash
   mv main-gamedata/progressive-data/task/*.json main-gamedata/progressive-data/tasks/
   ```

3. Remove the empty `task/` folder:
   ```bash
   rmdir main-gamedata/progressive-data/task/
   ```

### After Merging

1. **Create a new task** in admin panel
2. **Verify file location:**
   ```bash
   # Should appear here (plural):
   ls main-gamedata/progressive-data/tasks/
   ```

3. **Check game loads it:**
   - Restart server
   - Open tasks page
   - New task should appear

## 🔄 Migration Steps (If You Have Old Task Files)

### Option 1: Manual Move (Safe)

```bash
# 1. Check what's in old location
ls -la main-gamedata/progressive-data/task/

# 2. Move all JSON files to correct location
mv main-gamedata/progressive-data/task/*.json main-gamedata/progressive-data/tasks/

# 3. Remove empty old folder
rmdir main-gamedata/progressive-data/task/

# 4. Verify
ls -la main-gamedata/progressive-data/tasks/
```

### Option 2: Let Server Create New (Start Fresh)

```bash
# Just delete the old folder
rm -rf main-gamedata/progressive-data/task/

# New tasks will be created in correct location
```

## 📚 How It Works Now

### Upgrades Pattern (Already Working)
```typescript
// Load from master-data (array in one file)
syncUpgrades() {
  const path = 'master-data/upgrades-master.json';
  const data = loadFile<{ upgrades: Upgrade[] }>(path);
  // Cache in memory
  // Sync to DB
}

// Save back to master-data
saveUpgradeToJSON(upgrade) {
  const path = 'master-data/upgrades-master.json';
  const data = loadFile();
  data.upgrades.push(upgrade); // or update existing
  writeFile(path, data);
}
```

### Tasks Pattern (NOW FIXED)
```typescript
// Load from progressive-data (individual files)
syncTasks() {
  const dir = 'progressive-data/tasks/';  // ← FIXED: tasks (plural)
  const files = readDirectory(dir);
  files.forEach(file => {
    const task = loadFile(dir + file);
    // Cache in memory
  });
}

// Save to progressive-data
saveTaskToJSON(task) {
  const path = `progressive-data/tasks/${task.id}.json`;  // ← FIXED: tasks (plural)
  writeFile(path, task);
}
```

## ❓ FAQ

### Q: Will this break my existing tasks?
**A:** No! You just need to move the files from `task/` to `tasks/`. See migration steps above.

### Q: What about upgrades?
**A:** Zero changes! Upgrades continue working perfectly with the master-data pattern.

### Q: Do I need to update any other code?
**A:** No! The fix is only in the two files listed above. Everything else stays the same.

### Q: What if I don't have a `task/` folder?
**A:** Then you're good! The fix just ensures new tasks save to the correct `tasks/` location.

## 🛡️ Rollback Plan

If something breaks:

```bash
# Revert the PR
git checkout main
git pull

# Or manually revert just the two files:
git checkout main -- server/utils/dataLoader.ts
git checkout main -- server/utils/MasterDataService.ts
```

## ✅ Checklist Before Merging

- [ ] Move any files from `task/` to `tasks/` (if they exist)
- [ ] Remove empty `task/` folder
- [ ] Merge this PR to main
- [ ] Restart server
- [ ] Test creating a new task in admin panel
- [ ] Verify task file appears in `progressive-data/tasks/`
- [ ] Verify task shows up in game

## 👏 What This Fixes

✅ **Tasks save to correct folder** (`tasks/` instead of `task/`)  
✅ **Tasks load from correct folder** (`tasks/` consistently)  
✅ **New tasks appear in game** (no more phantom saves)  
✅ **Consistent with existing patterns** (plural folder names)  
✅ **No changes to upgrades/characters** (still working perfectly)  

---

**Type:** Bug Fix  
**Impact:** Tasks only  
**Risk:** Low (isolated change, easy rollback)  
**Testing:** Manual (create task, verify file location)  

**Created by:** AI Assistant  
**Date:** November 8, 2025  
**Branch:** `fix/data-architecture-improvements`  
