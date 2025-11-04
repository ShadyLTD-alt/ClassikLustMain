#!/usr/bin/env tsx
// 🧹 SCRIPT: Clean up duplicate media files
// Usage: npx tsx server/scripts/cleanupMedia.ts [--live]

import { MediaCleaner } from '../utils/mediaCleaner.js';
import path from 'path';

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--live');
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  console.log('🧹 ClassikLust Media Cleanup Tool');
  console.log(`📁 Scanning: ${uploadsDir}`);
  console.log(`🔧 Mode: ${isLive ? 'LIVE (will delete files)' : 'DRY RUN (analysis only)'}`);
  console.log('');
  
  if (!isLive) {
    console.log('⚠️  This is a dry run. Add --live flag to actually delete files.');
    console.log('');
  }
  
  try {
    // Clean up duplicates
    console.log('🔍 Step 1: Finding duplicate files...');
    const duplicateResults = await MediaCleaner.removeDuplicates(uploadsDir, !isLive);
    
    console.log('');
    
    // Clean up orphans
    console.log('🔍 Step 2: Finding orphaned files...');
    const orphanResults = await MediaCleaner.removeOrphanedFiles(uploadsDir, !isLive);
    
    console.log('');
    console.log('🎆 CLEANUP SUMMARY:');
    console.log(`  📏 Duplicate sets found: ${duplicateResults.duplicateSets}`);
    console.log(`  📏 Orphaned files found: ${orphanResults.orphanedFiles}`);
    console.log(`  🗑️ Total files ${isLive ? 'deleted' : 'marked for deletion'}: ${duplicateResults.filesDeleted + orphanResults.filesDeleted}`);
    console.log(`  💾 Total space ${isLive ? 'freed' : 'would be freed'}: ${duplicateResults.spaceFreedMB + orphanResults.spaceFreedMB} MB`);
    
    if (!isLive && (duplicateResults.filesDeleted > 0 || orphanResults.filesDeleted > 0)) {
      console.log('');
      console.log('✅ To actually delete these files, run:');
      console.log('  npx tsx server/scripts/cleanupMedia.ts --live');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}