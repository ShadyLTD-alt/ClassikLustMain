import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Zap, 
  Settings, 
  MessageCircle, 
  TrendingDown,
  User,
  Crown,
  Rocket,
  Gem
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useGame } from "@/contexts/GameContext";
import UpgradePanel from "./UpgradePanel";
import LevelUp from "./LevelUp";
import CharacterSelector from "./CharacterSelector";
import BoostPanel from "./BoostPanel";
import type { Player } from "@shared/schema";

export default function GameInterface() {
  console.log('🎮 [v3.3] GameInterface component rendering');
  
  // Get state from GameContext
  const { state, tap } = useGame();
  console.log('🎮 [v3.3] GameInterface state:', state);

  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [showBoost, setShowBoost] = useState(false);

  // Fetch player data for username (GameContext doesn't have this)
  const { data: player } = useQuery<Player>({
    queryKey: ['/api/player/me'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/player/me');
      return await response.json() as Player;
    },
    refetchInterval: 30000,
    enabled: !!localStorage.getItem('sessionToken')
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

  // Handle tap using GameContext tap function
  const handleTap = () => {
    console.log('💯 [v3.3] Tap triggered via GameContext');
    if (state?.energy > 0) {
      tap();
    }
  };

  // Wait for GameContext to initialize
  if (!state || state.points === undefined) {
    console.log('⏳ [v3.3] GameInterface waiting for GameContext to initialize...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  const energyPercentage = (state.energy / state.energyMax) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white relative">
      {/* Header with User Info */}
      <div className="p-4 bg-black/20 backdrop-blur-sm relative z-10">
        <div className="flex items-center justify-between">
          {/* User Info with Username */}
          <div className="flex items-center gap-3">
            <div className="relative">
              {currentCharacter ? (
                <img
                  src={currentCharacter.defaultImage || '/uploads/placeholder-avatar.jpg'}
                  alt={currentCharacter.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-purple-400"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/uploads/placeholder-avatar.jpg';
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
              )}
              {/* Character selector button */}
              <Button
                size="sm"
                variant="ghost"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-purple-600 hover:bg-purple-700 p-1"
                onClick={() => setShowCharacterSelector(true)}
              >
                <Crown className="w-3 h-3" />
              </Button>
            </div>
            <div>
              <div className="text-xs text-gray-400">@{player?.username || 'Player'}</div>
              <div className="font-semibold">
                {currentCharacter ? currentCharacter.name : 'Select Character'}
              </div>
            </div>
          </div>
          
          {/* NEW: LustGems Display + Boost Button */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="flex items-center gap-1 mb-1">
                <Gem className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-300">LUSTGEMS</span>
              </div>
              <div className="text-lg font-bold text-blue-400">{(state.lustGems || 0).toLocaleString()}</div>
            </div>
            
            <BoostPanel />
            
            {/* Admin Toggle */}
            {state.isAdmin && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-400">Admin: ON</span>
                <Settings className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Game Stats */}
      <div className="px-4 py-6 relative z-10">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* LustPoints Card */}
          <Card className="bg-black/40 border-pink-500/30">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-pink-400 mr-2" />
                <span className="text-pink-400 font-semibold text-sm">LUSTPOINTS</span>
              </div>
              <div className="text-2xl font-bold text-pink-300">{Math.floor(state.lustPoints || state.points)}</div>
              <div className="text-xs text-gray-400">+{Math.floor(state.passiveIncomeRate)}/hr</div>
              <div className="text-xs text-pink-400">Passive Income</div>
            </CardContent>
          </Card>
          
          {/* Passive Income Card */}
          <Card className="bg-black/40 border-purple-500/30">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingDown className="w-5 h-5 text-purple-400 mr-2" />
                <span className="text-purple-400 font-semibold text-sm">LP/HR</span>
              </div>
              <div className="text-2xl font-bold">{Math.floor(state.passiveIncomeRate)}</div>
              <div className="text-xs text-purple-400">Passive Income</div>
            </CardContent>
          </Card>
          
          {/* Energy Card */}
          <Card className="bg-black/40 border-green-500/30">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Zap className="w-5 h-5 text-green-400 mr-2" />
                <span className="text-green-400 font-semibold text-sm">ENERGY</span>
              </div>
              <div className="text-2xl font-bold text-green-300">{state.energy} / {state.maxEnergy}</div>
              <Progress value={energyPercentage} className="mt-2 h-2 bg-gray-700" />
              <div className="text-xs text-green-400 mt-1">+{state.energyRegenRate}/s</div>
            </CardContent>
          </Card>
        </div>
        
        {/* NEW: Boost Status Display */}
        {state.boostActive && state.boostExpiresAt && (
          <Card className="mb-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/50">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <Rocket className="w-5 h-5 text-orange-400" />
                <span className="text-orange-300 font-bold">{state.boostMultiplier}x BOOST ACTIVE!</span>
              </div>
              <div className="text-xs text-orange-400 mt-1">
                Expires: {state.boostExpiresAt.toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Character Display Area */}
      <div className="flex-1 flex items-center justify-center px-4 pb-20 relative z-10">
        <div className="text-center">
          {currentCharacter ? (
            <div>
              <div className="text-xl font-bold mb-2">{currentCharacter.name}</div>
              <div 
                className="w-64 h-64 mx-auto mb-4 rounded-lg bg-gray-800/50 backdrop-blur-sm border-2 border-purple-500/30 flex items-center justify-center cursor-pointer hover:border-purple-400/50 transition-all active:scale-95 overflow-hidden"
                onClick={handleTap}
              >
                {state.displayImage ? (
                  <img
                    src={state.displayImage}
                    alt={currentCharacter.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = currentCharacter.defaultImage || '/uploads/placeholder-character.jpg';
                    }}
                  />
                ) : currentCharacter.defaultImage ? (
                  <img
                    src={currentCharacter.defaultImage}
                    alt={currentCharacter.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/uploads/placeholder-character.jpg';
                    }}
                  />
                ) : (
                  <div className="text-gray-400 text-center">
                    <div className="text-6xl mb-2">👤</div>
                    <div>No character image</div>
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-400">
                Tap to earn points! ({state.energy > 0 ? 'Ready' : 'No energy'})
              </div>
              {state.boostActive && (
                <div className="text-sm text-orange-400 mt-1">
                  🚀 {state.boostMultiplier}x Boost Active!
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="w-64 h-64 mx-auto mb-4 rounded-lg bg-gray-800/50 backdrop-blur-sm border-2 border-gray-600 flex items-center justify-center">
                <div className="text-gray-400 text-center">
                  <User className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <div>No character selected</div>
                </div>
              </div>
              <Button onClick={() => setShowCharacterSelector(true)} className="bg-purple-600 hover:bg-purple-700">
                <Crown className="w-4 h-4 mr-2" />
                Select Character
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation - Fixed Position */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-gray-700 z-50">
        <div className="flex justify-around py-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center gap-1 text-xs hover:bg-purple-600/20" 
            onClick={() => setShowUpgrades(true)}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Upgrades</span>
            <span className="text-xs text-gray-400">0/6</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center gap-1 text-xs hover:bg-purple-600/20" 
            onClick={() => setShowCharacterSelector(true)}
          >
            <User className="w-5 h-5" />
            <span>Characters</span>
            <span className="text-xs text-gray-400">{state.unlockedCharacters?.length || 0}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center gap-1 text-xs hover:bg-blue-600/20" 
            onClick={() => setShowBoost(true)}
          >
            <Rocket className="w-5 h-5 text-blue-400" />
            <span className="text-blue-300">Boost</span>
            <span className="text-xs text-blue-400">{state.lustGems || 0} LG</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center gap-1 text-xs hover:bg-purple-600/20" 
            onClick={() => setShowLevelUp(true)}
          >
            <MessageCircle className="w-5 h-5" />
            <span>AI Chat</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center gap-1 text-xs hover:bg-purple-600/20" 
            onClick={() => setShowLevelUp(true)}
          >
            <TrendingDown className="w-5 h-5" />
            <span>Level Up</span>
            <span className="text-xs text-gray-400">Lv.{state.level}</span>
          </Button>
        </div>
      </div>

      {/* Modals - High z-index to appear above everything */}
      {showUpgrades && (
        <div className="fixed inset-0 z-[100]">
          <UpgradePanel isOpen={showUpgrades} onClose={() => setShowUpgrades(false)} />
        </div>
      )}
      {showLevelUp && (
        <div className="fixed inset-0 z-[100]">
          <LevelUp isOpen={showLevelUp} onClose={() => setShowLevelUp(false)} />
        </div>
      )}
      {showCharacterSelector && (
        <div className="fixed inset-0 z-[100]">
          <CharacterSelector isOpen={showCharacterSelector} onClose={() => setShowCharacterSelector(false)} />
        </div>
      )}
      {showBoost && (
        <div className="fixed inset-0 z-[100]">
          <BoostPanel isOpen={showBoost} onClose={() => setShowBoost(false)} />
        </div>
      )}
    </div>
  );
}