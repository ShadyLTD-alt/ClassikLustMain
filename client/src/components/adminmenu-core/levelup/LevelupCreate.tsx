import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

interface LevelupCreateProps {
  onSave: () => void;
  onCancel: () => void;
}

export default function LevelupCreate({ onSave, onCancel }: LevelupCreateProps) {
  const [formData, setFormData] = useState({
    id: 2,
    cost: 500,
    requirements: [],
    unlocks: [],
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/admin/levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        alert(`Failed to create level: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create level:', error);
      alert('Failed to create level. Check console for details.');
    } finally {
      setCreating(false);
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Level ID</label>
            <input type="number" value={formData.id} onChange={(e) => setFormData({ ...formData, id: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" min="1" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Cost (LP)</label>
            <input type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" min="0" required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Requirements (JSON)</label>
          <textarea value={JSON.stringify(formData.requirements, null, 2)} onChange={(e) => { try { setFormData({ ...formData, requirements: JSON.parse(e.target.value) }); } catch {} }} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" rows={5} placeholder='[{"type": "upgrade", "id": "tap-power", "level": 5}]' />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Unlocks (JSON)</label>
          <textarea value={JSON.stringify(formData.unlocks, null, 2)} onChange={(e) => { try { setFormData({ ...formData, unlocks: JSON.parse(e.target.value) }); } catch {} }} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" rows={5} placeholder='[{"type": "character", "id": "frost"}]' />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={creating} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors">
            <Save className="w-4 h-4" />
            {creating ? 'Creating...' : 'Create Level'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}