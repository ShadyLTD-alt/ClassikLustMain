import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Task {
  id: string;
  name: string;
  description: string;
  requirement: any;
  reward: any;
  repeatable: boolean;
}

interface TasksEditProps {
  task: Task;
  onSave: () => void;
  onCancel: () => void;
}

export default function TasksEdit({ task, onSave, onCancel }: TasksEditProps) {
  const [formData, setFormData] = useState<Task>(task);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await apiRequest('PUT', `/api/admin/tasks/${task.id}`, formData);
      if (response.ok) {
        alert('Task updated successfully!');
        onSave();
      } else {
        throw new Error('Failed to update task');
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Edit Task: {task.name}</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
          <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" rows={2} required />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <input type="checkbox" checked={formData.repeatable} onChange={(e) => setFormData({ ...formData, repeatable: e.target.checked })} className="rounded" />
            Repeatable Task
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Requirement (JSON)</label>
          <textarea value={JSON.stringify(formData.requirement, null, 2)} onChange={(e) => { try { setFormData({ ...formData, requirement: JSON.parse(e.target.value) }); } catch {} }} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" rows={4} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Reward (JSON)</label>
          <textarea value={JSON.stringify(formData.reward, null, 2)} onChange={(e) => { try { setFormData({ ...formData, reward: JSON.parse(e.target.value) }); } catch {} }} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" rows={4} />
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