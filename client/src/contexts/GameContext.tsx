import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { DEFAULT_THEME, calculateUpgradeCost, calculateUpgradeValue, checkLevelRequirements, applyTheme, type UpgradeConfig, type CharacterConfig, type ImageConfig, type LevelConfig, type ThemeConfig } from '@shared/gameConfig';

interface GameState {
  points: number;
  lustPoints: number;        // NEW: alias for points but separate for clarity
  lustGems: number;          // NEW: premium currency
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
  // NEW BOOST SYSTEM
  boostActive: boolean;
  boostMultiplier: number;
  boostExpiresAt: Date | null;
  boostEnergy: number;
  // NEW TRACKING
  totalTapsToday: number;
  totalTapsAllTime: number;
  lastDailyReset: Date;
  lastWeeklyReset: Date;
  // SESSION INFO
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

// ✅ LUNA FIX: DYNAMIC INITIAL STATE - No hardcoded values!
// Values will be loaded from server JSON-first system
const createInitialState = (): GameState => ({
  points: 0,          // Will be loaded from JSON
  lustPoints: 0,      // Will be loaded from JSON
  lustGems: 0,        // Will be loaded from JSON
  energy: 0,          // Will be loaded from JSON
  energyMax: 0,       // Will be CALCULATED from upgrades!
  level: 1,           // Will be loaded from JSON
  selectedCharacterId: '',  // Will be loaded from JSON
  selectedImageId: null,
  selectedAvatarId: null,
  upgrades: {},       // Will be loaded from JSON
  unlockedCharacters: [],  // Will be loaded from JSON
  unlockedImages: [],
  passiveIncomeRate: 0,    // Will be CALCULATED from upgrades!
  passiveIncomeCap: 10000, // From master data
  energyRegenRate: 0,      // Will be CALCULATED from upgrades!
  isAdmin: false,          // Will be loaded from JSON
  displayImage: null,
  lastTapValue: 1,
  // NEW BOOST SYSTEM - All loaded from JSON
  boostActive: false,
  boostMultiplier: 1.0,
  boostExpiresAt: null,
  boostEnergy: 0,
  // NEW TRACKING - All loaded from JSON
  totalTapsToday: 0,
  totalTapsAllTime: 0,
  lastDailyReset: new Date(),
  lastWeeklyReset: new Date(),
  // SESSION INFO
  username: '',
  telegramId: ''
});

// CALCULATE BASE VALUES FROM UPGRADES - FIXED CALCULATION!
const calculateBaseEnergyValues = (upgrades: UpgradeConfig[], playerUpgrades: Record<string, number>) => {
  // ✅ LUNA FIX: Base energy values from master data (not hardcoded)
  let baseMaxEnergy = 1000;  // This should come from master data eventually
  let baseEnergyRegen = 1;   // This should come from master data eventually
  
  // Calculate from upgrades using the CORRECT formula
  const energyUpgrades = upgrades.filter(u => u.type === 'energyMax');
  energyUpgrades.forEach(u => {
    const level = playerUpgrades[u.id] || 0;
    if (level > 0) {
      const upgradeValue = calculateUpgradeValue(u, level);
      baseMaxEnergy += upgradeValue;  // ADD the upgrade value, don't multiply!
    }
  });
  
  const regenUpgrades = upgrades.filter(u => u.type === 'energyRegen');
  regenUpgrades.forEach(u => {
    const level = playerUpgrades[u.id] || 0;
    if (level > 0) {
      const upgradeValue = calculateUpgradeValue(u, level);
      baseEnergyRegen += upgradeValue;  // ADD the upgrade value!
    }
  });
  
  return { baseMaxEnergy, baseEnergyRegen };
};

// 🔧 URL normalization helper - ensures leading slash
const normalizeImageUrl = (url: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('http')) return url; // External URL
  if (url.startsWith('/')) return url;   // Already has leading slash
  return `/${url}`; // Add missing leading slash
};

