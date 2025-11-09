import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Clock, TrendingUp, Crown, Trophy } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Props { 
  isOpen: boolean; 
  onClose: () => void;
  openMenu?: (menuId: string) => void;
}

export default function PlayerInfoMenu({ isOpen, onClose, openMenu }: Props) {
  // ✅ FIX: Use React Query for real-time player data sync
  const { data: playerData, refetch } = useQuery({
    queryKey: ['/api/player/me'],
    queryFn: async () => {
      const r = await apiRequest('GET', '/api/player/me');
      return await r.json();
    },
    enabled: isOpen, // Only fetch when modal is open
    refetchOnMount: 'always', // Always refetch when modal opens
  });

  const state = playerData?.player;
  
  if (!state) return null;

  const handleCharacterGalleryClick = () => {
    onClose(); // Close profile
    if (openMenu) {
      openMenu('character-gallery'); // Open character gallery
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900/95 border-purple-500/30 z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-300">
            <User className="w-5 h-5" />Player Profile
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Player Info Header with Crown Button */}
          <div className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
            {/* ✅ FIX: Crown button opens character gallery */}
            <Button
              onClick={handleCharacterGalleryClick}
              className="w-12 h-12 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg flex items-center justify-center transition-colors border border-purple-500/30 p-0"
              title="Character Gallery"
            >
              <Crown className="w-6 h-6 text-purple-400" />
            </Button>
            
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{state.username}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-purple-600/20 text-purple-300 border-purple-400/30">
                  Level {state.level}
                </Badge>
                {state.isAdmin && (
                  <Badge className="bg-yellow-600/20 text-yellow-300 border-yellow-400/30">
                    Admin
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-purple-300 text-sm font-semibold">LP/HR</div>
              <div className="text-white text-lg font-bold">
                {Math.round(state.passiveIncomeRate || 0)}
              </div>
            </div>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 text-center">
              <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-pink-500 bg-clip-text">
                {Math.round(state.lustPoints || state.points || 0).toLocaleString()}
              </div>
              <div className="text-purple-300 text-sm">Current LP</div>
            </div>
            
            <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 text-center">
              <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-500 bg-clip-text">
                {Math.round(state.lustGems || 0).toLocaleString()}
              </div>
              <div className="text-purple-300 text-sm">Lust Gems</div>
            </div>
            
            <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 text-center">
              <div className="text-2xl font-bold text-purple-400">
                {Math.round(state.passiveIncomeRate || 0)}
              </div>
              <div className="text-purple-300 text-sm">LP/Hour Rate</div>
            </div>
          </div>

          {/* Player Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
              <div className="text-lg font-bold text-white">
                {Math.round(state.totalTapsAllTime || 0).toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">Total Taps (All Time)</div>
            </div>
            
            <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
              <div className="text-lg font-bold text-white">
                {Object.keys(state.upgrades || {}).length}
              </div>
              <div className="text-gray-400 text-sm">Upgrades Owned</div>
            </div>
            
            <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
              <div className="text-lg font-bold text-white">
                {(state.unlockedCharacters || []).length}
              </div>
              <div className="text-gray-400 text-sm">Characters Unlocked</div>
            </div>
            
            <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
              <div className="text-lg font-bold text-white">
                {Math.round(state.consecutiveDays || 0)}
              </div>
              <div className="text-gray-400 text-sm">Login Streak</div>
            </div>
          </div>

          {/* Today's Progress */}
          <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <h3 className="text-purple-300 font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Today's Progress
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-white font-bold">
                  {Math.round(state.totalTapsToday || 0).toLocaleString()}
                </div>
                <div className="text-gray-400">Taps Today</div>
              </div>
              
              <div className="text-center">
                <div className="text-white font-bold">
                  {Math.round(state.lpEarnedToday || 0).toLocaleString()}
                </div>
                <div className="text-gray-400">LP Earned</div>
              </div>
              
              <div className="text-center">
                <div className="text-white font-bold">
                  {Math.round(state.upgradesPurchasedToday || 0)}
                </div>
                <div className="text-gray-400">Upgrades Bought</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}