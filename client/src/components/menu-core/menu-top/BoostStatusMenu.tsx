import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Clock, TrendingUp } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function BoostStatusMenu({ isOpen, onClose }: Props) {
  const { state } = useGame();
  
  if (!state) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-gray-900/95 border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-300">
            <Zap className="w-5 h-5" />
            Boost Status
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {state.boostActive ? (
            <>
              <div className="text-center p-6 bg-gradient-to-br from-orange-600/20 to-yellow-600/20 rounded-lg border border-orange-400/30">
                <div className="text-4xl font-bold text-orange-400 mb-2">{state.boostMultiplier}x</div>
                <div className="text-orange-300 font-semibold">BOOST ACTIVE</div>
                <div className="text-orange-200 text-sm mt-1">Earning {state.boostMultiplier}x points per tap!</div>
              </div>
              
              <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-purple-300 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Boost Timer
                  </span>
                  <span className="text-gray-400 text-sm">Active</span>
                </div>
                <div className="text-center text-orange-300 font-semibold">⚡ UNLIMITED BOOST ⚡</div>
              </div>
            </>
          ) : (
            <div className="text-center p-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
              <Zap className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <div className="text-gray-400">No active boost</div>
              <div className="text-gray-500 text-sm mt-2">Purchase upgrades or complete tasks to unlock boost power!</div>
            </div>
          )}
          
          {/* Energy Status */}
          <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-300 font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Energy Status
              </span>
              <span className="text-gray-400 text-sm">
                {Math.round(state.energy)} / {Math.round(state.energyMax)}
              </span>
            </div>
            <Progress value={(state.energy / state.energyMax) * 100} className="h-3 mb-2" />
            <div className="text-xs text-gray-400">
              {Math.round(((state.energy / state.energyMax) * 100))}% Energy Remaining
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}