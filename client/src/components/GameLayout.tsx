import React, { useState } from "react";
import { TopBar } from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { AdminFAB } from "@/components/AdminFAB";
import { MistralDebugger } from "../../LunaBug/interface/MistralDebugger";
import { AchievementSystem } from "@/components/AchievementSystem";
import ChatModal from "@/components/ChatModal";
import ModalPortal from "@/components/ModalPortal";
import { useGame } from "@/contexts/GameContext";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function GameLayout({
  children,
  onOpenUpgrades,
  onOpenCharacters,
  onOpenChat,
  onOpenLevel
}: {
  children: React.ReactNode;
  onOpenUpgrades: () => void;
  onOpenCharacters: () => void;
  onOpenChat: () => void;
  onOpenLevel: () => void;
}) {
  const { state } = useGame();
  const [showLunaBugDebugger, setShowLunaBugDebugger] = useState(false);
  
  const { data: player } = useQuery({
    queryKey: ['/api/player/me'],
    queryFn: async () => (await (await apiRequest('GET', '/api/player/me')).json()),
    staleTime: 15000
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <TopBar onOpenCharacterGallery={onOpenCharacters} />

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        {children}
      </main>

      <BottomNav 
        onUpgrades={onOpenUpgrades}
        onChat={onOpenChat}
        onLevel={onOpenLevel}
      />
      
      {/* Admin FAB with LunaBug access - NOW POSITIONED HIGHER */}
      <AdminFAB onOpenDebugger={() => setShowLunaBugDebugger(true)} />
      
      {/* LunaBug Debugger Modal - FROM STANDALONE DIRECTORY */}
      <MistralDebugger 
        isOpen={showLunaBugDebugger} 
        onClose={() => setShowLunaBugDebugger(false)} 
      />
      
      {/* Passive Achievement Tracking */}
      <AchievementSystem />
    </div>
  );
}