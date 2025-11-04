import React, { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { AdminFAB } from "@/components/AdminFAB";
import { MistralDebugger } from "../../../LunaBug/interface/MistralDebugger";
import { AchievementSystem } from "@/components/AchievementSystem";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function GameLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [showLunaBugDebugger, setShowLunaBugDebugger] = useState(false);
  
  const { data: player } = useQuery({
    queryKey: ['/api/player/me'],
    queryFn: async () => (await (await apiRequest('GET', '/api/player/me')).json()),
    staleTime: 15000
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <TopBar />

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        {children}
      </main>

      {/* Admin FAB with LunaBug access */}
      <AdminFAB onOpenDebugger={() => setShowLunaBugDebugger(true)} />
      
      {/* LunaBug Debugger Modal */}
      <MistralDebugger 
        isOpen={showLunaBugDebugger} 
        onClose={() => setShowLunaBugDebugger(false)} 
      />
      
      {/* Passive Achievement Tracking */}
      <AchievementSystem />
    </div>
  );
}