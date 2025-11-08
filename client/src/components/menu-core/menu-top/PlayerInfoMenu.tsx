import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { User, Clock, TrendingUp, Crown } from 'lucide-react';

interface Props { isOpen: boolean; onClose: () => void; }

export default function PlayerInfoMenu({ isOpen, onClose }: Props) {
  const { state } = useGame();
  if (!state) return null;
  const expNext = (state.level + 1) * 1000;
  const expProg = (state.experience / expNext) * 100;
  const totLP = Math.round((state.lustPoints || state.points || 0) + (state.lpEarnedToday || 0));
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900/95 border-purple-500/30">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-purple-300"><User className="w-5 h-5" />Player Profile</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <button className="w-12 h-12 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg flex items-center justify-center transition-colors border border-purple-500/30" title="Character Gallery"><Crown className="w-6 h-6 text-purple-400" /></button>
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center"><User className="w-8 h-8 text-white" /></div>
            <div className="flex-1"><h2 className="text-xl font-bold text-white">{state.username}</h2><div className="flex items-center gap-2 mt-1"><Badge className="bg-purple-600/20 text-purple-300 border-purple-400/30">Level {state.level}</Badge>{state.isAdmin && <Badge className="bg-yellow-600/20 text-yellow-300 border-yellow-400/30">Admin</Badge>}</div></div>
            <div className="text-right"><div className="text-purple-300 text-sm font-semibold">LP/HR</div><div className="text-white text-lg font-bold">{Math.round(state.passiveIncomeRate || 0)}</div></div>
          </div>
          <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50"><div className="flex items-center justify-between mb-2"><span className="text-purple-300 font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" />Experience Progress</span><span className="text-gray-400 text-sm">{Math.round(state.experience)} / {expNext} XP</span></div><Progress value={expProg} className="h-3 mb-2" /><div className="text-xs text-gray-400">{Math.round(expNext - state.experience)} XP needed for Level {state.level + 1}</div></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 text-center"><div className="text-2xl font-bold text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-pink-500 bg-clip-text">{Math.round(state.lustPoints || state.points || 0).toLocaleString()}</div><div className="text-purple-300 text-sm">Current LP</div></div>
            <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 text-center"><div className="text-2xl font-bold text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-500 bg-clip-text">{Math.round(state.lustGems || 0).toLocaleString()}</div><div className="text-purple-300 text-sm">Lust Gems</div></div>
            <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 text-center"><div className="text-2xl font-bold text-purple-400">{totLP.toLocaleString()}</div><div className="text-purple-300 text-sm">Total LP Earned</div></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50"><div className="text-lg font-bold text-white">{Math.round(state.totalTapsAllTime || 0).toLocaleString()}</div><div className="text-gray-400 text-sm">Total Taps</div></div>
            <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50"><div className="text-lg font-bold text-white">{Object.keys(state.upgrades || {}).length}</div><div className="text-gray-400 text-sm">Upgrades Owned</div></div>
            <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50"><div className="text-lg font-bold text-white">{(state.unlockedCharacters || []).length}</div><div className="text-gray-400 text-sm">Characters Unlocked</div></div>
            <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50"><div className="text-lg font-bold text-white">{Math.round(state.consecutiveDays || 0)}</div><div className="text-gray-400 text-sm">Login Streak</div></div>
          </div>
          <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50"><h3 className="text-purple-300 font-semibold mb-3 flex items-center gap-2"><Clock className="w-4 h-4" />Today's Progress</h3><div className="grid grid-cols-4 gap-4 text-sm"><div className="text-center"><div className="text-white font-bold">{Math.round(state.totalTapsToday || 0)}</div><div className="text-gray-400">Taps</div></div><div className="text-center"><div className="text-white font-bold">{Math.round(state.lpEarnedToday || 0)}</div><div className="text-gray-400">LP Earned</div></div><div className="text-center"><div className="text-white font-bold">{Math.round(state.upgradesPurchasedToday || 0)}</div><div className="text-gray-400">Upgrades</div></div><div className="text-center"><div className="text-white font-bold">{Math.round(state.lustGems || 0)}</div><div className="text-gray-400">Gems</div></div></div></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}