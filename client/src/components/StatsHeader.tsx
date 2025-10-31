import { Zap, Star, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useGame } from '@/contexts/GameContext';

export default function StatsHeader() {
  const { state } = useGame();
  
  const energyPercent = (state.energy / state.maxEnergy) * 100;
  const expNeeded = state.level * 100;
  const expPercent = (state.experience / expNeeded) * 100;

  return (
    <div className="sticky top-0 z-50 bg-card border-b border-card-border">
      <div className="flex items-center justify-between gap-4 p-4">
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

        <div className="flex-1 min-w-0" data-testid="stat-level">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium uppercase tracking-wide">Level</span>
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {state.level}
          </div>
          <Progress value={expPercent} className="h-2 mt-1" />
          <span className="text-xs text-muted-foreground">
            {Math.floor(state.experience)}/{expNeeded} XP
          </span>
        </div>
      </div>
    </div>
  );
}
