import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Clock, Star, Gift } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function TasksMenu({ isOpen, onClose }: Props) {
  const { refreshPlayerData } = useGame();
  const [claiming, setClaiming] = useState<string | null>(null);

  // Fetch tasks
  const { data: tasksData, refetch: refetchTasks } = useQuery({
    queryKey: ['/api/tasks'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/tasks');
      return await response.json();
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 30000 : false
  });

  // Fetch achievements
  const { data: achievementsData, refetch: refetchAchievements } = useQuery({
    queryKey: ['/api/achievements'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/achievements');
      return await response.json();
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 60000 : false
  });

  // Update badge count for bottom menu
  useEffect(() => {
    const tasks = tasksData?.tasks || [];
    const achievements = achievementsData?.achievements || [];
    const claimableTasks = tasks.filter((t: any) => !t.isClaimed && t.isCompleted).length;
    const claimableAchievements = achievements.filter((a: any) => !a.isClaimed && a.isUnlocked).length;
    const totalClaimable = claimableTasks + claimableAchievements;
    
    (window as any).tasksBadgeCount = totalClaimable;
  }, [tasksData, achievementsData]);

  const claimReward = async (id: string, type: 'task' | 'achievement') => {
    setClaiming(id);
    try {
      const endpoint = type === 'task' ? `/api/tasks/${id}/claim` : `/api/achievements/${id}/claim`;
      const response = await apiRequest('POST', endpoint);
      const result = await response.json();
      
      if (result.success) {
        await refreshPlayerData();
        if (type === 'task') {
          await refetchTasks();
        } else {
          await refetchAchievements();
        }
      } else {
        console.error(`Failed to claim ${type}:`, result.error);
      }
    } catch (error) {
      console.error(`Error claiming ${type}:`, error);
    } finally {
      setClaiming(null);
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'legendary': return 'text-yellow-400 border-yellow-400/50';
      case 'epic': return 'text-purple-400 border-purple-400/50';
      case 'rare': return 'text-blue-400 border-blue-400/50';
      default: return 'text-gray-400 border-gray-400/50';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900/95 border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-300">
            <Trophy className="w-5 h-5" />
            Tasks & Achievements
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="tasks" className="h-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
            <TabsTrigger value="tasks" className="data-[state=active]:bg-purple-600/50">
              Daily Tasks
            </TabsTrigger>
            <TabsTrigger value="achievements" className="data-[state=active]:bg-purple-600/50">
              Achievements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-4 h-[400px]">
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {tasksData?.tasks?.map((task: any) => (
                  <div
                    key={task.id}
                    className="border border-gray-700/50 rounded-lg p-4 bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{task.icon}</div>
                        <div>
                          <h3 className="font-semibold text-purple-300">{task.name}</h3>
                          <p className="text-sm text-gray-400">{task.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {task.isClaimed ? (
                          <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                            <Gift className="w-3 h-3 mr-1" />
                            Claimed
                          </Badge>
                        ) : task.isCompleted ? (
                          <Button
                            onClick={() => claimReward(task.id, 'task')}
                            disabled={claiming === task.id}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            {claiming === task.id ? 'Claiming...' : `Claim ${task.rewardAmount} ${task.rewardType.toUpperCase()}`}
                          </Button>
                        ) : (
                          <Badge variant="outline" className="border-gray-600 text-gray-400">
                            {Math.round((task.progress / task.target) * 100)}% Complete
                          </Badge>
                        )}
                        
                        {task.timeRemaining && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            Resets in {formatTimeRemaining(task.timeRemaining)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress: {task.progress} / {task.target}</span>
                        <span>{Math.round((task.progress / task.target) * 100)}%</span>
                      </div>
                      <Progress 
                        value={(task.progress / task.target) * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="achievements" className="mt-4 h-[400px]">
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {achievementsData?.achievements?.map((achievement: any) => (
                  <div
                    key={achievement.id}
                    className={`border rounded-lg p-4 bg-gray-800/30 hover:bg-gray-800/50 transition-colors ${
                      achievement.rarity ? getRarityColor(achievement.rarity) : 'border-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{achievement.icon}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-purple-300">
                              {achievement.isSecret && !achievement.isUnlocked ? '??? Secret ???' : achievement.name}
                            </h3>
                            {achievement.rarity && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getRarityColor(achievement.rarity)}`}
                              >
                                <Star className="w-3 h-3 mr-1" />
                                {achievement.rarity}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            {achievement.isSecret && !achievement.isUnlocked ? '???' : achievement.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {achievement.isClaimed ? (
                          <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                            <Gift className="w-3 h-3 mr-1" />
                            Claimed
                          </Badge>
                        ) : achievement.isUnlocked ? (
                          <Button
                            onClick={() => claimReward(achievement.id, 'achievement')}
                            disabled={claiming === achievement.id}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            {claiming === achievement.id ? 'Claiming...' : `Claim ${achievement.rewardAmount} ${achievement.rewardType.toUpperCase()}`}
                          </Button>
                        ) : (
                          <Badge variant="outline" className="border-gray-600 text-gray-400">
                            {Math.round((achievement.progress / achievement.target) * 100)}% Complete
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {!achievement.isSecret || achievement.isUnlocked ? (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Progress: {achievement.progress} / {achievement.target}</span>
                          <span>{Math.round((achievement.progress / achievement.target) * 100)}%</span>
                        </div>
                        <Progress 
                          value={(achievement.progress / achievement.target) * 100} 
                          className="h-2"
                        />
                      </div>
                    ) : (
                      <div className="mt-3 text-center text-gray-500 text-sm">🔒 Secret Achievement</div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}