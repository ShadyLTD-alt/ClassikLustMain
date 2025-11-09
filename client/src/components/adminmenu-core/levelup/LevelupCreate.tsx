import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface LevelFormData {
  level: number;
  cost: number;
  rewards: any;
  requirements: any[];
  unlocks: string[];
}

interface LevelupCreateProps {
  onSave: () => void;
  onCancel: () => void;
}

export default function LevelupCreate({ onSave, onCancel }: LevelupCreateProps) {
  const [formData, setFormData] = useState<LevelFormData>({
    level: 1,
    cost: 100,
    rewards: {},
    requirements: [],
    unlocks: []
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await apiRequest('POST', '/api/admin/levels', formData);
      if (response.ok) {
        alert('Level created successfully!');
        onSave();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create level');
      }
    } catch (error: any) {
      console.error('Failed to create level:', error);
      alert(error.message || 'Failed to create level. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Create New Level</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Level Number *</label>
            <input type="number" value={formData.level} onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" min="1" required />
            <p className="text-xs text-gray-500 mt-1">Must be unique</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">LP Cost *</label>
            <input type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" min="0" required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Requirements (JSON Array)</label>
          <textarea value={JSON.stringify(formData.requirements, null, 2)} onChange={(e) => { try { setFormData({ ...formData, requirements: JSON.parse(e.target.value) }); } catch {} }} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" rows={4} placeholder='[{"upgradeId": "tap-power", "minLevel": 5}]' />
          <p className="text-xs text-gray-500 mt-1">Example: [{"upgradeId": "tap-power", "minLevel": 10}]</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Unlocks (JSON Array)</label>
          <textarea value={JSON.stringify(formData.unlocks, null, 2)} onChange={(e) => { try { setFormData({ ...formData, unlocks: JSON.parse(e.target.value) }); } catch {} }} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" rows={3} placeholder='["new-character", "new-upgrade"]' />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Rewards (JSON Object)</label>
          <textarea value={JSON.stringify(formData.rewards, null, 2)} onChange={(e) => { try { setFormData({ ...formData, rewards: JSON.parse(e.target.value) }); } catch {} }} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" rows={3} placeholder='{"lustGems": 100, "bonusMultiplier": 1.1}' />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            {saving ? 'Creating...' : 'Create Level'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}