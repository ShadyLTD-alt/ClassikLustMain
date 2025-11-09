import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { invalidateTaskAchievementQueries } from '@/utils/queryInvalidation';
import { X, Trophy, Award, Clock, CheckCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface TasksAchievementsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Task {
  id: string;
  name: string;
  description: string;
  category: 'daily' | 'weekly' | 'event';
  requirementType: string;
  target: number;
  progress: number;
  rewardType: 'lp' | 'lg' | 'energy';
  rewardAmount: number;
  icon: string;
  isCompleted: boolean;
  isClaimed: boolean;
  timeRemaining?: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  requirementType: string;
  target: number;
  progress: number;
  rewardType: 'lp' | 'lg' | 'character';
  rewardAmount: number;
  rewardData?: any;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isUnlocked: boolean;
  isClaimed: boolean;
  isSecret: boolean;
  unlockedAt?: string;
}

export default function TasksAchievementsMenuV2({ isOpen, onClose }: TasksAchievementsMenuProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'achievements'>('tasks');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/tasks'],
    queryFn: async () => {
      const response = await apiRequest('/api/tasks', { method: 'GET' });
      const data = await response.json();
      return data;
    },
    enabled: isOpen,
    refetchInterval: 30000, // Refetch every 30 seconds for live progress
  });

  // Fetch achievements
  const { data: achievementsData, isLoading: achievementsLoading } = useQuery({
    queryKey: ['/api/achievements'],
    queryFn: async () => {
      const response = await apiRequest('/api/achievements', { method: 'GET' });
      const data = await response.json();
      return data;
    },
    enabled: isOpen,
    refetchInterval: 60000, // Refetch every minute
  });

  // ✅ FIXED: Claim task reward mutation with proper invalidation
  const claimTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest(`/api/tasks/${taskId}/claim`, { method: 'POST' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim task');
      }
      return await response.json();
    },
    onSuccess: async (data, taskId) => {
      console.log(`✅ [TASK CLAIM] Successfully claimed ${taskId}`);
      
      // ✅ Invalidate all task/player queries for instant sync
      await invalidateTaskAchievementQueries(queryClient);
      
      toast({
        title: "Task Completed!",
        description: "Your reward has been added to your account.",
      });
    },
    onError: (error: any) => {
      console.error('❌ [TASK CLAIM] Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to claim task reward.",
        variant: "destructive",
      });
    }
  });

  // ✅ FIXED: Claim achievement reward mutation with proper invalidation
  const claimAchievementMutation = useMutation({
    mutationFn: async (achievementId: string) => {
      const response = await apiRequest(`/api/achievements/${achievementId}/claim`, { method: 'POST' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim achievement');
      }
      return await response.json();
    },
    onSuccess: async (data, achievementId) => {
      console.log(`✅ [ACHIEVEMENT CLAIM] Successfully claimed ${achievementId}`);
      
      // ✅ Invalidate all achievement/player queries for instant sync
      await invalidateTaskAchievementQueries(queryClient);
      
      toast({
        title: "Achievement Unlocked!",
        description: "Your reward has been added to your account.",
      });
    },
    onError: (error: any) => {
      console.error('❌ [ACHIEVEMENT CLAIM] Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to claim achievement reward.",
        variant: "destructive",
      });
    }
  });

  const formatTimeRemaining = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-500 to-orange-500';
      case 'epic': return 'from-purple-500 to-pink-500';
      case 'rare': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'border-yellow-400/50';
      case 'epic': return 'border-purple-400/50';
      case 'rare': return 'border-blue-400/50';
      default: return 'border-gray-400/30';
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'lp': return '💖';
      case 'lg': return '💎';
      case 'energy': return '⚡';
      case 'character': return '👑';
      default: return '🎁';
    }
  };

  const tasks: Task[] = tasksData?.tasks || [];
  const achievements: Achievement[] = achievementsData?.achievements || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 border-purple-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-400/30">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            Tasks & Achievements
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              variant="ghost" 
              size="icon"
              className="ml-auto hover:bg-red-500/20 hover:text-red-400"
            >
              <X className="w-5 h-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'tasks' | 'achievements')} className="flex-1">
          <TabsList className="grid w-full grid-cols-2 bg-black/40 border border-purple-500/20">
            <TabsTrigger 
              value="tasks" 
              className="data-[state=active]:bg-purple-600/40 data-[state=active]:text-white flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              Daily Tasks ({tasks.filter(t => !t.isClaimed && t.isCompleted).length})
            </TabsTrigger>
            <TabsTrigger 
              value="achievements" 
              className="data-[state=active]:bg-yellow-600/40 data-[state=active]:text-white flex items-center gap-2"
            >
              <Award className="w-4 h-4" />
              Achievements ({achievements.filter(a => !a.isClaimed && a.isUnlocked).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="flex-1 mt-4">
            <ScrollArea className="h-[calc(80vh-12rem)] pr-4">
              {tasksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks available</p>
                  <p className="text-sm mt-2">Check back later for daily challenges!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {tasks.map((task) => {
                    const progressPercentage = Math.min(100, (task.progress / task.target) * 100);
                    
                    return (
                      <div
                        key={task.id}
                        className={`p-4 rounded-xl border transition-all ${
                          task.isClaimed 
                            ? 'bg-green-500/10 border-green-400/30' 
                            : task.isCompleted
                            ? 'bg-yellow-500/20 border-yellow-400/50 shadow-lg shadow-yellow-500/20'
                            : 'bg-black/40 border-purple-500/20 hover:border-purple-400/40'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{task.icon}</div>
                            <div>
                              <h3 className="font-bold text-lg">{task.name}</h3>
                              <p className="text-sm text-gray-300">{task.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                 {(task.category || 'DAILY').toUpperCase()}

                                </Badge>
                                {task.timeRemaining && (
                                  <div className="flex items-center gap-1 text-xs text-orange-300">
                                    <Clock className="w-3 h-3" />
                                    {formatTimeRemaining(task.timeRemaining)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-sm font-medium">
                              {getRewardIcon(task.rewardType)}
                              <span>+{task.rewardAmount}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span>Progress: {task.progress}/{task.target}</span>
                            <span>{Math.round(progressPercentage)}%</span>
                          </div>
                          <Progress 
                            value={progressPercentage} 
                            className="h-2 bg-black/40"
                          />
                        </div>
                        
                        <div className="flex justify-end">
                          {task.isClaimed ? (
                            <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-400/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Claimed
                            </Badge>
                          ) : task.isCompleted ? (
                            <Button
                              onClick={() => claimTaskMutation.mutate(task.id)}
                              disabled={claimTaskMutation.isPending}
                              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold"
                            >
                              {claimTaskMutation.isPending ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                              ) : (
                                <Trophy className="w-4 h-4 mr-2" />
                              )}
                              Claim Reward
                            </Button>
                          ) : (
                            <Badge variant="outline" className="border-gray-600 text-gray-400">
                              In Progress
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="achievements" className="flex-1 mt-4">
            <ScrollArea className="h-[calc(80vh-12rem)] pr-4">
              {achievementsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                </div>
              ) : achievements.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No achievements available</p>
                  <p className="text-sm mt-2">Start playing to unlock achievements!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {achievements
                    .sort((a, b) => {
                      // Sort: claimable first, then unlocked, then by rarity, then by progress
                      if (a.isUnlocked && !a.isClaimed && (!b.isUnlocked || b.isClaimed)) return -1;
                      if (b.isUnlocked && !b.isClaimed && (!a.isUnlocked || a.isClaimed)) return 1;
                      if (a.isUnlocked && !b.isUnlocked) return -1;
                      if (b.isUnlocked && !a.isUnlocked) return 1;
                      
                      const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
                      return rarityOrder[b.rarity] - rarityOrder[a.rarity];
                    })
                    .map((achievement) => {
                    const progressPercentage = Math.min(100, (achievement.progress / achievement.target) * 100);
                    const rarityGradient = getRarityColor(achievement.rarity);
                    const rarityBorder = getRarityBorder(achievement.rarity);
                    
                    return (
                      <div
                        key={achievement.id}
                        className={`p-4 rounded-xl border transition-all ${
                          achievement.isClaimed 
                            ? 'bg-green-500/10 border-green-400/30' 
                            : achievement.isUnlocked
                            ? `bg-gradient-to-br ${rarityGradient}/20 ${rarityBorder} shadow-lg`
                            : achievement.isSecret && !achievement.isUnlocked
                            ? 'bg-black/60 border-gray-700/50'
                            : 'bg-black/40 border-gray-600/30'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{achievement.isSecret && !achievement.isUnlocked ? '❓' : achievement.icon}</div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg">
                                  {achievement.isSecret && !achievement.isUnlocked ? '??? Secret ???' : achievement.name}
                                </h3>
                                <Badge 
                                  className={`text-xs ${getRarityColor(achievement.rarity)} text-white border-0 font-bold`}
                                >
      {(achievement.category || 'GENERAL').toUpperCase()}


                                </Badge>
                                {achievement.isSecret && (
                                  <Star className="w-4 h-4 text-yellow-400" />
                                )}
                              </div>
                              <p className="text-sm text-gray-300">
                                {achievement.isSecret && !achievement.isUnlocked ? 'Hidden until unlocked' : achievement.description}
                              </p>
                              <Badge variant="outline" className="mt-1 text-xs border-gray-600">
         {(achievement.rarity || 'common').toUpperCase()}

                              </Badge>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-sm font-medium">
                              {getRewardIcon(achievement.rewardType)}
                              <span>+{achievement.rewardAmount}</span>
                            </div>
                            {achievement.rewardData?.specialTitle && (
                              <div className="text-xs text-yellow-300 mt-1">
                                Title: {achievement.rewardData.specialTitle}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {!achievement.isSecret || achievement.isUnlocked ? (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span>Progress: {achievement.progress}/{achievement.target}</span>
                              <span>{Math.round(progressPercentage)}%</span>
                            </div>
                            <Progress 
                              value={progressPercentage} 
                              className={`h-2 bg-black/40`}
                            />
                          </div>
                        ) : (
                          <div className="mb-3 py-4 text-center text-gray-500">
                            <div className="text-4xl mb-2">🔒</div>
                            <div className="text-sm">Unlock conditions are secret</div>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <div>
                            {achievement.unlockedAt && (
                              <div className="text-xs text-gray-400">
                                Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            {achievement.isClaimed ? (
                              <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-400/30">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Claimed
                              </Badge>
                            ) : achievement.isUnlocked ? (
                              <Button
                                onClick={() => claimAchievementMutation.mutate(achievement.id)}
                                disabled={claimAchievementMutation.isPending}
                                className={`bg-gradient-to-r ${rarityGradient} hover:opacity-90 text-white font-bold border-0`}
                              >
                                {claimAchievementMutation.isPending ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                ) : (
                                  <Award className="w-4 h-4 mr-2" />
                                )}
                                Claim Reward
                              </Button>
                            ) : (
                              <Badge variant="outline" className="border-gray-600 text-gray-400">
                                {achievement.isSecret ? 'Locked' : `${Math.round(progressPercentage)}% Complete`}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}