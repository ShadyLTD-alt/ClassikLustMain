
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
    // Check for existing session
    const checkAuth = async () => {
      console.log('🚀 App.tsx checkAuth starting...');
      setLoadingProgress(20);
      
      // Check if running in Telegram WebApp
      const tg = (window as any).Telegram?.WebApp;
      console.log('📱 Telegram WebApp check:', { 
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
      
      // Check localStorage for saved player data FIRST
      const savedPlayer = localStorage.getItem('playerData');
      console.log('👤 Saved player exists:', !!savedPlayer);
      
      // If we have saved player data with telegramId, use it immediately
      if (savedPlayer) {
        try {
          const playerData = JSON.parse(savedPlayer);
          if (playerData.telegramId && playerData.id) {
            console.log('✅ Valid saved session found for:', playerData.username);
            setUserData(playerData);
            setLoadingProgress(100);
            setTimeout(() => setAuthState('authenticated'), 500);
            return;
          } else {
            console.log('⚠️ Saved player missing telegramId or id, clearing...');
            localStorage.removeItem('playerData');
          }
        } catch (error) {
          console.error('💥 Failed to parse saved player:', error);
          localStorage.removeItem('playerData');
        }
      }
      
      setLoadingProgress(60);
      
      // Only try Telegram auth if we don't have a valid saved session
      if (tg && tg.initData && tg.initData.length > 0) {
        console.log('🔑 No saved session, attempting Telegram auth...');
        setLoadingProgress(70);
        try {
          console.log('📤 Sending auth request...');
          const response = await fetch("/api/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initData }),
          });
          console.log('📥 Auth response status:', response.status);
          const data = await response.json();
          console.log('📦 Auth response data:', data);
          
          if (data.success && data.player) {
            console.log('🎉 Telegram auth successful!');
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
        console.log('ℹ️ No initData available for Telegram auth');
      }
      
      console.log('🔐 No valid session found, showing login screen');
      setLoadingProgress(100);
      setTimeout(() => setAuthState('login'), 500);
    };

    checkAuth();
  }, []);

  const handleLogin = (userId: string, user?: any) => {
    const playerData = user || { id: userId };
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
