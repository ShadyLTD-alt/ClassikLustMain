import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Lock, TrendingUp, X, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGame } from "@/contexts/GameContext";

interface LevelUpProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LevelUp({ isOpen, onClose }: LevelUpProps) {
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const { toast } = useToast();
  const { state } = useGame();
  
  // Fetch player data
  const { data: playerData } = useQuery({
    queryKey: ['/api/player/me'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/player/me');
      return await response.json();
    },
    enabled: isOpen
  });

  // 🎯 FIXED: Fetch all levels and find next available
  const { data: levelsData } = useQuery({
    queryKey: ['/api/levels'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/levels');
      return await response.json();
    },
    enabled: isOpen
  });

  // Fetch upgrades for requirement checking
  const { data: upgradesData } = useQuery({
    queryKey: ['/api/upgrades'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/upgrades');
      return await response.json();
    },
    enabled: isOpen
  });

  if (!playerData?.player || !levelsData?.levels) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-gray-900/95 backdrop-blur-lg text-white border-purple-500/50">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Level Up
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading level data...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const player = playerData.player;
  const levels = levelsData.levels || [];
  const upgrades = upgradesData?.upgrades || [];
  
  // 🎯 FIXED: Find next level correctly
  const currentLevel = player.level || 1;
  const nextLevelConfig = levels.find((l: any) => l.level === currentLevel + 1);
  
  // 🎯 FIXED: Check if max level reached
  if (!nextLevelConfig) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-gray-900/95 backdrop-blur-lg text-white border-purple-500/50">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Max Level Reached!
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>
          <div className="text-center py-8 space-y-4">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-yellow-400">Congratulations!</p>
              <p className="text-gray-300 mt-2">You've reached the maximum level ({currentLevel})!</p>
              <p className="text-sm text-gray-400 mt-2">More levels may be added in future updates.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // 🎯 FIXED: Calculate costs correctly
  const nextLevel = currentLevel + 1;
  const experienceRequired = nextLevelConfig.experienceRequired || (nextLevel * 1000); // Default if not set
  const canAfford = player.experience >= experienceRequired;
  const requirements = nextLevelConfig.requirements || [];
  const unlocks = nextLevelConfig.unlocks || [];
  const pointsReward = nextLevelConfig.pointsReward || 0;

  // Check if requirements are met
  const requirementsMet = requirements.every((req: any) => {
    const playerUpgradeLevel = player.upgrades?.[req.upgradeId] || 0;
    return playerUpgradeLevel >= req.minLevel;
  });

  const canLevelUp = canAfford && requirementsMet;

  const handleLevelUp = async () => {
    if (!canLevelUp || isLevelingUp) return;
    
    setIsLevelingUp(true);
    try {
      // 🎯 NEW: Call proper level-up endpoint
      const response = await apiRequest('POST', '/api/player/level-up', {
        targetLevel: nextLevel
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Level Up!",
          description: `Congratulations! You've reached level ${nextLevel}${pointsReward > 0 ? ` and earned ${pointsReward} bonus LustPoints!` : ''}`,
          duration: 5000
        });
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to level up');
      }
    } catch (error) {
      console.error('❌ [LEVEL UP] Error:', error);
      toast({
        title: "Level Up Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLevelingUp(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gray-900/95 backdrop-blur-lg text-white border-purple-500/50">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Level Up - Level {nextLevel}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-center text-sm text-gray-400">
            Current Level: {currentLevel} | Experience Required: <span className="text-purple-400 font-semibold">{experienceRequired.toLocaleString()}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Experience Progress */}
          <Card className="bg-black/40 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Experience Progress</span>
                <span className="text-sm text-purple-400">{player.experience.toLocaleString()} / {experienceRequired.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (player.experience / experienceRequired) * 100)}%` }}
                />
              </div>
              <div className="text-center text-xs text-gray-400 mt-2">
                {Math.round((player.experience / experienceRequired) * 100)}% complete
              </div>
            </CardContent>
          </Card>

          {/* Rewards */}
          {pointsReward > 0 && (
            <Card className="bg-green-950/30 border-green-500/30">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-green-400">
                  <TrendingUp className="w-4 h-4" />
                  Level {nextLevel} Rewards
                </h3>
                <div className="bg-green-900/30 p-3 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">💎</span>
                    <span className="text-green-400 font-bold">+{pointsReward.toLocaleString()} LustPoints</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Requirements Section */}
          {requirements.length > 0 && (
            <Card className="bg-black/40 border-purple-500/30">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  Requirements
                </h3>
                <div className="space-y-2">
                  {requirements.map((req: any, index: number) => {
                    const upgrade = upgrades.find((u: any) => u.id === req.upgradeId);
                    const playerLevel = player.upgrades?.[req.upgradeId] || 0;
                    const isMet = playerLevel >= req.minLevel;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-2 rounded bg-gray-800/50">
                        <div className="flex items-center gap-2">
                          {isMet ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Lock className="w-4 h-4 text-red-400" />
                          )}
                          <span className={isMet ? 'text-green-400' : 'text-red-400'}>
                            {upgrade?.name || req.upgradeId}
                          </span>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            isMet 
                              ? 'bg-green-600/20 text-green-400' 
                              : 'bg-red-600/20 text-red-400'
                          }`}
                        >
                          {playerLevel}/{req.minLevel}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unlocks Section */}
          {unlocks.length > 0 && (
            <Card className="bg-black/40 border-purple-500/30">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 text-yellow-400">Unlocks at Level {nextLevel}</h3>
                <div className="space-y-2">
                  {unlocks.map((unlock: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded bg-yellow-600/10">
                      <CheckCircle className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400">{unlock}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Level Up Button */}
          <Button
            onClick={handleLevelUp}
            disabled={!canLevelUp || isLevelingUp}
            className={`w-full py-3 text-lg font-semibold ${
              canLevelUp
                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            {isLevelingUp ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Leveling up...
              </div>
            ) : canLevelUp ? (
              🎯 `Level Up to ${nextLevel}!`
            ) : !canAfford ? (
              `Need ${(experienceRequired - player.experience).toLocaleString()} more EXP`
            ) : (
              'Requirements not met'
            )}
          </Button>

          {/* Current Status */}
          <div className="text-center text-sm text-gray-400 space-y-1">
            <div>Your Experience: <span className="text-purple-400 font-semibold">{player.experience.toLocaleString()}</span></div>
            <div>Required: <span className="text-purple-400 font-semibold">{experienceRequired.toLocaleString()}</span></div>
            {canAfford ? (
              <div className="text-green-400">✓ You have enough experience!</div>
            ) : (
              <div className="text-red-400">✗ Need more experience</div>
            )}
            {pointsReward > 0 && (
              <div className="text-yellow-400">🎆 Bonus: {pointsReward.toLocaleString()} LustPoints</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}