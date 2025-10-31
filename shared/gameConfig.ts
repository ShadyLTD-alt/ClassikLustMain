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
  imageType: 'character' | 'avatar' | 'vip' | 'other';
  categories: {
    nsfw: boolean;
    vip: boolean;
    event: boolean;
    random: boolean;
  };
  poses?: string[];
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

import tapPowerData from '../client/src/game-data/upgrades/tap-power.json';
import criticalChanceData from '../client/src/game-data/upgrades/critical-chance.json';
import passiveIncomeData from '../client/src/game-data/upgrades/passive-income.json';
import incomeMultiplierData from '../client/src/game-data/upgrades/income-multiplier.json';
import energyCapacityData from '../client/src/game-data/upgrades/energy-capacity.json';
import energyRegenData from '../client/src/game-data/upgrades/energy-regen.json';

export const DEFAULT_UPGRADES: UpgradeConfig[] = [
  tapPowerData as UpgradeConfig,
  criticalChanceData as UpgradeConfig,
  passiveIncomeData as UpgradeConfig,
  incomeMultiplierData as UpgradeConfig,
  energyCapacityData as UpgradeConfig,
  energyRegenData as UpgradeConfig
];

import starterData from '../client/src/character-data/starter.json';
import iceWarriorData from '../client/src/character-data/ice-warrior.json';
import pinkMageData from '../client/src/character-data/pink-mage.json';
import darkAssassinData from '../client/src/character-data/dark-assassin.json';

export const DEFAULT_CHARACTERS: CharacterConfig[] = [
  starterData as CharacterConfig,
  iceWarriorData as CharacterConfig,
  pinkMageData as CharacterConfig,
  darkAssassinData as CharacterConfig
];

import level2Data from '../client/src/game-data/levelup/level-2.json';
import level3Data from '../client/src/game-data/levelup/level-3.json';
import level5Data from '../client/src/game-data/levelup/level-5.json';
import level10Data from '../client/src/game-data/levelup/level-10.json';
import level20Data from '../client/src/game-data/levelup/level-20.json';

export const DEFAULT_LEVEL_CONFIGS: LevelConfig[] = [
  level2Data as LevelConfig,
  level3Data as LevelConfig,
  level5Data as LevelConfig,
  level10Data as LevelConfig,
  level20Data as LevelConfig
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