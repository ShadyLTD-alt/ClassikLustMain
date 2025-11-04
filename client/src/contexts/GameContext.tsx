import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { DEFAULT_THEME, calculateUpgradeCost, calculateUpgradeValue, checkLevelRequirements, applyTheme, type UpgradeConfig, type CharacterConfig, type ImageConfig, type LevelConfig, type ThemeConfig } from '@shared/gameConfig';

interface GameState {
  points: number;
  lustPoints: number;
  lustGems: number;
  energy: number;
  energyMax: number;
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
  lastTapValue?: number;
  boostActive: boolean;
  boostMultiplier: number;
  boostExpiresAt: Date | null;
  boostEnergy: number;
  totalTapsToday: number;
  totalTapsAllTime: number;
  lastDailyReset: Date;
  lastWeeklyReset: Date;
  username?: string;
  telegramId?: string;
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
  selectCharacter: (characterId: string) => Promise<boolean>;
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
  calculateTapValue: () => number;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const createInitialState = (): GameState => ({
  points: 0,
  lustPoints: 0,
  lustGems: 0,
  energy: 1000,
  energyMax: 1000,
  level: 1,
  selectedCharacterId: 'shadow', // 🔧 Default fallback character
  selectedImageId: null,
  selectedAvatarId: null,
  upgrades: {},
  unlockedCharacters: ['shadow'],
  unlockedImages: [],
  passiveIncomeRate: 0,
  passiveIncomeCap: 10000,
  energyRegenRate: 1,
  isAdmin: false,
  displayImage: null,
  lastTapValue: 1,
  boostActive: false,
  boostMultiplier: 1.0,
  boostExpiresAt: null,
  boostEnergy: 0,
  totalTapsToday: 0,
  totalTapsAllTime: 0,
  lastDailyReset: new Date(),
  lastWeeklyReset: new Date(),
  username: '',
  telegramId: ''
});

const calculateBaseEnergyValues = (upgrades: UpgradeConfig[], playerUpgrades: Record<string, number>) => {
  let baseMaxEnergy = 1000;
  let baseEnergyRegen = 1;
  
  const energyUpgrades = upgrades.filter(u => u.type === 'energyMax');
  energyUpgrades.forEach(u => {
    const level = playerUpgrades[u.id] || 0;
    if (level > 0) {
      const upgradeValue = calculateUpgradeValue(u, level);
      baseMaxEnergy += upgradeValue;
    }
  });
  
  const regenUpgrades = upgrades.filter(u => u.type === 'energyRegen');
  regenUpgrades.forEach(u => {
    const level = playerUpgrades[u.id] || 0;
    if (level > 0) {
      const upgradeValue = calculateUpgradeValue(u, level);
      baseEnergyRegen += upgradeValue;
    }
  });
  
  return { baseMaxEnergy, baseEnergyRegen };
};

const normalizeImageUrl = (url: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return url;
  return `/${url}`;
};

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [upgrades, setUpgrades] = useState<UpgradeConfig[]>([]);
  const [characters, setCharacters] = useState<CharacterConfig[]>([]);
  const [images, setImages] = useState<ImageConfig[]>([]);
  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[]>([]);
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [pendingPurchases, setPendingPurchases] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const calculateTapValue = useCallback(() => {
    const tapPowerUpgrades = upgrades.filter(u => u.type === 'perTap');
    let tapValue = 1;

    tapPowerUpgrades.forEach(upgrade => {
      const level = state.upgrades[upgrade.id] || 0;
      tapValue += calculateUpgradeValue(upgrade, level);
    });

    if (state.boostActive && state.boostExpiresAt && new Date() < state.boostExpiresAt) {
      tapValue *= state.boostMultiplier;
    }

    return Math.floor(tapValue);
  }, [upgrades, state.upgrades, state.boostActive, state.boostMultiplier, state.boostExpiresAt]);

