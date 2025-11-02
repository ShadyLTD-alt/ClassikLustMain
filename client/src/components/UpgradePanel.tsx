import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Hand, Clock, Zap, Sparkles, TrendingUp, Battery, X } from 'lucide-react';
import { calculateUpgradeCost, calculateUpgradeValue } from '@shared/gameConfig';

const iconMap: Record<string, any> = {
  Hand,
  Clock,
  Zap,
  Sparkles,
  TrendingUp,
  Battery
};

interface UpgradePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradePanel({ isOpen, onClose }: UpgradePanelProps) {
  const { state, upgrades, purchaseUpgrade } = useGame();
  const [activeTab, setActiveTab] = useState('all');

  const filteredUpgrades = activeTab === 'all' 
    ? upgrades
    : upgrades.filter(u => u.type === activeTab);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900/95 backdrop-blur-lg text-white border-purple-500/50 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Upgrades
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Player Stats */}
          <div className="flex items-center gap-4 p-3 bg-black/40 rounded-lg border border-gray-700/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{Math.floor(state?.points || 0)}</div>
              <div className="text-xs text-gray-400">Points</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-400">{state?.energy || 0}/{state?.maxEnergy || 1000}</div>
              <div className="text-xs text-gray-400">Energy</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-400">+{Math.floor(state?.passiveIncomeRate || 0)}</div>
              <div className="text-xs text-gray-400">Per Hour</div>
            </div>
          </div>
        </DialogHeader>

        <div className="h-full flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mb-4 grid grid-cols-4 flex-shrink-0 bg-black/60 border border-purple-500/30">
              <TabsTrigger value="all" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">All</TabsTrigger>
              <TabsTrigger value="perTap" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Tap</TabsTrigger>
              <TabsTrigger value="perHour" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Hour</TabsTrigger>
              <TabsTrigger value="energyMax" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Energy</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="flex-1 mt-0 overflow-hidden">
              <div className="max-h-[50vh] overflow-y-auto">
                <div className="space-y-4">
                  {filteredUpgrades.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No upgrades available</p>
                    </div>
                  ) : (
                    filteredUpgrades.map(upgrade => {
                      const currentLevel = state?.upgrades?.[upgrade.id] || 0;
                      const cost = calculateUpgradeCost(upgrade, currentLevel);
                      const currentValue = calculateUpgradeValue(upgrade, currentLevel);
                      const nextValue = calculateUpgradeValue(upgrade, currentLevel + 1);
                      const canAfford = (state?.points || 0) >= cost;
                      const isMaxLevel = currentLevel >= upgrade.maxLevel;
                      const Icon = iconMap[upgrade.icon] || Hand;
                      const progress = (currentLevel / upgrade.maxLevel) * 100;

                      return (
                        <Card key={upgrade.id} className="bg-gray-800/60 border-gray-600 hover:border-purple-400/50 transition-all">
                          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                            <div className="flex items-center gap-2">
                              <Icon className="w-5 h-5 text-purple-400" />
                              <h3 className="font-semibold text-white">{upgrade.name}</h3>
                            </div>
                            <Badge variant="secondary" className="bg-purple-600/20 text-purple-400">
                              {currentLevel}/{upgrade.maxLevel}
                            </Badge>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="text-sm text-gray-400">{upgrade.description}</p>
                            
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Current:</span>
                                <span className="font-semibold text-white">{currentValue}</span>
                              </div>
                              {!isMaxLevel && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">Next:</span>
                                  <span className="font-semibold text-purple-400">
                                    {nextValue} <span className="text-xs">(+{nextValue - currentValue})</span>
                                  </span>
                                </div>
                              )}
                            </div>

                            <Progress value={progress} className="h-2 bg-gray-700" />
                          </CardContent>
                          <CardFooter className="flex justify-between items-center gap-2">
                            <div className="text-sm font-medium tabular-nums text-gray-300">
                              {!isMaxLevel && `${cost.toLocaleString()} points`}
                              {isMaxLevel && <span className="text-purple-400">MAX LEVEL</span>}
                            </div>
                            <Button
                              onClick={() => purchaseUpgrade(upgrade.id)}
                              disabled={!canAfford || isMaxLevel}
                              size="sm"
                              className={`${
                                canAfford && !isMaxLevel 
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {isMaxLevel ? 'Maxed' : canAfford ? 'Upgrade' : 'Can\'t Afford'}
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}