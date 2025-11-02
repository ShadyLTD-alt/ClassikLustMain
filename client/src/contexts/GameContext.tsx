import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { DEFAULT_THEME, calculateUpgradeCost, calculateUpgradeValue, checkLevelRequirements, applyTheme, type UpgradeConfig, type CharacterConfig, type ImageConfig, type LevelConfig, type ThemeConfig } from '@shared/gameConfig';

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
  displayImage: string | null;
  lastTapValue?: number; // For floating animation sync
}

interface GameContextType {
  state: GameState;
  upgrades: UpgradeConfig[];
  characters: CharacterConfig[];
  images: ImageConfig[];
  levelConfigs: LevelConfig[];
  theme: ThemeConfig;
  tap: () => void;
  purchaseUpgrade: (upgradeId: string) => Promise<boolean>;
  selectCharacter: (characterId: string) => void;
  selectImage: (imageId: string) => void;
  selectAvatar: (imageId: string) => void;
  levelUp: () => Promise<boolean>;
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
  dispatch: (action: any) => void;
  calculateTapValue: () => number; // Exposed for CharacterDisplay
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const INITIAL_STATE: GameState = {
  points: 0,
  energy: 1000,
  maxEnergy: 1000,
  level: 1,
  selectedCharacterId: 'aria',
  selectedImageId: null,
  selectedAvatarId: null,
  upgrades: {},
  unlockedCharacters: ['aria'],
  unlockedImages: [],
  passiveIncomeRate: 0,
  passiveIncomeCap: 10000,
  energyRegenRate: 1,
  isAdmin: false,
  displayImage: null,
  lastTapValue: 1
};

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [upgrades, setUpgrades] = useState<UpgradeConfig[]>([]);
  const [characters, setCharacters] = useState<CharacterConfig[]>([]);
  const [images, setImages] = useState<ImageConfig[]>([]);
  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[]>([]);
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [pendingPurchases, setPendingPurchases] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Calculate tap value (shared with CharacterDisplay)
  const calculateTapValue = useCallback(() => {
    const tapPowerUpgrades = upgrades.filter(u => u.type === 'perTap');
    let tapValue = 1; // Base tap value

    tapPowerUpgrades.forEach(upgrade => {
      const level = state.upgrades[upgrade.id] || 0;
      tapValue += calculateUpgradeValue(upgrade, level);
    });

    return tapValue;
  }, [upgrades, state.upgrades]);

