import React from "react";

export default function BottomNav({ onUpgrades, onChat, onLevel }: { onUpgrades: () => void; onChat: () => void; onLevel: () => void; }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur border-t border-gray-700">
      <div className="mx-auto max-w-5xl px-2 py-2 grid grid-cols-3 gap-2">
        <button onClick={onUpgrades} className="flex flex-col items-center py-2 rounded hover:bg-purple-600/10 text-xs text-gray-300">
          <span className="text-sm">⬆️</span>
          <span>Upgrades</span>
        </button>
        <button onClick={onChat} className="flex flex-col items-center py-2 rounded hover:bg-purple-600/10 text-xs text-gray-300">
          <span className="text-sm">💬</span>
          <span>AI Chat</span>
        </button>
        <button onClick={onLevel} className="flex flex-col items-center py-2 rounded hover:bg-purple-600/10 text-xs text-gray-300">
          <span className="text-sm">📈</span>
          <span>Level</span>
        </button>
      </div>
    </nav>
  );
}
