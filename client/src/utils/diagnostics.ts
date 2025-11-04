// 🔧 DIAGNOSTICS: Debug stuck loading and timeout issues
export class GameDiagnostics {
  static async runHealthCheck() {
    console.log('🎙️ [DIAGNOSTICS] Starting comprehensive health check...');
    
    const results = {
      timestamp: new Date().toISOString(),
      sessionToken: !!localStorage.getItem('sessionToken'),
      serverConnection: null as any,
      apiEndpoints: {} as Record<string, any>,
      playerData: null as any,
      gameConfig: {} as Record<string, any>,
      errors: [] as string[]
    };
    
    // Test server connection
    try {
      console.log('🌐 [DIAGNOSTICS] Testing server connection...');
      const healthRes = await fetch('/api/health', { 
        signal: AbortSignal.timeout(3000) 
      });
      
      if (healthRes.ok) {
        results.serverConnection = await healthRes.json();
        console.log('✅ [DIAGNOSTICS] Server connection: OK');
      } else {
        results.errors.push(`Server health check failed: ${healthRes.status}`);
        console.error('❌ [DIAGNOSTICS] Server health check failed:', healthRes.status);
      }
    } catch (error) {
      results.errors.push(`Server connection failed: ${error}`);
      console.error('❌ [DIAGNOSTICS] Server connection failed:', error);
    }
    
    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) {
      results.errors.push('No session token found');
      console.error('❌ [DIAGNOSTICS] No session token');
      return results;
    }
    
