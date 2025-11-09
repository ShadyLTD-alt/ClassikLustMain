# ⚠️ DEPRECATED DIRECTORY

This directory (`main-gamedata/character-data/`) is **NO LONGER USED** by the game.

## 🚫 DO NOT USE THIS DIRECTORY

All character data is now loaded from:
```
main-gamedata/progressive-data/characters/
```

## Why This Directory Exists

This directory contains legacy character files from an older version of the game before the data structure was reorganized. These files are kept for historical reference only.

## Current Character Files Location

**Active Directory:**
- `main-gamedata/progressive-data/characters/aria.json`
- `main-gamedata/progressive-data/characters/frost.json`
- `main-gamedata/progressive-data/characters/shadow.json`
- `main-gamedata/progressive-data/characters/stella.json`

## What Loads These Files

1. **unifiedDataLoader.ts** - Loads from `progressive-data/characters/`
2. **admin.ts routes** - Saves to `progressive-data/characters/`
3. **MasterDataService.ts** - References progressive-data

## Migration Notes

If you need to add a new character:
1. Create `{character-id}.json` in `progressive-data/characters/`
2. Use lowercase kebab-case for character ID (e.g., `dark-assassin`)
3. Restart server to reload character cache

## Safe to Delete?

Yes, this directory can be safely deleted. It is not referenced anywhere in the current codebase.

---

**Last Updated:** November 8, 2025  
**Status:** Deprecated - Use `progressive-data/characters/` instead