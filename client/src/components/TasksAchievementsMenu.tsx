import React, { useState, useEffect } from 'react';
import { X, Trophy, Target, CheckCircle, Circle, Star, Gift, Clock, Zap } from 'lucide-react';
import { useGameContext } from '../hooks/useGameContext';

interface Task {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  requirementType: string;
  target: number;
  rewardType: string;
  amount: number;
  progress?: number;
  completed?: boolean;
  dynamic?: boolean;
  timeRemaining?: number;
  enabled: boolean;
  hidden: boolean;
  sortOrder: number;
}

interface TasksAchievementsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const TasksAchievementsMenu: React.FC<TasksAchievementsMenuProps> = ({ isOpen, onClose }) => {
  const { gameData, updateGameData } = useGameContext();
  const [activeTab, setActiveTab] = useState<'tasks' | 'achievements'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [achievements, setAchievements] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchTasksAndAchievements();
    }
  }, [isOpen, gameData]);

  const fetchTasksAndAchievements = async () => {
    setLoading(true);
    try {
      // Simulate API calls or use your actual data source
      const mockTasks: Task[] = [
        {
          id: 'daily-taps',
          key: 'daily-taps',
          name: 'Daily Tapper',
          description: 'Complete 500 taps today',
          category: 'daily',
          requirementType: 'tapCount',
          target: 500,
          rewardType: 'lp',
          amount: 100,
          progress: gameData?.tapCount || 0,
          completed: (gameData?.tapCount || 0) >= 500,
          dynamic: true,
          timeRemaining: 86400, // 24 hours in seconds
          enabled: true,
          hidden: false,
          sortOrder: 0
        },
        {
          id: 'energy-efficiency',
          key: 'energy-efficiency', 
          name: 'Energy Efficient',
          description: 'Use less than 50% of max energy',
          category: 'gameplay',
          requirementType: 'energyEfficiency',
          target: 50,
          rewardType: 'lp',
          amount: 75,
          progress: Math.round(((gameData?.maxEnergy || 1024) - (gameData?.energy || 1024)) / (gameData?.maxEnergy || 1024) * 100),
          completed: false,
          dynamic: true,
          enabled: true,
          hidden: false,
          sortOrder: 1
        },
        {
          id: 'level-up-fast',
          key: 'level-up-fast',
          name: 'Quick Progression',
          description: 'Reach level 5 within the hour',
          category: 'progression',
          requirementType: 'levelReached',
          target: 5,
          rewardType: 'lp',
          amount: 200,
          progress: gameData?.level || 2,
          completed: (gameData?.level || 2) >= 5,
          dynamic: true,
          timeRemaining: 3600, // 1 hour
          enabled: true,
          hidden: false,
          sortOrder: 2
        }
      ];

      const mockAchievements: Task[] = [
        {
          id: 'first-steps',
          key: 'first-steps',
          name: 'First Steps',
          description: 'Make your first tap',
          category: 'gameplay',
          requirementType: 'tapCount',
          target: 1,
          rewardType: 'lp',
          amount: 10,
          progress: gameData?.tapCount || 0,
          completed: (gameData?.tapCount || 0) >= 1,
          dynamic: false,
          enabled: true,
          hidden: false,
          sortOrder: 0
        },
        {
          id: 'tap-novice',
          key: 'tap-novice',
          name: 'Tap Novice',
          description: 'Make 100 taps',
          category: 'gameplay',
          requirementType: 'tapCount',
          target: 100,
          rewardType: 'lp',
          amount: 50,
          progress: gameData?.tapCount || 0,
          completed: (gameData?.tapCount || 0) >= 100,
          dynamic: false,
          enabled: true,
          hidden: false,
          sortOrder: 1
        },
        {
          id: 'lp-collector',
          key: 'lp-collector',
          name: 'LP Collector',
          description: 'Collect 10,000 LP',
          category: 'collection',
          requirementType: 'lpEarned',
          target: 10000,
          rewardType: 'lp',
          amount: 500,
          progress: gameData?.lustPoints || 5363,
          completed: (gameData?.lustPoints || 5363) >= 10000,
          dynamic: false,
          enabled: true,
          hidden: false,
          sortOrder: 2
        },
        {
          id: 'character-collector',
          key: 'character-collector',
          name: 'Character Collector',
          description: 'Unlock 5 different characters',
          category: 'collection',
          requirementType: 'charactersUnlocked',
          target: 5,
          rewardType: 'lp',
          amount: 1000,
          progress: 2, // Based on Shadow and Frost being unlocked
          completed: false,
          dynamic: false,
          enabled: true,
          hidden: false,
          sortOrder: 3
        }
      ];

      setTasks(mockTasks);
      setAchievements(mockAchievements);
    } catch (error) {
      console.error('Failed to load tasks and achievements:', error);
    } finally {
      setLoading(false);
    }
  };

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
      case 'gameplay': return <Target className="w-4 h-4" />;
      case 'progression': return <Zap className="w-4 h-4" />;
      case 'collection': return <Star className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'daily': return 'text-yellow-400 bg-yellow-900/20';
      case 'gameplay': return 'text-green-400 bg-green-900/20';
      case 'progression': return 'text-purple-400 bg-purple-900/20';
      case 'collection': return 'text-blue-400 bg-blue-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const claimReward = async (task: Task) => {
    if (!task.completed) return;
    
    // Update game data with reward
    if (task.rewardType === 'lp') {
      const newLP = (gameData?.lustPoints || 0) + task.amount;
      updateGameData({ lustPoints: newLP });
    }
    
    // Mark as claimed (you'd update this in your backend)
    console.log(`Claimed reward for ${task.name}: ${task.amount} ${task.rewardType}`);
  };

  const renderTaskCard = (task: Task) => {
    const progressPercentage = getProgressPercentage(task.progress || 0, task.target);
    const isCompleted = task.completed;
    
    return (
      <div 
        key={task.id} 
        className={`bg-gray-800/50 border border-gray-700 rounded-lg p-4 transition-all hover:bg-gray-800/70 ${
          isCompleted ? 'ring-2 ring-green-500/50' : ''
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getCategoryColor(task.category)}`}>
              {getCategoryIcon(task.category)}
            </div>
            <div>
              <h3 className="text-white font-semibold">{task.name}</h3>
              <p className="text-gray-400 text-sm">{task.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {task.dynamic && task.timeRemaining && (
              <div className="bg-orange-900/20 text-orange-400 px-2 py-1 rounded text-xs font-mono">
                {formatTime(task.timeRemaining)}
              </div>
            )}
            {isCompleted ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <Circle className="w-6 h-6 text-gray-500" />
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">
              {task.progress || 0} / {task.target}
            </span>
            <span className="text-gray-400">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isCompleted ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        {/* Reward */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Gift className="w-4 h-4 text-purple-400" />
            <span className="text-purple-400 font-semibold">
              {task.amount} {task.rewardType.toUpperCase()}
            </span>
          </div>
          
          {isCompleted && (
            <button
              onClick={() => claimReward(task)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-semibold transition-colors"
            >
              Claim
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">Tasks & Achievements</h2>
            </div>
            
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  activeTab === 'tasks'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Target className="w-4 h-4 mr-2 inline" />
                Tasks ({tasks.filter(t => !t.completed).length})
              </button>
              <button
                onClick={() => setActiveTab('achievements')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  activeTab === 'achievements'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Trophy className="w-4 h-4 mr-2 inline" />
                Achievements ({achievements.filter(a => a.completed).length}/{achievements.length})
              </button>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading {activeTab}...</p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(activeTab === 'tasks' ? tasks : achievements)
                  .filter(item => !item.hidden)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(renderTaskCard)
                }
              </div>
              
              {((activeTab === 'tasks' ? tasks : achievements).length === 0) && (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    No {activeTab} available
                  </h3>
                  <p className="text-gray-500">
                    {activeTab === 'tasks' 
                      ? 'New tasks will appear as you progress!' 
                      : 'Keep playing to unlock achievements!'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksAchievementsMenu;