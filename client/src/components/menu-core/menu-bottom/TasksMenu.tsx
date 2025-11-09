import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Clock, Star, Gift, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useGame } from "@/contexts/GameContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}
interface Task {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  target: number;
  progress: number;
  isCompleted: boolean;
  isClaimed: boolean;
  rewardType: string;
  rewardAmount: number;
  timeRemaining?: number;
}
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  rarity: string;
  target: number;
  progress: number;
  isCompleted: boolean;
  isUnlocked: boolean;
  isClaimed: boolean;
  rewardType: string;
  rewardAmount: number;
  isSecret?: boolean;
}

export default function TasksMenu({ isOpen, onClose }: Props) {
  const { refetch: refetchPlayer } = useGame();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("tasks");

  const { data: tasksData, refetch: refetchTasks } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/tasks");
      return await r.json();
    },
    enabled: isOpen,
  });
  const { data: achievementsData, refetch: refetchAchievements } = useQuery({
    queryKey: ["/api/achievements"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/achievements");
      return await r.json();
    },
    enabled: isOpen,
  });
  const claimTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const r = await apiRequest("POST", `/api/tasks/${taskId}/claim`);
      return await r.json();
    },
    onSuccess: () => {
      refetchTasks();
      refetchAchievements();
      refetchPlayer();
      qc.invalidateQueries({ queryKey: ["/api/player/me"] });
    },
  });
  const claimAchievementMutation = useMutation({
    mutationFn: async (achId: string) => {
      const r = await apiRequest("POST", `/api/achievements/${achId}/claim`);
      return await r.json();
    },
    onSuccess: () => {
      refetchTasks();
      refetchAchievements();
      refetchPlayer();
      qc.invalidateQueries({ queryKey: ["/api/player/me"] });
    },
  });

  const tasks: Task[] = tasksData?.tasks || [];
  const achievements: Achievement[] = achievementsData?.achievements || [];
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };
  const getRarityColor = (r: string) =>
    ({
      legendary: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
      epic: "text-purple-400 border-purple-400/30 bg-purple-400/10",
      rare: "text-blue-400 border-blue-400/30 bg-blue-400/10",
    })[r] || "text-gray-400 border-gray-400/30 bg-gray-400/10";
  const unclaimedTasks = tasks.filter(
    (t) => t.isCompleted && !t.isClaimed,
  ).length;
  const unclaimedAchievements = achievements.filter(
    (a) => a.isUnlocked && !a.isClaimed,
  ).length;
  const totalUnclaimed = unclaimedTasks + unclaimedAchievements;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gray-900/95 border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-300">
            <Trophy className="w-5 h-5" />
            Tasks & Achievements
            {totalUnclaimed > 0 && (
              <Badge className="bg-green-600/20 text-green-300 border-green-400/30 ml-2">
                {totalUnclaimed} to claim
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Tasks
              {unclaimedTasks > 0 && (
                <Badge className="bg-green-600/20 text-green-300 border-green-400/30 text-xs">
                  {unclaimedTasks}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="flex items-center gap-2"
            >
              <Star className="w-4 h-4" />
              Achievements
              {unclaimedAchievements > 0 && (
                <Badge className="bg-green-600/20 text-green-300 border-green-400/30 text-xs">
                  {unclaimedAchievements}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tasks" className="space-y-4">
            {tasks.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <div>No tasks available</div>
              </div>
            ) : (
              tasks.map((t) => (
                <div
                  key={t.id}
                  className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{t.icon}</div>
                      <div>
                        <h3 className="font-semibold text-white">{t.name}</h3>
                        <p className="text-gray-400 text-sm">{t.description}</p>
                        {t.timeRemaining && (
                          <div className="text-xs text-orange-400 mt-1">
                            ⏰ {formatTime(t.timeRemaining)} remaining
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm">
                        <div className="text-purple-300 font-medium">
                          {t.rewardType.toUpperCase()} +
                          {t.rewardAmount.toLocaleString()}
                        </div>
                      </div>
                      {t.isClaimed ? (
                        <Badge className="bg-gray-600/20 text-gray-300 border-gray-400/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Claimed
                        </Badge>
                      ) : t.isCompleted ? (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => claimTaskMutation.mutate(t.id)}
                          disabled={claimTaskMutation.isPending}
                        >
                          <Gift className="w-3 h-3 mr-1" />
                          Claim
                        </Button>
                      ) : (
                        <Badge className="bg-gray-600/20 text-gray-300 border-gray-400/30">
                          In Progress
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-white">
                        {Math.round(t.progress)}/{t.target}
                      </span>
                    </div>
                    <Progress
                      value={(t.progress / t.target) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
              ))
            )}
          </TabsContent>
          <TabsContent value="achievements" className="space-y-4">
            {achievements.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <div>No achievements available</div>
              </div>
            ) : (
              achievements.map((a) => (
                <div
                  key={a.id}
                  className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{a.icon}</div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{a.name}</h3>
                          <Badge className={getRarityColor(a.rarity)}>
                            {a.rarity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-sm">{a.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm">
                        <div className="text-purple-300 font-medium">
                          {a.rewardType.toUpperCase()} +
                          {a.rewardAmount.toLocaleString()}
                        </div>
                      </div>
                      {a.isClaimed ? (
                        <Badge className="bg-gray-600/20 text-gray-300 border-gray-400/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Claimed
                        </Badge>
                      ) : a.isUnlocked ? (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => claimAchievementMutation.mutate(a.id)}
                          disabled={claimAchievementMutation.isPending}
                        >
                          <Gift className="w-3 h-3 mr-1" />
                          Claim
                        </Button>
                      ) : (
                        <Badge className="bg-gray-600/20 text-gray-300 border-gray-400/30">
                          Locked
                        </Badge>
                      )}
                    </div>
                  </div>
                  {a.isUnlocked && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-white">
                          {Math.round(a.progress).toLocaleString()}/
                          {a.target.toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={(a.progress / a.target) * 100}
                        className="h-2"
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
