import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useGame } from "@/contexts/GameContext";
import { apiRequest } from "@/lib/queryClient";
import { User } from "lucide-react";

interface TopBarProps {
  onOpenCharacterGallery: () => void;
}

export function TopBar({ onOpenCharacterGallery }: TopBarProps) {
  const { state } = useGame();
  
  // Fetch player data for username
  const { data: player } = useQuery({
    queryKey: ['/api/player/me'],
    queryFn: async () => (await (await apiRequest('GET', '/api/player/me')).json()),
    staleTime: 15000
  });

  // Fetch current character data
  const { data: currentCharacter } = useQuery({
    queryKey: ['/api/characters', state?.selectedCharacterId],
    queryFn: async () => {
      if (!state?.selectedCharacterId) return null;
      const response = await apiRequest('GET', `/api/characters/${state.selectedCharacterId}`);
      return await response.json();
    },
    enabled: !!state?.selectedCharacterId,
  });

  const getCharacterImage = () => {
    if (state?.displayImage) return state.displayImage;
    if (currentCharacter?.defaultImage) return currentCharacter.defaultImage;
    return null;
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-gray-900/95 via-purple-900/90 to-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-black/60 border-b border-purple-500/20">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        
        {/* Left: Avatar + Username/Level */}
        <div className="flex items-center gap-3">
          <div 
            className="relative cursor-pointer group"
            onClick={onOpenCharacterGallery}
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600/40 via-pink-600/40 to-purple-800/60 border border-purple-400/50 flex items-center justify-center overflow-hidden transition-all group-hover:border-purple-300/70 group-hover:shadow-lg group-hover:shadow-purple-500/20">
              {getCharacterImage() ? (
                <img
                  src={getCharacterImage()!}
                  alt={currentCharacter?.name || 'Character'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/uploads/placeholder-avatar.jpg';
                  }}
                />
              ) : (
                <User className="w-6 h-6 text-purple-300" />
              )}
            </div>
            {/* Small camera icon overlay */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-600 border border-purple-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-white">📷</span>
            </div>
          </div>
          
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">{player?.username || "Player"}</div>
            <div className="text-xs text-purple-300 font-medium">Level {state?.level || 1}</div>
            {state?.isAdmin && (
              <div className="text-[10px] text-green-400 font-semibold">Admin</div>
            )}
          </div>
        </div>

        {/* Right: Stats Cards - Responsive Layout */}
        <div className="flex items-center gap-2">
          
          {/* LustPoints Card */}
          <div className="px-3 py-2 rounded-lg bg-black/30 border border-purple-500/20 min-w-[90px]">
            <div className="text-[10px] text-purple-300 font-semibold tracking-wider">LUST<span className="text-pink-400">POINTS</span></div>
            <div className="text-white text-sm font-bold tabular-nums leading-tight">{Math.floor(state?.points || 0).toLocaleString()}</div>
          </div>
          
          {/* Points Per Hour Card */}
          <div className="px-3 py-2 rounded-lg bg-black/30 border border-purple-500/20 min-w-[80px]">
            <div className="text-[10px] text-purple-300 font-semibold tracking-wide">LP/HR</div>
            <div className="text-white text-sm font-bold tabular-nums leading-tight">{Math.floor(state?.passiveIncomeRate || 0).toLocaleString()}</div>
          </div>
          
          {/* Energy Card */}
          <div className="px-3 py-2 rounded-lg bg-black/30 border border-yellow-500/20 min-w-[75px]">
            <div className="text-[10px] text-yellow-300 font-semibold tracking-wide">ENERGY</div>
            <div className="text-white text-sm font-bold tabular-nums leading-tight">{state?.energy || 0}/{state?. energyMax || 1000}</div>
            <div className="text-[9px] text-yellow-400 leading-none">+{state?.energyRegenRate || 1}/s</div>
          </div>
          
        </div>
      </div>
    </header>
  );
}