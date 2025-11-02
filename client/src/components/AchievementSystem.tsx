import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useGame } from '@/contexts/GameContext';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Star, Zap } from 'lucide-react';

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  category: 'gameplay' | 'collection';
  requirementType: string;
  target: number;
  rewardType: string;
  amount: number;
  enabled: boolean;
  hidden: boolean;
  sortOrder: number;
}

interface AchievementProgress {
  achievementId: string;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

interface AchievementSystemProps {
  // This component will track achievements passively
}

// Static achievement data from your files
const ACHIEVEMENTS: Achievement[] = [
  // Gameplay achievements
  {
    id: "first-steps",
    key: "first-steps",
    name: "First Steps",
    description: "Make your first tap",
    category: "gameplay",
    requirementType: "tapCount",
    target: 1,
    rewardType: "lp",
    amount: 10,
    enabled: true,
    hidden: false,
    sortOrder: 0
  },
  {
    id: "tap-novice",
    key: "tap-novice", 
    name: "Tap Novice",
    description: "Make 100 taps",
    category: "gameplay",
    requirementType: "tapCount",
    target: 100,
    rewardType: "lp",
    amount: 50,
    enabled: true,
    hidden: false,
    sortOrder: 1
  },
  // Collection achievements
  {
    id: "lp-collector",
    key: "lp-collector",
    name: "LP Collector", 
    description: "Collect 10,000 LP",
    category: "collection",
    requirementType: "lpEarned",
    target: 10000,
    rewardType: "lp",
    amount: 500,
    enabled: true,
    hidden: false,
    sortOrder: 0
  }
];

export function AchievementSystem({}: AchievementSystemProps) {
  const { state } = useGame();
  const { toast } = useToast();
  const [tapCount, setTapCount] = useState(0);
  const [totalLPEarned, setTotalLPEarned] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [lastTapTime, setLastTapTime] = useState(0);

  // Track tap count
  useEffect(() => {
    const now = Date.now();
    if (now - lastTapTime > 100) { // Debounce taps
      if (state?.energy < (state?.maxEnergy || 1000)) {
        setTapCount(prev => prev + 1);
        setLastTapTime(now);
      }
    }
  }, [state?.energy, lastTapTime]);

  // Track total LP earned
  useEffect(() => {
    if (state?.points && state.points > totalLPEarned) {
      setTotalLPEarned(state.points);
    }
  }, [state?.points, totalLPEarned]);

  // Check achievements
  useEffect(() => {
    ACHIEVEMENTS.forEach(achievement => {
      if (!achievement.enabled || unlockedAchievements.has(achievement.id)) {
        return; // Skip disabled or already unlocked
      }

      let currentProgress = 0;
      let isUnlocked = false;

      // Check requirement types
      switch (achievement.requirementType) {
        case 'tapCount':
          currentProgress = tapCount;
          isUnlocked = tapCount >= achievement.target;
          break;
        case 'lpEarned':
          currentProgress = totalLPEarned;
          isUnlocked = totalLPEarned >= achievement.target;
          break;
        case 'level':
          currentProgress = state?.level || 1;
          isUnlocked = (state?.level || 1) >= achievement.target;
          break;
        default:
          return;
      }

      // Unlock achievement if criteria met
      if (isUnlocked) {
        setUnlockedAchievements(prev => new Set(prev).add(achievement.id));
        
        // Show achievement toast
        const getAchievementIcon = (category: string) => {
          switch (category) {
            case 'gameplay': return '🎮';
            case 'collection': return '🏆';
            default: return '⭐';
          }
        };

        toast({
          title: `${getAchievementIcon(achievement.category)} Achievement Unlocked!`,
          description: `${achievement.name} - ${achievement.description}`,
          duration: 5000
        });

        // Log achievement unlock (for LunaBug learning)
        if (typeof window !== 'undefined') {
          try {
            const debugHistory = JSON.parse(localStorage.getItem("mistralDebugHistory") || "[]");
            const achievementLog = {
              timestamp: new Date().toISOString(),
              eventType: 'achievement_unlocked',
              achievement: {
                id: achievement.id,
                name: achievement.name,
                category: achievement.category,
                progress: currentProgress,
                target: achievement.target
              },
              gameState: {
                level: state?.level,
                points: state?.points,
                energy: state?.energy,
                tapCount
              }
            };
            localStorage.setItem("mistralDebugHistory", JSON.stringify([...debugHistory.slice(-49), achievementLog]));
          } catch (err) {
            console.warn('Failed to log achievement:', err);
          }
        }
      }
    });
  }, [tapCount, totalLPEarned, state?.level, state?.points, unlockedAchievements, toast]);

  // This component doesn't render anything - it's a passive achievement tracker
  return null;
}

// Achievement badge component for displaying in UI
export function AchievementBadge({ achievementId }: { achievementId: string }) {
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
  
  if (!achievement) return null;

  const getIcon = () => {
    switch (achievement.category) {
      case 'gameplay': return <Zap className="w-4 h-4" />;
      case 'collection': return <Trophy className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  return (
    <Badge 
      variant="secondary" 
      className="bg-yellow-600/20 text-yellow-400 border border-yellow-500/30"
    >
      {getIcon()}
      <span className="ml-1">{achievement.name}</span>
    </Badge>
  );
}

export { ACHIEVEMENTS };