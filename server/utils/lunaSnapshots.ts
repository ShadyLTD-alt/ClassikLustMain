/**
 * Snapshot Manager for Luna
 * - Writes snapshots under LunaBug/snapshots/
 * - Provides throttled logging to avoid console spam
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAPSHOT_DIR = path.join(__dirname, '../../LunaBug/snapshots');

async function ensureDir(dir: string) {
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
}

export async function writeSnapshot(fileName: string, data: any) {
  await ensureDir(SNAPSHOT_DIR);
  const file = path.join(SNAPSHOT_DIR, fileName);
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  await fs.writeFile(file, content);
  return file;
}

// Throttled logger to avoid spam
let lastLogTime = 0;
const MIN_INTERVAL_MS = 5000; // log at most once every 5s per category

export function throttledInfo(tag: string, payload?: any) {
  const now = Date.now();
  if (now - lastLogTime < MIN_INTERVAL_MS) return; // skip
  lastLogTime = now;
  try {
    const base = `[Luna] ${tag}`;
    if (payload) console.log(base, payload);
    else console.log(base);
  } catch {}
}
