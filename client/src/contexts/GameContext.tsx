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
  activeCharacter: string | null; // ✅ Added for character selection
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
  displayImage: (displayImage: string) => void;
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
  refreshPlayerState: () => Promise<void>; // ✅ Added for character selection refresh
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
  activeCharacter: null, // ✅ Added
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

const normalizeImageUrl = (url: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return url;
  return `/${url}`;
};

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
  const [state, setState] = useState<GameState>(() => {
    console.log('🎮 [GAMECONTEXT] Initializing with DEFAULT state');
    return createInitialState();
  });
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
    console.log('🔄 [GAMECONTEXT] Starting data load (attempt ' + (retryCount + 1) + ')...');
    setConnectionStatus('connecting');
    setLastError(null);

    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) {
      console.log('❌ [GAMECONTEXT] No session token');
      setConnectionStatus('offline');
      setLastError('Not authenticated - please login');
      setIsInitialized(true);
      return;
    }

    try {
      console.log('🎯 [GAMECONTEXT] Testing server connection...');
      const healthRes = await apiRequest('/api/health', {}, 2000);
      if (!healthRes.ok) {
        throw new Error(`Server unreachable (${healthRes.status})`);
      }
      console.log('✅ [GAMECONTEXT] Server is responding');

      console.log('🔑 [GAMECONTEXT] Validating session...');
      const authRes = await apiRequest('/api/auth/me', {}, 3000);
      
      if (!authRes.ok) {
        if (authRes.status === 401) {
          localStorage.removeItem('sessionToken');
          throw new Error('Session expired - please login again');
        }
        throw new Error(`Auth failed (${authRes.status})`);
      }

      const authData = await authRes.json();
      if (!authData.success || !authData.player) {
        throw new Error('Invalid auth response');
      }
      
      const player = authData.player;
      console.log('👤 [GAMECONTEXT] Player data received from backend:', {
        username: player.username,
        lustPoints: player.lustPoints,
        energy: player.energy,
        energyMax: player.energyMax,
        passiveIncomeRate: player.passiveIncomeRate,
        level: player.level,
        isAdmin: player.isAdmin,
        upgrades: Object.keys(player.upgrades || {}).length,
        selectedChar: player.selectedCharacterId,
        activeChar: player.activeCharacter // ✅ Added
      });

      console.log('📦 [GAMECONTEXT] Loading game configuration...');
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
        url: normalizeImageUrl(m.url),
        unlockLevel: m.unlockLevel,
        categories: m.categories || [],
        poses: m.poses || [],
        isHidden: m.isHidden || false
      }));
      setImages(imageConfigs);
      
      console.log('✅ [GAMECONTEXT] Config loaded:', {
        upgrades: loadedUpgrades.length,
        characters: loadedCharacters.length,
        levels: loadedLevels.length,
        media: imageConfigs.length
      });

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
        activeCharacter: player.activeCharacter || null, // ✅ Added
        selectedImageId: player.selectedImageId || null,
        displayImage: normalizeImageUrl(player.displayImage),
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
      
      console.log('📢 [GAMECONTEXT] Setting player state to loaded data:', {
        lustPoints: newState.lustPoints,
        energy: newState.energy,
        energyMax: newState.energyMax,
        passiveIncome: newState.passiveIncomeRate,
        level: newState.level,
        isAdmin: newState.isAdmin,
        character: newState.selectedCharacterId,
        activeCharacter: newState.activeCharacter, // ✅ Added
        upgradeCount: Object.keys(newState.upgrades).length
      });
      
      setState(newState);

      setConnectionStatus('connected');
      setLastError(null);
      setRetryCount(0);
      console.log('✅ [GAMECONTEXT] All data loaded and state updated successfully');
      
    } catch (error) {
      console.error('❌ [GAMECONTEXT] Load failed:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          setConnectionStatus('timeout');
          setLastError('Connection timeout - check internet connection');
        } else {
          setConnectionStatus('offline');
          setLastError(error.message);
        }
      } else {
        setConnectionStatus('offline');
        setLastError('Unknown connection error');
      }
    } finally {
      setIsInitialized(true);
    }
  }, [retryCount]);

  // ✅ NEW: Refresh player state after character selection
  const refreshPlayerState = useCallback(async () => {
    console.log('🔄 [GAMECONTEXT] Refreshing player state...');
    try {
      const response = await apiRequest('/api/player/me', {}, 3000);
      if (response.ok) {
        const data = await response.json();
        const player = data.player;
        setState(prev => ({
          ...prev,
          selectedCharacterId: player.selectedCharacterId || prev.selectedCharacterId,
          activeCharacter: player.activeCharacter || prev.activeCharacter,
          displayImage: normalizeImageUrl(player.displayImage) || prev.displayImage
        }));
        console.log('✅ [GAMECONTEXT] Player state refreshed');
      }
    } catch (err) {
      console.error('❌ [GAMECONTEXT] Failed to refresh player state:', err);
    }
  }, []);

  const retryConnection = useCallback(() => {
    console.log('🔄 [GAMECONTEXT] Manual retry requested');
    setRetryCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    console.log('🚀 [GAMECONTEXT] Initial loadAllData triggered');
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
    console.log('📤 [GAMECONTEXT] Dispatch action:', action.type);
    switch (action.type) {
      case 'SET_POINTS':
        setState(prev => ({ ...prev, points: action.payload, lustPoints: action.payload }));
        break;
      case 'UPDATE_DISPLAY_IMAGE':
        setState(prev => ({ ...prev, displayImage: normalizeImageUrl(action.payload) }));
        break;
      case 'REFRESH_FROM_SERVER':
        console.log('🔄 [GAMECONTEXT] Manual refresh requested');
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
      console.log(`🛍️ [GAMECONTEXT] Purchasing ${upgradeId} level ${newLevel}`);
      
      const response = await apiRequest('/api/player/upgrades', {
        method: 'POST',
        body: JSON.stringify({ upgradeId, level: newLevel })
      }, 5000);

      if (!response.ok) {
        throw new Error(`Purchase failed: ${response.status}`);
      }

      const result = await response.json();
      const updatedPlayer = result.player;
      
      console.log('✅ [GAMECONTEXT] Upgrade purchased, syncing all caches...');
      
      // ✅ CRITICAL FIX: Reload local state AND invalidate React Query cache
      await loadAllData();
      await invalidateAllGameQueries(queryClient);
      
      console.log('🔄 [GAMECONTEXT] All caches synced - UI should update instantly');
      
      return true;
    } catch (err) {
      console.error(`❌ [GAMECONTEXT] Purchase failed:`, err);
      setLastError(`Upgrade purchase failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
      console.log(`🎭 [GAMECONTEXT] Selecting ${characterId}`);
      
      const response = await apiRequest('/api/player/select-character', {
        method: 'POST',
        body: JSON.stringify({ characterId })
      }, 5000);

      if (!response.ok) {
        throw new Error(`Selection failed: ${response.status}`);
      }

      const result = await response.json();
      const updatedPlayer = result.player;
      
      setState(prev => ({
        ...prev,
        selectedCharacterId: updatedPlayer.selectedCharacterId,
        activeCharacter: updatedPlayer.activeCharacter || updatedPlayer.selectedCharacterId, // ✅ Added
        selectedImageId: updatedPlayer.selectedImageId,
        displayImage: normalizeImageUrl(updatedPlayer.displayImage)
      }));

      console.log(`✅ [GAMECONTEXT] Successfully selected ${characterId}`);
      return true;
    } catch (error) {
      console.error('❌ [GAMECONTEXT] Selection failed:', error);
      setLastError(`Character selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, [state.unlockedCharacters, connectionStatus]);

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
    const normalizedUrl = normalizeImageUrl(image.url);
    if (normalizedUrl === null) return;
    setImages(prev => [...prev, { ...image, url: normalizedUrl }]);
  }, []);

  const updateImage = useCallback((image: ImageConfig) => {
    setImages(prev => prev.map(img => {
      if (img.id === image.id) {
        const normalizedUrl = normalizeImageUrl(image.url);
        if (normalizedUrl === null) return img;
        return { ...image, url: normalizedUrl };
      }
      return img;
    }));
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
      refreshPlayerState // ✅ Added
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
              {connectionStatus === 'connected' ? '🟢 Connected' :
               connectionStatus === 'connecting' ? '🟡 Connecting...' :
               connectionStatus === 'timeout' ? '🟠 Timeout' :
               '🔴 Offline'}
            </span>
          </div>
          
          {lastError && (
            <div className="text-xs text-gray-300 mb-2">{lastError}</div>
          )}
          
          <div className="text-xs text-gray-400 mb-3">
            User: {state.username || 'Unknown'} | 
            Character: {state.activeCharacter || state.selectedCharacterId || 'None'} | 
            Upgrades: {Object.keys(state.upgrades).length}
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

console.log('✅ [GAMECONTEXT] Module loaded - uses backend stats directly, no embedded data');
