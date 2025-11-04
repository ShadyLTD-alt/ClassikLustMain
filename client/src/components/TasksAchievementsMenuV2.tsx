import React, { useState, useEffect } from 'react';
import { X, Trophy, Target, CheckCircle, Circle, Star, Gift, Clock, Zap, Crown, Heart, Gem } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Task {
  id: string;
  name: string;
  description: string;
  category: string;
  requirementType: string;
  target: number;
  rewardType: string;
  rewardAmount: number;
  icon?: string;
  resetType: string;
  progress?: number;
  isCompleted?: boolean;
  isClaimed?: boolean;
  timeRemaining?: number;
  sortOrder: number;
  isActive: boolean;
  isHidden: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  requirementType: string;
  target: number;
  rewardType: string;
  rewardAmount: number;
  rewardData?: Record<string, any>;
  icon?: string;
  rarity: string;
  progress?: number;
  isUnlocked?: boolean;
  isClaimed?: boolean;
  unlockedAt?: string;
  sortOrder: number;
  isSecret: boolean;
  isActive: boolean;
}

interface TasksAchievementsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const TasksAchievementsMenuV2: React.FC<TasksAchievementsMenuProps> = ({ isOpen, onClose }) => {
  const { state } = useGame();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'tasks' | 'achievements'>('tasks');

