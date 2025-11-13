// server/utils/syncUploadsToDatabase.js
// Auto-sync script to populate mediaUploads table from /uploads directory

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/characters');

function parseFileMetadata(filename, characterId, relativePath) {
  const lower = filename.toLowerCase();
  return {
    characterId,
    filename,
    url: `/uploads/characters/${relativePath}`,
    type: lower.includes('vip') ? 'vip' : 
          lower.includes('nsfw') ? 'nsfw' : 
          lower.includes('default') ? 'default' : 'Character',
    unlockLevel: extractLevel(lower),
    categories: extractCategories(lower),
    poses: extractPoses(lower),
  };
}

function extractLevel(filename) {
  const match = filename.match(/level?(\d+)|lv\.?([0-9]+)/i);
  return match ? parseInt(match[1] || match[2]) : 1;
}

function extractCategories(filename) {
  const categories = [];
  if (filename.includes('nsfw')) categories.push('nsfw');
  if (filename.includes('vip')) categories.push('vip');
  if (filename.includes('special')) categories.push('special');
  return categories;
}

function extractPoses(filename) {
  const poses = [];
  if (filename.includes('pose1')) poses.push('pose1');
  if (filename.includes('pose2')) poses.push('pose2');
  if (filename.includes('seductive')) poses.push('seductive');
  if (filename.includes('neutral')) poses.push('neutral');
  return poses.length > 0 ? poses : ['default'];
}

async function syncDirectory(dirPath, characterId = null, relativePath = '') {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const newRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await syncDirectory(fullPath, entry.name, newRelativePath);
      } else if (entry.isFile() && isImageFile(entry.name)) {
        await syncImageFile(entry.name, characterId || 'unknown', newRelativePath);
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${dirPath}:`, err);
  }
}

function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
}

async function patchMissingFields() {
  // Get all images missing characterId or url
  const { data: images, error } = await supabase
    .from('mediaUploads')
    .select('id, filename, url, characterId')
    .or('characterId.is.null,url.is.null')
    .limit(1000);
  if (error) {
    console.error('Failed to find missing images:', error);
    return;
  }
  if (!images || images.length === 0) return;
  for (const img of images) {
    // Attempt to infer character from filename or url
    let characterId = img.characterId || inferCharacterFromFilename(img.filename || img.url);
    let url = img.url;
    if (!url && img.filename) {
      // Try to infer path
      url = `/uploads/characters/${characterId}/${img.filename}`;
    }
    if (!characterId || !url) continue;
    const { error } = await supabase
      .from('mediaUploads')
      .update({ characterId, url })
      .eq('id', img.id);
    if (error) {
      console.warn('Patch error', img, error);
    } else {
      console.log(`✓ Patched image: ${img.id} [${characterId}] ${url}`);
    }
  }
}

function inferCharacterFromFilename(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('aria')) return 'aria';
  if (lower.includes('frost')) return 'frost';
  if (lower.includes('shadow')) return 'shadow';
  if (lower.includes('stella')) return 'stella';
  return null;
}

async function syncImageFile(filename, characterId, relativePath) {
  try {
    const url = `/uploads/characters/${relativePath}`;
    const { data: existing } = await supabase
      .from('mediaUploads')
      .select('id')
      .eq('url', url)
      .single();
    if (existing) {
      // Auto-patch if missing data
      if (!existing.characterId || !existing.url) {
        await patchMissingFields();
      } else {
        console.log(`✓ Already in DB: ${url}`);
      }
      return;
    }
    const metadata = parseFileMetadata(filename, characterId, relativePath);
    const { error } = await supabase
      .from('mediaUploads')
      .insert({
        characterId: metadata.characterId,
        url: metadata.url,
        filename: metadata.filename,
        type: metadata.type,
        unlockLevel: metadata.unlockLevel,
        categories: metadata.categories,
        poses: metadata.poses,
        uploadedAt: new Date().toISOString(),
      });
    if (error) {
      console.error(`✗ Failed to insert ${url}:`, error);
    } else {
      console.log(`✓ Added to DB: ${url}`);
    }
  } catch (err) {
    console.error(`Error syncing ${filename}:`, err);
  }
}

async function syncUploadsToDatabase() {
  console.log('🔄 Starting upload sync...');
  console.log(`📁 Scanning: ${UPLOADS_DIR}`);
  await patchMissingFields();
  try {
    await fs.access(UPLOADS_DIR);
    await syncDirectory(UPLOADS_DIR);
    console.log('✅ Upload sync complete!');
    return { success: true, message: 'Sync completed successfully' };
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('❌ Uploads directory not found:', UPLOADS_DIR);
      console.log('Creating uploads directory...');
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      return { success: false, message: 'Uploads directory created, no files to sync' };
    } else {
      console.error('❌ Sync failed:', err);
      return { success: false, message: err.message };
    }
  }
}

module.exports = { syncUploadsToDatabase };

if (require.main === module) {
  syncUploadsToDatabase().then((result) => {
    console.log('Sync result:', result);
    process.exit(result.success ? 0 : 1);
  });
}
