import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Trophy } from 'lucide-react';
import AchievementsEdit from './AchievementsEdit';
import AchievementsCreate from './AchievementsCreate';
import { apiRequest } from '@/lib/queryClient';

interface Achievement {
  id: string;
  name: string;
  description: string;
  requirementType?: string;
  target?: number;
  rewardType?: string;
  rewardAmount?: number;
  icon?: string;
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
      const response = await apiRequest('GET', '/api/admin/achievements');
      const data = await response.json();
      setAchievements(data.achievements || []);
    } catch (error) {
      console.error('Failed to load achievements:', error);
      alert('Failed to load achievements. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (achievementId: string) => {
    if (!confirm(`Delete achievement "${achievementId}"? This cannot be undone.`)) return;
    
    try {
      const response = await apiRequest('DELETE', `/api/admin/achievements/${achievementId}`);
      if (response.ok) {
        await loadAchievements();
        alert('Achievement deleted successfully!');
      }
    } catch (error) {
      console.error('Failed to delete achievement:', error);
      alert('Failed to delete achievement.');
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
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Achievement Management
          </h3>
          <p className="text-sm text-gray-400">Create milestone achievements for players</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Create Achievement
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-400">Loading achievements...</p>
          </div>
        ) : achievements.length === 0 ? (
          <div className="col-span-2 text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <p className="text-gray-400 mb-2">No achievements found.</p>
            <p className="text-sm text-gray-500">Create your first achievement to get started!</p>
          </div>
        ) : (
          achievements.map((achievement) => (
            <div key={achievement.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl">{achievement.icon || '🏆'}</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white">{achievement.name || 'Unnamed Achievement'}</h4>
                  <p className="text-sm text-gray-400">{achievement.description || 'No description'}</p>
                </div>
              </div>
              <div className="flex gap-2 mb-3 text-xs">
                <span className="bg-gray-700 px-2 py-0.5 rounded">
                  {achievement.requirementType || 'Custom'}: {achievement.target || 0}
                </span>
                <span className="bg-yellow-900/30 text-yellow-300 px-2 py-0.5 rounded">
                  🎯 {achievement.rewardAmount || 0} {(achievement.rewardType?.toUpperCase() || 'LP')}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingAchievement(achievement)} className="flex-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors" title="Edit Achievement">
                  <Edit className="w-4 h-4 mx-auto" />
                </button>
                <button onClick={() => handleDelete(achievement.id)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors" title="Delete Achievement">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {!loading && achievements.length > 0 && (
        <div className="text-sm text-gray-400 text-center pt-2 border-t border-gray-800">
          Total Achievements: {achievements.length}
        </div>
      )}
    </div>
  );
}
