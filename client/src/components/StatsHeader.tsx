import { Zap, Star, Heart, Gem, TrendingUp, Rocket } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ImageUploader from './ImageUploader';

export default function StatsHeader() {
  const { state, characters, images } = useGame();

  const energyPercent = (state.energy / state.maxEnergy) * 100;

  const selectedCharacter = characters.find(c => c.id === state.selectedCharacterId);
  const avatarImage = state.selectedAvatarId
    ? images.find(img => img.id === state.selectedAvatarId)
    : null;
  const displayAvatar = avatarImage?.url || selectedCharacter?.avatarImage || selectedCharacter?.defaultImage;

  return (
    <div className="sticky top-0 z-50 bg-card border-b border-card-border">
      <div className="flex items-center justify-between gap-2 p-3">
        
        {/* LEFT: Avatar + Username + Level */}
        <div className="flex items-center gap-3 min-w-0">
          <Dialog>
            <DialogTrigger asChild>
              <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-primary cursor-pointer hover-elevate flex-shrink-0">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={selectedCharacter?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Star className="w-4 h-4 text-muted-foreground" />
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
          
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white truncate">{selectedCharacter?.name || 'Player'}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>Level {state.level}</span>
              {state.isAdmin && <span className="text-xs px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Admin</span>}
            </div>
          </div>
        </div>

        {/* LUSTPOINTS */}
        <div className="text-center min-w-0" data-testid="stat-lustpoints">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Heart className="w-4 h-4 text-pink-500" />
            <span className="text-xs font-medium uppercase tracking-wide text-pink-300">LUSTPOINTS</span>
          </div>
          <div className="text-xl font-bold tabular-nums text-pink-400">
            {Math.floor(state.lustPoints || state.points || 0).toLocaleString()}
          </div>
        </div>

        {/* LUSTGEMS - NEW */}
        <div className="text-center min-w-0" data-testid="stat-lustgems">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Gem className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium uppercase tracking-wide text-blue-300">LUSTGEMS</span>
          </div>
          <div className="text-lg font-bold tabular-nums text-blue-400">
            {Math.floor(state.lustGems || 0).toLocaleString()}
          </div>
        </div>

        {/* LP/HR */}
        <div className="text-center min-w-0" data-testid="stat-points-per-hour">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium uppercase tracking-wide text-purple-300">LP/HR</span>
          </div>
          <div className="text-lg font-bold tabular-nums text-purple-400">
            {(state.passiveIncomeRate || 0).toLocaleString()}
          </div>
        </div>

        {/* ENERGY + BOOST */}
        <div className="min-w-0" data-testid="stat-energy">
          <div className="flex items-center gap-1 mb-1">
            <Zap className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium uppercase tracking-wide text-green-300">ENERGY</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold tabular-nums text-green-400">
              {Math.floor(state.energy)}
            </span>
            <span className="text-xs text-muted-foreground">
              /{state.maxEnergy}
            </span>
          </div>
          <Progress value={energyPercent} className="h-1 mt-1" />
          
          {/* BOOST+ - NEW */}
          <div className="flex items-center gap-1 mt-1">
            <Rocket className="w-3 h-3 text-orange-400" />
            <span className="text-xs font-bold tabular-nums text-orange-400">
              {state.boostEnergy || 1024}
            </span>
            <span className="text-xs text-orange-300">/1024</span>
          </div>
        </div>
      </div>
    </div>
  );
}