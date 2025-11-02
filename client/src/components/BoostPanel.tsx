import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket, Gem, Zap, Heart, Clock, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { safeStringify, debugJSON } from '@/utils/safeJson';

export default function BoostPanel() {
  const { state } = useGame();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const boostOptions = [
    { 
      id: 'energy_2x', 
      name: '2x Energy Refill', 
      cost: 10, 
      duration: 60, // minutes
      effect: 'double_energy_regen',
      description: 'Double energy regeneration for 1 hour',
      icon: '⚡'
    },
    { 
      id: 'points_3x', 
      name: '3x Points Boost', 
      cost: 25, 
      duration: 30,
      effect: 'triple_points',
      description: '3x points from tapping for 30 minutes',
      icon: '💖'
    },
    { 
      id: 'energy_instant', 
      name: 'Instant Energy Refill', 
      cost: 50, 
      duration: 0, // instant
      effect: 'instant_energy_refill',
      description: 'Instantly restore all energy',
      icon: '⚡'
    },
    { 
      id: 'mega_boost', 
      name: '5x Mega Boost', 
      cost: 100, 
      duration: 15,
      effect: 'mega_boost',
      description: '5x points and energy for 15 minutes',
      icon: '🚀'
    }
  ];

  const purchaseBoost = async (boost: typeof boostOptions[0]) => {
    if ((state.lustGems || 0) < boost.cost) {
      toast({
        title: 'Not enough LustGems!',
        description: `You need ${boost.cost} LustGems but only have ${state.lustGems || 0}.`,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        boostId: boost.id,
        cost: boost.cost,
        effect: boost.effect,
        duration: boost.duration,
        multiplier: boost.id === 'points_3x' ? 3 : boost.id === 'mega_boost' ? 5 : 2
      };
      
      debugJSON(requestData, 'BOOST PURCHASE REQUEST');
      
      const response = await fetch('/api/admin/boost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        },
        body: safeStringify({ action: 'enable', ...requestData })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to purchase boost: ${errorText}`);
      }

      const result = await response.json();
      debugJSON(result, 'BOOST PURCHASE RESPONSE');
      
      toast({
        title: '🚀 Boost Activated!',
        description: `${boost.name} is now active${boost.duration > 0 ? ` for ${boost.duration} minutes` : ''}.`,
      });
      
      // Refresh the page to update state
      window.location.reload();
    } catch (error) {
      console.error('🔥 Boost purchase error:', error);
      toast({
        title: 'Boost Purchase Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold shadow-lg transition-all transform hover:scale-105"
          size="sm"
        >
          <Rocket className="w-4 h-4 mr-1" />
          BOOST
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-orange-400 flex items-center gap-2">
            🚀 Boost Shop
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-blue-300">
            <Gem className="w-4 h-4" />
            <span>Your LustGems: <strong>{(state.lustGems || 0).toLocaleString()}</strong></span>
          </div>
        </DialogHeader>
        
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {boostOptions.map((boost) => {
            const canAfford = (state.lustGems || 0) >= boost.cost;
            
            return (
              <Card key={boost.id} className={`${canAfford ? 'border-orange-500/50' : 'border-gray-600 opacity-60'}`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{boost.icon}</span>
                      <div>
                        <CardTitle className="text-lg text-white">{boost.name}</CardTitle>
                        <p className="text-sm text-gray-400 mt-1">{boost.description}</p>
                        <div className="flex gap-2 mt-2">
                          {boost.duration > 0 && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {boost.duration}min
                            </Badge>
                          )}
                          {boost.effect === 'triple_points' && (
                            <Badge className="text-xs bg-pink-600">3x Points</Badge>
                          )}
                          {boost.effect === 'double_energy_regen' && (
                            <Badge className="text-xs bg-green-600">2x Energy</Badge>
                          )}
                          {boost.effect === 'mega_boost' && (
                            <Badge className="text-xs bg-purple-600">5x Everything</Badge>
                          )}
                          {boost.effect === 'instant_energy_refill' && (
                            <Badge className="text-xs bg-cyan-600">Instant</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Button
                        onClick={() => purchaseBoost(boost)}
                        disabled={!canAfford || loading}
                        className={`${
                          canAfford 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                        size="sm"
                      >
                        <Gem className="w-4 h-4 mr-1" />
                        {boost.cost}
                      </Button>
                      
                      {!canAfford && (
                        <div className="text-xs text-red-400 mt-1">
                          Need {boost.cost - (state.lustGems || 0)} more
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
        
        <div className="border-t border-gray-700 pt-4 mt-4 text-center">
          <div className="text-sm text-gray-400">
            💰 Earn LustGems through achievements, daily bonuses, and special events!
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Boosts stack with existing upgrades for maximum effectiveness
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}