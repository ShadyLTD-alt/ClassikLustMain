import fs from 'fs/promises';
import path from 'path';
import { storage } from '../storage';
import { getUpgradesFromMemory } from './unifiedDataLoader';

// (rest of your code unchanged...)

// --- ALL EXISTING CLASSES & FUNCTIONS UNCHANGED ---

// ADD robust setDisplayImageForPlayer under existing functions (preserves everything!)
export async function setDisplayImageForPlayer(player: any, imageUrl: string) {
  const playerId = player.id;
  if (!imageUrl || typeof imageUrl !== 'string') throw new Error('Valid image URL required');
  const normalizedUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;

  // 1️⃣ Update in-memory/cache
  const currentState = await getPlayerState(player);
  currentState.displayImage = normalizedUrl;

  // 2️⃣ Save to JSON
  const playerFolder = path.join(process.cwd(), 'main-gamedata', 'player-data', playerId);
  const playerFilePath = path.join(playerFolder, 'player-state.json');
  await fs.mkdir(playerFolder, { recursive: true });
  await fs.writeFile(playerFilePath, JSON.stringify(currentState, null, 2), 'utf-8');
  // 3️⃣ Sync to DB
  try {
    await storage.updatePlayer(playerId, { displayImage: normalizedUrl });
  } catch (_e) {}
  // 4️⃣ Optionally update custom cache if present
  if (typeof playerStateCache !== 'undefined') try { playerStateCache.set(playerId, currentState); } catch(_e) {}
  return currentState;
}

// export everything needed!
export {
  getPlayerState,
  updatePlayerState,
  selectCharacterForPlayer,
  purchaseUpgradeForPlayer,
  setDisplayImageForPlayer,
  playerStateManager
};