  useEffect(() => {
    if (state.boostActive && state.boostExpiresAt && new Date() >= state.boostExpiresAt) {
      setState(prev => ({
        ...prev,
        boostActive: false,
        boostMultiplier: 1.0,
        boostExpiresAt: null
      }));
    }
  }, [state.boostActive, state.boostExpiresAt]);

  // 🔧 CRITICAL FIX: Prevent timeout errors and handle failures gracefully
  useEffect(() => {
    let mounted = true;
    
    const loadAllData = async () => {
      console.log(`🔍 [GAME CONTEXT] Starting data load...`);
      
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        console.log('❌ [GAME CONTEXT] No session token, setting empty state');
        setIsInitialized(true);
        return;
      }

      try {
        console.log('🎯 [GAME CONTEXT] Loading from JSON-first system...');

        // 🔧 REDUCED TIMEOUT: Use shorter timeout to prevent hanging
        const authRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${sessionToken}` },
          signal: AbortSignal.timeout(5000) // Reduced from 10000
        });

        if (!mounted) return;

        if (!authRes.ok) {
          console.error(`❌ [GAME CONTEXT] Session invalid: ${authRes.status}`);
          if (authRes.status === 401) {
            localStorage.removeItem('sessionToken');
          }
          setLoadingError(`Session error (${authRes.status})`);
          setIsInitialized(true);
          return;
        }

        const authData = await authRes.json();
        if (!authData.success || !authData.player) {
          console.error('❌ [GAME CONTEXT] Invalid auth response');
          setLoadingError('Invalid authentication');
          setIsInitialized(true);
          return;
        }
        
        const playerFromAuth = authData.player;
        console.log(`✅ [GAME CONTEXT] Player loaded: ${playerFromAuth.username}`);

        if (!mounted) return;

        // 🔧 PARALLEL LOADING: Load all config in parallel with shorter timeouts
        const configPromises = [
          fetch('/api/upgrades', {
            headers: { 'Authorization': `Bearer ${sessionToken}` },
            signal: AbortSignal.timeout(3000) // Reduced timeout
          }).then(r => r.ok ? r.json() : null).catch(() => null),
          
          fetch('/api/characters', {
            headers: { 'Authorization': `Bearer ${sessionToken}` },
            signal: AbortSignal.timeout(3000)
          }).then(r => r.ok ? r.json() : null).catch(() => null),
          
          fetch('/api/levels', {
            headers: { 'Authorization': `Bearer ${sessionToken}` },
            signal: AbortSignal.timeout(3000)
          }).then(r => r.ok ? r.json() : null).catch(() => null),
          
          fetch('/api/media', {
            headers: { 'Authorization': `Bearer ${sessionToken}` },
            signal: AbortSignal.timeout(3000)
          }).then(r => r.ok ? r.json() : null).catch(() => null)
        ];

        const [upgradesData, charactersData, levelsData, mediaData] = await Promise.allSettled(
          configPromises
        );

        if (!mounted) return;

        // Set config data with fallbacks
        const upgrades = upgradesData.status === 'fulfilled' && upgradesData.value?.upgrades ? upgradesData.value.upgrades : [];
        const characters = charactersData.status === 'fulfilled' && charactersData.value?.characters ? charactersData.value.characters : [];
        const levels = levelsData.status === 'fulfilled' && levelsData.value?.levels ? levelsData.value.levels : [];
        const media = mediaData.status === 'fulfilled' && mediaData.value?.media ? mediaData.value.media : [];
        
        setUpgrades(upgrades);
        setCharacters(characters);
        setLevelConfigs(levels);
        
        const imageConfigs: ImageConfig[] = media.map((m: any) => ({
          id: m.id,
          characterId: m.characterId,
          url: normalizeImageUrl(m.url),
          unlockLevel: m.unlockLevel,
          categories: m.categories || [],
          poses: m.poses || [],
          isHidden: m.isHidden || false
        }));
        setImages(imageConfigs);
        
        console.log('✅ [GAME CONTEXT] Config loaded:', { upgrades: upgrades.length, characters: characters.length, media: imageConfigs.length });

        // Set player state
        if (upgrades.length > 0) {
          const player = playerFromAuth;
          const playerUpgrades = player.upgrades || {};
          const { baseMaxEnergy, baseEnergyRegen } = calculateBaseEnergyValues(upgrades, playerUpgrades);
          
          setState(prev => ({
            ...prev,
            username: player.username,
            telegramId: player.telegramId,
            points: typeof player.points === 'string' ? parseFloat(player.points) : (player.points || 0),
            lustPoints: typeof player.lustPoints === 'string' ? parseFloat(player.lustPoints) : (player.lustPoints || player.points || 0),
            lustGems: player.lustGems || 0,
            energy: Math.min(player.energy || baseMaxEnergy, baseMaxEnergy),
            energyMax: baseMaxEnergy,
            level: player.level || 1,
            selectedCharacterId: player.selectedCharacterId || (characters[0]?.id || 'shadow'),
            selectedImageId: player.selectedImageId || null,
            displayImage: normalizeImageUrl(player.displayImage),
            upgrades: playerUpgrades,
            unlockedCharacters: Array.isArray(player.unlockedCharacters) ? player.unlockedCharacters : ['shadow'],
            unlockedImages: Array.isArray(player.unlockedImages) ? player.unlockedImages : [],
            passiveIncomeRate: player.passiveIncomeRate || 0,
            energyRegenRate: baseEnergyRegen,
            isAdmin: player.isAdmin || false,
            boostActive: player.boostActive || false,
            boostMultiplier: player.boostMultiplier || 1.0,
            boostExpiresAt: player.boostExpiresAt ? new Date(player.boostExpiresAt) : null,
            boostEnergy: player.boostEnergy || 0,
            totalTapsToday: player.totalTapsToday || 0,
            totalTapsAllTime: player.totalTapsAllTime || 0,
            lastDailyReset: player.lastDailyReset ? new Date(player.lastDailyReset) : new Date(),
            lastWeeklyReset: player.lastWeeklyReset ? new Date(player.lastWeeklyReset) : new Date()
          }));
          
          console.log('✅ [GAME CONTEXT] Player state loaded successfully');
        }

        setLoadingError(null);
        console.log('✅ [GAME CONTEXT] Complete - All data loaded');
      } catch (error) {
        if (!mounted) return;
        console.error('❌ [GAME CONTEXT] Load failed:', error);
        
        // 🔧 GRACEFUL DEGRADATION: Set minimal working state
        if (error instanceof Error && error.name === 'AbortError') {
          setLoadingError('Connection timeout - using offline mode');
          // Keep current state, just mark as initialized
        } else {
          setLoadingError(error instanceof Error ? error.message : 'Load failed');
        }
      } finally {
        if (mounted) {
          setIsInitialized(true); // Always initialize, even on error
        }
      }
    };

    loadAllData();
    
    return () => {
      mounted = false;
    };
  }, []); // Single load only

  // Recalculate stats when upgrades change
  useEffect(() => {
    if (!isInitialized || upgrades.length === 0) return;

    setState(prev => {
      const perHourUpgrades = upgrades.filter(u => u.type === 'perHour');
      let newPassiveRate = 0;
      perHourUpgrades.forEach(u => {
        const lvl = prev.upgrades[u.id] || 0;
        newPassiveRate += calculateUpgradeValue(u, lvl);
      });

      const { baseMaxEnergy, baseEnergyRegen } = calculateBaseEnergyValues(upgrades, prev.upgrades);

      if (newPassiveRate !== prev.passiveIncomeRate || 
          baseMaxEnergy !== prev.energyMax || 
          baseEnergyRegen !== prev.energyRegenRate) {
        
        return {
          ...prev,
          passiveIncomeRate: newPassiveRate,
          energyMax: baseMaxEnergy,
          energyRegenRate: baseEnergyRegen,
          energy: Math.min(prev.energy, baseMaxEnergy)
        };
      }

      return prev;
    });
  }, [state.upgrades, upgrades, isInitialized]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // 🔧 FIXED: Reduced sync frequency to prevent spam
  useEffect(() => {
    if (!isInitialized || !state.username) return;
    
    let syncCounter = 0;
    const interval = setInterval(() => {
      setState(prev => {
        let newEnergy = Math.min(prev.energyMax, prev.energy + prev.energyRegenRate);
        let newPoints = prev.points;
        let newLustPoints = prev.lustPoints;

        if (prev.passiveIncomeRate > 0 && prev.points < prev.passiveIncomeCap) {
          const incomePerSecond = prev.passiveIncomeRate / 3600;
          newPoints = Math.min(prev.passiveIncomeCap, prev.points + incomePerSecond);
          newLustPoints = newPoints;
        }

        const energyChanged = newEnergy !== prev.energy;
        const pointsChanged = newPoints !== prev.points;

        if (!energyChanged && !pointsChanged) return prev;

        // 🔧 REDUCED SPAM: Only sync every 60 seconds instead of every 10
        syncCounter++;
        if (syncCounter >= 60) {
          syncCounter = 0;
          
          // 🔧 SILENT SYNC: Don't log routine syncs to reduce console spam
          fetch('/api/player/me', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({
              energy: Math.round(newEnergy),
              points: Math.round(newPoints),
              lustPoints: Math.round(newLustPoints)
            })
          })
          .catch(() => {}); // Silent fail for background sync
        }

        return { ...prev, energy: newEnergy, points: newPoints, lustPoints: newLustPoints };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isInitialized, state.username]);

  const tap = useCallback(async () => {
    setState(prev => {
      if (prev.energy < 1) return prev;

      const actualTapValue = calculateTapValue();
      const newPoints = prev.points + actualTapValue;
      const newLustPoints = prev.lustPoints + actualTapValue;
      const newEnergy = prev.energy - 1;
      const newTotalTapsToday = prev.totalTapsToday + 1;
      const newTotalTapsAllTime = prev.totalTapsAllTime + 1;

      // Log tap to LunaBug if available
      if ((window as any).LunaBug?.core) {
        (window as any).LunaBug.core.logEvent('tap_event', {
          tapValue: actualTapValue,
          boostActive: prev.boostActive,
          energyBefore: prev.energy,
          pointsBefore: prev.points
        });
      }

      // Immediate sync for taps (user expects instant response)
      fetch('/api/player/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        },
        body: JSON.stringify({
          points: Math.round(newPoints),
          lustPoints: Math.round(newLustPoints),
          energy: Math.round(newEnergy),
          totalTapsToday: newTotalTapsToday,
          totalTapsAllTime: newTotalTapsAllTime
        })
      })
      .catch(() => {}); // Silent fail

      return {
        ...prev,
        points: newPoints,
        lustPoints: newLustPoints,
        energy: newEnergy,
        lastTapValue: actualTapValue,
        totalTapsToday: newTotalTapsToday,
        totalTapsAllTime: newTotalTapsAllTime
      };
    });
  }, [calculateTapValue]);

  const dispatch = useCallback((action: any) => {
    switch (action.type) {
      case 'SET_POINTS':
        setState(prev => ({ ...prev, points: action.payload, lustPoints: action.payload }));
        break;
      case 'UPDATE_DISPLAY_IMAGE':
        setState(prev => ({ ...prev, displayImage: normalizeImageUrl(action.payload) }));
        break;
      case 'REFRESH_FROM_SERVER':
        const sessionToken = localStorage.getItem('sessionToken');
        if (sessionToken) {
          console.log('🔄 [REFRESH] Refreshing from server...');
          fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${sessionToken}` },
            signal: AbortSignal.timeout(5000)
          })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.player) {
              const player = data.player;
              setState(prev => {
                const { baseMaxEnergy, baseEnergyRegen } = calculateBaseEnergyValues(upgrades, player.upgrades || {});
                return {
                  ...prev,
                  points: typeof player.points === 'string' ? parseFloat(player.points) : (player.points || prev.points),
                  lustPoints: typeof player.lustPoints === 'string' ? parseFloat(player.lustPoints) : (player.lustPoints || prev.lustPoints),
                  energy: Math.min(player.energy || prev.energy, baseMaxEnergy),
                  energyMax: baseMaxEnergy,
                  energyRegenRate: baseEnergyRegen,
                  upgrades: player.upgrades || prev.upgrades,
                  selectedCharacterId: player.selectedCharacterId || prev.selectedCharacterId,
                  displayImage: normalizeImageUrl(player.displayImage) || prev.displayImage
                };
              });
              console.log('✅ [REFRESH] State refreshed');
              setLoadingError(null);
            }
          })
          .catch(err => {
            console.error('🔴 [REFRESH] Failed:', err);
            setLoadingError('Refresh failed');
          });
        }
        break;
      default:
        break;
    }
  }, [upgrades]);

  // FIXED: Purchase upgrade with immediate local update
  const purchaseUpgrade = useCallback(async (upgradeId: string): Promise<boolean> => {
    if (pendingPurchases.has(upgradeId)) return false;
    
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return false;

    const currentLevel = state.upgrades[upgradeId] || 0;
    if (currentLevel >= upgrade.maxLevel) return false;

    const cost = calculateUpgradeCost(upgrade, currentLevel);
    if (state.points < cost) return false;

    const newLevel = currentLevel + 1;
    setPendingPurchases(prev => new Set(prev).add(upgradeId));

    try {
      console.log(`🎯 [UPGRADE] Purchasing ${upgradeId} level ${newLevel}`);
      
      const response = await fetch('/api/player/upgrades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        },
        body: JSON.stringify({ upgradeId, level: newLevel }),
        signal: AbortSignal.timeout(5000) // Shorter timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      const updatedPlayer = result.player;
      
      // 🔧 IMMEDIATE LOCAL UPDATE
      setState(prev => {
        const newUpgrades = { ...prev.upgrades, [upgradeId]: newLevel };
        const { baseMaxEnergy, baseEnergyRegen } = calculateBaseEnergyValues(upgrades, newUpgrades);
        
        return {
          ...prev,
          points: updatedPlayer.points,
          lustPoints: updatedPlayer.lustPoints || updatedPlayer.points,
          upgrades: newUpgrades,
          energyMax: baseMaxEnergy,
          energyRegenRate: baseEnergyRegen,
          energy: Math.min(prev.energy, baseMaxEnergy)
        };
      });
      
      console.log(`✅ [UPGRADE] ${upgradeId} level ${newLevel} purchased`);
      return true;
    } catch (err) {
      console.error(`🔴 [UPGRADE] Purchase failed:`, err);
      return false;
    } finally {
      setPendingPurchases(prev => {
        const next = new Set(prev);
        next.delete(upgradeId);
        return next;
      });
    }
  }, [state.upgrades, state.points, upgrades, pendingPurchases]);

  const selectCharacter = useCallback(async (characterId: string): Promise<boolean> => {
    if (!state.unlockedCharacters.includes(characterId)) return false;

    try {
      const response = await fetch('/api/player/select-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        },
        body: JSON.stringify({ characterId }),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) return false;

      const result = await response.json();
      const updatedPlayer = result.player;
      
      setState(prev => ({
        ...prev,
        selectedCharacterId: updatedPlayer.selectedCharacterId,
        selectedImageId: updatedPlayer.selectedImageId,
        displayImage: normalizeImageUrl(updatedPlayer.displayImage)
      }));

      return true;
    } catch (error) {
      console.error('🔴 [SELECT CHARACTER] Error:', error);
      return false;
    }
  }, [state.unlockedCharacters]);

  const selectImage = useCallback((imageId: string) => {
    const selectedImg = images.find(img => img.id === imageId);
    setState(prev => ({ 
      ...prev, 
      selectedImageId: imageId,
      displayImage: normalizeImageUrl(selectedImg?.url || prev.displayImage)
    }));
  }, [images]);

  const selectAvatar = useCallback((imageId: string) => {
    setState(prev => ({ ...prev, selectedAvatarId: imageId }));
  }, []);

  const canLevelUp = useCallback(() => {
    const nextLevel = state.level + 1;
    const nextLevelConfig = levelConfigs.find(lc => lc.level === nextLevel);
    return nextLevelConfig ? checkLevelRequirements(nextLevelConfig, state.upgrades) && state.points >= nextLevelConfig.experienceRequired : false;
  }, [state.level, state.points, state.upgrades, levelConfigs]);

  const levelUp = useCallback(async (): Promise<boolean> => {
    if (!canLevelUp()) return false;
    const nextLevel = state.level + 1;
    setState(prev => ({ ...prev, level: nextLevel }));
    return true;
  }, [canLevelUp, state.level]);

  const toggleAdmin = useCallback(() => {
    setState(prev => ({ ...prev, isAdmin: !prev.isAdmin }));
  }, []);

  const updateUpgradeConfig = useCallback((upgrade: UpgradeConfig) => {
    setUpgrades(prev => {
      const index = prev.findIndex(u => u.id === upgrade.id);
      return index >= 0 ? prev.map((u, i) => i === index ? upgrade : u) : [...prev, upgrade];
    });
  }, []);

  const updateCharacterConfig = useCallback((character: CharacterConfig) => {
    setCharacters(prev => {
      const index = prev.findIndex(c => c.id === character.id);
      return index >= 0 ? prev.map((c, i) => i === index ? character : c) : [...prev, character];
    });
  }, []);

  const addImage = useCallback((image: ImageConfig) => {
    setImages(prev => [...prev, { ...image, url: normalizeImageUrl(image.url) }]);
  }, []);

  const updateImage = useCallback((image: ImageConfig) => {
    setImages(prev => prev.map(img => img.id === image.id ? { ...image, url: normalizeImageUrl(image.url) } : img));
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
  }, []);

  const deleteLevel = useCallback((levelToDelete: number) => {
    setLevelConfigs(prev => prev.filter(lc => lc.level !== levelToDelete));
  }, []);

  const updateLevelConfig = useCallback((levelConfig: LevelConfig) => {
    setLevelConfigs(prev => {
      const index = prev.findIndex(lc => lc.level === levelConfig.level);
      return index >= 0 
        ? prev.map((lc, i) => i === index ? levelConfig : lc)
        : [...prev, levelConfig].sort((a, b) => a.level - b.level);
    });
  }, []);

  const updateTheme = useCallback((newTheme: ThemeConfig) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  }, []);

  const resetGame = useCallback(() => {
    setState(createInitialState());
    setUpgrades([]);
    setCharacters([]);
    setImages([]);
    setLevelConfigs([]);
    setTheme(DEFAULT_THEME);
    setLoadingError(null);
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
      
      {/* 🔍 Minimal debug overlay - only show critical errors */}
      {process.env.NODE_ENV === 'development' && loadingError && (
        <div className="fixed bottom-4 right-4 bg-red-900/90 text-white p-3 rounded-lg border border-red-500 max-w-xs text-sm z-50">
          <div className="font-semibold">🔍 Debug Info:</div>
          <div className="text-xs">{loadingError}</div>
          <div className="text-xs">User: {state.username || 'None'}</div>
          <div className="text-xs">Character: {state.selectedCharacterId || 'None'}</div>
          <div className="text-xs">Upgrades: {Object.keys(state.upgrades).length}</div>
          <button 
            onClick={() => dispatch({ type: 'REFRESH_FROM_SERVER' })}
            className="mt-2 px-2 py-1 bg-blue-600 rounded text-xs w-full"
          >
            🔄 Refresh
          </button>
          <button 
            onClick={() => setLoadingError(null)}
            className="mt-1 px-2 py-1 bg-gray-600 rounded text-xs w-full"
          >
            ❌ Hide
          </button>
        </div>
      )}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}