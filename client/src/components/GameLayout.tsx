import React from "react";
import { AchievementSystem } from "@/components/AchievementSystem";

// Simplified GameLayout - Admin panel now in menu
export default function GameLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-20">
        {children}
      </main>
      
      {/* Passive Achievement Tracking */}
      <AchievementSystem />
    </div>
  );
}