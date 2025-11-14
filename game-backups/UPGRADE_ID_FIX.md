# 🔧 Upgrade ID Mismatch - FOUND & FIXED

## The Problem

Your `player-state.json` uses **different upgrade IDs** than your template files:

### ❌ What player-state.json Has:
```json
"upgrades": {
  "perHour": 19,
  "energyMax": 17,
  "incomeMultiplier": 6,
  "energyRegen": 8,
  "criticalChance": 22,
  "perTap": 30
}
```

### ✅ What Templates Expect:
```
progressive-data/upgrades/
  ├── tap-power.json         (id: "tap-power")
  ├── passive-income.json    (id: "passive-income")
  ├── energy-capacity.json   (id: "energy-capacity")
  ├── energy-regen.json      (id: "energy-regen")
  ├── critical-chance.json   (id: "critical-chance")
  └── income-multiplier.json (id: "income-multiplier")
```

## Why This Breaks Display

When the UpgradePanel tries to display your upgrades:

```typescript
// UpgradePanel.tsx line ~55
const lvl = state.upgrades[upgrade.id] || 0;
```

It looks for `state.upgrades["tap-power"]` but your player-state.json has `perTap`, so it gets `undefined` and defaults to level 0!

## The Fix

### Run the Migration Script:

```bash
node migrate-upgrade-ids.js
```

This will:
1. ✅ Rename all upgrade IDs in your player-state.json to match templates
2. ✅ Create a backup of your original file (.backup)
3. ✅ Update the `updatedAt` timestamp
4. ✅ Preserve all your level values

### ID Mapping:

| Old ID (player-state.json) | New ID (templates) |
|----------------------------|--------------------|
| `perTap` | `tap-power` |
| `perHour` | `passive-income` |
| `energyMax` | `energy-capacity` |
| `energyRegen` | `energy-regen` |
| `criticalChance` | `critical-chance` |
| `incomeMultiplier` | `income-multiplier` |

## After Migration

Your `player-state.json` will look like:

```json
"upgrades": {
  "passive-income": 19,
  "energy-capacity": 17,
  "income-multiplier": 6,
  "energy-regen": 8,
  "critical-chance": 22,
  "tap-power": 30
}
```

Now the frontend will find `state.upgrades["tap-power"]` and correctly show level 30! 🎉

## Verification

1. **Run migration**: `node migrate-upgrade-ids.js`
2. **Restart server**: Stop and restart your development server
3. **Hard refresh browser**: Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
4. **Open upgrade menu**: Your upgrades should now show correct levels!

## Root Cause

This happened because:
1. Your player-state.json was using camelCase IDs (`perTap`, `energyMax`)
2. Your template files use kebab-case IDs (`tap-power`, `energy-capacity`)
3. The system correctly loads both, but the **mismatch** means the lookup fails

## Character Selection

Character selection should work fine because:
- player-state.json has: `"selectedCharacterId": "shadow"`
- Template file is: `main-gamedata/progressive-data/characters/*.json` with matching IDs

If you're having issues with characters, check that:
1. The `selectedCharacterId` value matches an actual character file ID
2. The character is in your `unlockedCharacters` array

## Prevention

To avoid this in the future:
1. Always use the same ID format everywhere (kebab-case recommended)
2. When purchasing upgrades, the system now uses template IDs automatically
3. New players will get correct IDs from the start

---

**TL;DR**: Your routing was correct. The issue was ID naming mismatch. Run `node migrate-upgrade-ids.js` to fix it!