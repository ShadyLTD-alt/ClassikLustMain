import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Requirement {
  upgradeId: string;
  minLevel: number;
}

interface Level {
  level: number;
  cost: number;
  rewards?: any;
  requirements?: Requirement[];
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
  const [advancedMode, setAdvancedMode] = useState(false);
  
  // Reward state
  const [rewardLP, setRewardLP] = useState(level.rewards?.lustPoints || 0);
  const [rewardLG, setRewardLG] = useState(level.rewards?.lustGems || 0);
  const [rewardMultiplier, setRewardMultiplier] = useState(level.rewards?.bonusMultiplier || 1);
  
  // Unlocks state
  const [selectedUnlock, setSelectedUnlock] = useState('');
  const [unlocksList, setUnlocksList] = useState<string[]>(level.unlocks || []);
  
  // Requirements state
  const [requirements, setRequirements] = useState<Requirement[]>(level.requirements || []);

  useEffect(() => {
    // Update rewards object when individual values change
    const newRewards: any = {};
    if (rewardLP > 0) newRewards.lustPoints = rewardLP;
    if (rewardLG > 0) newRewards.lustGems = rewardLG;
    if (rewardMultiplier !== 1) newRewards.bonusMultiplier = rewardMultiplier;
    setFormData(prev => ({ ...prev, rewards: newRewards }));
  }, [rewardLP, rewardLG, rewardMultiplier]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, unlocks: unlocksList }));
  }, [unlocksList]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, requirements }));
  }, [requirements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await apiRequest(`/api/admin/levels/${level.level}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
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

  const addUnlock = () => {
    if (selectedUnlock && !unlocksList.includes(selectedUnlock)) {
      setUnlocksList([...unlocksList, selectedUnlock]);
      setSelectedUnlock('');
    }
  };

  const removeUnlock = (unlock: string) => {
    setUnlocksList(unlocksList.filter(u => u !== unlock));
  };

  const addRequirement = () => {
    setRequirements([...requirements, { upgradeId: '', minLevel: 1 }]);
  };

  const updateRequirement = (index: number, field: keyof Requirement, value: any) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value };
    setRequirements(updated);
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Edit Level {level.level}</h3>
        <div className="flex gap-2 items-center">
          <button 
            type="button"
            onClick={() => setAdvancedMode(!advancedMode)}
            className="text-sm px-3 py-1 rounded bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 transition-colors"
          >
            {advancedMode ? '👁️ Simple' : '⚙️ Advanced'}
          </button>
          <button onClick={onCancel} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Level Number *</label>
            <input 
              type="number" 
              value={formData.level} 
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" 
              disabled 
            />
            <p className="text-xs text-gray-500 mt-1">Cannot change level number</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">LP Cost *</label>
            <input 
              type="number" 
              value={formData.cost} 
              onChange={(e) => setFormData({ ...formData, cost: parseInt(e.target.value) })} 
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" 
              min="0" 
              required 
            />
          </div>
        </div>

        {!advancedMode ? (
          <>
            {/* Simple Rewards UI */}
            <div className="space-y-4 bg-gray-900/50 p-4 rounded-lg border border-purple-500/20">
              <h4 className="text-md font-semibold text-purple-300 flex items-center gap-2">
                🎁 Rewards
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Lust Points</label>
                  <input 
                    type="number" 
                    value={rewardLP} 
                    onChange={(e) => setRewardLP(parseInt(e.target.value) || 0)} 
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" 
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Lust Gems</label>
                  <input 
                    type="number" 
                    value={rewardLG} 
                    onChange={(e) => setRewardLG(parseInt(e.target.value) || 0)} 
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" 
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Bonus Multiplier</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={rewardMultiplier} 
                    onChange={(e) => setRewardMultiplier(parseFloat(e.target.value) || 1)} 
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" 
                    min="1"
                    placeholder="1.0"
                  />
                </div>
              </div>
            </div>

            {/* Requirements UI */}
            <div className="space-y-4 bg-gray-900/50 p-4 rounded-lg border border-orange-500/20">
              <div className="flex justify-between items-center">
                <h4 className="text-md font-semibold text-orange-300">⚠️ Requirements (Upgrades needed)</h4>
                <button
                  type="button"
                  onClick={addRequirement}
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              {requirements.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No requirements set</p>
              ) : (
                <div className="space-y-2">
                  {requirements.map((req, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-gray-800 p-2 rounded">
                      <input
                        type="text"
                        value={req.upgradeId}
                        onChange={(e) => updateRequirement(idx, 'upgradeId', e.target.value)}
                        placeholder="upgrade-id"
                        className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      />
                      <input
                        type="number"
                        value={req.minLevel}
                        onChange={(e) => updateRequirement(idx, 'minLevel', parseInt(e.target.value) || 1)}
                        placeholder="Level"
                        className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        min="1"
                      />
                      <button
                        type="button"
                        onClick={() => removeRequirement(idx)}
                        className="p-1 bg-red-600 hover:bg-red-700 text-white rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Simple Unlocks UI */}
            <div className="space-y-4 bg-gray-900/50 p-4 rounded-lg border border-purple-500/20">
              <h4 className="text-md font-semibold text-purple-300 flex items-center gap-2">
                🔓 Unlocks
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedUnlock}
                  onChange={(e) => setSelectedUnlock(e.target.value)}
                  placeholder="character-id or upgrade-id"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addUnlock())}
                />
                <button
                  type="button"
                  onClick={addUnlock}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {unlocksList.map((unlock, idx) => (
                  <span 
                    key={idx} 
                    className="px-3 py-1 bg-purple-900/50 text-purple-200 rounded-full flex items-center gap-2 border border-purple-500/30"
                  >
                    {unlock}
                    <button
                      type="button"
                      onClick={() => removeUnlock(unlock)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {unlocksList.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No unlocks added yet</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Advanced JSON Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Requirements (JSON)</label>
              <textarea 
                value={JSON.stringify(formData.requirements || [], null, 2)} 
                onChange={(e) => { try { setFormData({ ...formData, requirements: JSON.parse(e.target.value) }); } catch {} }} 
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" 
                rows={4} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Unlocks (JSON)</label>
              <textarea 
                value={JSON.stringify(formData.unlocks || [], null, 2)} 
                onChange={(e) => { try { setFormData({ ...formData, unlocks: JSON.parse(e.target.value) }); } catch {} }} 
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" 
                rows={3} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Rewards (JSON)</label>
              <textarea 
                value={JSON.stringify(formData.rewards || {}, null, 2)} 
                onChange={(e) => { try { setFormData({ ...formData, rewards: JSON.parse(e.target.value) }); } catch {} }} 
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" 
                rows={3} 
              />
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-700">
          <button 
            type="submit" 
            disabled={saving} 
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
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