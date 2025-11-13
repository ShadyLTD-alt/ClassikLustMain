// server/utils/syncUploadsToDatabase.js
// Auto-sync script for mediaUploads table and local JSON metadata by character

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/characters');
const METADATA_BASE = path.resolve(__dirname, '../../main-gamedata/character-data');

async function ensureMetadataDir(character, type) {
  const dir = path.join(METADATA_BASE, character, type);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function parseFileMetadata(filename, characterId, relativePath) {
  const lower = filename.toLowerCase();
  return {
    characterId,
    filename,
    url: `/uploads/characters/${relativePath}`,
    type: lower.includes('vip') ? 'vip' : lower.includes('nsfw') ? 'nsfw' : lower.includes('default') ? 'default' : 'Character',
    unlockLevel: extractLevel(lower),
    categories: extractCategories(lower),
    poses: extractPoses(lower)
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

function inferCharacterFromFilename(filename) {
  const lower = (filename||'').toLowerCase();
  for (const c of ['aria', 'frost', 'shadow', 'stella']) {
    if (lower.includes(c)) return c;
  }
  return 'unknown';
}

async function saveMetadataJson(metadata) {
  const dir = await ensureMetadataDir(
    metadata.characterId || 'unknown',
    metadata.type || 'Character'
  );
  const base = path.basename(metadata.filename, path.extname(metadata.filename));
  const file = path.join(dir, `${base}.meta.json`);
  await fs.writeFile(file, JSON.stringify(metadata, null, 2));
  return file;
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
        await syncImageFile(entry.name, characterId || inferCharacterFromFilename(entry.name), newRelativePath);
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

async function syncImageFile(filename, characterId, relativePath) {
  try {
    const url = `/uploads/characters/${relativePath}`;
    const metadata = parseFileMetadata(filename, characterId, relativePath);
    await saveMetadataJson(metadata);
    const { data: existing, error } = await supabase
      .from('mediaUploads')
      .select('id, characterId, url')
      .eq('url', url)
      .single();
    if (error && error.code !== 'PGRST116') {
      console.error(`[DB] Lookup fail for ${url}:`, error);
    }
    if (existing) {
      if (!existing.characterId || !existing.url) {
        await patchMissingFields();
      } else {
        if (process.env.DEBUG_VERBOSE === 'true') console.log(`✓ Already in DB: ${url}`);
      }
      return;
    }
    const { error: insError } = await supabase
      .from('mediaUploads')
      .insert({
        characterId: metadata.characterId,
        url: metadata.url,
        filename: metadata.filename,
        type: metadata.type,
        unlockLevel: metadata.unlockLevel,
        categories: metadata.categories,
        poses: metadata.poses,
        uploadedAt: new Date().toISOString()
      });
    if (insError) {
      console.error(`[DB] Insert fail for ${url}:`, insError);
    } else {
      console.log(`[INS + JSON] Added to DB and metadata: ${url}`);
    }
  } catch (err) {
    console.error(`[SYNC ERROR] ${filename}:`, err);
  }
}

async function patchMissingFields(debugLog = true) {
  const { data: images, error } = await supabase
    .from('mediaUploads')
    .select('id, filename, url, characterId')
    .or('characterId.is.null,url.is.null')
    .limit(1000);
  if (error) {
    console.error('PATCH[DB] Failed to find missing images:', error);
    return;
  }
  if (!images || images.length === 0) {
    if (debugLog) console.log('PATCH[DB] No images found missing characterId or url');
    return;
  }
  for (const img of images) {
    let characterId = img.characterId || inferCharacterFromFilename(img.filename || img.url);
    let url = img.url;
    if (!url && img.filename) {
      url = `/uploads/characters/${characterId}/${img.filename}`;
    }
    if (!characterId || !url) {
      if(debugLog) console.warn('PATCH[DB] Could not infer values for:', img.filename);
      continue;
    }
    const { error } = await supabase
      .from('mediaUploads')
      .update({ characterId, url })
      .eq('id', img.id);
    if (error) {
      if(debugLog) console.warn('[PATCH FAIL]', img, error);
    } else {
      if(debugLog) console.log(`[PATCH] ${img.id}: set characterId=${characterId}, url=${url}`);
    }
  }
}

async function syncUploadsToDatabase() {
  console.log('🔄 Starting upload sync + local JSON metadata...');
  console.log(`📁 Scanning: ${UPLOADS_DIR}`);
  await patchMissingFields(true);
  try {
    await fs.access(UPLOADS_DIR);
    await syncDirectory(UPLOADS_DIR);
    console.log('✅ Media and JSON metadata sync complete!');
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
