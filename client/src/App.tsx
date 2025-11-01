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
      console.log('🚀 [v3.2] CLIENT App.tsx checkAuth starting...');
      console.log('⏰ Current timestamp:', new Date().toISOString());

      try {
        // Test basic connectivity first
        console.log('🏥 [v3.2] Testing server connectivity...');
        try {

          if (!isMounted) return;
          setLoadingProgress(30);
          
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${sessionToken}`
            }

          const healthResponse = await fetch('/api/health');
          console.log('🏥 [v3.2] Health check result:', {
            status: healthResponse.status,
            ok: healthResponse.ok

          });
        } catch (healthError) {
          console.error('💀 [v3.2] CRITICAL: Cannot reach server!', healthError);
          setLoadingProgress(100);
          setAuthState('unauthenticated');
          return;
        }


          if (!isMounted) return;
          setLoadingProgress(60);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📦 [v3.0] Player data received:', data.player?.username);
            console.log('✅ [v3.0] Session valid, user authenticated');
            
            if (!isMounted) return;
            setUserData(data.player);
            setLoadingProgress(100);
            setAuthState('authenticated');
            return;
          } else {
            console.log('❌ [v3.0] Session invalid, clearing token');

        const WebApp = (window as any).Telegram?.WebApp;
        console.log('📱 [v3.2] Telegram WebApp check:', {
          exists: !!WebApp,
          hasInitData: !!WebApp?.initData,
          initDataLength: WebApp?.initData?.length || 0,
          platform: WebApp?.platform || 'unknown',
          version: WebApp?.version || '6.0'
        });

        if (WebApp) {
          console.log('🔧 Telegram WebApp ready() called');
          WebApp.ready();
          WebApp.expand();
        }

        const sessionToken = localStorage.getItem('sessionToken');
        console.log('🔑 [v3.2] Session token check:', {
          exists: !!sessionToken,
          length: sessionToken?.length || 0
        });

        // Check existing session first
        if (sessionToken) {
          console.log('🔍 [v3.2] Validating existing session token...');
          try {
            setLoadingProgress(30);
            const response = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${sessionToken}`
              }
            });

            console.log('🔍 [v3.2] Session validation response:', {
              status: response.status,
              ok: response.ok
            });

            setLoadingProgress(60);
            if (response.ok) {
              const data = await response.json();
              setLoadingProgress(90);
              setUserData(data.player);
              setAuthState('authenticated');
              console.log('✅ [v3.2] Session valid, user authenticated');
              setLoadingProgress(100);
              return;
            } else {
              console.log('❌ [v3.2] Session invalid, clearing token');
              localStorage.removeItem('sessionToken');
            }
          } catch (error) {
            console.error('💥 [v3.2] Session check failed:', error);

            localStorage.removeItem('sessionToken');
          }
        }


      // If we have Telegram initData, try to authenticate
      if (WebApp?.initData) {
        console.log('🔄 [v3.0] Attempting Telegram auth with initData');
        if (!isMounted) return;
        setLoadingProgress(40);
        
        try {
          const response = await fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: WebApp.initData })
          });

          if (!isMounted) return;
          setLoadingProgress(70);
          
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('sessionToken', data.sessionToken);
            
            if (!isMounted) return;
            setLoadingProgress(90);
            setUserData(data.player);
            setLoadingProgress(100);
            setAuthState('authenticated');
            console.log('✅ [v3.0] Telegram auto-auth successful');
            return;
          } else {
            console.log('❌ [v3.0] Telegram auth failed');

        // Try Telegram auto-auth if available
        if (WebApp?.initData) {
          console.log('🔄 [v3.2] Attempting Telegram auth with initData');
          setLoadingProgress(40);
          try {
            const response = await fetch('/api/auth/telegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: WebApp.initData })
            });

            console.log('🔄 [v3.2] Telegram auth response:', {
              status: response.status,
              ok: response.ok
            });

            setLoadingProgress(70);
            if (response.ok) {
              const data = await response.json();
              localStorage.setItem('sessionToken', data.sessionToken);
              setLoadingProgress(90);
              setUserData(data.player);
              setAuthState('authenticated');
              console.log('✅ [v3.2] Telegram auto-auth successful');
              setLoadingProgress(100);
              return;
            } else {
              console.log('❌ [v3.2] Telegram auth failed:', response.status);
            }
          } catch (error) {
            console.error('💥 [v3.2] Telegram auth error:', error);

          }
        } else {
          console.log('ℹ️ [v3.2] No initData available for Telegram auth');
        }


      console.log('🔐 [v3.0] No valid session found, showing login screen');
      if (!isMounted) return;
      setLoadingProgress(100);
      setAuthState('unauthenticated');

        // Ensure we always transition out of loading state
        console.log('🔐 [v3.2] No valid session found, showing login screen');
        setLoadingProgress(100);
        setAuthState('unauthenticated');

      } catch (error) {
        console.error('💥 [v3.2] CheckAuth encountered fatal error:', error);
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
    console.log('🎉 [v3.2] Login successful, setting session token and player data');
    localStorage.setItem('sessionToken', sessionToken);
    setUserData(playerData);
    setAuthState('authenticated');
  };


  console.log('🎨 [v3.0] App render - authState:', authState, 'progress:', loadingProgress);
  console.log('🎨 [v3.0] Current time:', new Date().toISOString());

  if (authState === 'loading') {
    console.log('🔄 [v3.0] Rendering LoadingScreen');

  console.log(`🔍 [CLIENT] Current auth state: ${authState}, progress: ${loadingProgress}`);

  if (authState === 'loading') {
    console.log('⏳ [CLIENT] Rendering LoadingScreen');

    return <LoadingScreen progress={loadingProgress} />;
  }

  if (authState === 'login' || authState === 'unauthenticated') {

    console.log('🔐 [v3.0] Rendering LoginScreen');
    return <LoginScreen onLogin={handleLogin} />;
  }

  console.log('🎮 [v3.0] Rendering Game with userData:', userData?.username);

    console.log('🔐 [CLIENT] Rendering LoginScreen');
    return <LoginScreen onLogin={handleLogin} />;
  }

  console.log('🎮 [CLIENT] Rendering Game');

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GameProvider>
          <Toaster />
          <Router />
        </GameProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;