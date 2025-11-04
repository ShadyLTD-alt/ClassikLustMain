// Fixed decimal numbers to whole integers in routes
// Round integer fields to prevent PostgreSQL errors
const integerFields = ['points', 'lustPoints', 'energy', 'energyMax', 'level', 'experience', 'passiveIncomeRate'];
for (const field of integerFields) {
  if (updates[field] !== undefined && typeof updates[field] === 'number') {
    updates[field] = Math.round(updates[field]);
  }
}

// Fixed upgrade purchase logs to show actual username
console.log(`🛒 [UPGRADE] Player ${req.player?.username || 'Unknown'} purchasing ${upgradeId} level ${level}`);
const cost = Math.round(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level - 1));
console.log(`💰 [UPGRADE] Cost calculated: ${cost} for ${upgradeId} level ${level}`);

const updatedState = await purchaseUpgradeForPlayer(req.player!.id, upgradeId, level, cost);
console.log(`✅ [UPGRADE] Success for ${updatedState.username}`);

// Keep existing routes code but with these fixes applied throughout