  // Fetch tasks with progress
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/tasks'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/tasks');
      return await response.json();
    },
    enabled: isOpen
  });

  // Fetch achievements with progress
  const { data: achievementsData, isLoading: achievementsLoading } = useQuery({
    queryKey: ['/api/achievements'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/achievements');
      return await response.json();
    },
    enabled: isOpen
  });

  // Claim reward mutation
  const claimRewardMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'task' | 'achievement', id: string }) => {
      const endpoint = type === 'task' ? `/api/tasks/${id}/claim` : `/api/achievements/${id}/claim`;
      const response = await apiRequest('POST', endpoint);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/achievements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/player/me'] });
      
      toast({
        title: "Reward Claimed!",
        description: `You received ${data.reward?.amount || 0} ${(data.reward?.type || '').toUpperCase()}!`,
        duration: 4000
      });
    },
    onError: (error) => {
      toast({
        title: "Claim Failed",
        description: error instanceof Error ? error.message : "Failed to claim reward",
        variant: "destructive"
      });
    }
  });

  const formatTime = (seconds: number) => {
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

  const getProgressPercentage = (progress: number, target: number) => {
    return Math.min((progress / target) * 100, 100);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'daily': return <Clock className="w-4 h-4" />;
      case 'weekly': return <Target className="w-4 h-4" />;
      case 'gameplay': return <Zap className="w-4 h-4" />;
      case 'progression': return <TrendingUp className="w-4 h-4" />;
      case 'collection': return <Star className="w-4 h-4" />;
      case 'special': return <Crown className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'daily': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'weekly': return 'text-orange-400 bg-orange-900/20 border-orange-500/30';
      case 'gameplay': return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'progression': return 'text-purple-400 bg-purple-900/20 border-purple-500/30';
      case 'collection': return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
      case 'special': return 'text-pink-400 bg-pink-900/20 border-pink-500/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-yellow-300 border-yellow-400/50 bg-yellow-500/10';
      case 'epic': return 'text-purple-300 border-purple-400/50 bg-purple-500/10';
      case 'rare': return 'text-blue-300 border-blue-400/50 bg-blue-500/10';
      default: return 'text-gray-300 border-gray-400/50 bg-gray-500/10';
    }
  };

  const getRewardIcon = (rewardType: string) => {
    switch (rewardType) {
      case 'lp': return <Heart className="w-4 h-4 text-pink-400" />;
      case 'lg': return <Gem className="w-4 h-4 text-cyan-400" />;
      case 'energy': return <Zap className="w-4 h-4 text-yellow-400" />;
      default: return <Gift className="w-4 h-4 text-purple-400" />;
    }
  };

  const renderTaskCard = (task: Task) => {
    const progressPercentage = getProgressPercentage(task.progress || 0, task.target);
    const isCompleted = task.isCompleted;
    const canClaim = isCompleted && !task.isClaimed;
    
    return (
      <Card key={task.id} className={`bg-gray-800/30 border transition-all hover:bg-gray-800/50 ${
        isCompleted ? 'border-green-500/50 shadow-lg shadow-green-500/10' : 'border-gray-700'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg border ${getCategoryColor(task.category)}`}>
                {task.icon ? (
                  <span className="text-lg">{task.icon}</span>
                ) : (
                  getCategoryIcon(task.category)
                )}
              </div>
              <div>
                <CardTitle className="text-white text-base">{task.name}</CardTitle>
                <p className="text-gray-400 text-sm">{task.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {task.resetType === 'daily' && task.timeRemaining && (
                <Badge variant="outline" className="text-xs font-mono bg-orange-900/20 text-orange-400 border-orange-500/30">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(task.timeRemaining)}
                </Badge>
              )}
              {isCompleted ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <Circle className="w-6 h-6 text-gray-500" />
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">
                {(task.progress || 0).toLocaleString()} / {task.target.toLocaleString()}
              </span>
              <span className="text-gray-400">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          
          {/* Reward */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getRewardIcon(task.rewardType)}
              <span className={`font-semibold ${
                task.rewardType === 'lp' ? 'text-pink-400' :
                task.rewardType === 'lg' ? 'text-cyan-400' :
                'text-purple-400'
              }`}>
                {task.rewardAmount.toLocaleString()} {task.rewardType.toUpperCase()}
              </span>
            </div>
            
            {canClaim && (
              <Button
                onClick={() => claimRewardMutation.mutate({ type: 'task', id: task.id })}
                disabled={claimRewardMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-semibold"
              >
                {claimRewardMutation.isPending ? 'Claiming...' : 'Claim'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAchievementCard = (achievement: Achievement) => {
    const progressPercentage = getProgressPercentage(achievement.progress || 0, achievement.target);
    const isUnlocked = achievement.isUnlocked;
    const canClaim = isUnlocked && !achievement.isClaimed;
    const isSecret = achievement.isSecret && !isUnlocked;
    
    return (
      <Card key={achievement.id} className={`bg-gray-800/30 border transition-all hover:bg-gray-800/50 ${
        isUnlocked ? `border-green-500/50 shadow-lg shadow-green-500/10` : 'border-gray-700'
      } ${isSecret ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg border ${getCategoryColor(achievement.category)}`}>
                {achievement.icon && !isSecret ? (
                  <span className="text-lg">{achievement.icon}</span>
                ) : isSecret ? (
                  <span className="text-lg">❓</span>
                ) : (
                  getCategoryIcon(achievement.category)
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-white text-base">
                    {isSecret ? '??? Secret ???' : achievement.name}
                  </CardTitle>
                  <Badge className={`text-xs ${getRarityColor(achievement.rarity)}`}>
                    {achievement.rarity}
                  </Badge>
                </div>
                <p className="text-gray-400 text-sm">
                  {isSecret ? 'Complete hidden requirements to unlock' : achievement.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isUnlocked ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <Circle className="w-6 h-6 text-gray-500" />
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Progress Bar - only show if not secret or already unlocked */}
          {(!isSecret || isUnlocked) && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">
                  {(achievement.progress || 0).toLocaleString()} / {achievement.target.toLocaleString()}
                </span>
                <span className="text-gray-400">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    isUnlocked ? 'bg-green-500' : `bg-gradient-to-r ${
                      achievement.rarity === 'legendary' ? 'from-yellow-500 to-orange-500' :
                      achievement.rarity === 'epic' ? 'from-purple-500 to-pink-500' :
                      achievement.rarity === 'rare' ? 'from-blue-500 to-cyan-500' :
                      'from-gray-500 to-gray-600'
                    }`
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Reward */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getRewardIcon(achievement.rewardType)}
              <span className={`font-semibold ${
                achievement.rewardType === 'lp' ? 'text-pink-400' :
                achievement.rewardType === 'lg' ? 'text-cyan-400' :
                'text-purple-400'
              }`}>
                {isSecret && !isUnlocked ? '???' : `${achievement.rewardAmount.toLocaleString()} ${achievement.rewardType.toUpperCase()}`}
              </span>
              {achievement.rewardData?.specialTitle && isUnlocked && (
                <Badge className="text-xs bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
                  Title: {achievement.rewardData.specialTitle}
                </Badge>
              )}
            </div>
            
            {canClaim && (
              <Button
                onClick={() => claimRewardMutation.mutate({ type: 'achievement', id: achievement.id })}
                disabled={claimRewardMutation.isPending}
                className={`px-4 py-2 text-sm font-semibold ${
                  achievement.rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700' :
                  achievement.rarity === 'epic' ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' :
                  achievement.rarity === 'rare' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700' :
                  'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {claimRewardMutation.isPending ? 'Claiming...' : 'Claim'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!isOpen) return null;

  const tasks = tasksData?.tasks || [];
  const achievements = achievementsData?.achievements || [];
  const completedTasks = tasks.filter((t: Task) => t.isCompleted).length;
  const completedAchievements = achievements.filter((a: Achievement) => a.isUnlocked).length;
  const claimableTasks = tasks.filter((t: Task) => t.isCompleted && !t.isClaimed).length;
  const claimableAchievements = achievements.filter((a: Achievement) => a.isUnlocked && !a.isClaimed).length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] bg-gray-900/95 border-purple-500/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-7 h-7 text-yellow-400" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Tasks & Achievements</h2>
                  <p className="text-sm text-gray-400">Complete objectives to earn rewards</p>
                </div>
              </div>
              
              {(claimableTasks > 0 || claimableAchievements > 0) && (
                <Badge className="bg-green-600/20 text-green-400 border-green-500/30 animate-pulse">
                  {claimableTasks + claimableAchievements} rewards ready!
                </Badge>
              )}
            </div>
            
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'tasks' | 'achievements')} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Tasks ({completedTasks}/{tasks.length})
                {claimableTasks > 0 && (
                  <Badge className="ml-2 bg-green-600/20 text-green-400 border-green-500/30 text-xs px-1.5 py-0.5">
                    {claimableTasks}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="achievements" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Achievements ({completedAchievements}/{achievements.filter((a: Achievement) => !a.isSecret || a.isUnlocked).length})
                {claimableAchievements > 0 && (
                  <Badge className="ml-2 bg-green-600/20 text-green-400 border-green-500/30 text-xs px-1.5 py-0.5">
                    {claimableAchievements}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="tasks" className="h-full m-0">
                {tasksLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                      <p className="text-gray-400">Loading tasks...</p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pr-4">
                      {tasks
                        .filter((task: Task) => !task.isHidden && task.isActive)
                        .sort((a: Task, b: Task) => a.sortOrder - b.sortOrder)
                        .map(renderTaskCard)
                      }
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
              
              <TabsContent value="achievements" className="h-full m-0">
                {achievementsLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                      <p className="text-gray-400">Loading achievements...</p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pr-4">
                      {achievements
                        .filter((achievement: Achievement) => achievement.isActive && (!achievement.isSecret || achievement.isUnlocked))
                        .sort((a: Achievement, b: Achievement) => {
                          // Sort by: unlocked first, then by rarity, then by sort order
                          if (a.isUnlocked !== b.isUnlocked) {
                            return b.isUnlocked ? 1 : -1;
                          }
                          return a.sortOrder - b.sortOrder;
                        })
                        .map(renderAchievementCard)
                      }
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default TasksAchievementsMenuV2;