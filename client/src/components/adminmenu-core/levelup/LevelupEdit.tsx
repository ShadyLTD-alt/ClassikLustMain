import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Level {
  level: number;
  cost: number;
  rewards?: any;
  requirements?: any[];
  unlocks?: string[];
}

interface LevelupEditProps {
  level: Level;
  onSave: () => void;
  onCancel: () => void;
}

export default function LevelupEdit({ level, onSave, onCancel }: LevelupEditProps) {
  const [formData, setFormData] = useState<Level>(level);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await apiRequest('PUT', `/api/admin/levels/${level.level}`, formData);
      if (response.ok) {
        alert('Level updated successfully!');
        onSave();
      } else {
        throw new Error('Failed to update level');
      }
    } catch (error) {
      console.error('Failed to update level:', error);
      alert('Failed to update level. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Edit Level {level.level}</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Level Number *</label>
            <input type="number" value={formData.level} onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" min="1" required disabled />
            <p className="text-xs text-gray-500 mt-1">Cannot change level number</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">LP Cost *</label>
            <input type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" min="0" required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Requirements (JSON)</label>
          <textarea 
            value={JSON.stringify(formData.requirements || [], null, 2)} 
            onChange={(e) => { try { setFormData({ ...formData, requirements: JSON.parse(e.target.value) }); } catch {} }} 
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" 
            rows={4} 
          />
          <p className="text-xs text-gray-500 mt-1">Array of requirement objects</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Unlocks (JSON)</label>
          <textarea 
            value={JSON.stringify(formData.unlocks || [], null, 2)} 
            onChange={(e) => { try { setFormData({ ...formData, unlocks: JSON.parse(e.target.value) }); } catch {} }} 
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" 
            rows={3} 
          />
          <p className="text-xs text-gray-500 mt-1">Array of unlock IDs</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Rewards (JSON)</label>
          <textarea 
            value={JSON.stringify(formData.rewards || {}, null, 2)} 
            onChange={(e) => { try { setFormData({ ...formData, rewards: JSON.parse(e.target.value) }); } catch {} }} 
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" 
            rows={3} 
          />
          <p className="text-xs text-gray-500 mt-1">Object with reward properties</p>
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