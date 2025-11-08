/**
 * Cleanup Script: Delete all DB levels and resync from progressive-data/levelup ONLY
 * 
 * Run with: npx tsx server/scripts/cleanup-db-levels.ts
 */

import { storage } from '../storage';
import { syncLevels } from '../utils/levelsProgressive';

async function cleanupAndResyncLevels() {
  console.log('🧹 Starting DB levels cleanup...');
  console.log('');

  try {
    // Step 1: Get all current levels from DB
    console.log('1️⃣  Fetching current levels from database...');
    const allLevels = await storage.getAllLevels?.() || [];
    console.log(`   Found ${allLevels.length} levels in database`);
    console.log('');

    // Step 2: Delete all levels from DB
    console.log('2️⃣  Deleting all levels from database...');
    let deleted = 0;
    for (const level of allLevels) {
      try {
        await storage.deleteLevel(level.level);
        deleted++;
        process.stdout.write(`\r   Deleted: ${deleted}/${allLevels.length}`);
      } catch (error: any) {
        console.error(`\n   ⚠️  Failed to delete level ${level.level}:`, error.message);
      }
    }
    console.log('\n   ✅ All levels deleted from database');
    console.log('');

    // Step 3: Resync from progressive-data/levelup ONLY
    console.log('3️⃣  Resyncing levels from progressive-data/levelup...');
    await syncLevels();
    console.log('   ✅ Levels resynced from progressive-data');
    console.log('');

    // Step 4: Verify final count
    const newLevels = await storage.getAllLevels?.() || [];
    console.log('────────────────────────────────────────');
    console.log('🎉 Cleanup Complete!');
    console.log('');
    console.log(`✅ Before: ${allLevels.length} levels (from master-data)`);
    console.log(`✅ After:  ${newLevels.length} levels (from progressive-data/levelup)`);
    console.log('');
    console.log('Database now matches progressive-data/levelup directory.');
    console.log('────────────────────────────────────────');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Cleanup failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

// Run cleanup
console.log('');
console.log('╭────────────────────────────────────────╮');
console.log('│  LUNA DB LEVELS CLEANUP               │');
console.log('│  Delete all DB levels and resync      │');
console.log('╰────────────────────────────────────────╯');
console.log('');

cleanupAndResyncLevels();
