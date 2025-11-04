import React, { useState } from "react";
import { AdminFAB } from "@/components/AdminFAB";
import { MistralDebugger } from "../../../LunaBug/interface/MistralDebugger";
import { AchievementSystem } from "@/components/AchievementSystem";

// Simplified GameLayout - TopBar now handled by menu-top
export default function GameLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [showLunaBugDebugger, setShowLunaBugDebugger] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-20"> {/* Added pt-20 for top menu */}
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