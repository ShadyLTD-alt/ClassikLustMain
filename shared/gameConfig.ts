export interface UpgradeConfig {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  baseValue: number;
  valueIncrement: number;
  icon: string;
  type: 'perTap' | 'perHour' | 'energyMax' | 'energyRegen'; // ADD energyRegen
  isVip?: boolean;
  isEvent?: boolean;
  passiveIncomeTime?: number;
  isHidden?: boolean; // ADD for admin control
}

export interface CharacterConfig {
  id: string;
  name: string;
  unlockLevel: number;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  defaultImage: string;
  avatarImage: string;
  displayImage: string;
  vip?: boolean; // ADD VIP flag
}

export interface ImageConfig {
  id: string;
  characterId: string;
  url: string;
  unlockLevel: number;
  isAvatar?: boolean;
  imageType?: 'character' | 'avatar' | 'vip' | 'other';
  categories?: {          // MAKE OPTIONAL to match GameContext
    nsfw?: boolean;
    vip?: boolean;
    event?: boolean;
    random?: boolean;
  } | string[];          // ALLOW BOTH formats
  poses?: string[];
  isHidden?: boolean;
  chatEnable?: boolean;
  chatSendPercent?: number;
}

export interface LevelRequirement {
  upgradeId: string;
  minLevel: number;
}

export interface LevelConfig {
  level: number;
  cost: number;
  requirements: LevelRequirement[];
  unlocks: string[];
  rewards?: {  // ADD THIS
    lustPoints?: number;
    lustGems?: number;
    characterUnlocks?: string[];
    upgradeUnlocks?: string[];
  };
  createdAt?: string;  // ADD THIS
  updatedAt?: string;  // ADD THIS
  unlockedAt?: string;
}

export interface ThemeConfig {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  card?: string;
  muted?: string;
  primaryColor?: string;  // ADD for backward compatibility
}

// NEW INTERFACES FOR EXPANSIONS
export interface Achievement {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  lustPointReward: number;
  lustGemReward: number;
  requirements: Record<string, any>;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  type: 'daily' | 'weekly' | 'special';
  category: string;
  targetValue: number;
  lustPointReward: number;
  lustGemReward: number;
  energyReward: number;
  requirements: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerUpgrade {
  id: string;
  playerId: string;
  upgradeId: string;
  currentLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerAchievement {
  id: string;
  playerId: string;
  achievementId: string;
  progress: number;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerTask {
  id: string;
  playerId: string;
  taskId: string;
  progress: number;
  isCompleted: boolean;
  completedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_THEME: ThemeConfig = {
  primary: '270 60% 50%',
  secondary: '240 5% 26%',
  accent: '280 65% 60%',
  background: '240 10% 8%',
  card: '240 8% 12%',
  muted: '240 5% 20%',
  primaryColor: '#8b5cf6'
};

export function calculateUpgradeCost(upgrade: UpgradeConfig, currentLevel: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}

export function calculateUpgradeValue(upgrade: UpgradeConfig, level: number): number {
  return upgrade.baseValue + (upgrade.valueIncrement * level);
}

export function checkLevelRequirements(levelConfig: LevelConfig, upgradeLevels: Record<string, number>): boolean {
  return levelConfig.requirements.every(req => {
    const currentLevel = upgradeLevels[req.upgradeId] || 0;
    return currentLevel >= req.minLevel;
  });
}

export function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement;
  if (theme.primary) root.style.setProperty('--primary', theme.primary);
  if (theme.secondary) root.style.setProperty('--secondary', theme.secondary);
  if (theme.accent) root.style.setProperty('--accent', theme.accent);
  if (theme.background) root.style.setProperty('--background', theme.background);
  if (theme.card) root.style.setProperty('--card', theme.card);
  if (theme.muted) root.style.setProperty('--muted', theme.muted);
}