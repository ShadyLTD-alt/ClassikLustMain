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
  type: 'perTap' | 'perHour' | 'energyMax';
  isVip?: boolean;
  isEvent?: boolean;
  passiveIncomeTime?: number;
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
}

export interface ImageConfig {
  id: string;
  characterId: string;
  url: string;
  unlockLevel: number;
  isAvatar: boolean;
  isDisplay: boolean;
  imageType?: 'character' | 'avatar' | 'vip' | 'other';
  categories: {
    nsfw: boolean;
    vip: boolean;
    event: boolean;
    random: boolean;
  };
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
}

export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  card: string;
  muted: string;
}

// All upgrade, character, and level data should be loaded from JSON files only
// No default/mock data in this config file

export const DEFAULT_THEME: ThemeConfig = {
  primary: '270 60% 50%',
  secondary: '240 5% 26%',
  accent: '280 65% 60%',
  background: '240 10% 8%',
  card: '240 8% 12%',
  muted: '240 5% 20%'
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
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--secondary', theme.secondary);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--background', theme.background);
  root.style.setProperty('--card', theme.card);
  root.style.setProperty('--muted', theme.muted);
}