import React from "react";

interface TopBarProps {
  username?: string;
  level: number;
  points: number;
  passivePerHour: number;
  energy: number;
  maxEnergy: number;
  energyRegen: number;
  isAdmin?: boolean;
}

export function TopBar({ username = "Player", level, points, passivePerHour, energy, maxEnergy, energyRegen, isAdmin }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-purple-900/80 via-black/70 to-pink-900/80 backdrop-blur supports-[backdrop-filter]:bg-black/60 border-b border-purple-500/20">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        {/* Left: Avatar + Username */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-700 border border-purple-400/40" />
          <div className="leading-tight">
            <div className="text-xs text-gray-400">@{username}</div>
            <div className="text-[11px] text-purple-300">Lv.{level}</div>
          </div>
          {isAdmin && (
            <span className="ml-2 rounded px-2 py-0.5 text-[10px] font-semibold bg-green-700/30 text-green-300 border border-green-500/30">Admin: ON</span>
          )}
        </div>

        {/* Right: Compact Stats */}
        <div className="grid grid-cols-3 gap-3 text-right text-[11px]">
          <div className="px-2 py-1 rounded bg-black/30 border border-purple-500/20">
            <div className="text-purple-300">POINTS</div>
            <div className="text-white text-sm font-bold tabular-nums">{Math.floor(points).toLocaleString()}</div>
            <div className="text-gray-400">+{Math.floor(passivePerHour).toLocaleString()}/hr</div>
          </div>
          <div className="px-2 py-1 rounded bg-black/30 border border-purple-500/20">
            <div className="text-purple-300">POINTS/HR</div>
            <div className="text-white text-sm font-bold tabular-nums">{Math.floor(passivePerHour).toLocaleString()}</div>
            <div className="text-gray-400">Passive</div>
          </div>
          <div className="px-2 py-1 rounded bg-black/30 border border-purple-500/20">
            <div className="text-yellow-300">ENERGY</div>
            <div className="text-white text-sm font-bold tabular-nums">{energy}/{maxEnergy}</div>
            <div className="text-yellow-400">+{energyRegen}/s</div>
          </div>
        </div>
      </div>
    </header>
  );
}
