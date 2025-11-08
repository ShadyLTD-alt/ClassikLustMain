// ... snip (imports and declarations as before) ...

export function GameProvider({ children }: { children: React.ReactNode }) {
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

  // (unchanged calculateTapValue, etc)

  // Patch: only recalculate energy/energyMax if NOT using backend value (i.e. upon upgrade purchase, not on every change)
  const loadAllData = useCallback(async () => {
    setConnectionStatus('connecting');
    setLastError(null);
    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) {
      setConnectionStatus('offline');
      setLastError('Not authenticated - please login');
      setIsInitialized(true);
      return;
    }
    try {
      // ... API fetch for player and config just as before ...
      const [upgradesRes, charactersRes, levelsRes, mediaRes] = await Promise.all([
        apiRequest('/api/upgrades').then(r => r.ok ? r.json() : { upgrades: [] }),
        apiRequest('/api/characters').then(r => r.ok ? r.json() : { characters: [] }),
        apiRequest('/api/levels').then(r => r.ok ? r.json() : { levels: [] }),
        apiRequest('/api/media').then(r => r.ok ? r.json() : { media: [] })
      ]);
      setUpgrades(upgradesRes.upgrades || []);
      setCharacters(charactersRes.characters || []);
      setLevelConfigs(levelsRes.levels || []);
      setImages(mediaRes.media?.map((m: any) => ({
        id: m.id,
        characterId: m.characterId,
        url: normalizeImageUrl(m.url),
        unlockLevel: m.unlockLevel,
        categories: m.categories || [],
        poses: m.poses || [],
        isHidden: m.isHidden || false
      })) || []);

      // PATCH: Only now set player state, using backend upgrades/energy/energyMax, not default or recalculated values
      const playerResp = await apiRequest('/api/auth/me');
      const playerData = (await playerResp.json()).player;
      setState(prev => ({
        ...prev,
        username: playerData.username,
        upgrades: playerData.upgrades ?? {},
        points: playerData.points ?? 0,
        lustPoints: playerData.lustPoints ?? 0,
        energy: playerData.energy ?? 1000,
        energyMax: playerData.energyMax ?? 1000,
        level: playerData.level ?? 1,
        selectedCharacterId: playerData.selectedCharacterId || (charactersRes.characters?.[0]?.id || 'shadow'),
        passiveIncomeRate: playerData.passiveIncomeRate ?? 0,
        energyRegenRate: playerData.energyRegenRate ?? 1,
        unlockedCharacters: Array.isArray(playerData.unlockedCharacters) ? playerData.unlockedCharacters : ['shadow'],
        unlockedImages: Array.isArray(playerData.unlockedImages) ? playerData.unlockedImages : [],
        displayImage: normalizeImageUrl(playerData.displayImage),
        isAdmin: !!playerData.isAdmin,
        boostActive: !!playerData.boostActive,
        boostMultiplier: playerData.boostMultiplier ?? 1.0,
        boostExpiresAt: playerData.boostExpiresAt ? new Date(playerData.boostExpiresAt) : null,
        boostEnergy: playerData.boostEnergy ?? 0,
        totalTapsToday: playerData.totalTapsToday ?? 0,
        totalTapsAllTime: playerData.totalTapsAllTime ?? 0,
        lastDailyReset: playerData.lastDailyReset ? new Date(playerData.lastDailyReset) : new Date(),
        lastWeeklyReset: playerData.lastWeeklyReset ? new Date(playerData.lastWeeklyReset) : new Date(),
        selectedImageId: playerData.selectedImageId || null,
        lastTapValue: playerData.lastTapValue ?? 1,
        selectedAvatarId: null
      }));
      setConnectionStatus('connected');
      setLastError(null);
      setRetryCount(0);
    } catch (error) {
      setConnectionStatus('offline');
      setLastError('Data load failed');
    } finally {
      setIsInitialized(true);
    }
  }, [retryCount]);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  // ...rest of your GameContext unchanged (tap etc) ...
}