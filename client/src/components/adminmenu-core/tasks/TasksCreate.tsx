import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

interface TasksCreateProps {
  onSave: () => void;
  onCancel: () => void;
}

export default function TasksCreate({ onSave, onCancel }: TasksCreateProps) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    requirement: { type: 'taps', value: 100 },
    reward: { type: 'lustpoints', value: 50 },
    repeatable: false,
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        alert(`Failed to create task: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Check console for details.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Create New Task</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">ID (unique identifier)</label>
          <input type="text" value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" placeholder="daily-taps-100" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
          <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" placeholder="Tap 100 Times" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" placeholder="Complete 100 taps" rows={2} required />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <input type="checkbox" checked={formData.repeatable} onChange={(e) => setFormData({ ...formData, repeatable: e.target.checked })} className="rounded" />
            Repeatable Task (can be completed multiple times)
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Requirement (JSON)</label>
          <textarea value={JSON.stringify(formData.requirement, null, 2)} onChange={(e) => { try { setFormData({ ...formData, requirement: JSON.parse(e.target.value) }); } catch {} }} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" rows={3} placeholder='{"type": "taps", "value": 100}' />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Reward (JSON)</label>
          <textarea value={JSON.stringify(formData.reward, null, 2)} onChange={(e) => { try { setFormData({ ...formData, reward: JSON.parse(e.target.value) }); } catch {} }} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" rows={3} placeholder='{"type": "lustpoints", "value": 50}' />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={creating} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors">
            <Save className="w-4 h-4" />
            {creating ? 'Creating...' : 'Create Task'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}