  // Load player data from server on mount
  useEffect(() => {
    const loadAllData = async () => {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        console.log('❌ No session token, skipping data load');
        setIsInitialized(true);
        return;
      }

      try {
        console.log('🔄 Starting to load game data...');

        // STEP 1: Load player data FIRST
        console.log('📥 Loading player data...');
        const playerRes = await fetch('/api/player/me', {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });

        if (!playerRes.ok) {
          console.error('❌ Failed to load player data');
          setIsInitialized(true);
          return;
        }

        const playerData = await playerRes.json();

        if (playerData?.player) {
          const player = playerData.player;
          setState(prev => ({
            ...prev,
            points: typeof player.points === 'string' ? parseFloat(player.points) : player.points,
            energy: player.energy || prev.energy,
            maxEnergy: player.maxEnergy || prev.maxEnergy,
            level: player.level || prev.level,
            selectedCharacterId: player.selectedCharacterId || 'aria',
            selectedImageId: player.selectedImageId || null,
            displayImage: player.displayImage || null,
            upgrades: player.upgrades || {},
            unlockedCharacters: Array.isArray(player.unlockedCharacters) ? player.unlockedCharacters : ['aria'],
            passiveIncomeRate: player.passiveIncomeRate || 0,
            isAdmin: player.isAdmin || false
          }));
          console.log('✅ Loaded player data:', player.username);
        }

        // STEP 2: Load game config data in parallel AFTER player data is set
        console.log('📥 Loading game configuration data...');
        const [upgradesRes, charactersRes, levelsRes, mediaRes] = await Promise.all([
          fetch('/api/upgrades', {
            headers: { 'Authorization': `Bearer ${sessionToken}` }
          }),
          fetch('/api/characters', {
            headers: { 'Authorization': `Bearer ${sessionToken}` }
          }),
          fetch('/api/levels', {
            headers: { 'Authorization': `Bearer ${sessionToken}` }
          }),
          fetch('/api/media', {
            headers: { 'Authorization': `Bearer ${sessionToken}` }
          })
        ]);

        // Parse config responses
        const [upgradesData, charactersData, levelsData, mediaData] = await Promise.all([
          upgradesRes.ok ? upgradesRes.json() : null,
          charactersRes.ok ? charactersRes.json() : null,
          levelsRes.ok ? levelsRes.json() : null,
          mediaRes.ok ? mediaRes.json() : null
        ]);

        // Set upgrades
        if (upgradesData?.upgrades) {
          setUpgrades(upgradesData.upgrades);
          console.log('✅ Loaded upgrades:', upgradesData.upgrades.length);
        }

        // Set characters
        if (charactersData?.characters) {
          setCharacters(charactersData.characters);
          console.log('✅ Loaded characters:', charactersData.characters.length);
        }

        // Set levels
        if (levelsData?.levels) {
          setLevelConfigs(levelsData.levels);
          console.log('✅ Loaded levels:', levelsData.levels.length);
        }

        // Set media
        if (mediaData?.media) {
          const imageConfigs: ImageConfig[] = mediaData.media.map((media: any) => ({
            id: media.id,
            characterId: media.characterId,
            url: media.url,
            unlockLevel: media.unlockLevel,
            categories: media.categories || [],
            poses: media.poses || [],
            isHidden: media.isHidden || false
          }));
          setImages(imageConfigs);
          console.log('✅ Loaded media:', imageConfigs.length);
        }

        console.log('✅ All game data loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load game data:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadAllData();
  }, []);

  // Recalculate passive income, max energy, and regen when upgrades change
  useEffect(() => {
    if (!isInitialized) return;

    setState(prev => {
      const perHourUpgrades = upgrades.filter(u => u.type === 'perHour');
      let newPassiveRate = 0;
      perHourUpgrades.forEach(u => {
        const lvl = prev.upgrades[u.id] || 0;
        newPassiveRate += calculateUpgradeValue(u, lvl);
      });

      // Fix: Find ANY energyMax upgrade, not just specific ID
      const energyUpgrades = upgrades.filter(u => u.type === 'energyMax');
      let newMaxEnergy = 1000; // Base energy
      energyUpgrades.forEach(u => {
        const lvl = prev.upgrades[u.id] || 0;
        if (lvl > 0) {
          const upgradeValue = calculateUpgradeValue(u, lvl);
          // PROPER calculation: multiply level by upgrade value per level
          newMaxEnergy = 1000 + (upgradeValue * lvl);
        }
      });

      const regenUpgrades = upgrades.filter(u => u.type === 'energyRegen');
      let newRegenRate = 1; // Base regen
      regenUpgrades.forEach(u => {
        const lvl = prev.upgrades[u.id] || 0;
        if (lvl > 0) {
          newRegenRate += calculateUpgradeValue(u, lvl);
        }
      });

      // Only update if values changed
      if (newPassiveRate !== prev.passiveIncomeRate || 
          newMaxEnergy !== prev.maxEnergy || 
          newRegenRate !== prev.energyRegenRate) {
        return {
          ...prev,
          passiveIncomeRate: newPassiveRate,
          maxEnergy: newMaxEnergy,
          energyRegenRate: newRegenRate
        };
      }

      return prev;
    });
  }, [state.upgrades, upgrades, isInitialized]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Save state before user leaves/refreshes
  useEffect(() => {
    const handleBeforeUnload = async () => {
      const sessionToken = localStorage.getItem('sessionToken');
      if (sessionToken) {
        // Use sendBeacon for reliable save on page unload
        const data = JSON.stringify({
          points: state.points,
          energy: state.energy,
          passiveIncomeRate: state.passiveIncomeRate,
          upgrades: state.upgrades,
          unlockedCharacters: state.unlockedCharacters,
          level: state.level,
          maxEnergy: state.maxEnergy,
          energyRegenRate: state.energyRegenRate,
          displayImage: state.displayImage
        });

        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon('/api/player/me', blob);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state]);

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
              points: newPoints,
              passiveIncomeRate: prev.passiveIncomeRate,
              upgrades: prev.upgrades,
              unlockedCharacters: prev.unlockedCharacters,
              displayImage: prev.displayImage
            })
          }).catch(err => console.error('Failed to sync to DB:', err));
        }

