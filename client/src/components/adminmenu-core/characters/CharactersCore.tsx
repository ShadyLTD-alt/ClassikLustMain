import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import CharactersEdit from './CharactersEdit';
import CharactersCreate from './CharactersCreate';
import { apiRequest } from '@/lib/queryClient';

interface Character {
  id: string;
  name: string;
  description: string;
  rarity: string;
  unlockLevel: number;
  image?: string;
}

export default function CharactersCore() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('GET', '/api/admin/characters');
      const data = await response.json();
      setCharacters(data.characters || []);
    } catch (error) {
      console.error('Failed to load characters:', error);
      alert('Failed to load characters. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (characterId: string) => {
    if (!confirm(`Delete character "${characterId}"? This cannot be undone.`)) return;
    
    try {
      const response = await apiRequest('DELETE', `/api/admin/characters/${characterId}`);
      if (response.ok) {
        await loadCharacters();
        alert('Character deleted successfully!');
      }
    } catch (error) {
      console.error('Failed to delete character:', error);
      alert('Failed to delete character.');
    }
  };

  if (isCreating) {
    return <CharactersCreate onSave={() => { loadCharacters(); setIsCreating(false); }} onCancel={() => setIsCreating(false)} />;
  }

  if (editingCharacter) {
    return <CharactersEdit character={editingCharacter} onSave={() => { loadCharacters(); setEditingCharacter(null); }} onCancel={() => setEditingCharacter(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Character Management
          </h3>
          <p className="text-sm text-gray-400">Create and manage game characters</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Create Character
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-400">Loading characters...</p>
          </div>
        ) : characters.length === 0 ? (
          <div className="col-span-2 text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <p className="text-gray-400 mb-2">No characters found.</p>
            <p className="text-sm text-gray-500">Create your first character to get started!</p>
          </div>
        ) : (
          characters.map((character) => (
            <div key={character.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-white">{character.name}</h4>
                  <p className="text-sm text-gray-400">{character.description}</p>
                </div>
                {character.image && (
                  <img src={character.image} alt={character.name} className="w-16 h-16 rounded-lg object-cover border border-gray-700" />
                )}
              </div>
              <div className="flex gap-2 mb-3 text-xs">
                <span className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded">{character.rarity}</span>
                <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded">Level {character.unlockLevel}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingCharacter(character)} className="flex-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors" title="Edit Character">
                  <Edit className="w-4 h-4 mx-auto" />
                </button>
                <button onClick={() => handleDelete(character.id)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors" title="Delete Character">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {!loading && characters.length > 0 && (
        <div className="text-sm text-gray-400 text-center pt-2 border-t border-gray-800">
          Total Characters: {characters.length}
        </div>
      )}
    </div>
  );
}