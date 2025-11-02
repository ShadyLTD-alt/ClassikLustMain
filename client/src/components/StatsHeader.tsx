import { Zap, Star, Heart } from 'lucide-react';
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
      <div className="flex items-center justify-between gap-4 p-4">
        
        {/* LEFT: Avatar + Username + Level */}
        <div className="flex items-center gap-3 min-w-0">
          <Dialog>
            <DialogTrigger asChild>
              <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-primary cursor-pointer hover-elevate flex-shrink-0">
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
          
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-white truncate">{selectedCharacter?.name || 'Player'}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span>Level {state.level}</span>
              {state.isAdmin && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-400/30">Admin</span>}
            </div>
          </div>
        </div>

        {/* CENTER-LEFT: LUSTPOINTS */}
        <div className="flex-1 min-w-0 text-center" data-testid="stat-lustpoints">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-pink-500" />
            <span className="text-sm font-medium uppercase tracking-wide text-pink-300">LustPoints</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-pink-400">
            {Math.floor(state.lustPoints || state.points || 0).toLocaleString()}
          </div>
        </div>

        {/* CENTER-RIGHT: LP/HR */}
        <div className="flex-1 min-w-0 text-center" data-testid="stat-points-per-hour">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Star className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium uppercase tracking-wide text-purple-300">LP/HR</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-purple-400">
            {(state.passiveIncomeRate || 0).toLocaleString()}
          </div>
          <span className="text-xs text-muted-foreground">
            Passive Income
          </span>
        </div>

        {/* RIGHT: ENERGY */}
        <div className="flex-1 min-w-0" data-testid="stat-energy">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium uppercase tracking-wide text-green-300">Energy</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-green-400">
              {Math.floor(state.energy)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {state.maxEnergy}
            </span>
          </div>
          <Progress value={energyPercent} className="h-2 mt-1" />
          <span className="text-xs text-muted-foreground">
            +{state.energyRegenRate}/s
          </span>
        </div>
      </div>
    </div>
  );
}