import path from 'path';
import fs from 'fs';
import { storage } from '../storage';
import logger from '../logger';
import { queuePlayerSync } from './syncQueue';

// 📁 Player data directory structure
const getPlayerDataPath = (telegramId: string, username: string) => {
  const sanitizedUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_');
  const folder = `${telegramId}_${sanitizedUsername}`;
  const filename = `player_${sanitizedUsername}.json`;
  return {
    folder,
    filename,
    fullPath: path.join(process.cwd(), 'main-gamedata', 'player-data', folder, filename)
  };
};

// 🔧 FIXED: Round all numeric fields to prevent decimal issues
const sanitizePlayerUpdates = (updates: any) => {
  const sanitized = { ...updates };
  
  // Round all numeric fields to prevent decimal issues
  const numericFields = ['points', 'lustPoints', 'energy', 'energyMax', 'level', 'experience', 'passiveIncomeRate', 'lustGems'];
  for (const field of numericFields) {
    if (sanitized[field] !== undefined && typeof sanitized[field] === 'number') {
      sanitized[field] = Math.round(sanitized[field]);
    }
  }
  
  return sanitized;
};

// 📖 Get player state from JSON file
export const getPlayerState = async (playerId: string) => {
  try {
    const player = await storage.getPlayer(playerId);
    if (!player) throw new Error('Player not found');
    
    const { fullPath } = getPlayerDataPath(player.telegramId, player.username);
    
    if (!fs.existsSync(fullPath)) {
      // Return default state if no JSON exists
      return {
        id: player.id,
        telegramId: player.telegramId,
        username: player.username,
        isAdmin: player.isAdmin,
        points: 0,
        lustPoints: 0,
        lustGems: 0,
        energy: 3300,
        energyMax: 3300,
        level: 1,
        experience: 0,
        selectedCharacterId: null,
        displayImage: null,
        upgrades: {},
        unlockedCharacters: [],
        boostActive: false,
        boostMultiplier: 1,
        lastTapValue: 1,
        totalTapsToday: 0,
        totalTapsAllTime: 0,
        lpEarnedToday: 0,
        upgradesPurchasedToday: 0,
        consecutiveDays: 0,
        claimedTasks: [],
        claimedAchievements: [],
        achievementUnlockDates: {},
        createdAt: player.createdAt,
        updatedAt: new Date()
      };
    }
    
    const content = await fs.promises.readFile(fullPath, 'utf8');
    const playerData = JSON.parse(content);
    
    // Ensure safe defaults for all fields
    return {
      id: player.id,
      telegramId: player.telegramId,
      username: player.username,
      isAdmin: player.isAdmin,
      points: Math.round(playerData.points || playerData.lustPoints || 0),
      lustPoints: Math.round(playerData.lustPoints || playerData.points || 0),
      lustGems: Math.round(playerData.lustGems || 0),
      energy: Math.round(playerData.energy || 3300),
      energyMax: Math.round(playerData.energyMax || 3300),
      level: Math.round(playerData.level || 1),
      experience: Math.round(playerData.experience || 0),
      selectedCharacterId: playerData.selectedCharacterId || null,
      displayImage: playerData.displayImage || null,
      upgrades: playerData.upgrades || {},
      unlockedCharacters: playerData.unlockedCharacters || [],
      boostActive: Boolean(playerData.boostActive),
      boostMultiplier: Math.round(playerData.boostMultiplier || 1),
      lastTapValue: Math.round(playerData.lastTapValue || 1),
      totalTapsToday: Math.round(playerData.totalTapsToday || 0),
      totalTapsAllTime: Math.round(playerData.totalTapsAllTime || 0),
      lpEarnedToday: Math.round(playerData.lpEarnedToday || 0),
      upgradesPurchasedToday: Math.round(playerData.upgradesPurchasedToday || 0),
      consecutiveDays: Math.round(playerData.consecutiveDays || 0),
      claimedTasks: playerData.claimedTasks || [],
      claimedAchievements: playerData.claimedAchievements || [],
      achievementUnlockDates: playerData.achievementUnlockDates || {},
      createdAt: playerData.createdAt || player.createdAt,
      updatedAt: new Date()
    };
  } catch (error) {
    logger.error('Failed to get player state', { playerId, error: error instanceof Error ? error.message : 'Unknown' });
    throw error;
  }
};

// ✏️ Update player state in JSON file
export const updatePlayerState = async (playerId: string, updates: any) => {
  try {
    const player = await storage.getPlayer(playerId);
    if (!player) throw new Error('Player not found');
    
    const { folder, filename, fullPath } = getPlayerDataPath(player.telegramId, player.username);
    
    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Get current state
    const currentState = await getPlayerState(playerId);
    
    // Apply sanitized updates
    const sanitizedUpdates = sanitizePlayerUpdates(updates);
    const updatedState = {
      ...currentState,
      ...sanitizedUpdates,
      updatedAt: new Date()
    };
    
    // Save to JSON
    await fs.promises.writeFile(fullPath, JSON.stringify(updatedState, null, 2));
    
    // Queue for DB sync
    queuePlayerSync(playerId, updatedState, false);
    
    console.log(`✅ [SIMPLE] Updated player ${updatedState.username}`);
    return updatedState;
  } catch (error) {
    logger.error('Failed to update player state', { playerId, error: error instanceof Error ? error.message : 'Unknown' });
    throw error;
  }
};

// 🎭 Select character for player
export const selectCharacterForPlayer = async (playerId: string, characterId: string) => {
  const updates = {
    selectedCharacterId: characterId,
    displayImage: null // Reset display image when changing character
  };
  return await updatePlayerState(playerId, updates);
};

// 🖼️ Set display image for player
export const setDisplayImageForPlayer = async (playerId: string, imageUrl: string) => {
  const updates = {
    displayImage: imageUrl
  };
  return await updatePlayerState(playerId, updates);
};

// 🛒 Purchase upgrade for player - FIXED with proper username logging
export const purchaseUpgradeForPlayer = async (playerId: string, upgradeId: string, level: number, cost: number) => {
  const player = await storage.getPlayer(playerId);
  if (!player) throw new Error('Player not found');
  
  console.log(`🛒 [UPGRADE] Player ${player.username} purchasing ${upgradeId} level ${level}`);
  
  const currentState = await getPlayerState(playerId);
  const roundedCost = Math.round(cost);
  
  if ((currentState.lustPoints || currentState.points || 0) < roundedCost) {
    throw new Error('Insufficient funds');
  }
  
  const updates = {
    upgrades: {
      ...currentState.upgrades,
      [upgradeId]: level
    },
    lustPoints: Math.round((currentState.lustPoints || currentState.points || 0) - roundedCost),
    points: Math.round((currentState.lustPoints || currentState.points || 0) - roundedCost),
    experience: Math.round((currentState.experience || 0) + (level * 10)), // Add XP for upgrades
    upgradesPurchasedToday: (currentState.upgradesPurchasedToday || 0) + 1
  };
  
  console.log(`✅ [UPGRADE] Success for ${player.username}`);
  return await updatePlayerState(playerId, updates);
};

// 🏥 Player State Manager health check
export const playerStateManager = {
  async healthCheck() {
    return {
      status: 'active',
      type: 'json-first',
      asyncLockBypassed: true,
      dataDirectory: path.join(process.cwd(), 'main-gamedata', 'player-data')
    };
  },
  
  async migrateOldPlayerFiles() {
    return { moved: 0, errors: 0 };
  },
  
  async forceDatabaseSync(playerId: string) {
    const state = await getPlayerState(playerId);
    queuePlayerSync(playerId, state, false);
    return { synced: true };
  }
};