    // Test auth endpoint
    try {
      console.log('🔑 [DIAGNOSTICS] Testing authentication...');
      const authRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
        signal: AbortSignal.timeout(5000)
      });
      
      if (authRes.ok) {
        const authData = await authRes.json();
        results.playerData = authData;
        console.log('✅ [DIAGNOSTICS] Authentication: OK');
        console.log(`  👤 Player: ${authData.player?.username}`);
        console.log(`  🎯 Selected Character: ${authData.player?.selectedCharacterId}`);
      } else {
        results.errors.push(`Auth failed: ${authRes.status}`);
        console.error('❌ [DIAGNOSTICS] Auth failed:', authRes.status);
      }
    } catch (error) {
      results.errors.push(`Auth timeout: ${error}`);
      console.error('❌ [DIAGNOSTICS] Auth timeout:', error);
    }
    
    // Test config endpoints in parallel with shorter timeouts
    const configTests = [
      { name: 'characters', url: '/api/characters' },
      { name: 'upgrades', url: '/api/upgrades' },
      { name: 'levels', url: '/api/levels' },
      { name: 'media', url: '/api/media' }
    ];
    
    console.log('🔧 [DIAGNOSTICS] Testing config endpoints...');
    
    await Promise.allSettled(
      configTests.map(async (test) => {
        try {
          const res = await fetch(test.url, {
            headers: { 'Authorization': `Bearer ${sessionToken}` },
            signal: AbortSignal.timeout(3000) // Very short timeout
          });
          
          if (res.ok) {
            const data = await res.json();
            results.gameConfig[test.name] = {
              status: 'ok',
              count: data[test.name]?.length || 0,
              responseTime: Date.now()
            };
            console.log(`  ✅ ${test.name}: ${data[test.name]?.length || 0} items`);
          } else {
            results.gameConfig[test.name] = { status: 'error', code: res.status };
            results.errors.push(`${test.name} endpoint failed: ${res.status}`);
            console.error(`  ❌ ${test.name}: HTTP ${res.status}`);
          }
        } catch (error) {
          results.gameConfig[test.name] = { status: 'timeout', error: error instanceof Error ? error.message : 'Unknown' };
          results.errors.push(`${test.name} timeout: ${error}`);
          console.error(`  ⏱️ ${test.name}: Timeout`);
        }
      })
    );
    
    // Summary
    console.log('📊 [DIAGNOSTICS] Health Check Summary:');
    console.log(`  🔋 Server Status: ${results.serverConnection ? 'Connected' : 'Failed'}`);
    console.log(`  🔑 Authentication: ${results.playerData ? 'Valid' : 'Invalid'}`);
    console.log(`  🎯 Config Endpoints: ${Object.values(results.gameConfig).filter(c => c.status === 'ok').length}/${configTests.length} OK`);
    console.log(`  ❌ Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('⚠️ [DIAGNOSTICS] Issues found:');
      results.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
    
    return results;
  }
  
  // Fix stuck loading by forcing a clean restart
  static async forceRefresh() {
    console.log('🔄 [DIAGNOSTICS] Force refreshing game state...');
    
    // Clear any stuck intervals
    const highestId = setTimeout(() => {}, 0);
    for (let i = 0; i < highestId; i++) {
      clearTimeout(i);
      clearInterval(i);
    }
    
    // Clear local storage cache but keep session
    const sessionToken = localStorage.getItem('sessionToken');
    const importantKeys = ['sessionToken', 'availablePoses', 'gameSettings'];
    
    // Remove everything except important keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !importantKeys.includes(key)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log(`🧹 [DIAGNOSTICS] Cleared ${keysToRemove.length} cached items`);
    
    // Trigger a hard reload
    window.location.reload();
  }
  
  // Test specific API endpoint with detailed logging
  static async testEndpoint(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) {
    const sessionToken = localStorage.getItem('sessionToken');
    console.log(`🔍 [DIAGNOSTICS] Testing ${method} ${endpoint}...`);
    
    const startTime = Date.now();
    
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken && { 'Authorization': `Bearer ${sessionToken}` })
        },
        signal: AbortSignal.timeout(10000)
      };
      
      if (body && method === 'POST') {
        options.body = JSON.stringify(body);
      }
      
      const res = await fetch(endpoint, options);
      const duration = Date.now() - startTime;
      
      console.log(`✅ [DIAGNOSTICS] ${endpoint}: ${res.status} (${duration}ms)`);
      
      if (res.ok) {
        const data = await res.json();
        console.log(`  📊 Response:`, data);
        return { success: true, status: res.status, data, duration };
      } else {
        const errorText = await res.text();
        console.error(`  ❌ Error response:`, errorText);
        return { success: false, status: res.status, error: errorText, duration };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`⏱️ [DIAGNOSTICS] ${endpoint}: Timeout/Error (${duration}ms)`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown', duration };
    }
  }
  
  // Quick server status check
  static async quickServerCheck() {
    try {
      const res = await fetch('/ping', { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        console.log('✅ [QUICK CHECK] Server is responding:', data);
        return true;
      }
    } catch {
      console.error('❌ [QUICK CHECK] Server not responding');
    }
    return false;
  }
}

// 🔧 EMERGENCY: Auto-diagnostic on window load
if (typeof window !== 'undefined') {
  // Auto-run diagnostics if loading takes too long
  let loadingTimeout: NodeJS.Timeout;
  
  const checkLoadingProgress = () => {
    loadingTimeout = setTimeout(() => {
      const hasGameLoaded = document.querySelector('[data-testid="character-tap-area"]') || 
                           document.querySelector('.lust-brand') ||
                           document.body.textContent?.includes('Tap to earn points');
      
      if (!hasGameLoaded) {
        console.warn('⚠️ [AUTO-DIAGNOSTIC] Game stuck loading - running diagnostics...');
        GameDiagnostics.runHealthCheck().then(results => {
          if (results.errors.length > 3) {
            console.error('🚑 [AUTO-DIAGNOSTIC] Multiple errors detected - forcing refresh in 5s...');
            setTimeout(() => GameDiagnostics.forceRefresh(), 5000);
          }
        });
      }
    }, 15000); // Run diagnostic if still loading after 15s
  };
  
  // Start the loading watcher
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkLoadingProgress);
  } else {
    checkLoadingProgress();
  }
  
  // Global diagnostic access
  (window as any).GameDiagnostics = GameDiagnostics;
}