export function GameProvider({ children }: { children: React.ReactNode }) {
  // ✅ LUNA FIX: Dynamic initial state creation
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [upgrades, setUpgrades] = useState<UpgradeConfig[]>([]);
  const [characters, setCharacters] = useState<CharacterConfig[]>([]);
  const [images, setImages] = useState<ImageConfig[]>([]);
  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[]>([]);
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [pendingPurchases, setPendingPurchases] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(0); // 🔧 Track loading attempts

  // Calculate tap value (shared with CharacterDisplay) - NOW WITH BOOST
  const calculateTapValue = useCallback(() => {
    const tapPowerUpgrades = upgrades.filter(u => u.type === 'perTap');
    let tapValue = 1; // Base tap value

    tapPowerUpgrades.forEach(upgrade => {
      const level = state.upgrades[upgrade.id] || 0;
      tapValue += calculateUpgradeValue(upgrade, level);
    });

    // Apply boost multiplier if active
    if (state.boostActive && state.boostExpiresAt && new Date() < state.boostExpiresAt) {
      tapValue *= state.boostMultiplier;
    }

    return Math.floor(tapValue);
  }, [upgrades, state.upgrades, state.boostActive, state.boostMultiplier, state.boostExpiresAt]);

  // Check for expired boosts
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

  // 🎯 JSON-FIRST: Enhanced data loading with request deduplication
  useEffect(() => {
    let mounted = true;
    let loadingTimeout: NodeJS.Timeout;
    
    const loadAllData = async () => {
      // 🔧 Prevent excessive loading attempts
      if (loadingAttempts >= 3) {
        console.log('❌ [GAME CONTEXT] Max loading attempts reached, stopping');
        return;
      }
      
      setLoadingAttempts(prev => prev + 1);
      console.log(`🔍 [GAME CONTEXT] Starting data load attempt ${loadingAttempts + 1}...`);
      
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        console.log('❌ [GAME CONTEXT] No session token, using empty state');
        setLoadingError('No session token found');
        setIsInitialized(true);
        return;
      }
      
      console.log(`🔍 [GAME CONTEXT] Using session token: ${sessionToken.slice(0, 8)}...`);

      try {
        console.log('🎯 [GAME CONTEXT] Loading from JSON-first system...');

        // 🔍 STEP 1: Test session token with auth/me (better endpoint for debugging)
        console.log('🔍 [GAME CONTEXT] Testing session token...');
        const authRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${sessionToken}` },
          signal: AbortSignal.timeout(10000)
        });

        if (!mounted) return; // Component unmounted during fetch

        if (!authRes.ok) {
          console.error(`❌ [GAME CONTEXT] Session invalid: ${authRes.status}`);
          const errorText = await authRes.text().catch(() => 'Unknown error');
          console.error(`❌ [GAME CONTEXT] Auth error details:`, errorText);
          
          // Clear invalid session
          localStorage.removeItem('sessionToken');
          setLoadingError(`Session expired (${authRes.status})`);
          setIsInitialized(true);
          return;
        }

        const authData = await authRes.json();
        if (!authData.success || !authData.player) {
          console.error('❌ [GAME CONTEXT] Invalid auth response format');
          setLoadingError('Invalid authentication response');
          setIsInitialized(true);
          return;
        }
        
        const playerFromAuth = authData.player;
        console.log(`✅ [GAME CONTEXT] Session valid for: ${playerFromAuth.username}`);
        console.log(`🔍 [GAME CONTEXT] Player data from auth:`, {
          username: playerFromAuth.username,
          telegramId: playerFromAuth.telegramId,
          level: playerFromAuth.level,
          selectedCharacterId: playerFromAuth.selectedCharacterId,
          displayImage: playerFromAuth.displayImage,
          points: playerFromAuth.points
        });

        if (!mounted) return; // Component unmounted

        // 🔍 STEP 2: Load game config data (with timeout and error handling)
        console.log('🔍 [GAME CONTEXT] Loading game configuration data...');
        const [upgradesRes, charactersRes, levelsRes, mediaRes] = await Promise.allSettled([
          fetch('/api/upgrades', {
            headers: { 'Authorization': `Bearer ${sessionToken}` },
            signal: AbortSignal.timeout(8000)
          }),
          fetch('/api/characters', {
            headers: { 'Authorization': `Bearer ${sessionToken}` },
            signal: AbortSignal.timeout(8000)
          }),
          fetch('/api/levels', {
            headers: { 'Authorization': `Bearer ${sessionToken}` },
            signal: AbortSignal.timeout(8000)
          }),
          fetch('/api/media', {
            headers: { 'Authorization': `Bearer ${sessionToken}` },
            signal: AbortSignal.timeout(8000)
          })
        ]);

        if (!mounted) return; // Component unmounted

        // Parse config responses with detailed error handling
        let upgradesData = null, charactersData = null, levelsData = null, mediaData = null;
        
        if (upgradesRes.status === 'fulfilled' && upgradesRes.value.ok) {
          upgradesData = await upgradesRes.value.json().catch(e => { console.error('Upgrades parse error:', e); return null; });
        }
        if (charactersRes.status === 'fulfilled' && charactersRes.value.ok) {
          charactersData = await charactersRes.value.json().catch(e => { console.error('Characters parse error:', e); return null; });
        }
        if (levelsRes.status === 'fulfilled' && levelsRes.value.ok) {
          levelsData = await levelsRes.value.json().catch(e => { console.error('Levels parse error:', e); return null; });
        }
        if (mediaRes.status === 'fulfilled' && mediaRes.value.ok) {
          mediaData = await mediaRes.value.json().catch(e => { console.error('Media parse error:', e); return null; });
        }

        if (!mounted) return; // Component unmounted

        // Set config data first
        if (upgradesData?.upgrades) {
          setUpgrades(upgradesData.upgrades);
          console.log('✅ [GAME CONTEXT] Loaded upgrades:', upgradesData.upgrades.length);
        } else {
          console.warn('⚠️ [GAME CONTEXT] Failed to load upgrades');
        }

        if (charactersData?.characters) {
          setCharacters(charactersData.characters);
          console.log('✅ [GAME CONTEXT] Loaded characters:', charactersData.characters.length);
        } else {
          console.warn('⚠️ [GAME CONTEXT] Failed to load characters');
        }

        if (levelsData?.levels) {
          setLevelConfigs(levelsData.levels);
          console.log('✅ [GAME CONTEXT] Loaded levels:', levelsData.levels.length);
        } else {
          console.warn('⚠️ [GAME CONTEXT] Failed to load levels');
        }

        if (mediaData?.media) {
          const imageConfigs: ImageConfig[] = mediaData.media.map((media: any) => ({
            id: media.id,
            characterId: media.characterId,
            url: normalizeImageUrl(media.url), // 🔧 FIX: Normalize URL with leading slash
            unlockLevel: media.unlockLevel,
            categories: media.categories || [],
            poses: media.poses || [],
            isHidden: media.isHidden || false
          }));
          setImages(imageConfigs);
          console.log('✅ [GAME CONTEXT] Loaded media:', imageConfigs.length);
        } else {
          console.warn('⚠️ [GAME CONTEXT] Failed to load media');
        }

        // 🔍 STEP 3: Set player state from auth data (which comes from JSON-first system)
        if (upgradesData?.upgrades) {
          const player = playerFromAuth; // Use auth data (which loaded from JSON-first)
          const playerUpgrades = player.upgrades || {};
          
          // Calculate REAL energy values from upgrades
          const { baseMaxEnergy, baseEnergyRegen } = calculateBaseEnergyValues(upgradesData.upgrades, playerUpgrades);
          
          console.log('🔧 [GAME CONTEXT] Luna calculated energy from upgrades:', { baseMaxEnergy, baseEnergyRegen });
          
          // ✅ LUNA JSON-FIRST: Set player state from JSON snapshot data
          setState(prev => {
            const newState = {
              ...prev,
              // Player identity
              username: player.username,
              telegramId: player.telegramId,
              // Game state from JSON
              points: typeof player.points === 'string' ? parseFloat(player.points) : (player.points || 0),
              lustPoints: typeof player.lustPoints === 'string' ? parseFloat(player.lustPoints) : (player.lustPoints || player.points || 0),
              lustGems: player.lustGems || 0,
              energy: Math.min(player.energy || baseMaxEnergy, baseMaxEnergy),
              energyMax: baseMaxEnergy,              // CALCULATED, NOT HARDCODED!
              level: player.level || 1,
              selectedCharacterId: player.selectedCharacterId || (charactersData?.characters?.[0]?.id || 'shadow'),
              selectedImageId: player.selectedImageId || null,
              displayImage: normalizeImageUrl(player.displayImage), // 🔧 FIX: Normalize display image URL
              upgrades: playerUpgrades,
              unlockedCharacters: Array.isArray(player.unlockedCharacters) ? player.unlockedCharacters : ['shadow'],
              unlockedImages: Array.isArray(player.unlockedImages) ? player.unlockedImages : [],
              passiveIncomeRate: player.passiveIncomeRate || 0,
              energyRegenRate: baseEnergyRegen,      // CALCULATED, NOT HARDCODED!
              isAdmin: player.isAdmin || false,
              // NEW BOOST FIELDS - From JSON
              boostActive: player.boostActive || false,
              boostMultiplier: player.boostMultiplier || 1.0,
              boostExpiresAt: player.boostExpiresAt ? new Date(player.boostExpiresAt) : null,
              boostEnergy: player.boostEnergy || 0,
              // NEW TRACKING FIELDS - From JSON
              totalTapsToday: player.totalTapsToday || 0,
              totalTapsAllTime: player.totalTapsAllTime || 0,
              lastDailyReset: player.lastDailyReset ? new Date(player.lastDailyReset) : new Date(),
              lastWeeklyReset: player.lastWeeklyReset ? new Date(player.lastWeeklyReset) : new Date()
            };
            
            console.log('🎯 [GAME CONTEXT] JSON-FIRST player state loaded:', {
              username: newState.username,
              points: newState.points,
              level: newState.level,
              selectedCharacter: newState.selectedCharacterId,
              displayImage: newState.displayImage,
              energyMax: newState.energyMax,
              upgradesCount: Object.keys(newState.upgrades).length
            });
            
            return newState;
          });
          
          console.log('✅ [GAME CONTEXT] All data loaded from JSON-first system');
        }

        setLoadingError(null);
        console.log('✅ [GAME CONTEXT] Complete - All game data loaded successfully');
      } catch (error) {
        if (!mounted) return;
        console.error('❌ [GAME CONTEXT] Failed to load game data:', error);
        setLoadingError(error instanceof Error ? error.message : 'Unknown error');
        
        // 🔧 Retry loading after delay if it's a network error
        if (loadingAttempts < 3 && (error instanceof TypeError || error instanceof Error && error.message.includes('fetch'))) {
          console.log(`🔄 [GAME CONTEXT] Retrying load in 3 seconds... (attempt ${loadingAttempts + 1}/3)`);
          loadingTimeout = setTimeout(() => {
            if (mounted) {
              setLoadingAttempts(prev => prev + 1);
              loadAllData();
            }
          }, 3000);
        }
      } finally {
        if (mounted) {
          setIsInitialized(true);
        }
      }
    };

    loadAllData();
    
    return () => {
      mounted = false;
      if (loadingTimeout) clearTimeout(loadingTimeout);
    };
  }, []); // 🔧 Empty dependency array prevents re-runs

  // Recalculate passive income, max energy, and regen when upgrades change
  useEffect(() => {
    if (!isInitialized || upgrades.length === 0) return;

    setState(prev => {
      const perHourUpgrades = upgrades.filter(u => u.type === 'perHour');
      let newPassiveRate = 0;
      perHourUpgrades.forEach(u => {
        const lvl = prev.upgrades[u.id] || 0;
        newPassiveRate += calculateUpgradeValue(u, lvl);
      });

      // Calculate energy values from upgrades
      const { baseMaxEnergy, baseEnergyRegen } = calculateBaseEnergyValues(upgrades, prev.upgrades);

      // Only update if values changed
      if (newPassiveRate !== prev.passiveIncomeRate || 
          baseMaxEnergy !== prev.energyMax || 
          baseEnergyRegen !== prev.energyRegenRate) {
        
        return {
          ...prev,
          passiveIncomeRate: newPassiveRate,
          energyMax: baseMaxEnergy,
          energyRegenRate: baseEnergyRegen,
          energy: Math.min(prev.energy, baseMaxEnergy) // Cap current energy to new max
        };
      }

      return prev;
    });
  }, [state.upgrades, upgrades, isInitialized]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // 🎯 JSON-FIRST: Optimized autosync - less frequent, smarter batching
  useEffect(() => {
    if (!isInitialized || !state.username) return;
    
    let syncCounter = 0;
    const interval = setInterval(() => {
      setState(prev => {
        let newEnergy = Math.min(prev.energyMax, prev.energy + prev.energyRegenRate);
        let newPoints = prev.points;
        let newLustPoints = prev.lustPoints;

        // Passive income calculation
        if (prev.passiveIncomeRate > 0 && prev.points < prev.passiveIncomeCap) {
          const incomePerSecond = prev.passiveIncomeRate / 3600;
          newPoints = Math.min(prev.passiveIncomeCap, prev.points + incomePerSecond);
          newLustPoints = newPoints; // Keep in sync
        }

        const energyChanged = newEnergy !== prev.energy;
        const pointsChanged = newPoints !== prev.points;

        if (!energyChanged && !pointsChanged) {
          return prev;
        }

        // 🔧 REDUCED: Only sync every 30 seconds instead of 10 (reduces spam)
        syncCounter++;
        if (syncCounter >= 30) {
          syncCounter = 0;
          
          console.log(`🔄 [GAME CONTEXT] Auto-syncing for ${prev.username}... (energy: ${energyChanged}, points: ${pointsChanged})`);
          
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
              // 🔧 REMOVED: Don't include unchanged fields to reduce overwrites
            })
          })
          .then(response => {
            if (response.ok) {
              console.log(`✅ [GAME CONTEXT] Auto-sync successful for ${prev.username}`);
            } else {
              console.error(`❌ [GAME CONTEXT] Auto-sync failed: ${response.status}`);
            }
          })
          .catch(err => {
            console.error('❌ [GAME CONTEXT] Auto-sync error:', err);
          });
        }

        return { ...prev, energy: newEnergy, points: newPoints, lustPoints: newLustPoints };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isInitialized, state.username]); // 🔧 Don't include sessionToken to prevent re-creation

  const tap = useCallback(async () => {
    setState(prev => {
      if (prev.energy < 1) return prev;

      // Calculate actual tap value (with boost)
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
          boostMultiplier: prev.boostMultiplier,
          energyBefore: prev.energy,
          pointsBefore: prev.points
        });
      }

      // 🎯 JSON-FIRST: Immediate sync for taps (critical user action)
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
      .then(response => {
        if (!response.ok) {
          console.error(`❌ [TAP] Sync failed: ${response.status}`);
        }
      })
      .catch(err => console.error('❌ [TAP] Sync error:', err));

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
      case 'SET_LUSTGEMS':
        setState(prev => ({ ...prev, lustGems: action.payload }));
        break;
      case 'SET_BOOST':
        setState(prev => ({
          ...prev,
          boostActive: action.payload.active,
          boostMultiplier: action.payload.multiplier,
          boostExpiresAt: action.payload.expiresAt ? new Date(action.payload.expiresAt) : null
        }));
        break;
      case 'SET_ENERGY':
        setState(prev => ({ ...prev, energy: action.payload }));
        break;
      case 'RECALCULATE_ENERGY':
        // Force recalculate energy from upgrades
        if (upgrades.length > 0) {
          const { baseMaxEnergy, baseEnergyRegen } = calculateBaseEnergyValues(upgrades, state.upgrades);
          console.log('🔄 [GAME CONTEXT] Luna force recalculating energy:', { baseMaxEnergy, baseEnergyRegen });
          setState(prev => ({ ...prev, energyMax: baseMaxEnergy, energyRegenRate: baseEnergyRegen, energy: Math.min(prev.energy, baseMaxEnergy) }));
        }
        break;
      case 'UPDATE_DISPLAY_IMAGE': // 🆕 NEW: Handle display image updates from external components
        setState(prev => ({ ...prev, displayImage: normalizeImageUrl(action.payload) }));
        break;
      default:
        break;
    }
  }, [upgrades, state.upgrades]);

  // 🎯 JSON-FIRST: Enhanced purchase with better error handling
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
      console.log(`🎯 [UPGRADE] ${state.username} purchasing upgrade ${upgradeId} level ${newLevel}`);
      
      const response = await fetch('/api/player/upgrades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        },
        body: JSON.stringify({ upgradeId, level: newLevel }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const updatedPlayer = result.player;
      
      // Update local state from JSON response
      setState(prev => {
        const newUpgrades = updatedPlayer.upgrades || prev.upgrades;
        const { baseMaxEnergy, baseEnergyRegen } = calculateBaseEnergyValues(upgrades, newUpgrades);
        
        console.log(`✅ [UPGRADE] ${prev.username} upgrade ${upgradeId} purchased successfully`);
        
        return {
          ...prev,
          points: updatedPlayer.points,
          lustPoints: updatedPlayer.lustPoints,
          upgrades: newUpgrades,
          energyMax: baseMaxEnergy,
          energyRegenRate: baseEnergyRegen,
          energy: Math.min(prev.energy, baseMaxEnergy)
        };
      });

      return true;
    } catch (err) {
      console.error(`🔴 [UPGRADE] Purchase failed for ${state.username}:`, err);
      return false;
    } finally {
      setPendingPurchases(prev => {
        const next = new Set(prev);
        next.delete(upgradeId);
        return next;
      });
    }
  }, [state.upgrades, state.points, state.username, upgrades, pendingPurchases]);

  // 🎯 JSON-FIRST: Enhanced character selection with state update
  const selectCharacter = useCallback(async (characterId: string): Promise<boolean> => {
    if (!state.unlockedCharacters.includes(characterId)) {
      console.log(`❌ [SELECT CHARACTER] Character ${characterId} not unlocked for ${state.username}`);
      return false;
    }

    try {
      console.log(`🎭 [SELECT CHARACTER] ${state.username} selecting character ${characterId}`);
      
      const response = await fetch('/api/player/select-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        },
        body: JSON.stringify({ characterId }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ [SELECT CHARACTER] Failed to save character selection:`, errorData);
        return false;
      }

      const result = await response.json();
      const updatedPlayer = result.player;
      
      // 🔧 IMMEDIATE: Update local state for instant UI feedback
      setState(prev => ({
        ...prev,
        selectedCharacterId: updatedPlayer.selectedCharacterId,
        selectedImageId: updatedPlayer.selectedImageId,
        displayImage: normalizeImageUrl(updatedPlayer.displayImage) // 🔧 FIX: Normalize URL
      }));

      console.log(`✅ [SELECT CHARACTER] ${state.username} character selection successful: ${characterId}`);
      return true;
    } catch (error) {
      console.error(`🔴 [SELECT CHARACTER] Error for ${state.username}:`, error);
      return false;
    }
  }, [state.unlockedCharacters, state.username]);

  const selectImage = useCallback((imageId: string) => {
    const selectedImg = images.find(img => img.id === imageId);
    setState(prev => ({ 
      ...prev, 
      selectedImageId: imageId,
      displayImage: normalizeImageUrl(selectedImg?.url || prev.displayImage) // 🔧 FIX: Normalize URL
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

  // Simplified update methods
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
    setImages(prev => [...prev, { ...image, url: normalizeImageUrl(image.url) }]); // 🔧 FIX: Normalize URL
  }, []);

  const updateImage = useCallback((image: ImageConfig) => {
    setImages(prev => prev.map(img => img.id === image.id ? { ...image, url: normalizeImageUrl(image.url) } : img)); // 🔧 FIX: Normalize URL
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
    setLoadingAttempts(0); // 🔧 Reset attempts
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
      
      {/* 🔍 Debug info overlay in development */}
      {process.env.NODE_ENV === 'development' && loadingError && (
        <div className="fixed bottom-4 right-4 bg-red-900/90 text-white p-3 rounded-lg border border-red-500 max-w-md text-sm z-50">
          <div className="font-semibold">🔍 Debug Info:</div>
          <div>Loading Error: {loadingError}</div>
          <div>Initialized: {isInitialized ? '✅' : '❌'}</div>
          <div>Username: {state.username || 'None'}</div>
          <div>Session: {localStorage.getItem('sessionToken') ? 'Present' : 'Missing'}</div>
          <div>Attempts: {loadingAttempts}/3</div>
          <div>Selected Character: {state.selectedCharacterId || 'None'}</div>
          <div>Display Image: {state.displayImage ? 'Set' : 'None'}</div>
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