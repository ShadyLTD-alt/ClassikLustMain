import fs from 'fs/promises';
import path from 'path';
import { storage } from '../storage';
import { getUpgradesFromMemory } from './unifiedDataLoader';
// ... other code remains unchanged ...

export async function setDisplayImageForPlayer(player: any, imageUrl: string): Promise<any> {
  const playerId = player.id;
  console.log(`🖼️ [SET DISPLAY] Setting display image for ${playerId}: ${imageUrl}`);

  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new Error('Valid image URL is required');
  }

  const normalizedUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  console.log(`🖼️ [SET DISPLAY] Normalized URL: ${normalizedUrl}`);

  try {
    // 1️⃣ Load current state
    const currentState = await getPlayerState(player);
    currentState.displayImage = normalizedUrl;

    // 2️⃣ Write to JSON file
    const playerFolder = path.join(process.cwd(), 'main-gamedata', 'player-data', playerId);
    const playerFilePath = path.join(playerFolder, 'player-state.json');
    await fs.mkdir(playerFolder, { recursive: true });
    await fs.writeFile(playerFilePath, JSON.stringify(currentState, null, 2), 'utf-8');
    console.log(`✅ [SET DISPLAY] JSON file updated successfully`);

    // 3️⃣ Sync to database
    try {
      await storage.updatePlayer(playerId, { displayImage: normalizedUrl });
      console.log(`✅ [SET DISPLAY] Database synced`);
    } catch (dbError) {
      console.warn(`⚠️ [SET DISPLAY] DB sync failed (non-critical):`, dbError);
    }

    // 4️⃣ Update cache (if applicable)
    if (typeof playerStateCache !== 'undefined') {
      playerStateCache.set(playerId, currentState);
    }
    
    console.log(`✅ [SET DISPLAY] All player state updated`);

    return currentState;
  } catch (error: any) {
    console.error(`❌ [SET DISPLAY] Failed:`, error);
    throw error;
  }
}
// ... rest of file unchanged, keep all other exports and logic ...
