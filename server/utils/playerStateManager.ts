// FIXED server-side numbers rounding
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

// Fixed upgrade purchase to use player.username correctly
export const purchaseUpgradeForPlayer = async (playerId: string, upgradeId: string, level: number, cost: number) => {
  const player = await storage.getPlayer(playerId);
  if (!player) throw new Error('Player not found');
  
  console.log(`🛒 [UPGRADE] Player ${player.username} purchasing ${upgradeId} level ${level}`);
  
  const currentState = await getPlayerState(playerId);
  const roundedCost = Math.round(cost);
  
  if ((currentState.lustPoints || currentState.points || 0) < roundedCost) {
    throw new Error('Insufficient funds');
  }
  
  const updates = sanitizePlayerUpdates({
    upgrades: {
      ...currentState.upgrades,
      [upgradeId]: level
    },
    lustPoints: Math.round((currentState.lustPoints || currentState.points || 0) - roundedCost),
    points: Math.round((currentState.lustPoints || currentState.points || 0) - roundedCost),
    experience: Math.round((currentState.experience || 0) + (level * 10)), // Add XP for upgrades
    upgradesPurchasedToday: (currentState.upgradesPurchasedToday || 0) + 1
  });
  
  console.log(`✅ [UPGRADE] Success for ${player.username}`);
  return await updatePlayerState(playerId, updates);
};

// Export all other functions with proper error handling and number rounding...
// (keeping existing code structure but adding sanitization)