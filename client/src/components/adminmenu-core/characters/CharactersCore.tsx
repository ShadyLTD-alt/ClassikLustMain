import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import CharactersEdit from './CharactersEdit';
import CharactersCreate from './CharactersCreate';

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
      const response = await fetch('/api/admin/characters');
      const data = await response.json();
      setCharacters(data.characters || []);
    } catch (error) {
      console.error('Failed to load characters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (characterId: string) => {
    if (!confirm(`Delete character "${characterId}"? This cannot be undone.`)) return;
    
    try {
      const response = await fetch(`/api/admin/characters/${characterId}`, { method: 'DELETE' });
      if (response.ok) await loadCharacters();
    } catch (error) {
      console.error('Failed to delete character:', error);
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
        <h3 className="text-lg font-semibold text-white">Character Management</h3>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Create Character
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <p className="text-gray-400">Loading characters...</p>
        ) : characters.length === 0 ? (
          <p className="text-gray-400">No characters found. Create your first character!</p>
        ) : (
          characters.map((character) => (
            <div key={character.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-white">{character.name}</h4>
                  <p className="text-sm text-gray-400">{character.description}</p>
                </div>
                {character.image && (
                  <img src={character.image} alt={character.name} className="w-16 h-16 rounded-lg object-cover" />
                )}
              </div>
              <div className="flex gap-4 mb-3 text-xs text-gray-500">
                <span className="px-2 py-1 bg-purple-900/30 rounded">{character.rarity}</span>
                <span>Level {character.unlockLevel}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingCharacter(character)} className="flex-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                  <Edit className="w-4 h-4 mx-auto" />
                </button>
                <button onClick={() => handleDelete(character.id)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}