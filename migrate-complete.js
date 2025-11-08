#!/usr/bin/env node
/**
 * 🔧 COMPLETE DATA MIGRATION SCRIPT
 * 
 * Fixes BOTH issues from config refactor:
 * 1. Upgrade ID mismatch (perTap → tap-power)
 * 2. Character ID mismatch (shadow/frost → dark-assassin/ice-warrior)
 */

const fs = require('fs');
const path = require('path');

// Mapping from old upgrade IDs to new template IDs
const UPGRADE_ID_MAP = {
  'perTap': 'tap-power',
  'perHour': 'passive-income',
  'energyMax': 'energy-capacity',
  'energyRegen': 'energy-regen',
  'criticalChance': 'critical-chance',
  'incomeMultiplier': 'income-multiplier'
};

// Mapping from old character IDs to new template IDs
const CHARACTER_ID_MAP = {
  'shadow': 'dark-assassin',
  'frost': 'ice-warrior',
  'default': 'aria'
};

async function migrateAllPlayerData() {
  console.log('🔧 Starting Complete Data Migration...\n');
  console.log('This will fix:');
  console.log('  1. Upgrade IDs (perTap → tap-power, etc.)');
  console.log('  2. Character IDs (shadow → dark-assassin, frost → ice-warrior)');
  console.log('');
  
  const playerDataDir = path.join(process.cwd(), 'main-gamedata', 'player-data');
  
  try {
    const folders = fs.readdirSync(playerDataDir);
    let totalUpgradesMigrated = 0;
    let totalCharactersMigrated = 0;
    let totalPlayers = 0;
    
    for (const folder of folders) {
      const playerStatePath = path.join(playerDataDir, folder, 'player-state.json');
      
      if (!fs.existsSync(playerStatePath)) continue;
      
      totalPlayers++;
      console.log(`📁 Processing: ${folder}`);
      
      const playerData = JSON.parse(fs.readFileSync(playerStatePath, 'utf-8'));
      let hasChanges = false;
      
      // PART 1: Migrate Upgrade IDs
      if (playerData.upgrades && typeof playerData.upgrades === 'object') {
        const oldUpgrades = playerData.upgrades;
        const newUpgrades = {};
        let upgradeMigrations = 0;
        
        for (const [oldKey, level] of Object.entries(oldUpgrades)) {
          const newKey = UPGRADE_ID_MAP[oldKey] || oldKey;
          
          if (oldKey !== newKey) {
            console.log(`  ✅ Upgrade: "${oldKey}" → "${newKey}" (level ${level})`);
            upgradeMigrations++;
            totalUpgradesMigrated++;
            hasChanges = true;
          }
          
          newUpgrades[newKey] = level;
        }
        
        if (upgradeMigrations > 0) {
          playerData.upgrades = newUpgrades;
          console.log(`     Migrated ${upgradeMigrations} upgrade(s)`);
        }
      }
      
      // PART 2: Migrate Character IDs
      let characterMigrations = 0;
      
      if (playerData.selectedCharacterId) {
        const oldId = playerData.selectedCharacterId;
        const newId = CHARACTER_ID_MAP[oldId] || oldId;
        
        if (oldId !== newId) {
          console.log(`  ✅ Selected Character: "${oldId}" → "${newId}"`);
          playerData.selectedCharacterId = newId;
          characterMigrations++;
          totalCharactersMigrated++;
          hasChanges = true;
        }
      }
      
      if (Array.isArray(playerData.unlockedCharacters)) {
        const oldUnlocked = playerData.unlockedCharacters;
        const newUnlocked = oldUnlocked.map(oldId => {
          const newId = CHARACTER_ID_MAP[oldId] || oldId;
          if (oldId !== newId) {
            console.log(`  ✅ Unlocked Character: "${oldId}" → "${newId}"`);
            characterMigrations++;
            totalCharactersMigrated++;
            hasChanges = true;
          }
          return newId;
        });
        
        playerData.unlockedCharacters = [...new Set(newUnlocked)];
      }
      
      if (!playerData.unlockedCharacters || !playerData.unlockedCharacters.includes('aria')) {
        if (!playerData.unlockedCharacters) playerData.unlockedCharacters = [];
        playerData.unlockedCharacters.push('aria');
        console.log(`  ✅ Added starter character: "aria"`);
        hasChanges = true;
      }
      
      if (!playerData.selectedCharacterId) {
        playerData.selectedCharacterId = 'aria';
        console.log(`  ✅ Set default selected character: "aria"`);
        hasChanges = true;
      }
      
      if (characterMigrations > 0) {
        console.log(`     Migrated ${characterMigrations} character reference(s)`);
      }
      
      if (hasChanges) {
        const backupPath = playerStatePath + '.backup';
        fs.writeFileSync(backupPath, JSON.stringify(JSON.parse(fs.readFileSync(playerStatePath, 'utf-8')), null, 2));
        console.log(`  💾 Backup created: ${path.basename(backupPath)}`);
        
        playerData.updatedAt = new Date().toISOString();
        fs.writeFileSync(playerStatePath, JSON.stringify(playerData, null, 2));
        console.log(`  ✅ Updated player-state.json\n`);
      } else {
        console.log(`  ✅ Already up-to-date\n`);
      }
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Players processed: ${totalPlayers}`);
    console.log(`Upgrade IDs fixed: ${totalUpgradesMigrated}`);
    console.log(`Character IDs fixed: ${totalCharactersMigrated}`);
    console.log('');
    console.log('🎉 Your data is now synchronized!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Restart your server');
    console.log('  2. Hard refresh your browser (Ctrl+Shift+R)');
    console.log('  3. Both upgrades AND character selection should work!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateAllPlayerData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});