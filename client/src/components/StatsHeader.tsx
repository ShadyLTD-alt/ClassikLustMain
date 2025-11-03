import { Zap, Star, Heart, Gem, TrendingUp, Rocket, User } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ImageUploader from './ImageUploader';

export default function StatsHeader() {
  const { state, characters, images } = useGame();

  const energyPercent = (state.energy / state.energyMax) * 100;

  const selectedCharacter = characters.find(c => c.id === state.selectedCharacterId);
  const avatarImage = state.selectedAvatarId
    ? images.find(img => img.id === state.selectedAvatarId)
    : null;
  const displayAvatar = avatarImage?.url || selectedCharacter?.avatarImage || selectedCharacter?.defaultImage;

  return (
    <div className="sticky top-0 z-50 bg-card border-b border-card-border">
      <div className="p-4">
        
        {/* ✅ LUNA FIX: TOP ROW - Username above everything */}
        <div className="flex items-center justify-center mb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            <span className="text-lg font-bold text-blue-300">
              {selectedCharacter?.name || 'Player'}
            </span>
            {state.isAdmin && (
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* ✅ LUNA FIX: MIDDLE ROW - LP/HR in center top */}
        <div className="flex items-center justify-center mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium uppercase tracking-wide text-purple-300">LP/HR</span>
            </div>
            <div className="text-2xl font-bold tabular-nums text-purple-400">
              {(state.passiveIncomeRate || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* ✅ LUNA FIX: MAIN ROW - Avatar with LustPoints & LustGems beside, Energy separate */}
        <div className="flex items-center justify-between gap-4">
          
          {/* LEFT SIDE: LustPoints */}
          <div className="text-center" data-testid="stat-lustpoints">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Heart className="w-5 h-5 text-pink-500" />
              <span className="text-xs font-medium uppercase tracking-wide text-pink-300">LustPoints</span>
            </div>
            <div className="text-2xl font-bold tabular-nums text-pink-400">
              {Math.floor(state.lustPoints || state.points || 0).toLocaleString()}
            </div>
            
            {/* ✅ LUNA FIX: LustGems below LustPoints */}
            <div className="mt-2">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Gem className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium uppercase tracking-wide text-blue-300">LustGems</span>
              </div>
              <div className="text-lg font-bold tabular-nums text-blue-400">
                {Math.floor(state.lustGems || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* ✅ LUNA FIX: CENTER - Avatar with Level below */}
          <div className="flex flex-col items-center">
            <Dialog>
              <DialogTrigger asChild>
                <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-primary cursor-pointer hover-elevate flex-shrink-0 mb-2">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={selectedCharacter?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Star className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Character Gallery - {selectedCharacter?.name}</DialogTitle>
                </DialogHeader>
                <ImageUploader adminMode={false} />
              </DialogContent>
            </Dialog>
            
            {/* ✅ LUNA FIX: Level below avatar */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium uppercase tracking-wide text-amber-300">Level</span>
              </div>
              <div className="text-xl font-bold tabular-nums text-amber-400">
                {state.level}
              </div>
            </div>
          </div>

          {/* ✅ LUNA FIX: RIGHT SIDE - Energy with Boosters below */}
          <div className="text-center" data-testid="stat-energy">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-5 h-5 text-green-500" />
              <span className="text-xs font-medium uppercase tracking-wide text-green-300">Energy</span>
            </div>
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-2xl font-bold tabular-nums text-green-400">
                {Math.floor(state.energy)}
              </span>
              <span className="text-sm text-muted-foreground">
                /{state.energyMax}
              </span>
            </div>
            <Progress value={energyPercent} className="h-2 w-20 mx-auto mb-3" />
            
            {/* ✅ LUNA FIX: Boosters display below energy */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Rocket className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium uppercase tracking-wide text-orange-300">Boosters</span>
              </div>
              
              {/* Active Boost Display */}
              {state.boostActive ? (
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg px-2 py-1">
                  <div className="text-xs text-orange-300 text-center">
                    {state.boostMultiplier}x Active
                  </div>
                  {state.boostExpiresAt && (
                    <div className="text-xs text-orange-400 text-center">
                      {Math.max(0, Math.floor((new Date(state.boostExpiresAt).getTime() - Date.now()) / 60000))}m left
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg px-2 py-1">
                  <div className="text-xs text-slate-400 text-center">
                    No Active Boost
                  </div>
                </div>
              )}
              
              {/* Boost Energy/Charges */}
              <div className="bg-slate-800/50 rounded-lg px-2 py-1 mt-1">
                <div className="flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs text-cyan-300">Boost+:</span>
                  <span className="text-xs font-bold text-cyan-400">
                    {state.boostEnergy || 0}/1024
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}