import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/contexts/GameContext";
import Game from "@/pages/Game";
import LoginScreen from "@/components/LoginScreen";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useState, useEffect } from "react";

// AGGRESSIVE DEBUG: Log client boot
console.log("🏁 [CLIENT] App.tsx module loaded");

function Router() {
  console.log("🌍 [CLIENT] Router component rendered");
  return (
    <Switch>
      <Route path="/" component={Game} />
      <Route component={Game} />
    </Switch>
  );
}

function App() {
  console.log("🚀 [CLIENT] App component mounting...");
  
  const [authState, setAuthState] = useState<'loading' | 'login' | 'authenticated' | 'unauthenticated'>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    console.log("🔥 [CLIENT] App useEffect triggered - starting auth check");

    const checkAuth = async () => {
      console.log('🚀 [v3.4] CLIENT App.tsx checkAuth starting...');
      console.log('⏰ Current timestamp:', new Date().toISOString());

      try {
        // Test basic connectivity first
        console.log('🏥 [v3.4] Testing server connectivity...');
        
        try {
          const healthResponse = await fetch('/api/health');
          console.log('🏥 [v3.4] Health check result:', {
            status: healthResponse.status,
            ok: healthResponse.ok
          });
          
          if (!healthResponse.ok) {
            throw new Error(`Health check failed: ${healthResponse.status}`);
          }
        } catch (healthError) {
          console.error('💀 [v3.4] CRITICAL: Cannot reach server!', healthError);
          if (!isMounted) return;
          setLoadingProgress(100);
          setAuthState('unauthenticated');
          return;
        }

        // Initialize Telegram WebApp
        const WebApp = (window as any).Telegram?.WebApp;
        console.log('📱 [v3.4] Telegram WebApp check:', {
          exists: !!WebApp,
          hasInitData: !!WebApp?.initData,
          initDataLength: WebApp?.initData?.length || 0,
          platform: WebApp?.platform || 'unknown',
          version: WebApp?.version || '6.0'
        });

        if (WebApp) {
          console.log('🔧 [v3.4] Telegram WebApp ready() called');
          WebApp.ready();
          WebApp.expand();
        }

        if (!isMounted) return;
        setLoadingProgress(20);

        // Check for existing session token
        const sessionToken = localStorage.getItem('sessionToken');
        console.log('🔑 [v3.4] Session token check:', {
          exists: !!sessionToken,
          length: sessionToken?.length || 0
        });

        // Validate existing session if available
        if (sessionToken) {
          console.log('🔍 [v3.4] Validating existing session token...');
          
          try {
            if (!isMounted) return;
            setLoadingProgress(30);
            
            const authResponse = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${sessionToken}`
              }
            });

            console.log('🔍 [v3.4] Session validation response:', {
              status: authResponse.status,
              ok: authResponse.ok
            });

            if (!isMounted) return;
            setLoadingProgress(60);
            
            if (authResponse.ok) {
              const data = await authResponse.json();
              console.log('📦 [v3.4] Player data received:', data.player?.username);
              console.log('✅ [v3.4] Session valid, user authenticated');
              
              if (!isMounted) return;
              setUserData(data.player);
              setLoadingProgress(100);
              setAuthState('authenticated');
              return;
            } else {
              console.log('❌ [v3.4] Session invalid, clearing token');
              localStorage.removeItem('sessionToken');
            }
          } catch (sessionError) {
            console.error('💥 [v3.4] Session check failed:', sessionError);
            localStorage.removeItem('sessionToken');
          }
        }

        // Try Telegram auto-auth if available
        if (WebApp?.initData) {
          console.log('🔄 [v3.4] Attempting Telegram auth with initData');
          if (!isMounted) return;
          setLoadingProgress(40);
          
          try {
            const telegramResponse = await fetch('/api/auth/telegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: WebApp.initData })
            });

            console.log('🔄 [v3.4] Telegram auth response:', {
              status: telegramResponse.status,
              ok: telegramResponse.ok
            });

            if (!isMounted) return;
            setLoadingProgress(70);
            
            if (telegramResponse.ok) {
              const data = await telegramResponse.json();
              localStorage.setItem('sessionToken', data.sessionToken);
              
              if (!isMounted) return;
              setLoadingProgress(90);
              setUserData(data.player);
              setLoadingProgress(100);
              setAuthState('authenticated');
              console.log('✅ [v3.4] Telegram auto-auth successful');
              return;
            } else {
              console.log('❌ [v3.4] Telegram auth failed:', telegramResponse.status);
            }
          } catch (telegramError) {
            console.error('💥 [v3.4] Telegram auth error:', telegramError);
          }
        } else {
          console.log('ℹ️ [v3.4] No initData available for Telegram auth');
        }

        // No valid authentication found
        console.log('🔐 [v3.4] No valid session found, showing login screen');
        if (!isMounted) return;
        setLoadingProgress(100);
        setAuthState('unauthenticated');

      } catch (error) {
        console.error('💥 [v3.4] CheckAuth encountered fatal error:', error);
        if (!isMounted) return;
        setLoadingProgress(100);
        setAuthState('unauthenticated');
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = (sessionToken: string, playerData: any) => {
    console.log('🎉 [v3.4] Login successful, setting session token and player data');
    localStorage.setItem('sessionToken', sessionToken);
    setUserData(playerData);
    setAuthState('authenticated');
  };

  console.log(`🔍 [CLIENT] Current auth state: ${authState}, progress: ${loadingProgress}`);

  if (authState === 'loading') {
    console.log('⏳ [CLIENT] Rendering LoadingScreen');
    return <LoadingScreen progress={loadingProgress} />;
  }

  if (authState === 'login' || authState === 'unauthenticated') {
    console.log('🔐 [CLIENT] Rendering LoginScreen');
    return <LoginScreen onLogin={handleLogin} />;
  }

  console.log('🎮 [CLIENT] Rendering Game with userData:', userData?.username);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GameProvider userData={userData}>
          <Toaster />
          <Router />
        </GameProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;