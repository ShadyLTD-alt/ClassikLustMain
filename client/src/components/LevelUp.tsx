import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Lock, TrendingUp, X, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LevelUpProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LevelUp({ isOpen, onClose }: LevelUpProps) {
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();  // ✅ Query client for cache management
  
  // Fetch player data
  const { data: playerData, isLoading: playerLoading, refetch: refetchPlayer } = useQuery({
    queryKey: ['/api/player/me'],
    queryFn: async () => {
      const response = await apiRequest('/api/player/me', { method: 'GET' });
      const data = await response.json();
      return data.player;
    },
    enabled: isOpen
  });

  // Fetch next level info
  const { data: nextLevelData, isLoading: levelLoading } = useQuery({
    queryKey: ['/api/levels', playerData?.level + 1],
    queryFn: async () => {
      if (!playerData) return null;
      const response = await apiRequest(`/api/levels/${playerData.level + 1}`, { method: 'GET' });
      if (!response.ok) return null;
      const data = await response.json();
      return data.level;
    },
    enabled: isOpen && !!playerData
  });

  // Fetch upgrades for requirement checking
  const { data: upgradesData } = useQuery({
    queryKey: ['/api/upgrades'],
    queryFn: async () => {
      const response = await apiRequest('/api/upgrades', { method: 'GET' });
      const data = await response.json();
      return data;
    },
    enabled: isOpen
  });

  if (playerLoading || levelLoading) {
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
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
            <p className="text-gray-400 mt-4">Loading level data...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!playerData || !nextLevelData) {
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
            <p className="text-gray-400">No next level available.</p>
            <p className="text-sm text-gray-500 mt-2">You're at the highest level configured in the game!</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const cost = nextLevelData.cost || 100;
  const canAfford = playerData.points >= cost;
  const requirements = nextLevelData.requirements || [];
  const unlocks = nextLevelData.unlocks || [];
  const upgrades = upgradesData?.upgrades || [];

  // Check if requirements are met
  const requirementsMet = requirements.every((req: any) => {
    const playerUpgradeLevel = playerData.upgrades?.[req.upgradeId] || 0;
    return playerUpgradeLevel >= req.minLevel;
  });

  const canLevelUp = canAfford && requirementsMet;

  const handleLevelUp = async () => {
    if (!canLevelUp || isLevelingUp) return;
    
    setIsLevelingUp(true);
    try {
      const response = await apiRequest('/api/player/level-up', { method: 'POST' });
      
      if (response.ok) {
        const data = await response.json();
        
        console.log(`✅ [LEVEL-UP UI] Success! New level: ${data.newLevel}, spent ${data.pointsSpent} LP`);
        
        // ✅ FIX 1: Invalidate ALL player-related cache
        await queryClient.invalidateQueries({ queryKey: ['/api/player/me'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/levels'] });
        
        // ✅ FIX 2: Force immediate refetch to update the dialog
        await refetchPlayer();
        
        console.log(`🔄 [LEVEL-UP UI] All queries invalidated and refetched`);
        
        toast({
          title: "Level Up!",
          description: `Congratulations! You've reached level ${data.newLevel}`,
        });
        
        // ✅ FIX 3: Close dialog after a short delay so user sees the success state
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to level up');
      }
    } catch (error: any) {
      console.error('[LEVEL-UP UI] Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to level up. Please try again.",
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
              Level Up - Level {nextLevelData.level}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-center text-sm text-gray-400">
            Current Level: {playerData.level} | Cost: <span className="text-purple-400 font-semibold">{cost}</span> points
          </p>
        </DialogHeader>

        <div className="space-y-4">
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
                    const playerLevel = playerData.upgrades?.[req.upgradeId] || 0;
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
                <h3 className="font-semibold mb-3 text-yellow-400">Unlocks at Level {nextLevelData.level}</h3>
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
                <Loader2 className="w-4 h-4 animate-spin" />
                Leveling up...
              </div>
            ) : canLevelUp ? (
              'Level Up Now!'
            ) : !canAfford ? (
              `Need ${cost - playerData.points} more points`
            ) : (
              'Requirements not met'
            )}
          </Button>

          {/* Current Status */}
          <div className="text-center text-sm text-gray-400 space-y-1">
            <div>Your Points: <span className="text-purple-400 font-semibold">{Math.floor(playerData.points)}</span></div>
            <div>Cost: <span className="text-purple-400 font-semibold">{cost}</span></div>
            {canAfford ? (
              <div className="text-green-400">✓ You have enough points!</div>
            ) : (
              <div className="text-red-400">✗ Not enough points</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
