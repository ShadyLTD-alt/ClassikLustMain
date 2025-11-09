import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import UpgradesEdit from './UpgradesEdit';
import UpgradesCreate from './UpgradesCreate';
import { apiRequest } from '@/lib/queryClient';

interface Upgrade {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  maxLevel: number;
  baseCost: number;
  baseValue: number;
  isEvent?: boolean;
  levelRequirement?: number;
}

export default function UpgradesCore() {
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUpgrade, setEditingUpgrade] = useState<Upgrade | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadUpgrades();
  }, []);

  const loadUpgrades = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/admin/upgrades');
      const data = await response.json();
      setUpgrades(data.upgrades || []);
    } catch (error) {
      console.error('Failed to load upgrades:', error);
      alert('Failed to load upgrades. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (upgradeId: string) => {
    if (!confirm(`Delete upgrade "${upgradeId}"? This cannot be undone.`)) return;
    try {
      const response = await apiRequest(`/api/admin/upgrades/${upgradeId}`, { method: 'DELETE' });
      if (response.ok) {
        await loadUpgrades();
        alert('Upgrade deleted successfully!');
      }
    } catch (error) {
      console.error('Failed to delete upgrade:', error);
      alert('Failed to delete upgrade.');
    }
  };

  const handleSaveEdit = async () => {
    await loadUpgrades();
    setEditingUpgrade(null);
  };

  const handleSaveCreate = async () => {
    await loadUpgrades();
    setIsCreating(false);
  };

  if (isCreating) return <UpgradesCreate onSave={handleSaveCreate} onCancel={() => setIsCreating(false)} />;
  if (editingUpgrade) return <UpgradesEdit upgrade={editingUpgrade} onSave={handleSaveEdit} onCancel={() => setEditingUpgrade(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white">Upgrade Management</h3>
          <p className="text-sm text-gray-400">Create and manage game upgrades</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Upgrade
        </button>
      </div>
      
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-400">Loading upgrades...</p>
          </div>
        ) : upgrades.length === 0 ? (
          <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <p className="text-gray-400 mb-2">No upgrades found.</p>
            <p className="text-sm text-gray-500">Create your first upgrade to get started!</p>
          </div>
        ) : (
          upgrades.map((upgrade) => (
            <div key={upgrade.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between hover:bg-gray-750 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{upgrade.icon}</span>
                  <div>
                    <h4 className="font-semibold text-white">{upgrade.name}</h4>
                    <p className="text-sm text-gray-400">{upgrade.description}</p>
                  </div>
                  {upgrade.isEvent && (
                    <span className="ml-2 px-2 py-0.5 bg-yellow-700 text-yellow-300 rounded-full text-xs font-bold">EVENT</span>
                  )}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span className="bg-gray-700 px-2 py-0.5 rounded">Type: {upgrade.type}</span>
                  <span className="bg-gray-700 px-2 py-0.5 rounded">Max: {upgrade.maxLevel}</span>
                  <span className="bg-gray-700 px-2 py-0.5 rounded">Base: {upgrade.baseCost} LP</span>
                  {upgrade.levelRequirement && (
                    <span className="bg-purple-900 text-purple-300 px-2 py-0.5 rounded">Lvl Req: {upgrade.levelRequirement}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingUpgrade(upgrade)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  title="Edit Upgrade"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(upgrade.id)}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                  title="Delete Upgrade"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {!loading && upgrades.length > 0 && (
        <div className="text-sm text-gray-400 text-center pt-2 border-t border-gray-800">
          Total Upgrades: {upgrades.length}
        </div>
      )}
    </div>
  );
}