import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { DEFAULT_UPGRADES, DEFAULT_CHARACTERS, DEFAULT_LEVEL_CONFIGS, DEFAULT_THEME, calculateUpgradeCost, calculateUpgradeValue, checkLevelRequirements, applyTheme, type UpgradeConfig, type CharacterConfig, type ImageConfig, type LevelConfig, type ThemeConfig } from '@shared/gameConfig';

interface GameState {
  points: number;
  energy: number;
  maxEnergy: number;
  level: number;
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
  deleteUpgrade: (upgradeId: string) => void;
  deleteCharacter: (characterId: string) => void;
  deleteLevel: (level: number) => void;
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
    let syncCounter = 0;
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

        // Sync to database every 10 seconds
        syncCounter++;
        if (syncCounter >= 10) {
          syncCounter = 0;
          fetch('/api/player/me', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
            },
            body: JSON.stringify({
              energy: newEnergy,
              points: newPoints
            })
          }).catch(err => console.error('Failed to sync energy/points to DB:', err));
        }

        return { ...prev, energy: newEnergy, points: newPoints };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const tap = useCallback(async () => {
    setState(prev => {
      if (prev.energy < 1) return prev;

      const tapPowerUpgrades = upgrades.filter(u => u.type === 'perTap');
      let tapValue = 1;

      tapPowerUpgrades.forEach(upgrade => {
        const level = prev.upgrades[upgrade.id] || 0;
        tapValue += calculateUpgradeValue(upgrade, level);
      });

      const newPoints = prev.points + tapValue;
      const newEnergy = prev.energy - 1;

      // Sync to database
      fetch('/api/player/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        },
        body: JSON.stringify({
          points: newPoints,
          energy: newEnergy
        })
      }).catch(err => console.error('Failed to sync tap to DB:', err));

      return {
        ...prev,
        points: newPoints,
        energy: newEnergy
      };
    });
  }, [upgrades, characters]);

  const purchaseUpgrade = useCallback(async (upgradeId: string) => {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return false;

    const currentLevel = state.upgrades[upgradeId] || 0;
    if (currentLevel >= upgrade.maxLevel) return false;

    const cost = calculateUpgradeCost(upgrade, currentLevel);
    if (state.points < cost) return false;

    const newLevel = currentLevel + 1;

    // Save to database first
    try {
      await fetch('/api/player/upgrades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        },
        body: JSON.stringify({
          upgradeId,
          level: newLevel
        })
      });
    } catch (err) {
      console.error('Failed to save upgrade to DB:', err);
      return false;
    }

    setState(prev => {
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

  const selectCharacter = useCallback(async (characterId: string) => {
    if (state.unlockedCharacters.includes(characterId)) {
      try {
        await fetch('/api/player/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
          },
          body: JSON.stringify({
            selectedCharacterId: characterId
          })
        });
      } catch (err) {
        console.error('Failed to sync character selection to DB:', err);
      }
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
    const hasEnoughPoints = state.points >= nextLevelConfig.cost;
    return meetsRequirements && hasEnoughPoints;
  }, [state.level, state.points, state.upgrades, levelConfigs]);

  const levelUp = useCallback(async () => {
    if (!canLevelUp()) return false;

    const nextLevel = state.level + 1;
    const levelConfig = levelConfigs.find(lc => lc.level === nextLevel);
    if (!levelConfig) return false;

    const newUnlockedChars = characters
      .filter(c => c.unlockLevel === nextLevel && !state.unlockedCharacters.includes(c.id))
      .map(c => c.id);

    // Sync to database
    try {
      await fetch('/api/player/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        },
        body: JSON.stringify({
          level: nextLevel,
          points: state.points - levelConfig.cost
        })
      });

      // Unlock new characters in DB
      for (const charId of newUnlockedChars) {
        await fetch(`/api/player/characters/${charId}/unlock`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
          }
        });
      }
    } catch (err) {
      console.error('Failed to sync level up to DB:', err);
      return false;
    }

    setState(prev => ({
      ...prev,
      level: nextLevel,
      points: prev.points - levelConfig.cost,
      unlockedCharacters: [...prev.unlockedCharacters, ...newUnlockedChars]
    }));

    return true;
  }, [canLevelUp, levelConfigs, characters, state.level, state.points, state.unlockedCharacters]);

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

  const deleteUpgrade = useCallback((upgradeId: string) => {
    setUpgrades(prev => prev.filter(u => u.id !== upgradeId));
    setState(prev => {
      const newUpgradesState = { ...prev.upgrades };
      delete newUpgradesState[upgradeId];
      return { ...prev, upgrades: newUpgradesState };
    });
  }, []);

  const deleteCharacter = useCallback((characterId: string) => {
    setCharacters(prev => prev.filter(c => c.id !== characterId));
    setState(prev => {
      const newUnlockedCharacters = prev.unlockedCharacters.filter(id => id !== characterId);
      let newSelectedCharacterId = prev.selectedCharacterId;
      if (prev.selectedCharacterId === characterId) {
        newSelectedCharacterId = 'starter';
      }
      return { ...prev, unlockedCharacters: newUnlockedCharacters, selectedCharacterId: newSelectedCharacterId };
    });
  }, []);

  const deleteLevel = useCallback((levelToDelete: number) => {
    setLevelConfigs(prev => prev.filter(lc => lc.level !== levelToDelete));
    // Potentially need to adjust game state if a level is deleted that the player has passed
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
      deleteUpgrade,
      deleteCharacter,
      deleteLevel,
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