import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { DEFAULT_UPGRADES, DEFAULT_CHARACTERS, DEFAULT_LEVEL_CONFIGS, DEFAULT_THEME, calculateUpgradeCost, calculateUpgradeValue, checkLevelRequirements, applyTheme, type UpgradeConfig, type CharacterConfig, type ImageConfig, type LevelConfig, type ThemeConfig } from '@shared/gameConfig';

interface GameState {
  points: number;
  energy: number;
  maxEnergy: number;
  level: number;
  experience: number;
  selectedCharacterId: string;
  selectedImageId: string | null;
  selectedAvatarId: string | null;
  upgrades: Record<string, number>;
  unlockedCharacters: string[];
  unlockedImages: string[];
  passiveIncomeRate: number;
  passiveIncomeCap: number;
  energyRegenRate: number;
  isAdmin: boolean;
}

interface GameContextType {
  state: GameState;
  upgrades: UpgradeConfig[];
  characters: CharacterConfig[];
  images: ImageConfig[];
  levelConfigs: LevelConfig[];
  theme: ThemeConfig;
  tap: () => void;
  purchaseUpgrade: (upgradeId: string) => boolean;
  selectCharacter: (characterId: string) => void;
  selectImage: (imageId: string) => void;
  selectAvatar: (imageId: string) => void;
  levelUp: () => boolean;
  canLevelUp: () => boolean;
  toggleAdmin: () => void;
  updateUpgradeConfig: (upgrade: UpgradeConfig) => void;
  updateCharacterConfig: (character: CharacterConfig) => void;
  addImage: (image: ImageConfig) => void;
  updateImage: (image: ImageConfig) => void;
  removeImage: (imageId: string) => void;
  updateLevelConfig: (levelConfig: LevelConfig) => void;
  updateTheme: (theme: ThemeConfig) => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const INITIAL_STATE: GameState = {
  points: 0,
  energy: 1000,
  maxEnergy: 1000,
  level: 1,
  experience: 0,
  selectedCharacterId: 'starter',
  selectedImageId: null,
  selectedAvatarId: null,
  upgrades: {},
  unlockedCharacters: ['starter'],
  unlockedImages: [],
  passiveIncomeRate: 0,
  passiveIncomeCap: 10000,
  energyRegenRate: 1,
  isAdmin: false
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem('gameState');
    return saved ? { ...INITIAL_STATE, ...JSON.parse(saved) } : INITIAL_STATE;
  });

  const [upgrades, setUpgrades] = useState<UpgradeConfig[]>(() => {
    const saved = localStorage.getItem('upgradeConfigs');
    return saved ? JSON.parse(saved) : DEFAULT_UPGRADES;
  });

  const [characters, setCharacters] = useState<CharacterConfig[]>(() => {
    const saved = localStorage.getItem('characterConfigs');
    return saved ? JSON.parse(saved) : DEFAULT_CHARACTERS;
  });

  const [images, setImages] = useState<ImageConfig[]>(() => {
    const saved = localStorage.getItem('imageConfigs');
    return saved ? JSON.parse(saved) : [];
  });

  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[]>(() => {
    const saved = localStorage.getItem('levelConfigs');
    return saved ? JSON.parse(saved) : DEFAULT_LEVEL_CONFIGS;
  });

  const [theme, setTheme] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem('themeConfig');
    return saved ? JSON.parse(saved) : DEFAULT_THEME;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('gameState', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem('upgradeConfigs', JSON.stringify(upgrades));
  }, [upgrades]);

  useEffect(() => {
    localStorage.setItem('characterConfigs', JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    localStorage.setItem('imageConfigs', JSON.stringify(images));
  }, [images]);

  useEffect(() => {
    localStorage.setItem('levelConfigs', JSON.stringify(levelConfigs));
  }, [levelConfigs]);

  useEffect(() => {
    localStorage.setItem('themeConfig', JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        let newEnergy = Math.min(prev.maxEnergy, prev.energy + prev.energyRegenRate);
        let newPoints = prev.points;
        
        if (prev.passiveIncomeRate > 0 && prev.points < prev.passiveIncomeCap) {
          const incomePerSecond = prev.passiveIncomeRate / 3600;
          newPoints = Math.min(prev.passiveIncomeCap, prev.points + incomePerSecond);
        }

        if (newEnergy === prev.energy && newPoints === prev.points) {
          return prev;
        }

        return { ...prev, energy: newEnergy, points: newPoints };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const tap = useCallback(() => {
    setState(prev => {
      if (prev.energy < 1) return prev;

      const tapPowerUpgrades = upgrades.filter(u => u.type === 'perTap');
      let tapValue = 1;
      
      tapPowerUpgrades.forEach(upgrade => {
        const level = prev.upgrades[upgrade.id] || 0;
        tapValue += calculateUpgradeValue(upgrade, level);
      });

      const newPoints = prev.points + tapValue;
      const newExp = prev.experience + tapValue;
      const expNeeded = prev.level * 100;
      let newLevel = prev.level;
      let remainingExp = newExp;

      if (newExp >= expNeeded) {
        newLevel++;
        remainingExp = newExp - expNeeded;
      }

      const newUnlockedChars = characters
        .filter(c => c.unlockLevel <= newLevel && !prev.unlockedCharacters.includes(c.id))
        .map(c => c.id);

      return {
        ...prev,
        points: newPoints,
        energy: prev.energy - 1,
        experience: remainingExp,
        level: newLevel,
        unlockedCharacters: [...prev.unlockedCharacters, ...newUnlockedChars]
      };
    });
  }, [upgrades, characters]);

  const purchaseUpgrade = useCallback((upgradeId: string) => {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return false;

    const currentLevel = state.upgrades[upgradeId] || 0;
    if (currentLevel >= upgrade.maxLevel) return false;

    const cost = calculateUpgradeCost(upgrade, currentLevel);
    if (state.points < cost) return false;

    setState(prev => {
      const newLevel = currentLevel + 1;
      const newUpgrades = { ...prev.upgrades, [upgradeId]: newLevel };
      
      const perHourUpgrades = upgrades.filter(u => u.type === 'perHour');
      let newPassiveRate = 0;
      perHourUpgrades.forEach(u => {
        const lvl = newUpgrades[u.id] || 0;
        newPassiveRate += calculateUpgradeValue(u, lvl);
      });

      const energyUpgrades = upgrades.filter(u => u.type === 'energyMax' && u.id === 'energy-capacity');
      let newMaxEnergy = 1000;
      energyUpgrades.forEach(u => {
        const lvl = newUpgrades[u.id] || 0;
        newMaxEnergy = calculateUpgradeValue(u, lvl);
      });

      const regenUpgrades = upgrades.filter(u => u.type === 'energyMax' && u.id === 'energy-regen');
      let newRegenRate = 1;
      regenUpgrades.forEach(u => {
        const lvl = newUpgrades[u.id] || 0;
        newRegenRate = calculateUpgradeValue(u, lvl);
      });

      return {
        ...prev,
        points: prev.points - cost,
        upgrades: newUpgrades,
        passiveIncomeRate: newPassiveRate,
        maxEnergy: newMaxEnergy,
        energyRegenRate: newRegenRate
      };
    });

    return true;
  }, [state.upgrades, state.points, upgrades]);

  const selectCharacter = useCallback((characterId: string) => {
    if (state.unlockedCharacters.includes(characterId)) {
      setState(prev => ({ ...prev, selectedCharacterId: characterId, selectedImageId: null }));
    }
  }, [state.unlockedCharacters]);

  const selectImage = useCallback((imageId: string) => {
    setState(prev => ({ ...prev, selectedImageId: imageId }));
  }, []);

  const selectAvatar = useCallback((imageId: string) => {
    setState(prev => ({ ...prev, selectedAvatarId: imageId }));
  }, []);

  const canLevelUp = useCallback(() => {
    const nextLevel = state.level + 1;
    const nextLevelConfig = levelConfigs.find(lc => lc.level === nextLevel);
    if (!nextLevelConfig) return false;
    
    const meetsRequirements = checkLevelRequirements(nextLevelConfig, state.upgrades);
    const hasEnoughExp = state.experience >= nextLevelConfig.experienceRequired;
    return meetsRequirements && hasEnoughExp;
  }, [state.level, state.experience, state.upgrades, levelConfigs]);

  const levelUp = useCallback(() => {
    if (!canLevelUp()) return false;

    setState(prev => {
      const nextLevel = prev.level + 1;
      const levelConfig = levelConfigs.find(lc => lc.level === nextLevel);
      if (!levelConfig) return prev;

      const newUnlockedChars = characters
        .filter(c => c.unlockLevel === nextLevel && !prev.unlockedCharacters.includes(c.id))
        .map(c => c.id);

      return {
        ...prev,
        level: nextLevel,
        experience: 0,
        unlockedCharacters: [...prev.unlockedCharacters, ...newUnlockedChars]
      };
    });

    return true;
  }, [canLevelUp, levelConfigs, characters]);

  const toggleAdmin = useCallback(() => {
    setState(prev => ({ ...prev, isAdmin: !prev.isAdmin }));
  }, []);

  const updateUpgradeConfig = useCallback((upgrade: UpgradeConfig) => {
    setUpgrades(prev => {
      const index = prev.findIndex(u => u.id === upgrade.id);
      if (index >= 0) {
        const newUpgrades = [...prev];
        newUpgrades[index] = upgrade;
        return newUpgrades;
      }
      return [...prev, upgrade];
    });
  }, []);

  const updateCharacterConfig = useCallback((character: CharacterConfig) => {
    setCharacters(prev => {
      const index = prev.findIndex(c => c.id === character.id);
      if (index >= 0) {
        const newChars = [...prev];
        newChars[index] = character;
        return newChars;
      }
      return [...prev, character];
    });
  }, []);

  const addImage = useCallback((image: ImageConfig) => {
    setImages(prev => [...prev, image]);
  }, []);

  const updateImage = useCallback((image: ImageConfig) => {
    setImages(prev => {
      const index = prev.findIndex(img => img.id === image.id);
      if (index >= 0) {
        const newImages = [...prev];
        newImages[index] = image;
        return newImages;
      }
      return prev;
    });
  }, []);

  const removeImage = useCallback((imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

  const updateLevelConfig = useCallback((levelConfig: LevelConfig) => {
    setLevelConfigs(prev => {
      const index = prev.findIndex(lc => lc.level === levelConfig.level);
      if (index >= 0) {
        const newConfigs = [...prev];
        newConfigs[index] = levelConfig;
        return newConfigs;
      }
      return [...prev, levelConfig].sort((a, b) => a.level - b.level);
    });
  }, []);

  const updateTheme = useCallback((newTheme: ThemeConfig) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  }, []);

  const resetGame = useCallback(() => {
    setState(INITIAL_STATE);
    setUpgrades(DEFAULT_UPGRADES);
    setCharacters(DEFAULT_CHARACTERS);
    setImages([]);
    setLevelConfigs(DEFAULT_LEVEL_CONFIGS);
    setTheme(DEFAULT_THEME);
  }, []);

  return (
    <GameContext.Provider value={{
      state,
      upgrades,
      characters,
      images,
      levelConfigs,
      theme,
      tap,
      purchaseUpgrade,
      selectCharacter,
      selectImage,
      selectAvatar,
      levelUp,
      canLevelUp,
      toggleAdmin,
      updateUpgradeConfig,
      updateCharacterConfig,
      addImage,
      updateImage,
      removeImage,
      updateLevelConfig,
      updateTheme,
      resetGame
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}
