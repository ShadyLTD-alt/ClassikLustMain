import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Hand, Clock, Zap, Sparkles, TrendingUp, Battery } from 'lucide-react';
import { calculateUpgradeCost, calculateUpgradeValue } from '@shared/gameConfig';

const iconMap: Record<string, any> = {
  Hand,
  Clock,
  Zap,
  Sparkles,
  TrendingUp,
  Battery
};

export default function UpgradePanel() {
  const { state, upgrades, purchaseUpgrade } = useGame();
  const [activeTab, setActiveTab] = useState('all');

  const filteredUpgrades = activeTab === 'all' 
    ? upgrades
    : upgrades.filter(u => u.type === activeTab);

  return (
    <div className="h-full flex flex-col bg-card border-l border-card-border">
      <div className="p-4 border-b border-card-border">
        <h2 className="text-xl font-bold">Upgrades</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 grid grid-cols-4">
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="perTap" data-testid="tab-pertap">Tap</TabsTrigger>
          <TabsTrigger value="perHour" data-testid="tab-perhour">Hour</TabsTrigger>
          <TabsTrigger value="energyMax" data-testid="tab-energy">Energy</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
          {filteredUpgrades.map(upgrade => {
            const currentLevel = state.upgrades[upgrade.id] || 0;
            const cost = calculateUpgradeCost(upgrade, currentLevel);
            const currentValue = calculateUpgradeValue(upgrade, currentLevel);
            const nextValue = calculateUpgradeValue(upgrade, currentLevel + 1);
            const canAfford = state.points >= cost;
            const isMaxLevel = currentLevel >= upgrade.maxLevel;
            const Icon = iconMap[upgrade.icon] || Hand;
            const progress = (currentLevel / upgrade.maxLevel) * 100;

            return (
              <Card key={upgrade.id} data-testid={`upgrade-card-${upgrade.id}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">{upgrade.name}</h3>
                  </div>
                  <Badge variant="secondary">
                    {currentLevel}/{upgrade.maxLevel}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{upgrade.description}</p>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current:</span>
                      <span className="font-semibold">{currentValue}</span>
                    </div>
                    {!isMaxLevel && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Next:</span>
                        <span className="font-semibold text-primary">
                          {nextValue} <span className="text-xs">(+{nextValue - currentValue})</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <Progress value={progress} className="h-2" />
                </CardContent>
                <CardFooter className="flex justify-between items-center gap-2">
                  <div className="text-sm font-medium tabular-nums">
                    {!isMaxLevel && `${cost.toLocaleString()} points`}
                    {isMaxLevel && <span className="text-primary">MAX</span>}
                  </div>
                  <Button
                    onClick={() => purchaseUpgrade(upgrade.id)}
                    disabled={!canAfford || isMaxLevel}
                    size="sm"
                    data-testid={`button-upgrade-${upgrade.id}`}
                  >
                    {isMaxLevel ? 'Maxed' : 'Upgrade'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
