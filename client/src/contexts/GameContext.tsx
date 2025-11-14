import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { DEFAULT_THEME, calculateUpgradeCost, calculateUpgradeValue, checkLevelRequirements, applyTheme, type UpgradeConfig, type CharacterConfig, type ImageConfig, type LevelConfig, type ThemeConfig } from '@shared/gameConfig';
import { queryClient } from '@/lib/queryClient';
import { invalidateAllGameQueries } from '@/utils/queryInvalidation';

interface GameState {
  points: number;
  lustPoints: number;
  lustGems: number;
  energy: number;
  energyMax: number;
  level: number;
  selectedCharacterId: string;
  activeCharacter: string | null;
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
  connectionStatus: 'connected' | 'timeout' | 'offline' | 'connecting';
  lastError: string | null;
  tap: () => void;
  purchaseUpgrade: (upgradeId: string) => Promise<boolean>;
  selectCharacter: (characterId: string) => Promise<boolean>;
  selectImage: (imageId: string) => void;
  selectAvatar: (imageId: string) => void;
  setDisplayImage: (imageId: string) => void;
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
  retryConnection: () => void;
  refreshPlayerState: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const createInitialState = (): GameState => ({
  points: 0,
  lustPoints: 0,
  lustGems: 0,
  energy: 1000,
  energyMax: 1000,
  level: 1,
  selectedCharacterId: 'aria',
  activeCharacter: null,
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

const apiRequest = async (url: string, options: RequestInit = {}, timeoutMs: number = 3000): Promise<Response> => {
  const sessionToken = localStorage.getItem('sessionToken');
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (sessionToken) {
    defaultHeaders['Authorization'] = `Bearer ${sessionToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(createInitialState);
  const [upgrades, setUpgrades] = useState<UpgradeConfig[]>([]);
  const [characters, setCharacters] = useState<CharacterConfig[]>([]);
  const [images, setImages] = useState<ImageConfig[]>([]);
  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[]>([]);
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [pendingPurchases, setPendingPurchases] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'timeout' | 'offline' | 'connecting'>('connecting');
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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

  const loadAllData = useCallback(async () => {
    console.log(`┌── 🔄 GameContext Init (attempt ${retryCount + 1})`);
    setConnectionStatus('connecting');
    setLastError(null);

    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) {
      console.error('└── ❌ No session token');
      setConnectionStatus('offline');
      setLastError('Not authenticated');
      setIsInitialized(true);
      return;
    }

    try {
      const healthRes = await apiRequest('/api/health', {}, 2000);
      if (!healthRes.ok) throw new Error(`Server unreachable`);

      const authRes = await apiRequest('/api/auth/me', {}, 3000);
      if (!authRes.ok) {
        if (authRes.status === 401) {
          localStorage.removeItem('sessionToken');
          throw new Error('Session expired');
        }
        throw new Error(`Auth failed`);
      }

      const authData = await authRes.json();
      if (!authData.success || !authData.player) throw new Error('Invalid auth');
      
      const player = authData.player;
      console.log(`├── 👤 Player: ${player.username} | Lvl ${player.level} | Admin: ${player.isAdmin}`);

      const configResults = await Promise.allSettled([
        apiRequest('/api/upgrades', {}, 3000).then(r => r.ok ? r.json() : { upgrades: [] }),
        apiRequest('/api/characters', {}, 3000).then(r => r.ok ? r.json() : { characters: [] }),
        apiRequest('/api/levels', {}, 3000).then(r => r.ok ? r.json() : { levels: [] }),
        apiRequest('/api/media', {}, 3000).then(r => r.ok ? r.json() : { media: [] })
      ]);

      const upgradesData = configResults[0].status === 'fulfilled' ? configResults[0].value : { upgrades: [] };
      const charactersData = configResults[1].status === 'fulfilled' ? configResults[1].value : { characters: [] };
      const levelsData = configResults[2].status === 'fulfilled' ? configResults[2].value : { levels: [] };
      const mediaData = configResults[3].status === 'fulfilled' ? configResults[3].value : { media: [] };
      
      const loadedUpgrades = upgradesData.upgrades || [];
      const loadedCharacters = charactersData.characters || [];
      const loadedLevels = levelsData.levels || [];
      const loadedMedia = mediaData.media || [];

      setUpgrades(loadedUpgrades);
      setCharacters(loadedCharacters);
      setLevelConfigs(loadedLevels);
      
      const imageConfigs: ImageConfig[] = loadedMedia.map((m: any) => ({
        id: m.id,
        characterId: m.characterId,
        url: m.url,
        unlockLevel: m.unlockLevel,
        categories: m.categories || [],
        poses: m.poses || [],
        isHidden: m.isHidden || false
      }));
      setImages(imageConfigs);
      
      console.log(`├── 📚 Config loaded: ${loadedUpgrades.length} upgrades, ${loadedCharacters.length} chars, ${imageConfigs.length} images`);

      const newState = {
        username: player.username,
        telegramId: player.telegramId,
        points: typeof player.points === 'string' ? parseFloat(player.points) : (player.points || 0),
        lustPoints: typeof player.lustPoints === 'string' ? parseFloat(player.lustPoints) : (player.lustPoints || player.points || 0),
        lustGems: player.lustGems || 0,
        energy: player.energy || 1000,
        energyMax: player.energyMax || 1000,
        level: player.level || 1,
        selectedCharacterId: player.selectedCharacterId || (loadedCharacters[0]?.id || 'aria'),
        activeCharacter: player.activeCharacter || null,
        selectedImageId: player.selectedImageId || null,
        displayImage: player.displayImage || null,
        upgrades: player.upgrades || {},
        unlockedCharacters: Array.isArray(player.unlockedCharacters) ? player.unlockedCharacters : ['aria'],
        unlockedImages: Array.isArray(player.unlockedImages) ? player.unlockedImages : [],
        passiveIncomeRate: player.passiveIncomeRate || 0,
        passiveIncomeCap: 10000,
        energyRegenRate: player.energyRegenRate || 1,
        isAdmin: player.isAdmin || false,
        boostActive: player.boostActive || false,
        boostMultiplier: player.boostMultiplier || 1.0,
        boostExpiresAt: player.boostExpiresAt ? new Date(player.boostExpiresAt) : null,
        boostEnergy: player.boostEnergy || 0,
        totalTapsToday: player.totalTapsToday || 0,
        totalTapsAllTime: player.totalTapsAllTime || 0,
        lastDailyReset: player.lastDailyReset ? new Date(player.lastDailyReset) : new Date(),
        lastWeeklyReset: player.lastWeeklyReset ? new Date(player.lastWeeklyReset) : new Date(),
        lastTapValue: 1,
        selectedAvatarId: null
      };
      
      setState(newState);

      setConnectionStatus('connected');
      setLastError(null);
      setRetryCount(0);
      console.log('└── ✅ GameContext ready');
      
    } catch (error) {
      console.error('└── ❌ Load failed:', error instanceof Error ? error.message : 'Unknown error');
      
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          setConnectionStatus('timeout');
          setLastError('Connection timeout');
        } else {
          setConnectionStatus('offline');
          setLastError(error.message);
        }
      } else {
        setConnectionStatus('offline');
        setLastError('Unknown error');
      }
    } finally {
      setIsInitialized(true);
    }
  }, [retryCount]);

  const refreshPlayerState = useCallback(async () => {
    try {
      const response = await apiRequest('/api/player/me', {}, 3000);
      if (response.ok) {
        const data = await response.json();
        const player = data.player;
        setState(prev => ({
          ...prev,
          selectedCharacterId: player.selectedCharacterId || prev.selectedCharacterId,
          activeCharacter: player.activeCharacter || prev.activeCharacter,
          displayImage: player.displayImage || prev.displayImage
        }));
      }
    } catch (err) {
      console.error('❌ Player state refresh failed:', err);
    }
  }, []);

  const retryConnection = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!isInitialized || !state.username || connectionStatus !== 'connected') return;
    
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

        syncCounter++;
        if (syncCounter >= 120) {
          syncCounter = 0;
          apiRequest('/api/player/me', {
            method: 'PATCH',
            body: JSON.stringify({
              energy: Math.round(newEnergy),
              points: Math.round(newPoints),
              lustPoints: Math.round(newLustPoints)
            })
          }, 2000).catch(() => {});
        }

        return { ...prev, energy: newEnergy, points: newPoints, lustPoints: newLustPoints };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isInitialized, state.username, connectionStatus]);

  const tap = useCallback(async () => {
    setState(prev => {
      if (prev.energy < 1) return prev;

      const actualTapValue = calculateTapValue();
      const newPoints = prev.points + actualTapValue;
      const newLustPoints = prev.lustPoints + actualTapValue;
      const newEnergy = prev.energy - 1;
      const newTotalTapsToday = prev.totalTapsToday + 1;
      const newTotalTapsAllTime = prev.totalTapsAllTime + 1;

      apiRequest('/api/player/me', {
        method: 'PATCH',
        body: JSON.stringify({
          points: Math.round(newPoints),
          lustPoints: Math.round(newLustPoints),
          energy: Math.round(newEnergy),
          totalTapsToday: newTotalTapsToday,
          totalTapsAllTime: newTotalTapsAllTime
        })
      }, 2000).catch(() => {});

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
        setState(prev => ({ ...prev, displayImage: action.payload }));
        break;
      case 'REFRESH_FROM_SERVER':
        loadAllData();
        break;
      default:
        break;
    }
  }, [loadAllData]);

  const purchaseUpgrade = useCallback(async (upgradeId: string): Promise<boolean> => {
    if (pendingPurchases.has(upgradeId) || connectionStatus !== 'connected') return false;
    
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return false;

    const currentLevel = state.upgrades[upgradeId] || 0;
    if (currentLevel >= upgrade.maxLevel) return false;

    const cost = calculateUpgradeCost(upgrade, currentLevel);
    if (state.points < cost) return false;

    const newLevel = currentLevel + 1;
    setPendingPurchases(prev => new Set(prev).add(upgradeId));

    try {
      console.log(`🛍️ Purchasing ${upgradeId} Lvl ${newLevel}`);
      
      const response = await apiRequest('/api/player/upgrades', {
        method: 'POST',
        body: JSON.stringify({ upgradeId, level: newLevel })
      }, 5000);

      if (!response.ok) throw new Error(`Purchase failed`);

      await loadAllData();
      await invalidateAllGameQueries(queryClient);
      
      console.log('✅ Upgrade purchased');
      return true;
    } catch (err) {
      console.error('❌ Purchase failed:', err);
      setLastError('Upgrade purchase failed');
      return false;
    } finally {
      setPendingPurchases(prev => {
        const next = new Set(prev);
        next.delete(upgradeId);
        return next;
      });
    }
  }, [state.upgrades, state.points, upgrades, pendingPurchases, connectionStatus, loadAllData]);

  const selectCharacter = useCallback(async (characterId: string): Promise<boolean> => {
    if (!state.unlockedCharacters.includes(characterId) || connectionStatus !== 'connected') return false;

    try {
      const response = await apiRequest('/api/player/select-character', {
        method: 'POST',
        body: JSON.stringify({ characterId })
      }, 5000);

      if (!response.ok) throw new Error('Selection failed');

      const result = await response.json();
      const updatedPlayer = result.player;
      
      setState(prev => ({
        ...prev,
        selectedCharacterId: updatedPlayer.selectedCharacterId,
        activeCharacter: updatedPlayer.activeCharacter || updatedPlayer.selectedCharacterId,
        selectedImageId: updatedPlayer.selectedImageId,
        displayImage: updatedPlayer.displayImage
      }));

      return true;
    } catch (error) {
      console.error('❌ Character selection failed:', error);
      setLastError('Character selection failed');
      return false;
    }
  }, [state.unlockedCharacters, connectionStatus]);

  const selectImage = useCallback((imageId: string) => {
    const selectedImg = images.find(img => img.id === imageId);
    setState(prev => ({ 
      ...prev, 
      selectedImageId: imageId,
      displayImage: selectedImg?.url || prev.displayImage
    }));
  }, [images]);

  const selectAvatar = useCallback((imageId: string) => {
    setState(prev => ({ ...prev, selectedAvatarId: imageId }));
  }, []);

  const setDisplayImage = useCallback((imageUr: string) => {
    setState(prev => ({ ...prev, displayImage: imageUrl }));
  }, []);

  const canLevelUp = useCallback(() => {
    const nextLevel = state.level + 1;
    const nextLevelConfig = levelConfigs.find(lc => lc.level === nextLevel);
    if (!nextLevelConfig) return false;
    
    const meetsRequirements = checkLevelRequirements(nextLevelConfig, state.upgrades);
    const hasEnoughPoints = state.points >= (nextLevelConfig.cost || 0);
    
    return meetsRequirements && hasEnoughPoints;
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
    setImages(prev => [...prev, image]);
  }, []);

  const updateImage = useCallback((image: ImageConfig) => {
    setImages(prev => prev.map(img => img.id === image.id ? image : img));
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
    setLastError(null);
    setConnectionStatus('connecting');
  }, []);

  return (
    <GameContext.Provider value={{
      state,
      upgrades,
      characters,
      images,
      levelConfigs,
      theme,
      connectionStatus,
      lastError,
      tap,
      purchaseUpgrade,
      selectCharacter,
      selectImage,
      selectAvatar,
      setDisplayImage,
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
      calculateTapValue,
      retryConnection,
      refreshPlayerState
    }}>
      {children}
      
      {(connectionStatus !== 'connected' || lastError) && (
        <div className="fixed bottom-4 right-4 bg-gray-900/95 text-white p-4 rounded-lg border max-w-sm text-sm z-50">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              connectionStatus === 'timeout' ? 'bg-orange-500' :
              'bg-red-500'
            }`} />
            <span className="font-medium">
              {connectionStatus === 'connected' ? '🟬 Connected' :
               connectionStatus === 'connecting' ? '🟬 Connecting...' :
               connectionStatus === 'timeout' ? '🟠 Timeout' :
               '🔴 Offline'}
            </span>
          </div>
          
          {lastError && (
            <div className="text-xs text-gray-300 mb-2">{lastError}</div>
          )}
          
          <div className="text-xs text-gray-400 mb-3">
            {state.username || 'Unknown'} | {state.activeCharacter || state.selectedCharacterId || 'None'} | {Object.keys(state.upgrades).length} upgrades
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={retryConnection}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs flex-1"
              disabled={connectionStatus === 'connecting'}
            >
              {connectionStatus === 'connecting' ? '⏳ Connecting...' : '🔄 Retry'}
            </button>
            <button 
              onClick={() => setLastError(null)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs"
            >
              ❌
            </button>
          </div>
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