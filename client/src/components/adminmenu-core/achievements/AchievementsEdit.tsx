import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Achievement {
  id: string;
  name: string;
  description: string;
  requirementType: string;
  target: number;
  rewardType: string;
  rewardAmount: number;
  icon?: string;
}

interface AchievementsEditProps {
  achievement: Achievement;
  onSave: () => void;
  onCancel: () => void;
}

export default function AchievementsEdit({ achievement, onSave, onCancel }: AchievementsEditProps) {
  const [formData, setFormData] = useState<Achievement>(achievement);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await apiRequest(`/api/admin/achievements/${achievement.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        alert('Achievement updated successfully!');
        onSave();
      } else {
        throw new Error('Failed to update achievement');
      }
    } catch (error) {
      console.error('Failed to update achievement:', error);
      alert('Failed to update achievement. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Edit Achievement: {achievement.name}</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Icon</label>
            <input type="text" value={formData.icon || ''} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="🏆" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" rows={2} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Requirement Type *</label>
            <select value={formData.requirementType} onChange={(e) => setFormData({ ...formData, requirementType: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
              <option value="lpTotal">LP Total</option>
              <option value="upgradeCount">Upgrade Count</option>
              <option value="characterUnlocked">Characters Unlocked</option>
              <option value="level">Player Level</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Target *</label>
            <input type="number" value={formData.target} onChange={(e) => setFormData({ ...formData, target: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" min="1" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Reward Type *</label>
            <select value={formData.rewardType} onChange={(e) => setFormData({ ...formData, rewardType: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
              <option value="lp">Lust Points (LP)</option>
              <option value="lg">Lust Gems (LG)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Reward Amount *</label>
            <input type="number" value={formData.rewardAmount} onChange={(e) => setFormData({ ...formData, rewardAmount: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" min="0" required />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}