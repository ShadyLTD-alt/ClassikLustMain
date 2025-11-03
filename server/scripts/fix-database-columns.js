/**
 * Luna's Database Column Fix Script
 * Fixes maxEnergy -> energyMax column naming issues
 * Emergency script to resolve database schema inconsistencies
 */
const { supabase } = require('../database');

const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`)
};

async function checkAndFixDatabaseColumns() {
  logger.info('🚑 Luna: Starting database column integrity check...');
  
  try {
    // 1. Check if maxEnergy column exists (it shouldn't)
    logger.info('1️⃣ Checking for maxEnergy column...');
    
    const { data: columns, error: columnError } = await supabase
      .rpc('get_columns', { table_name: 'players' })
      .select('column_name');
    
    if (columnError) {
      // Fallback: Try to query a test record to see what columns exist
      logger.warn('RPC failed, trying direct table check...');
      
      const { data: testPlayer, error: testError } = await supabase
        .from('players')
        .select('*')
        .limit(1)
        .single();
        
      if (testError) {
        logger.error('❌ Cannot access players table:', testError.message);
        return false;
      }
      
      const existingColumns = Object.keys(testPlayer || {});
      logger.info(`🗑️ Found columns: ${existingColumns.join(', ')}`);
      
      if (existingColumns.includes('maxEnergy')) {
        logger.warn('🚨 Found problematic maxEnergy column!');
        return await fixMaxEnergyColumn();
      }
      
      if (existingColumns.includes('energyMax')) {
        logger.info('✅ Correct energyMax column found');
        return true;
      }
      
      logger.error('❌ Neither maxEnergy nor energyMax found!');
      return false;
    }
    
    // If RPC worked, check the results
    if (columns) {
      const columnNames = columns.map(col => col.column_name);
      logger.info(`🗑️ Database columns: ${columnNames.join(', ')}`);
      
      if (columnNames.includes('maxEnergy') && columnNames.includes('energyMax')) {
        logger.warn('🚨 BOTH maxEnergy and energyMax exist! Fixing...');
        return await cleanupDuplicateColumns();
      }
      
      if (columnNames.includes('maxEnergy')) {
        logger.warn('🚨 Found maxEnergy instead of energyMax! Fixing...');
        return await renameMaxEnergyColumn();
      }
      
      if (columnNames.includes('energyMax')) {
        logger.info('✅ Correct energyMax column found');
        return true;
      }
    }
    
    logger.error('❌ Could not determine column structure!');
    return false;
    
  } catch (error) {
    logger.error('❌ Database column check failed:', error.message);
    return false;
  }
}

async function fixMaxEnergyColumn() {
  logger.info('🔧 Luna: Fixing maxEnergy column...');
  
  try {
    // First, check if energyMax already exists
    const { error: checkError } = await supabase
      .from('players')
      .select('energyMax')
      .limit(1);
      
    if (!checkError) {
      logger.info('✅ energyMax column already exists, checking for maxEnergy...');
      
      // Try to access maxEnergy
      const { error: maxEnergyError } = await supabase
        .from('players')
        .select('maxEnergy')
        .limit(1);
        
      if (!maxEnergyError) {
        logger.warn('🚨 Both columns exist! Cleaning up...');
        return await cleanupDuplicateColumns();
      }
      
      logger.info('✅ Only energyMax exists (good!)');
      return true;
    }
    
    // If energyMax doesn't exist, try to rename maxEnergy
    return await renameMaxEnergyColumn();
    
  } catch (error) {
    logger.error('❌ Failed to fix maxEnergy column:', error.message);
    return false;
  }
}

async function renameMaxEnergyColumn() {
  logger.info('🔄 Luna: Renaming maxEnergy column to energyMax...');
  
  try {
    // Use raw SQL to rename the column
    const { error } = await supabase
      .rpc('exec_sql', { 
        sql: 'ALTER TABLE players RENAME COLUMN "maxEnergy" TO "energyMax";' 
      });
    
    if (error) {
      logger.error('❌ Column rename failed:', error.message);
      return false;
    }
    
    logger.info('✅ Successfully renamed maxEnergy to energyMax!');
    return true;
    
  } catch (error) {
    logger.error('❌ Rename operation failed:', error.message);
    return false;
  }
}

async function cleanupDuplicateColumns() {
  logger.info('🧽 Luna: Cleaning up duplicate energy columns...');
  
  try {
    // Copy maxEnergy values to energyMax if needed, then drop maxEnergy
    const { error: updateError } = await supabase
      .rpc('exec_sql', {
        sql: `
          UPDATE players 
          SET "energyMax" = COALESCE("energyMax", "maxEnergy", 1000)
          WHERE "energyMax" IS NULL OR "energyMax" = 0;
        `
      });
      
    if (updateError) {
      logger.error('❌ Failed to update energyMax values:', updateError.message);
      return false;
    }
    
    // Drop the old maxEnergy column
    const { error: dropError } = await supabase
      .rpc('exec_sql', {
        sql: 'ALTER TABLE players DROP COLUMN IF EXISTS "maxEnergy";'
      });
      
    if (dropError) {
      logger.error('❌ Failed to drop maxEnergy column:', dropError.message);
      return false;
    }
    
    logger.info('✅ Successfully cleaned up duplicate columns!');
    return true;
    
  } catch (error) {
    logger.error('❌ Cleanup operation failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  logger.info('🚑 Luna: Database Column Fix Script Starting...');
  
  try {
    const success = await checkAndFixDatabaseColumns();
    
    if (success) {
      logger.info('✅ Database columns fixed successfully!');
      logger.info('🌙 Luna: Database is now compliant with schema');
    } else {
      logger.error('❌ Database column fix failed!');
      logger.error('🚨 Manual database intervention may be required');
    }
    
    // Test the fix
    logger.info('🧪 Testing database access...');
    const { data: testPlayer, error: testError } = await supabase
      .from('players')
      .select('id, username, energyMax')
      .limit(1)
      .single();
      
    if (testError) {
      logger.error('❌ Test query failed:', testError.message);
    } else {
      logger.info('✅ Test query succeeded - energyMax column accessible');
      logger.info(`Sample data: ${testPlayer?.username} has ${testPlayer?.energyMax} energyMax`);
    }
    
  } catch (error) {
    logger.error('❌ Script execution failed:', error.message);
  }
  
  process.exit(0);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    logger.error('❌ Script crashed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  checkAndFixDatabaseColumns,
  fixMaxEnergyColumn,
  renameMaxEnergyColumn,
  cleanupDuplicateColumns
};