        return { ...prev, energy: newEnergy, points: newPoints };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const tap = useCallback(async () => {
    setState(prev => {
      if (prev.energy < 1) return prev;

      // Calculate actual tap value
      const actualTapValue = calculateTapValue();

      const newPoints = prev.points + actualTapValue;
      const newEnergy = prev.energy - 1;

      // Log tap to LunaBug if available
      if ((window as any).LunaBug?.core) {
        (window as any).LunaBug.core.logEvent('tap_event', {
          tapValue: actualTapValue,
          energyBefore: prev.energy,
          pointsBefore: prev.points
        });
      }

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
        energy: newEnergy,
        lastTapValue: actualTapValue // Store for CharacterDisplay animation
      };
    });
  }, [calculateTapValue]);

  const dispatch = useCallback((action: any) => {
    switch (action.type) {
      case 'SET_POINTS':
        setState(prev => ({ ...prev, points: action.payload }));
        break;
      case 'SET_ENERGY':
        setState(prev => ({ ...prev, energy: action.payload }));
        break;
      default:
        break;
    }
  }, []);

  const purchaseUpgrade = useCallback(async (upgradeId: string): Promise<boolean> => {
    // Prevent duplicate purchases
    if (pendingPurchases.has(upgradeId)) {
      return false;
    }

    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return false;

    const currentLevel = state.upgrades[upgradeId] || 0;
    if (currentLevel >= upgrade.maxLevel) return false;

    const cost = calculateUpgradeCost(upgrade, currentLevel);
    if (state.points < cost) return false;

    const newLevel = currentLevel + 1;

    // Mark as pending
    setPendingPurchases(prev => new Set(prev).add(upgradeId));

    // Log purchase attempt to LunaBug
    if ((window as any).LunaBug?.core) {
      (window as any).LunaBug.core.logEvent('upgrade_purchase_attempt', {
        upgradeId,
        currentLevel,
        newLevel,
        cost,
        playerPoints: state.points
      });
    }

    // Save to database first (pessimistic update)
    try {
      const response = await fetch('/api/player/upgrades', {
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

      if (!response.ok) {
        throw new Error('Failed to purchase upgrade');
      }

      // Only update state after successful server response
      setState(prev => {
        const newUpgrades = { ...prev.upgrades, [upgradeId]: newLevel };

        const perHourUpgrades = upgrades.filter(u => u.type === 'perHour');
        let newPassiveRate = 0;
        perHourUpgrades.forEach(u => {
          const lvl = newUpgrades[u.id] || 0;
          newPassiveRate += calculateUpgradeValue(u, lvl);
        });

        // Fix: Find ANY energyMax upgrade
        const energyUpgrades = upgrades.filter(u => u.type === 'energyMax');
        let newMaxEnergy = 1000;
        energyUpgrades.forEach(u => {
          const lvl = newUpgrades[u.id] || 0;
          if (lvl > 0) {
            const upgradeValue = calculateUpgradeValue(u, lvl);
            // FIXED: Proper energy calculation
            newMaxEnergy = 1000 + (upgradeValue * lvl);
          }
        });

        const regenUpgrades = upgrades.filter(u => u.type === 'energyRegen');
        let newRegenRate = 1;
        regenUpgrades.forEach(u => {
          const lvl = newUpgrades[u.id] || 0;
          if (lvl > 0) {
            newRegenRate += calculateUpgradeValue(u, lvl);
          }
        });

        // Log successful upgrade to LunaBug
        if ((window as any).LunaBug?.core) {
          (window as any).LunaBug.core.logEvent('upgrade_purchased', {
            upgradeId,
            newLevel,
            costPaid: cost,
            newMaxEnergy,
            newPassiveRate
          });
        }

        return {
          ...prev,
          points: prev.points - cost,
          upgrades: newUpgrades,
          passiveIncomeRate: newPassiveRate,
          maxEnergy: newMaxEnergy,
          energyRegenRate: newRegenRate
        };
      });

      setPendingPurchases(prev => {
        const next = new Set(prev);
        next.delete(upgradeId);
        return next;
      });

      return true;
    } catch (err) {
      console.error('Failed to save upgrade to DB:', err);
      
      // Log error to LunaBug
      if ((window as any).LunaBug?.core) {
        (window as any).LunaBug.core.logEvent('upgrade_purchase_error', {
          upgradeId,
          error: err.message
        });
      }
      
      setPendingPurchases(prev => {
        const next = new Set(prev);
        next.delete(upgradeId);
        return next;
      });
      return false;
    }
  }, [state.upgrades, state.points, upgrades, pendingPurchases]);

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
    const selectedImg = images.find(img => img.id === imageId);
    setState(prev => ({ 
      ...prev, 
      selectedImageId: imageId,
      displayImage: selectedImg?.url || prev.displayImage
    }));

    // Update the player on the server with the new display image
    if (selectedImg) {
      fetch('/api/player/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        },
        body: JSON.stringify({ 
          selectedImageId: imageId,
          displayImage: selectedImg.url 
        })
      }).catch(err => console.error('Failed to update display image:', err));
    }
  }, [images]);

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

  const levelUp = useCallback(async (): Promise<boolean> => {
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

    setState(prev => {
      const newState = {
        ...prev,
        level: nextLevel,
        points: prev.points - levelConfig.cost,
        unlockedCharacters: [...prev.unlockedCharacters, ...newUnlockedChars]
      };

      // Sync level data to database
      fetch('/api/player/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        },
        body: JSON.stringify({
          level: nextLevel,
          unlockedCharacters: newState.unlockedCharacters
        })
      }).catch(err => console.error('Failed to sync level data to DB:', err));

      return newState;
    });

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
        newSelectedCharacterId = 'aria';
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
    setUpgrades([]);
    setCharacters([]);
    setImages([]);
    setLevelConfigs([]);
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
      resetGame,
      dispatch,
      calculateTapValue
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