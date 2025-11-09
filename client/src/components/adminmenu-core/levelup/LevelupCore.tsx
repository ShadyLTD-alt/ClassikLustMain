import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Star } from 'lucide-react';
import LevelupEdit from './LevelupEdit';
import LevelupCreate from './LevelupCreate';
import { apiRequest } from '@/lib/queryClient';

interface Level {
  level: number;
  cost: number;
  rewards?: any;
  requirements?: any[];
  unlocks?: string[];
}

export default function LevelupCore() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('GET', '/api/admin/levels');
      const data = await response.json();
      const sortedLevels = (data.levels || []).sort((a: Level, b: Level) => a.level - b.level);
      setLevels(sortedLevels);
    } catch (error) {
      console.error('Failed to load levels:', error);
      alert('Failed to load levels. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (level: number) => {
    if (!confirm(`Delete level ${level}? This cannot be undone.`)) return;
    
    try {
      const response = await apiRequest('DELETE', `/api/admin/levels/${level}`);
      if (response.ok) {
        await loadLevels();
        alert('Level deleted successfully!');
      }
    } catch (error) {
      console.error('Failed to delete level:', error);
      alert('Failed to delete level.');
    }
  };

  if (isCreating) {
    return <LevelupCreate onSave={() => { loadLevels(); setIsCreating(false); }} onCancel={() => setIsCreating(false)} />;
  }

  if (editingLevel) {
    return <LevelupEdit level={editingLevel} onSave={() => { loadLevels(); setEditingLevel(null); }} onCancel={() => setEditingLevel(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Star className="w-5 h-5" />
            Level Management
          </h3>
          <p className="text-sm text-gray-400">Configure level progression and rewards</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Create Level
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-400">Loading levels...</p>
          </div>
        ) : levels.length === 0 ? (
          <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <p className="text-gray-400 mb-2">No levels found.</p>
            <p className="text-sm text-gray-500">Create your first level to get started!</p>
          </div>
        ) : (
          levels.map((level) => (
            <div key={level.level} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between hover:bg-gray-750 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                    <span className="text-xl font-bold text-purple-300">{level.level}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Level {level.level}</h4>
                    <p className="text-sm text-gray-400">Cost: {level.cost?.toLocaleString() || 0} LP</p>
                  </div>
                </div>
                {(level.requirements && level.requirements.length > 0) && (
                  <div className="mt-2 text-xs text-gray-500">
                    <span className="bg-orange-900/30 text-orange-300 px-2 py-0.5 rounded">
                      {level.requirements.length} requirement(s)
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingLevel(level)} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors" title="Edit Level">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(level.level)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors" title="Delete Level">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {!loading && levels.length > 0 && (
        <div className="text-sm text-gray-400 text-center pt-2 border-t border-gray-800">
          Total Levels: {levels.length} • Max Level: {Math.max(...levels.map(l => l.level))}
        </div>
      )}
    </div>
  );
}