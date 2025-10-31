import { Home, TrendingUp, UserCircle, ArrowUpCircle } from 'lucide-react';
import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import UpgradePanel from './UpgradePanel';
import CharacterGallery from './CharacterGallery';

export default function BottomNav() {
  const { state, upgrades } = useGame();
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  const totalUpgrades = upgrades.length;
  const completedUpgrades = upgrades.filter(u => (state.upgrades[u.id] || 0) >= u.maxLevel).length;
  const canLevelUp = completedUpgrades >= 3;

  const handleLevelUp = () => {
    if (canLevelUp) {
      console.log('Level up triggered! Completed upgrades:', completedUpgrades);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-40">
        <div className="flex items-center justify-around p-2 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 gap-1"
            onClick={() => setActiveSheet(activeSheet === 'upgrades' ? null : 'upgrades')}
            data-testid="nav-upgrades"
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-xs">Upgrades</span>
            <Badge variant="secondary" className="text-xs px-1 min-w-6">
              {completedUpgrades}/{totalUpgrades}
            </Badge>
          </Button>

          <Button
            variant="ghost"
            className="flex-col h-auto py-2 gap-1"
            onClick={() => setActiveSheet(activeSheet === 'characters' ? null : 'characters')}
            data-testid="nav-characters"
          >
            <UserCircle className="w-6 h-6" />
            <span className="text-xs">Characters</span>
            <Badge variant="secondary" className="text-xs px-1 min-w-6">
              {state.unlockedCharacters.length}
            </Badge>
          </Button>

          <Button
            variant={canLevelUp ? 'default' : 'ghost'}
            className="flex-col h-auto py-2 gap-1"
            onClick={handleLevelUp}
            disabled={!canLevelUp}
            data-testid="nav-levelup"
          >
            <ArrowUpCircle className="w-6 h-6" />
            <span className="text-xs">Level Up</span>
            {canLevelUp && (
              <Badge className="text-xs px-1">Ready!</Badge>
            )}
          </Button>
        </div>
      </div>

      <Sheet open={activeSheet === 'upgrades'} onOpenChange={(open) => setActiveSheet(open ? 'upgrades' : null)}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>Upgrades</SheetTitle>
          </SheetHeader>
          <div className="h-full overflow-hidden mt-4">
            <UpgradePanel />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={activeSheet === 'characters'} onOpenChange={(open) => setActiveSheet(open ? 'characters' : null)}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>Character Collection</SheetTitle>
          </SheetHeader>
          <div className="h-full overflow-auto mt-4 px-4">
            <CharacterGallery inline />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
