import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

interface UpgradesCreateProps {
  onSave: () => void;
  onCancel: () => void;
}

/**
 * UpgradesCreate - Create new upgrade using master-data template
 * Saves to progressive-data for live game use
 */
export default function UpgradesCreate({ onSave, onCancel }: UpgradesCreateProps) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    icon: 'Hand',
    type: 'perTap',
    maxLevel: 30,
    baseCost: 10,
    costMultiplier: 1.15,
    baseValue: 1,
    valueIncrement: 1,
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/admin/upgrades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        alert(`Failed to create upgrade: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create upgrade:', error);
      alert('Failed to create upgrade. Check console for details.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Create New Upgrade</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">ID (unique identifier)</label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="tap-power"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Tap Power"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Icon</label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Hand"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="perTap">Per Tap</option>
              <option value="perHour">Per Hour</option>
              <option value="energyMax">Energy Max</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            placeholder="Increase points earned per tap"
            rows={3}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Max Level</label>
            <input
              type="number"
              value={formData.maxLevel}
              onChange={(e) => setFormData({ ...formData, maxLevel: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Base Cost</label>
            <input
              type="number"
              value={formData.baseCost}
              onChange={(e) => setFormData({ ...formData, baseCost: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Cost Multiplier</label>
            <input
              type="number"
              step="0.01"
              value={formData.costMultiplier}
              onChange={(e) => setFormData({ ...formData, costMultiplier: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              min="1"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Base Value</label>
            <input
              type="number"
              value={formData.baseValue}
              onChange={(e) => setFormData({ ...formData, baseValue: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Value Increment</label>
            <input
              type="number"
              value={formData.valueIncrement}
              onChange={(e) => setFormData({ ...formData, valueIncrement: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              min="0"
              required
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={creating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {creating ? 'Creating...' : 'Create Upgrade'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}