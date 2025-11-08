import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import LevelupEdit from './LevelupEdit';
import LevelupCreate from './LevelupCreate';

interface Level {
  id: number;
  cost: number;
  requirements: any[];
  unlocks: any[];
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
      const response = await fetch('/api/admin/levels');
      const data = await response.json();
      setLevels(data.levels || []);
    } catch (error) {
      console.error('Failed to load levels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (levelId: number) => {
    if (!confirm(`Delete level ${levelId}? This cannot be undone.`)) return;
    
    try {
      const response = await fetch(`/api/admin/levels/${levelId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadLevels();
      }
    } catch (error) {
      console.error('Failed to delete level:', error);
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
        <h3 className="text-lg font-semibold text-white">Level Management</h3>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Create Level
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-gray-400">Loading levels...</p>
        ) : levels.length === 0 ? (
          <p className="text-gray-400">No levels found. Create your first level!</p>
        ) : (
          levels.map((level) => (
            <div key={level.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-white">Level {level.id}</h4>
                <p className="text-sm text-gray-400">Cost: {level.cost} LP</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>{level.requirements?.length || 0} requirements</span>
                  <span>{level.unlocks?.length || 0} unlocks</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingLevel(level)} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(level.id)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors">
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