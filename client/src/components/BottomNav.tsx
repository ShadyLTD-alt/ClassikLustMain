import { TrendingUp, UserCircle, ArrowUpCircle, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import UpgradePanel from './UpgradePanel';
import CharacterGallery from './CharacterGallery';
import { useToast } from '@/hooks/use-toast';

export default function BottomNav() {
  const { state, upgrades, levelConfigs, canLevelUp, levelUp } = useGame();
  const { toast } = useToast();
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  const totalUpgrades = upgrades.length;
  const completedUpgrades = upgrades.filter(u => (state.upgrades[u.id] || 0) >= u.maxLevel).length;
  const isLevelUpReady = canLevelUp();
  
  const nextLevel = state.level + 1;
  const nextLevelConfig = levelConfigs.find(lc => lc.level === nextLevel);

  const handleLevelUp = () => {
    if (levelUp()) {
      toast({ 
        title: `Level ${nextLevel} Reached!`, 
        description: `You are now level ${nextLevel}. Keep going!` 
      });
      setActiveSheet(null);
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
            variant={isLevelUpReady ? 'default' : 'ghost'}
            className={`flex-col h-auto py-2 gap-1 ${isLevelUpReady ? 'bg-green-600 hover:bg-green-700' : ''}`}
            onClick={() => setActiveSheet(activeSheet === 'levelup' ? null : 'levelup')}
            data-testid="nav-levelup"
          >
            <ArrowUpCircle className="w-6 h-6" />
            <span className="text-xs">Level Up</span>
            {isLevelUpReady ? (
              <Badge className="text-xs px-1 bg-green-700">Ready!</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs px-1">Lv.{state.level}</Badge>
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

      <Sheet open={activeSheet === 'levelup'} onOpenChange={(open) => setActiveSheet(open ? 'levelup' : null)}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>Level Up - Level {nextLevel}</SheetTitle>
            <SheetDescription>
              Current Level: {state.level} | Experience: {Math.floor(state.experience)}/{nextLevelConfig?.experienceRequired || 0}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-full mt-4 px-4">
            {nextLevelConfig ? (
              <div className="space-y-4 pb-20">
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold">Requirements</h3>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {nextLevelConfig.requirements.map(req => {
                      const upgrade = upgrades.find(u => u.id === req.upgradeId);
                      const currentLevel = state.upgrades[req.upgradeId] || 0;
                      const isMet = currentLevel >= req.minLevel;
                      
                      return (
                        <div key={req.upgradeId} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isMet ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className={isMet ? 'text-green-500' : 'text-muted-foreground'}>
                              {upgrade?.name || req.upgradeId}
                            </span>
                          </div>
                          <Badge variant={isMet ? 'default' : 'secondary'}>
                            {currentLevel}/{req.minLevel}
                          </Badge>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="font-semibold">Unlocks at Level {nextLevel}</h3>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {nextLevelConfig.unlocks.map((unlock, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="w-1.5 h-1.5 rounded-full p-0" />
                          {unlock}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Button 
                  onClick={handleLevelUp}
                  disabled={!isLevelUpReady}
                  className={`w-full ${isLevelUpReady ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  size="lg"
                  data-testid="button-confirm-levelup"
                >
                  {isLevelUpReady ? 'Level Up Now!' : 'Requirements Not Met'}
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>Maximum level reached!</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
