
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
      
      // Check localStorage for guest session
      const guestSession = localStorage.getItem('guestSession');
      console.log('👤 Guest session:', guestSession);
      
      setLoadingProgress(50);
      
      // Check if running in Telegram WebApp
      const tg = (window as any).Telegram?.WebApp;
      console.log('📱 Telegram WebApp check:', { exists: !!tg, hasInitData: !!tg?.initData });
      
      if (tg && tg.initData) {
        console.log('✅ Telegram WebApp detected, attempting auto-auth...');
        console.log('📝 InitData:', tg.initData);
        setLoadingProgress(70);
        try {
          console.log('📤 Sending auto-auth request...');
          const response = await fetch("/api/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initData }),
          });
          console.log('📥 Auto-auth response status:', response.status);
          const data = await response.json();
          console.log('📦 Auto-auth response data:', data);
          
          if (data.success && data.player) {
            console.log('🎉 Auto-auth successful!');
            setUserData(data.player);
            setLoadingProgress(100);
            setTimeout(() => setAuthState('authenticated'), 500);
            return;
          } else {
            console.log('⚠️ Auto-auth unsuccessful:', data);
          }
        } catch (error) {
          console.error('💥 Auto-auth failed:', error);
        }
      } else {
        console.log('ℹ️ Not in Telegram WebApp or no initData');
      }
      
      setLoadingProgress(80);
      
      if (guestSession) {
        console.log('👋 Using guest session');
        setUserData({ id: 'guest', isGuest: true });
        setLoadingProgress(100);
        setTimeout(() => setAuthState('authenticated'), 500);
      } else {
        console.log('🔐 No session found, showing login screen');
        setLoadingProgress(100);
        setTimeout(() => setAuthState('login'), 500);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (userId: string, user?: any) => {
    setUserData(user || { id: userId });
    setAuthState('authenticated');
  };

  const handleGuestLogin = () => {
    localStorage.setItem('guestSession', 'true');
    setUserData({ id: 'guest', isGuest: true });
    setAuthState('authenticated');
  };

  if (authState === 'loading') {
    return <LoadingScreen progress={loadingProgress} />;
  }

  if (authState === 'login') {
    return <LoginScreen onLogin={handleLogin} onGuestLogin={handleGuestLogin} />;
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
