/**
 * SINGLE SOURCE OF TRUTH FOR GAME CONFIGURATION
 * 
 * This file defines ALL game config types and serves as the central reference point.
 * 
 * IMPORTANT RULES:
 * 1. ALL runtime data comes from progressive-data directories (via unifiedDataLoader)
 * 2. This file defines types/interfaces/constants ONLY
 * 3. NO actual data arrays should be hardcoded here
 * 4. Master JSON files in main-gamedata/master-data are for ADMIN EDITING only
 * 5. Game runtime ALWAYS loads from progressive-data via unifiedDataLoader.ts
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface LevelConfig {
  level: number;
  experienceRequired: number;
  requirements?: string[];
  unlocks?: string[];
  rewards?: {
    lustGems?: number;
    items?: string[];
  };
}

export interface UpgradeConfig {
  id: string;
  name: string;
  description: string;
  type: string;
  icon?: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  baseValue: number;
  valueIncrement: number;
  isHidden?: boolean;
}

export interface CharacterConfig {
  id: string;
  name: string;
  unlockLevel: number;
  description?: string;
  rarity: string;
  defaultImage?: string;
  avatarImage?: string;
  displayImage?: string;
  isHidden?: boolean;
}

export interface TaskConfig {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'permanent';
  targetValue: number;
  rewards: {
    lustPoints?: number;
    lustGems?: number;
  };
  requirements?: {
    minLevel?: number;
    completedTasks?: string[];
  };
}

export interface AchievementConfig {
  id: string;
  title: string;
  description: string;
  icon?: string;
  category: string;
  targetValue: number;
  rewards: {
    lustPoints?: number;
    lustGems?: number;
    title?: string;
  };
  isHidden?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const GAME_CONSTANTS = {
  // Energy
  DEFAULT_MAX_ENERGY: 100,
  ENERGY_REGEN_RATE: 1, // energy per second
  
  // Experience
  BASE_EXP_REQUIREMENT: 100,
  EXP_MULTIPLIER: 1.5,
  
  // Economy
  BASE_TAP_VALUE: 1,
  BASE_PASSIVE_INCOME: 0,
  
  // Offline
  OFFLINE_INCOME_CAP_HOURS: 3,
  
  // Boosts
  DEFAULT_BOOST_DURATION_MS: 300000, // 5 minutes
  DEFAULT_BOOST_MULTIPLIER: 2.0,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================



/**
 * Calculate upgrade cost for a level
 */
export function calculateUpgradeCost(
  baseCost: number,
  currentLevel: number,
  costMultiplier: number
): number {
  return Math.floor(baseCost * Math.pow(costMultiplier, currentLevel));
}

/**
 * Calculate upgrade value for a level
 */
export function calculateUpgradeValue(
  baseValue: number,
  currentLevel: number,
  valueIncrement: number
): number {
  return baseValue + (valueIncrement * currentLevel);
}

/**
 * Get data directory paths
 */
export const DATA_PATHS = {
  MASTER_DATA: 'main-gamedata/master-data',
  PROGRESSIVE_DATA: 'main-gamedata/progressive-data',
  PLAYER_DATA: 'main-gamedata/player-data',
  CHARACTER_DATA: 'main-gamedata/character-data',
} as const;

console.log('✅ [GAME CONFIG] Central configuration loaded - all data comes from progressive-data');
