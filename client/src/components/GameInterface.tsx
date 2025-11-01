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
  Crown
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import Upgrades from "./Upgrades";
import LevelUp from "./LevelUp";
import CharacterSelector from "./CharacterSelector";
import type { Player } from "@shared/schema";

export default function GameInterface() {
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const { user } = useAuth();

  // Fetch player data
  const { data: player, refetch: refetchPlayer } = useQuery({
    queryKey: ['/api/player/me'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/player/me');
      return await response.json() as Player;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch current character
  const { data: currentCharacter } = useQuery({
    queryKey: ['/api/characters', player?.selectedCharacterId],
    queryFn: async () => {
      if (!player?.selectedCharacterId) return null;
      const response = await apiRequest('GET', `/api/characters/${player.selectedCharacterId}`);
      return await response.json();
    },
    enabled: !!player?.selectedCharacterId,
  });

  // Auto-refetch player data when modals close
  useEffect(() => {
    if (!showUpgrades && !showLevelUp && !showCharacterSelector) {
      refetchPlayer();
    }
  }, [showUpgrades, showLevelUp, showCharacterSelector, refetchPlayer]);

  // Handle tap
  const handleTap = async () => {
    if (!player) return;
    
    try {
      const response = await apiRequest('POST', '/api/player/tap');
      if (response.ok) {
        refetchPlayer();
      }
    } catch (error) {
      console.error('Tap failed:', error);
    }
  };

  if (!player || !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  const energyPercentage = (player.energy / player.maxEnergy) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header with User Info */}
      <div className="p-4 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          {/* User Info with Telegram Username */}
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
              <div className="text-xs text-gray-400">@{user.username}</div>
              <div className="font-semibold">
                {currentCharacter ? currentCharacter.name : 'Select Character'}
              </div>
            </div>
          </div>

          {/* Admin Toggle */}
          {player.isAdmin && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-400">Admin: ON</span>
              <Settings className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Main Game Stats */}
      <div className="px-4 py-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Points */}
          <Card className="bg-black/40 border-purple-500/30">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-purple-400 mr-2" />
                <span className="text-purple-400 font-semibold">POINTS</span>
              </div>
              <div className="text-2xl font-bold">{Math.floor(player.points)}</div>
              <div className="text-xs text-gray-400">+{Math.floor(player.passiveIncomeRate)}/hr</div>
              <div className="text-xs text-purple-400">Passive Income</div>
            </CardContent>
          </Card>

          {/* Points/HR */}
          <Card className="bg-black/40 border-purple-500/30">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingDown className="w-5 h-5 text-purple-400 mr-2" />
                <span className="text-purple-400 font-semibold">POINTS/HR</span>
              </div>
              <div className="text-2xl font-bold">{Math.floor(player.passiveIncomeRate)}</div>
              <div className="text-xs text-purple-400">Passive Income</div>
            </CardContent>
          </Card>

          {/* Energy */}
          <Card className="bg-black/40 border-purple-500/30">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Zap className="w-5 h-5 text-yellow-400 mr-2" />
                <span className="text-yellow-400 font-semibold">ENERGY</span>
              </div>
              <div className="text-2xl font-bold">{player.energy} / {player.maxEnergy}</div>
              <Progress 
                value={energyPercentage} 
                className="mt-2 h-2 bg-gray-700"
              />
              <div className="text-xs text-yellow-400 mt-1">+1/s</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Character Display Area */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          {currentCharacter ? (
            <div>
              <div className="text-xl font-bold mb-2">{currentCharacter.name}</div>
              <div 
                className="w-64 h-64 mx-auto mb-4 rounded-lg bg-gray-800/50 backdrop-blur-sm border-2 border-purple-500/30 flex items-center justify-center cursor-pointer hover:border-purple-400/50 transition-all active:scale-95"
                onClick={handleTap}
              >
                {player.displayImage ? (
                  <img
                    src={player.displayImage}
                    alt={currentCharacter.name}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = currentCharacter.defaultImage || '/uploads/placeholder-character.jpg';
                    }}
                  />
                ) : (
                  <div className="text-gray-400 text-center">
                    <div className="text-6xl mb-2">👤</div>
                    <div>No character selected</div>
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-400">
                Tap to earn points!
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-64 h-64 mx-auto mb-4 rounded-lg bg-gray-800/50 backdrop-blur-sm border-2 border-gray-600 flex items-center justify-center">
                <div className="text-gray-400 text-center">
                  <User className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <div>No character selected</div>
                </div>
              </div>
              <Button 
                onClick={() => setShowCharacterSelector(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Crown className="w-4 h-4 mr-2" />
                Select Character
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-gray-700">
        <div className="flex justify-around py-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 text-xs"
            onClick={() => setShowUpgrades(true)}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Upgrades</span>
            <span className="text-xs text-gray-400">0/6</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 text-xs"
            onClick={() => setShowCharacterSelector(true)}
          >
            <User className="w-5 h-5" />
            <span>Characters</span>
            <span className="text-xs text-gray-400">0</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 text-xs"
            onClick={() => setShowLevelUp(true)}
          >
            <MessageCircle className="w-5 h-5" />
            <span>AI Chat</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 text-xs"
            onClick={() => setShowLevelUp(true)}
          >
            <TrendingDown className="w-5 h-5" />
            <span>Level Up</span>
            <span className="text-xs text-gray-400">Lv.{player.level}</span>
          </Button>
        </div>
      </div>

      {/* Modals */}
      <Upgrades 
        isOpen={showUpgrades}
        onClose={() => setShowUpgrades(false)}
      />

      <LevelUp 
        isOpen={showLevelUp}
        onClose={() => setShowLevelUp(false)}
      />

      <CharacterSelector 
        isOpen={showCharacterSelector}
        onClose={() => setShowCharacterSelector(false)}
      />
    </div>
  );
}