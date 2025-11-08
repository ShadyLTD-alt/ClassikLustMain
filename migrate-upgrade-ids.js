#!/usr/bin/env node
/**
 * 🔧 UPGRADE ID MIGRATION SCRIPT
 * 
 * Fixes the mismatch between player-state.json upgrade keys and template upgrade IDs
 * 
 * PROBLEM:
 * - player-state.json has: perTap, perHour, energyMax, criticalChance
 * - Templates have: tap-power, passive-income, energy-capacity, critical-chance
 * 
 * This script renames the keys to match the template IDs.
 */

const fs = require('fs');
const path = require('path');

// Mapping from old keys to new template IDs
const ID_MIGRATION_MAP = {
  'perTap': 'tap-power',
  'perHour': 'passive-income',
  'energyMax': 'energy-capacity',
  'energyRegen': 'energy-regen',
  'criticalChance': 'critical-chance',
  'incomeMultiplier': 'income-multiplier'
};

async function migratePlayerUpgrades() {
  console.log('🔧 Starting Upgrade ID Migration...\n');
  
  const playerDataDir = path.join(process.cwd(), 'main-gamedata', 'player-data');
  
  try {
    const folders = fs.readdirSync(playerDataDir);
    let totalMigrated = 0;
    let totalPlayers = 0;
    
    for (const folder of folders) {
      const playerStatePath = path.join(playerDataDir, folder, 'player-state.json');
      
      if (!fs.existsSync(playerStatePath)) continue;
      
      totalPlayers++;
      console.log(`📁 Processing: ${folder}`);
      
      // Read player data
      const playerData = JSON.parse(fs.readFileSync(playerStatePath, 'utf-8'));
      
      if (!playerData.upgrades || typeof playerData.upgrades !== 'object') {
        console.log('  ⏭️  No upgrades to migrate\n');
        continue;
      }
      
      // Create new upgrades object with correct IDs
      const oldUpgrades = playerData.upgrades;
      const newUpgrades = {};
      let hasMigrations = false;
      
      for (const [oldKey, level] of Object.entries(oldUpgrades)) {
        const newKey = ID_MIGRATION_MAP[oldKey] || oldKey;
        
        if (oldKey !== newKey) {
          console.log(`  ✅ Migrating: "${oldKey}" → "${newKey}" (level ${level})`);
          hasMigrations = true;
          totalMigrated++;
        }
        
        newUpgrades[newKey] = level;
      }
      
      if (hasMigrations) {
        // Backup original file
        const backupPath = playerStatePath + '.backup';
        fs.writeFileSync(backupPath, JSON.stringify(playerData, null, 2));
        console.log(`  💾 Backup created: ${path.basename(backupPath)}`);
        
        // Update with new upgrade IDs
        playerData.upgrades = newUpgrades;
        playerData.updatedAt = new Date().toISOString();
        
        // Write updated file
        fs.writeFileSync(playerStatePath, JSON.stringify(playerData, null, 2));
        console.log(`  ✅ Updated player-state.json\n`);
      } else {
        console.log(`  ✅ Already using correct IDs\n`);
      }
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Players processed: ${totalPlayers}`);
    console.log(`Upgrades migrated: ${totalMigrated}`);
    console.log('');
    console.log('🎉 Your upgrade IDs now match the template files!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Restart your server');
    console.log('  2. Hard refresh your browser (Ctrl+Shift+R)');
    console.log('  3. Upgrades should now display with correct levels!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
migratePlayerUpgrades().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});