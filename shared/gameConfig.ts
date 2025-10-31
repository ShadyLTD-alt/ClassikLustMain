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
  categories: {
    nsfw: boolean;
    vip: boolean;
    event: boolean;
    random: boolean;
  };
}

export interface LevelRequirement {
  upgradeId: string;
  minLevel: number;
}

export interface LevelConfig {
  level: number;
  requirements: LevelRequirement[];
  experienceRequired: number;
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

export const DEFAULT_UPGRADES: UpgradeConfig[] = [
  {
    id: 'tap-power',
    name: 'Tap Power',
    description: 'Increase points earned per tap',
    maxLevel: 30,
    baseCost: 10,
    costMultiplier: 1.15,
    baseValue: 1,
    valueIncrement: 1,
    icon: 'Hand',
    type: 'perTap'
  },
  {
    id: 'critical-chance',
    name: 'Critical Tap',
    description: 'Boost tap multiplier',
    maxLevel: 30,
    baseCost: 50,
    costMultiplier: 1.2,
    baseValue: 0,
    valueIncrement: 0.5,
    icon: 'Sparkles',
    type: 'perTap'
  },
  {
    id: 'passive-income',
    name: 'Passive Income',
    description: 'Points earned per hour',
    maxLevel: 30,
    baseCost: 100,
    costMultiplier: 1.25,
    baseValue: 10,
    valueIncrement: 10,
    icon: 'Clock',
    type: 'perHour'
  },
  {
    id: 'income-multiplier',
    name: 'Income Boost',
    description: 'Multiply passive income',
    maxLevel: 30,
    baseCost: 500,
    costMultiplier: 1.3,
    baseValue: 0,
    valueIncrement: 5,
    icon: 'TrendingUp',
    type: 'perHour'
  },
  {
    id: 'energy-capacity',
    name: 'Energy Capacity',
    description: 'Maximum energy storage',
    maxLevel: 30,
    baseCost: 200,
    costMultiplier: 1.18,
    baseValue: 1000,
    valueIncrement: 100,
    icon: 'Zap',
    type: 'energyMax'
  },
  {
    id: 'energy-regen',
    name: 'Energy Recovery',
    description: 'Energy regeneration rate',
    maxLevel: 30,
    baseCost: 300,
    costMultiplier: 1.22,
    baseValue: 1,
    valueIncrement: 0.5,
    icon: 'Battery',
    type: 'energyMax'
  }
];

export const DEFAULT_CHARACTERS: CharacterConfig[] = [
  {
    id: 'starter',
    name: 'Aria',
    unlockLevel: 1,
    description: 'Your first companion',
    rarity: 'common',
    defaultImage: '/attached_assets/generated_images/Main_anime_character_portrait_2b6366d4.png',
    avatarImage: '/attached_assets/generated_images/Main_anime_character_portrait_2b6366d4.png',
    displayImage: '/attached_assets/generated_images/Main_anime_character_portrait_2b6366d4.png'
  },
  {
    id: 'ice-warrior',
    name: 'Frost',
    unlockLevel: 5,
    description: 'The ice warrior',
    rarity: 'rare',
    defaultImage: '/attached_assets/generated_images/Ice_warrior_character_portrait_6f04192c.png',
    avatarImage: '/attached_assets/generated_images/Ice_warrior_character_portrait_6f04192c.png',
    displayImage: '/attached_assets/generated_images/Ice_warrior_character_portrait_6f04192c.png'
  },
  {
    id: 'pink-mage',
    name: 'Stella',
    unlockLevel: 10,
    description: 'The pink mage',
    rarity: 'epic',
    defaultImage: '/attached_assets/generated_images/Pink_mage_character_portrait_ac8f14fa.png',
    avatarImage: '/attached_assets/generated_images/Pink_mage_character_portrait_ac8f14fa.png',
    displayImage: '/attached_assets/generated_images/Pink_mage_character_portrait_ac8f14fa.png'
  },
  {
    id: 'dark-assassin',
    name: 'Shadow',
    unlockLevel: 20,
    description: 'The dark assassin',
    rarity: 'legendary',
    defaultImage: '/attached_assets/generated_images/Dark_assassin_character_portrait_8231b831.png',
    avatarImage: '/attached_assets/generated_images/Dark_assassin_character_portrait_8231b831.png',
    displayImage: '/attached_assets/generated_images/Dark_assassin_character_portrait_8231b831.png'
  }
];

export const DEFAULT_LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 2,
    requirements: [
      { upgradeId: 'tap-power', minLevel: 1 },
      { upgradeId: 'energy-capacity', minLevel: 1 }
    ],
    experienceRequired: 100,
    unlocks: ['New character slot available']
  },
  {
    level: 3,
    requirements: [
      { upgradeId: 'tap-power', minLevel: 3 },
      { upgradeId: 'passive-income', minLevel: 2 }
    ],
    experienceRequired: 200,
    unlocks: ['Boost multiplier x1.2']
  },
  {
    level: 5,
    requirements: [
      { upgradeId: 'tap-power', minLevel: 5 },
      { upgradeId: 'passive-income', minLevel: 5 },
      { upgradeId: 'energy-capacity', minLevel: 3 }
    ],
    experienceRequired: 500,
    unlocks: ['Character: Frost', 'New image slots']
  },
  {
    level: 10,
    requirements: [
      { upgradeId: 'tap-power', minLevel: 10 },
      { upgradeId: 'passive-income', minLevel: 8 },
      { upgradeId: 'critical-chance', minLevel: 5 }
    ],
    experienceRequired: 1000,
    unlocks: ['Character: Stella', 'VIP features']
  },
  {
    level: 20,
    requirements: [
      { upgradeId: 'tap-power', minLevel: 20 },
      { upgradeId: 'passive-income', minLevel: 15 },
      { upgradeId: 'income-multiplier', minLevel: 10 }
    ],
    experienceRequired: 2000,
    unlocks: ['Character: Shadow', 'Legendary tier unlocked']
  }
];

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
