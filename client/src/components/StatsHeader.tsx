import { Zap, Star } from 'lucide-react';
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
        <div className="flex flex-col items-center gap-1">
          <Dialog>
            <DialogTrigger asChild>
              <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-primary cursor-pointer hover-elevate">
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
          <div className="text-xs text-muted-foreground" data-testid="stat-level">
            Lv.{state.level}
          </div>
        </div>

        <div className="flex-1 min-w-0" data-testid="stat-points">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium uppercase tracking-wide">Points</span>
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {Math.floor(state.points).toLocaleString()}
          </div>
          {state.passiveIncomeRate > 0 && (
            <span className="text-xs text-muted-foreground">
              +{state.passiveIncomeRate}/hr
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0" data-testid="stat-points-per-hour">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium uppercase tracking-wide">Points/Hr</span>
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {state.passiveIncomeRate.toLocaleString()}
          </div>
          <span className="text-xs text-muted-foreground">
            Passive Income
          </span>
        </div>

        <div className="flex-1 min-w-0" data-testid="stat-energy">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium uppercase tracking-wide">Energy</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">
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