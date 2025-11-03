import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAPSHOT_DIR = path.join(__dirname, '../../LunaBug/snapshots');

async function ensureDir(dir) { try { await fs.mkdir(dir, { recursive: true }); } catch {} }

let lastWrite = 0;
let minIntervalMs = parseInt(process.env.LUNA_SNAPSHOT_INTERVAL_MS || '15000', 10); // 15s default

export function setSnapshotInterval(ms) { minIntervalMs = ms; }

export async function writeSnapshot(fileName, data) {
  const now = Date.now();
  if (now - lastWrite < minIntervalMs) return null; // throttle snapshot writes
  lastWrite = now;

  await ensureDir(SNAPSHOT_DIR);
  const file = path.join(SNAPSHOT_DIR, fileName);
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  await fs.writeFile(file, content);
  return file;
}

let lastLog = 0; const LOG_INTERVAL = 10000; // 10s
export function throttledInfo(tag, payload) {
  const now2 = Date.now();
  if (now2 - lastLog < LOG_INTERVAL) return;
  lastLog = now2;
  try { console.log(`[Luna] ${tag}`, payload || ''); } catch {}
}
