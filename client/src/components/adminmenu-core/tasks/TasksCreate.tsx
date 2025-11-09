import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface TaskFormData {
  id: string;
  name: string;
  description: string;
  requirementType: string;
  target: number;
  rewardType: string;
  rewardAmount: number;
  resetInterval: string;
}

interface TasksCreateProps {
  onSave: () => void;
  onCancel: () => void;
}

export default function TasksCreate({ onSave, onCancel }: TasksCreateProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    id: '',
    name: '',
    description: '',
    requirementType: 'tapCount',
    target: 100,
    rewardType: 'lp',
    rewardAmount: 500,
    resetInterval: 'daily'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await apiRequest('/api/admin/tasks', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        alert('Task created successfully!');
        onSave();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create task');
      }
    } catch (error: any) {
      console.error('Failed to create task:', error);
      alert(error.message || 'Failed to create task. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Create New Task</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Task ID *</label>
            <input type="text" value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value })} placeholder="daily-taps" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" required />
            <p className="text-xs text-gray-500 mt-1">Unique identifier (lowercase, hyphens)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Daily Taps" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Tap 1000 times today" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" rows={2} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Requirement Type *</label>
            <select value={formData.requirementType} onChange={(e) => setFormData({ ...formData, requirementType: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
              <option value="tapCount">Tap Count</option>
              <option value="upgradesPurchased">Upgrades Purchased</option>
              <option value="lpEarned">LP Earned</option>
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

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Reset Interval *</label>
          <select value={formData.resetInterval} onChange={(e) => setFormData({ ...formData, resetInterval: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="never">Never (One-Time)</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            {saving ? 'Creating...' : 'Create Task'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}