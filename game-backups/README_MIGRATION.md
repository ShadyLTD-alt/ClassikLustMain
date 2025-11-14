# 🔧 Config Refactor Data Migration

## What Happened?

During the previous config refactor (merging 5 config files into 1), the upgrade and character IDs were changed but your player save files weren't updated. This caused:

1. **Upgrades not displaying** - Your level 30 perTap became invisible because the system looks for "tap-power" now
2. **Character selection broken** - Your "shadow" character doesn't exist anymore, it's now "dark-assassin"

## The Problems (BOTH Found!)

### Problem 1: Upgrade IDs Changed ❌

**Your player-state.json has:**
```json
"upgrades": {
  "perTap": 30,
  "perHour": 19,
  "energyMax": 17,
  "criticalChance": 22
}
```

**But templates now expect:**
```json
"upgrades": {
  "tap-power": 30,
  "passive-income": 19,
  "energy-capacity": 17,
  "critical-chance": 22
}
```

### Problem 2: Character IDs Changed ❌

**Your player-state.json has:**
```json
"selectedCharacterId": "shadow",
"unlockedCharacters": ["frost", "shadow"]
```

**But character files are now:**
- `aria.json` (starter character)
- `dark-assassin.json` (was "shadow")
- `ice-warrior.json` (was "frost")
- `pink-mage.json` (new character)

## The Fix ✅

Run the complete migration script:

```bash
node migrate-complete.js
```

This will automatically:

### ✅ Fix Upgrade IDs
| Old ID | New ID |
|--------|--------|
| `perTap` | `tap-power` |
| `perHour` | `passive-income` |
| `energyMax` | `energy-capacity` |
| `energyRegen` | `energy-regen` |
| `criticalChance` | `critical-chance` |
| `incomeMultiplier` | `income-multiplier` |

### ✅ Fix Character IDs
| Old ID | New ID |
|--------|--------|
| `shadow` | `dark-assassin` |
| `frost` | `ice-warrior` |
| `default` | `aria` |

### ✅ Safety Features
- Creates `.backup` file before modifying
- Preserves all your level values
- Adds `aria` as starter character if missing
- Removes duplicate character IDs
- Updates `updatedAt` timestamp

## After Migration

Your `player-state.json` will be fixed:

```json
{
  "upgrades": {
    "tap-power": 30,
    "passive-income": 19,
    "energy-capacity": 17,
    "energy-regen": 8,
    "critical-chance": 22,
    "income-multiplier": 6
  },
  "selectedCharacterId": "dark-assassin",
  "unlockedCharacters": ["aria", "ice-warrior", "dark-assassin"]
}
```

## Verification Steps

1. **Run migration**:
   ```bash
   node migrate-complete.js
   ```

2. **Check the output** - should show:
   ```
   ✅ Upgrade: "perTap" → "tap-power" (level 30)
   ✅ Selected Character: "shadow" → "dark-assassin"
   ✅ Unlocked Character: "frost" → "ice-warrior"
   ```

3. **Restart your server**:
   ```bash
   npm run dev
   ```

4. **Hard refresh browser**: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

5. **Test upgrades menu** - Should now show correct levels (30, 19, 17, etc.)

6. **Test character selection** - Should now show and work with dark-assassin and ice-warrior

## Why This Happened

The config refactor changed from separate files with different naming conventions to unified files with consistent kebab-case IDs:

**Before (5 files):**
- Upgrades used: `perTap`, `perHour` (camelCase)
- Characters used: `shadow`, `frost` (lowercase)

**After (1 unified file):**
- Everything uses: `tap-power`, `dark-assassin` (kebab-case)

Your code was updated but the player save files weren't migrated, causing the mismatch.

## Root Cause

When `UpgradePanel` tries to display:
```typescript
const lvl = state.upgrades[upgrade.id] || 0;
```

It looks for `state.upgrades["tap-power"]` but your file has `perTap`, so it returns 0.

Same for characters:
```typescript
const isSelected = state.selectedCharacterId === character.id;
```

It compares `"shadow"` === `"dark-assassin"`, which is false, so nothing appears selected.

## Rollback

If something goes wrong:
1. Stop the migration immediately
2. Restore from `.backup` files:
   ```bash
   cp main-gamedata/player-data/*/player-state.json.backup main-gamedata/player-data/*/player-state.json
   ```

---

**TL;DR**: Config refactor changed IDs but didn't update your save files. Run `node migrate-complete.js` to fix both upgrades and characters!