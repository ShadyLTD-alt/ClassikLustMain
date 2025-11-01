
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
  const [authState, setAuthState] = useState<'loading' | 'login' | 'authenticated'>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('🚀 [v3.0] App.tsx checkAuth starting...');
      console.log('⏰ Current timestamp:', new Date().toISOString());
      setLoadingProgress(20);
      
      const tg = (window as any).Telegram?.WebApp;
      console.log('📱 [v3.0] Telegram WebApp check:', { 
        exists: !!tg, 
        hasInitData: !!tg?.initData,
        initDataLength: tg?.initData?.length || 0,
        platform: tg?.platform,
        version: tg?.version
      });
      
      if (tg) {
        console.log('🔧 Telegram WebApp ready() called');
        tg.ready();
        tg.expand();
      }
      
      setLoadingProgress(40);
      
      const sessionToken = localStorage.getItem('sessionToken');
      console.log('🔑 [v3.0] Session token check:', {
        exists: !!sessionToken,
        length: sessionToken?.length || 0
      });
      
      if (sessionToken) {
        console.log('🔄 [v3.0] Validating existing session...');
        try {
          const response = await fetch("/api/auth/me", {
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ [v3.0] Session valid! Player:', data.player.username);
            localStorage.setItem('playerData', JSON.stringify(data.player));
            setUserData(data.player);
            setLoadingProgress(100);
            setTimeout(() => setAuthState('authenticated'), 500);
            return;
          } else {
            console.log('⚠️ [v3.0] Session invalid, clearing...');
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('playerData');
          }
        } catch (error) {
          console.error('💥 [v3.0] Session validation failed:', error);
          localStorage.removeItem('sessionToken');
          localStorage.removeItem('playerData');
        }
      }
      
      setLoadingProgress(60);
      
      if (tg && tg.initData && tg.initData.length > 0) {
        console.log('🔑 [v3.0] Attempting Telegram auth...');
        setLoadingProgress(70);
        try {
          const response = await fetch("/api/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initData }),
          });
          const data = await response.json();
          
          if (data.success && data.player && data.sessionToken) {
            console.log('🎉 Telegram auth successful!');
            localStorage.setItem('sessionToken', data.sessionToken);
            localStorage.setItem('playerData', JSON.stringify(data.player));
            setUserData(data.player);
            setLoadingProgress(100);
            setTimeout(() => setAuthState('authenticated'), 500);
            return;
          } else {
            console.log('⚠️ Telegram auth unsuccessful:', data);
          }
        } catch (error) {
          console.error('💥 Telegram auth failed:', error);
        }
      } else {
        console.log('ℹ️ [v3.0] No initData available for Telegram auth');
      }
      
      console.log('🔐 [v3.0] No valid session found, showing login screen');
      setLoadingProgress(100);
      setTimeout(() => setAuthState('login'), 500);
    };

    checkAuth();
  }, []);

  const handleLogin = (sessionToken: string, playerData: any) => {
    localStorage.setItem('sessionToken', sessionToken);
    localStorage.setItem('playerData', JSON.stringify(playerData));
    setUserData(playerData);
    setAuthState('authenticated');
  };

  if (authState === 'loading') {
    return <LoadingScreen progress={loadingProgress} />;
  }

  if (authState === 'login') {
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
