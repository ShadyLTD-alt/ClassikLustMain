import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CharacterFormData {
  id: string;
  name: string;
  description: string;
  rarity: string;
  unlockLevel: number;
  image?: string;
}

interface CharactersCreateProps {
  onSave: () => void;
  onCancel: () => void;
}

export default function CharactersCreate({ onSave, onCancel }: CharactersCreateProps) {
  const [formData, setFormData] = useState<CharacterFormData>({
    id: '',
    name: '',
    description: '',
    rarity: 'Common',
    unlockLevel: 1,
    image: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await apiRequest('/api/admin/characters', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        alert('Character created successfully!');
        onSave();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create character');
      }
    } catch (error: any) {
      console.error('Failed to create character:', error);
      alert(error.message || 'Failed to create character. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Create New Character</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Character ID *</label>
            <input type="text" value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value })} placeholder="aria" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" required />
            <p className="text-xs text-gray-500 mt-1">Unique identifier (lowercase, hyphens)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Aria" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="A mysterious character..." className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" rows={3} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Rarity *</label>
            <select value={formData.rarity} onChange={(e) => setFormData({ ...formData, rarity: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
              <option value="Common">Common</option>
              <option value="Rare">Rare</option>
              <option value="Epic">Epic</option>
              <option value="Legendary">Legendary</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Unlock Level *</label>
            <input type="number" value={formData.unlockLevel} onChange={(e) => setFormData({ ...formData, unlockLevel: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" min="1" required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Image URL</label>
          <input type="text" value={formData.image || ''} onChange={(e) => setFormData({ ...formData, image: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" placeholder="/uploads/character.png" />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            {saving ? 'Creating...' : 'Create Character'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}