/**
 * ✅ IMPROVED TASK/ACHIEVEMENT CALCULATION FUNCTIONS
 * 
 * Replace the existing calculateTaskProgress and calculateAchievementProgress
 * functions in server/routes.ts with these enhanced versions.
 * 
 * These handle ALL requirement types properly:
 * - tapCount (daily/all-time)
 * - upgradesPurchased (daily)
 * - lpEarned (daily/total)
 * - energyEfficiency
 * - levelReached
 * - upgradesTotal (sum of all upgrade levels)
 * - charactersUnlocked
 * - consecutiveDays
 */

// ✅ IMPROVED: Comprehensive task progress calculation
export function calculateTaskProgress(player: any, task: any): number {
  switch (task.requirementType) {
    case 'tapCount':
      // Daily tasks use totalTapsToday
      return Math.min(player.totalTapsToday || 0, task.target);
      
    case 'upgradesPurchased':
    case 'upgradesPurchasedToday':
      return Math.min(player.upgradesPurchasedToday || 0, task.target);
      
    case 'lpEarned':
    case 'lpEarnedToday':
      return Math.min(player.lpEarnedToday || 0, task.target);
      
    case 'energyEfficiency':
      // Calculate % of energy remaining
      const energyPercent = Math.round((player.energy / player.energyMax) * 100);
      return energyPercent >= task.target ? task.target : energyPercent;
      
    case 'levelReached':
      return Math.min(player.level || 1, task.target);
      
    default:
      console.warn(`⚠️ [TASK CALC] Unknown requirement type: ${task.requirementType}`);
      return 0;
  }
}

// ✅ IMPROVED: Comprehensive achievement progress calculation  
export function calculateAchievementProgress(player: any, achievement: any): number {
  switch (achievement.requirementType) {
    case 'lpTotal':
      // Total LP accumulated
      return Math.min(player.lustPoints || player.points || 0, achievement.target);
      
    case 'tapCount':
      // All-time tap count for achievements
      return Math.min(player.totalTapsAllTime || 0, achievement.target);
      
    case 'upgradeCount':
    case 'upgradesTotal':
      // Sum all upgrade levels (not just count of upgrades)
      const totalUpgradeLevels = Object.values(player.upgrades || {}).reduce(
        (sum: number, level: any) => sum + (Number(level) || 0), 
        0
      );
      return Math.min(totalUpgradeLevels, achievement.target);
      
    case 'characterUnlocked':
    case 'charactersUnlocked':
      return Math.min((player.unlockedCharacters || []).length, achievement.target);
      
    case 'level':
    case 'levelReached':
      return Math.min(player.level || 1, achievement.target);
      
    case 'consecutiveDays':
      return Math.min(player.consecutiveDays || 0, achievement.target);
      
    default:
      console.warn(`⚠️ [ACH CALC] Unknown requirement type: ${achievement.requirementType}`);
      return 0;
  }
}

/**
 * HOW TO APPLY THIS PATCH:
 * 
 * 1. Open server/routes.ts
 * 2. Find the existing calculateTaskProgress function (around line 45)
 * 3. Replace it with the calculateTaskProgress from this file
 * 4. Find the existing calculateAchievementProgress function (around line 50)
 * 5. Replace it with the calculateAchievementProgress from this file
 * 6. Save and restart server
 * 
 * This will enable proper tracking for:
 * - Daily tap counts
 * - All-time tap counts  
 * - Daily upgrade purchases
 * - Total upgrade levels (not just count)
 * - LP earned today
 * - Energy efficiency percentage
 * - Level milestones
 * - Character collection
 * - Consecutive days played
 */
