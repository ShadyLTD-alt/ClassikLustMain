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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Game} />
      <Route component={Game} />
    </Switch>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [playerData, setPlayerData] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log('🚀 [v3.0] App.tsx checkAuth starting...');
    console.log('⏰ Current timestamp:', new Date().toISOString());
    
    try {
      const token = localStorage.getItem('sessionToken');
      console.log('🔑 [v3.0] Session token check:', { 
        exists: !!token, 
        length: token?.length || 0 
      });

      if (token) {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ [v3.0] Session valid, user authenticated');
          setSessionToken(token);
          setPlayerData(data.player);
          setIsAuthenticated(true);
        } else {
          console.log('❌ [v3.0] Session invalid, clearing token');
          localStorage.removeItem('sessionToken');
        }
      }
    } catch (error) {
      console.error('💥 [v3.0] Auth check failed:', error);
      localStorage.removeItem('sessionToken');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (token: string, player: any) => {
    console.log('✅ Login successful, saving session');
    localStorage.setItem('sessionToken', token);
    setSessionToken(token);
    setPlayerData(player);
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return <LoadingScreen progress={50} />;
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GameProvider>
          <Router />
          <Toaster />
        </GameProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

function App() {
  const [authState, setAuthState] = useState<'loading' | 'login' | 'authenticated' | 'unauthenticated'>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [userData, setUserData] = useState<any>(null);

  // Renamed state variables to match the original code's logic before the edit
  const setPlayerData = setUserData;
  const setAuthStatus = setAuthState;

  useEffect(() => {
    const checkAuth = async () => {
      console.log('🚀 [v3.0] App.tsx checkAuth starting...');
      console.log('⏰ Current timestamp:', new Date().toISOString());

      const WebApp = (window as any).Telegram?.WebApp;
      console.log('📱 [v3.0] Telegram WebApp check:', {
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
      console.log('🔑 [v3.0] Session token check:', {
        exists: !!sessionToken,
        length: sessionToken?.length || 0
      });

      if (sessionToken) {
        try {
          setLoadingProgress(30);
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${sessionToken}`
            }
          });

          setLoadingProgress(60);
          if (response.ok) {
            const data = await response.json();
            setLoadingProgress(90);
            setPlayerData(data.player);
            setAuthStatus('authenticated');
            console.log('✅ [v3.0] Session valid, user authenticated');
            setLoadingProgress(100);
            return;
          } else {
            console.log('❌ [v3.0] Session invalid, clearing token');
            localStorage.removeItem('sessionToken');
          }
        } catch (error) {
          console.error('💥 [v3.0] Session check failed:', error);
          localStorage.removeItem('sessionToken');
        }
      }

      // If we have Telegram initData, try to authenticate
      if (WebApp?.initData) {
        console.log('🔄 [v3.0] Attempting Telegram auth with initData');
        setLoadingProgress(40);
        try {
          const response = await fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: WebApp.initData })
          });

          setLoadingProgress(70);
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('sessionToken', data.sessionToken);
            setLoadingProgress(90);
            setPlayerData(data.player);
            setAuthStatus('authenticated');
            console.log('✅ [v3.0] Telegram auto-auth successful');
            setLoadingProgress(100);
            return;
          } else {
            console.log('❌ [v3.0] Telegram auth failed');
          }
        } catch (error) {
          console.error('💥 [v3.0] Telegram auth error:', error);
        }
      } else {
        console.log('ℹ️ [v3.0] No initData available for Telegram auth');
      }

      console.log('🔐 [v3.0] No valid session found, showing login screen');
      setLoadingProgress(100);
      setAuthStatus('unauthenticated');
    };

    checkAuth();
  }, []);

  const handleLogin = (sessionToken: string, playerData: any) => {
    console.log('🎉 Login successful, setting session token and player data');
    localStorage.setItem('sessionToken', sessionToken);
    setUserData(playerData);
    setAuthState('authenticated');
  };

  if (authState === 'loading') {
    return <LoadingScreen progress={loadingProgress} />;
  }

  if (authState === 'login' || authState === 'unauthenticated') { // Treat unauthenticated as needing login
    return <LoginScreen onLogin={handleLogin} />;
  }

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