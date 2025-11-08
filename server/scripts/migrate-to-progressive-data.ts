/**
 * Migration Script: Copy master-data to progressive-data
 * 
 * This script migrates upgrades and characters from master-data JSON files
 * to individual progressive-data JSON files.
 * 
 * Run with: npx tsx server/scripts/migrate-to-progressive-data.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '../..');
const MASTER_DATA_PATH = path.join(ROOT, 'main-gamedata/master-data');
const PROGRESSIVE_DATA_PATH = path.join(ROOT, 'main-gamedata/progressive-data');

interface MigrationResult {
  migrated: string[];
  skipped: string[];
  errors: string[];
}

async function loadJSONFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load ${filePath}:`, error);
    return null;
  }
}

async function migrateUpgrades(): Promise<MigrationResult> {
  const result: MigrationResult = { migrated: [], skipped: [], errors: [] };
  
  console.log('\n🔧 Migrating Upgrades...');
  
  const masterPath = path.join(MASTER_DATA_PATH, 'upgrades-master.json');
  const progressiveDir = path.join(PROGRESSIVE_DATA_PATH, 'upgrades');
  
  // Load master file
  const masterData = await loadJSONFile<{ upgrades: any[] }>(masterPath);
  if (!masterData || !masterData.upgrades) {
    result.errors.push('Failed to load upgrades-master.json');
    return result;
  }
  
  // Create progressive-data folder
  await fs.mkdir(progressiveDir, { recursive: true });
  
  // Migrate each upgrade to individual file
  for (const upgrade of masterData.upgrades) {
    const fileName = `${upgrade.id}.json`;
    const filePath = path.join(progressiveDir, fileName);
    
    try {
      // Check if file already exists
      try {
        await fs.access(filePath);
        console.log(`  ⏭️  Skipped (exists): ${fileName}`);
        result.skipped.push(fileName);
        continue;
      } catch {
        // File doesn't exist, proceed with migration
      }
      
      // Write individual upgrade file
      await fs.writeFile(filePath, JSON.stringify(upgrade, null, 2));
      console.log(`  ✅ Migrated: ${fileName}`);
      result.migrated.push(fileName);
    } catch (error: any) {
      console.error(`  ❌ Failed: ${fileName} - ${error.message}`);
      result.errors.push(`${fileName}: ${error.message}`);
    }
  }
  
  return result;
}

async function migrateCharacters(): Promise<MigrationResult> {
  const result: MigrationResult = { migrated: [], skipped: [], errors: [] };
  
  console.log('\n👥 Migrating Characters...');
  
  const masterPath = path.join(MASTER_DATA_PATH, 'character-master.json');
  const progressiveDir = path.join(PROGRESSIVE_DATA_PATH, 'characters');
  
  // Load master file
  const masterData = await loadJSONFile<{ characters: any[] }>(masterPath);
  if (!masterData || !masterData.characters) {
    result.errors.push('Failed to load character-master.json');
    return result;
  }
  
  // Create progressive-data folder
  await fs.mkdir(progressiveDir, { recursive: true });
  
  // Migrate each character to individual file
  for (const character of masterData.characters) {
    const fileName = `${character.id}.json`;
    const filePath = path.join(progressiveDir, fileName);
    
    try {
      // Check if file already exists
      try {
        await fs.access(filePath);
        console.log(`  ⏭️  Skipped (exists): ${fileName}`);
        result.skipped.push(fileName);
        continue;
      } catch {
        // File doesn't exist, proceed with migration
      }
      
      // Write individual character file
      await fs.writeFile(filePath, JSON.stringify(character, null, 2));
      console.log(`  ✅ Migrated: ${fileName}`);
      result.migrated.push(fileName);
    } catch (error: any) {
      console.error(`  ❌ Failed: ${fileName} - ${error.message}`);
      result.errors.push(`${fileName}: ${error.message}`);
    }
  }
  
  return result;
}

async function runMigration() {
  console.log('╭────────────────────────────────────────╮');
  console.log('│  LUNA DATA MIGRATION                  │');
  console.log('│  master-data → progressive-data      │');
  console.log('╰────────────────────────────────────────╯');
  
  const upgradesResult = await migrateUpgrades();
  const charactersResult = await migrateCharacters();
  
  console.log('\n╭────────────────────────────────────────╮');
  console.log('│  MIGRATION SUMMARY                    │');
  console.log('╰────────────────────────────────────────╯');
  
  console.log('\n🔧 Upgrades:');
  console.log(`  ✅ Migrated: ${upgradesResult.migrated.length}`);
  console.log(`  ⏭️  Skipped: ${upgradesResult.skipped.length}`);
  console.log(`  ❌ Errors: ${upgradesResult.errors.length}`);
  
  console.log('\n👥 Characters:');
  console.log(`  ✅ Migrated: ${charactersResult.migrated.length}`);
  console.log(`  ⏭️  Skipped: ${charactersResult.skipped.length}`);
  console.log(`  ❌ Errors: ${charactersResult.errors.length}`);
  
  const totalMigrated = upgradesResult.migrated.length + charactersResult.migrated.length;
  const totalErrors = upgradesResult.errors.length + charactersResult.errors.length;
  
  if (totalErrors > 0) {
    console.log('\n⚠️  Errors encountered:');
    [...upgradesResult.errors, ...charactersResult.errors].forEach(err => {
      console.log(`    - ${err}`);
    });
  }
  
  console.log('\n────────────────────────────────────────');
  
  if (totalMigrated > 0) {
    console.log(`\n🎉 Migration complete! ${totalMigrated} files migrated.`);
    console.log('\n📝 Next steps:');
    console.log('  1. Verify files in main-gamedata/progressive-data/');
    console.log('  2. Update server to use unifiedDataLoader.ts');
    console.log('  3. Test admin panel create/edit functionality');
    console.log('  4. Keep master-data as backup (optional)');
  } else {
    console.log('\nℹ️  No new files to migrate (all already exist).');
  }
  
  console.log('\n');
}

// Run migration
runMigration().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
