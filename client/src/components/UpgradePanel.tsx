import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Hand, Clock, Zap, Sparkles, TrendingUp, Battery } from 'lucide-react';
import { calculateUpgradeCost, calculateUpgradeValue } from '@shared/gameConfig';

const iconMap: Record<string, any> = { Hand, Clock, Zap, Sparkles, TrendingUp, Battery };

interface UpgradePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradePanel({ isOpen, onClose }: UpgradePanelProps) {
  const { state, upgrades, purchaseUpgrade } = useGame();
  const [activeTab, setActiveTab] = useState('all');

  const filtered = activeTab === 'all' ? upgrades : upgrades.filter(u => u.type === activeTab);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900/95 backdrop-blur-lg text-white border-purple-500/50 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Upgrades
            </DialogTitle>
            <div className="text-xs text-gray-400">Points: <span className="text-purple-300 font-semibold tabular-nums">{Math.floor(state.points).toLocaleString()}</span></div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mb-3 grid grid-cols-4 bg-black/60 border border-purple-500/30">
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">All</TabsTrigger>
            <TabsTrigger value="perTap" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Tap</TabsTrigger>
            <TabsTrigger value="perHour" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Hour</TabsTrigger>
            <TabsTrigger value="energyMax" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Energy</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex-1 mt-0 overflow-hidden">
            <div className="max-h-[60vh] overflow-y-auto px-1 pb-2">
              {!upgrades || upgrades.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No upgrades available yet.</div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(upgrade => {
                    const lvl = state.upgrades[upgrade.id] || 0;
                    const cost = calculateUpgradeCost(upgrade, lvl);
                    const curr = calculateUpgradeValue(upgrade, lvl);
                    const next = calculateUpgradeValue(upgrade, lvl + 1);
                    const canAfford = state.points >= cost;
                    const isMax = lvl >= upgrade.maxLevel;
                    const Icon = iconMap[upgrade.icon] || Hand;
                    const progress = (lvl / upgrade.maxLevel) * 100;

                    return (
                      <Card key={upgrade.id} className="bg-gray-800/60 border-gray-600 hover:border-purple-400/50 transition-all">
                        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-5 h-5 text-purple-400" />
                            <h3 className="font-semibold text-white">{upgrade.name}</h3>
                          </div>
                          <Badge className="bg-purple-600/20 text-purple-400">{lvl}/{upgrade.maxLevel}</Badge>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-sm text-gray-400">{upgrade.description}</p>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Current</span>
                            <span className="font-semibold text-white">{curr}</span>
                          </div>
                          {!isMax && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Next</span>
                              <span className="font-semibold text-purple-300">{next} <span className="text-xs">(+{next - curr})</span></span>
                            </div>
                          )}
                          <Progress value={progress} className="h-2 bg-gray-700" />
                        </CardContent>
                        <CardFooter className="flex justify-between items-center gap-2">
                          <div className="text-sm font-medium tabular-nums text-gray-300">
                            {!isMax ? `${cost.toLocaleString()} pts` : 'MAX LEVEL'}
                          </div>
                          <Button size="sm" disabled={!canAfford || isMax} onClick={() => purchaseUpgrade(upgrade.id)} className={`${canAfford && !isMax ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-600 text-gray-400'}`}>
                            {isMax ? 'Maxed' : 'Upgrade'}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
