import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import logger from '../logger.js';

// 🔧 UTILITY: Clean up duplicate media files
export class MediaCleaner {
  private static async getFileHash(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return crypto.createHash('md5').update(fileBuffer).digest('hex');
    } catch (error) {
      console.error(`Failed to hash ${filePath}:`, error);
      return '';
    }
  }
  
  private static async getFileStats(filePath: string) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch {
      return null;
    }
  }
  
  // Find and remove duplicate files in uploads directory
  static async findDuplicates(uploadsDir: string = path.join(process.cwd(), 'uploads')) {
    console.log(`🔍 [MEDIA CLEANER] Scanning ${uploadsDir} for duplicates...`);
    
    const filesByHash = new Map<string, Array<{ path: string; stats: any }>();
    const duplicatesFound: Array<{ hash: string; files: string[]; sizeMB: number }> = [];
    
    async function scanDirectory(dirPath: string) {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && /\.(jpg|jpeg|png|webp|gif)$/i.test(entry.name)) {
            const hash = await this.getFileHash(fullPath);
            const stats = await this.getFileStats(fullPath);
            
            if (hash && stats) {
              if (!filesByHash.has(hash)) {
                filesByHash.set(hash, []);
              }
              filesByHash.get(hash)!.push({ path: fullPath, stats });
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning ${dirPath}:`, error);
      }
    }
    
    await scanDirectory(uploadsDir);
    
    // Find duplicates (same hash, multiple files)
    for (const [hash, files] of filesByHash.entries()) {
      if (files.length > 1) {
        // Sort by creation time (keep oldest)
        files.sort((a, b) => a.stats.created.getTime() - b.stats.created.getTime());
        
        duplicatesFound.push({
          hash,
          files: files.map(f => f.path),
          sizeMB: Math.round(files[0].stats.size / 1024 / 1024 * 100) / 100
        });
      }
    }
    
    console.log(`🔍 [MEDIA CLEANER] Found ${duplicatesFound.length} sets of duplicates`);
    return duplicatesFound;
  }
  
  // Remove duplicate files (keep the oldest one)
  static async removeDuplicates(uploadsDir: string = path.join(process.cwd(), 'uploads'), dryRun: boolean = true) {
    const duplicates = await this.findDuplicates(uploadsDir);
    
    let totalDeleted = 0;
    let spaceFreedMB = 0;
    
    for (const duplicate of duplicates) {
      const [keep, ...toDelete] = duplicate.files;
      
      console.log(`👀 [DUPLICATE SET] Hash: ${duplicate.hash.substring(0, 8)}...`);
      console.log(`  ✅ KEEP: ${path.basename(keep)}`);
      
      for (const filePath of toDelete) {
        console.log(`  🗑️ DELETE: ${path.basename(filePath)}`);
        
        if (!dryRun) {
          try {
            await fs.unlink(filePath);
            totalDeleted++;
            spaceFreedMB += duplicate.sizeMB;
          } catch (error) {
            console.error(`  ❌ Failed to delete ${filePath}:`, error);
            logger.error('Failed to delete duplicate file', { filePath, error: error instanceof Error ? error.message : 'Unknown' });
          }
        }
      }
    }
    
    const summary = {
      duplicateSets: duplicates.length,
      filesDeleted: totalDeleted,
      spaceFreedMB: Math.round(spaceFreedMB * 100) / 100,
      dryRun
    };
    
    console.log(`🧹 [MEDIA CLEANER] ${dryRun ? 'DRY RUN' : 'CLEANUP'} Complete:`);
    console.log(`  📏 Duplicate sets: ${summary.duplicateSets}`);
    console.log(`  🗑️ Files ${dryRun ? 'would be' : ''} deleted: ${summary.filesDeleted}`);
    console.log(`  💾 Space ${dryRun ? 'would be' : ''} freed: ${summary.spaceFreedMB} MB`);
    
    logger.info('Media cleanup completed', summary);
    return summary;
  }
  
  // Find images that exist as files but not in media.json
  static async findOrphanedFiles(uploadsDir: string = path.join(process.cwd(), 'uploads')) {
    console.log(`🔍 [MEDIA CLEANER] Scanning for orphaned files...`);
    
    const mediaJsonPath = path.join(process.cwd(), 'main-gamedata', 'master-data', 'media.json');
    let mediaEntries: any[] = [];
    
    try {
      const mediaContent = await fs.readFile(mediaJsonPath, 'utf8');
      const mediaData = JSON.parse(mediaContent);
      mediaEntries = mediaData.media || [];
    } catch (error) {
      console.error('Failed to load media.json:', error);
      return [];
    }
    
    const registeredPaths = new Set(mediaEntries.map(m => m.url).filter(Boolean));
    const orphanedFiles: string[] = [];
    
    async function scanForOrphans(dirPath: string) {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            await scanForOrphans(fullPath);
          } else if (entry.isFile() && /\.(jpg|jpeg|png|webp|gif)$/i.test(entry.name)) {
            // Convert absolute path to relative URL path
            const relativePath = '/' + path.relative(path.join(process.cwd()), fullPath).replace(/\\/g, '/');
            
            if (!registeredPaths.has(relativePath)) {
              orphanedFiles.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning ${dirPath} for orphans:`, error);
      }
    }
    
    await scanForOrphans(uploadsDir);
    
    console.log(`🔍 [MEDIA CLEANER] Found ${orphanedFiles.length} orphaned files`);
    return orphanedFiles;
  }
  
  // Clean up orphaned files not referenced in media.json
  static async removeOrphanedFiles(uploadsDir: string = path.join(process.cwd(), 'uploads'), dryRun: boolean = true) {
    const orphanedFiles = await this.findOrphanedFiles(uploadsDir);
    
    if (orphanedFiles.length === 0) {
      console.log('✅ [MEDIA CLEANER] No orphaned files found');
      return { orphanedFiles: 0, filesDeleted: 0, spaceFreedMB: 0, dryRun };
    }
    
    let filesDeleted = 0;
    let spaceFreedMB = 0;
    
    for (const filePath of orphanedFiles) {
      try {
        const stats = await this.getFileStats(filePath);
        const sizeMB = stats ? Math.round(stats.size / 1024 / 1024 * 100) / 100 : 0;
        
        console.log(`${dryRun ? '👀 WOULD DELETE' : '🗑️ DELETING'}: ${path.basename(filePath)} (${sizeMB}MB)`);
        
        if (!dryRun) {
          await fs.unlink(filePath);
          filesDeleted++;
          spaceFreedMB += sizeMB;
        }
      } catch (error) {
        console.error(`Failed to ${dryRun ? 'analyze' : 'delete'} ${filePath}:`, error);
      }
    }
    
    const summary = {
      orphanedFiles: orphanedFiles.length,
      filesDeleted,
      spaceFreedMB: Math.round(spaceFreedMB * 100) / 100,
      dryRun
    };
    
    console.log(`🧹 [ORPHAN CLEANUP] ${dryRun ? 'DRY RUN' : 'CLEANUP'} Complete:`);
    console.log(`  📏 Orphaned files: ${summary.orphanedFiles}`);
    console.log(`  🗑️ Files ${dryRun ? 'would be' : ''} deleted: ${summary.filesDeleted}`);
    console.log(`  💾 Space ${dryRun ? 'would be' : ''} freed: ${summary.spaceFreedMB} MB`);
    
    logger.info('Orphan cleanup completed', summary);
    return summary;
  }
  
  // Full cleanup: duplicates + orphans
  static async fullCleanup(uploadsDir?: string, dryRun: boolean = true) {
    console.log(`🧹 [MEDIA CLEANER] Starting full cleanup (${dryRun ? 'DRY RUN' : 'LIVE'})...`);
    
    const duplicateResult = await this.removeDuplicates(uploadsDir, dryRun);
    const orphanResult = await this.removeOrphanedFiles(uploadsDir, dryRun);
    
    const totalResult = {
      duplicateSets: duplicateResult.duplicateSets,
      orphanedFiles: orphanResult.orphanedFiles,
      totalFilesDeleted: duplicateResult.filesDeleted + orphanResult.filesDeleted,
      totalSpaceFreedMB: duplicateResult.spaceFreedMB + orphanResult.spaceFreedMB,
      dryRun
    };
    
    console.log(`🎆 [FULL CLEANUP] ${dryRun ? 'ANALYSIS' : 'COMPLETE'}:`);
    console.log(`  📏 Total duplicate sets: ${totalResult.duplicateSets}`);
    console.log(`  📏 Total orphaned files: ${totalResult.orphanedFiles}`);
    console.log(`  🗑️ Total files ${dryRun ? 'would be' : ''} deleted: ${totalResult.totalFilesDeleted}`);
    console.log(`  💾 Total space ${dryRun ? 'would be' : ''} freed: ${totalResult.totalSpaceFreedMB} MB`);
    
    return totalResult;
  }
}