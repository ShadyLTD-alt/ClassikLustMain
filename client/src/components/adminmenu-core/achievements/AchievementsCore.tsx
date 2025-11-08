import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Trophy } from 'lucide-react';
import AchievementsEdit from './AchievementsEdit';
import AchievementsCreate from './AchievementsCreate';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: any;
  reward: any;
}

export default function AchievementsCore() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/achievements');
      const data = await response.json();
      setAchievements(data.achievements || []);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (achievementId: string) => {
    if (!confirm(`Delete achievement "${achievementId}"? This cannot be undone.`)) return;
    
    try {
      const response = await fetch(`/api/admin/achievements/${achievementId}`, { method: 'DELETE' });
      if (response.ok) await loadAchievements();
    } catch (error) {
      console.error('Failed to delete achievement:', error);
    }
  };

  if (isCreating) {
    return <AchievementsCreate onSave={() => { loadAchievements(); setIsCreating(false); }} onCancel={() => setIsCreating(false)} />;
  }

  if (editingAchievement) {
    return <AchievementsEdit achievement={editingAchievement} onSave={() => { loadAchievements(); setEditingAchievement(null); }} onCancel={() => setEditingAchievement(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Achievement Management</h3>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Create Achievement
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <p className="text-gray-400">Loading achievements...</p>
        ) : achievements.length === 0 ? (
          <p className="text-gray-400">No achievements found. Create your first achievement!</p>
        ) : (
          achievements.map((achievement) => (
            <div key={achievement.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <div className="flex-1">
                  <h4 className="font-semibold text-white">{achievement.name}</h4>
                  <p className="text-sm text-gray-400">{achievement.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingAchievement(achievement)} className="flex-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                  <Edit className="w-4 h-4 mx-auto" />
                </button>
                <button onClick={() => handleDelete(achievement.id)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}