import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Lock, Check, Image as ImageIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CharacterSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  openMenu?: (menuId: string) => void;
}

export default function CharacterSelection({ isOpen, onClose, openMenu }: CharacterSelectionProps) {
  const { state, characters, refreshPlayerState } = useGame();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCardClick = (characterId: string) => {
    setSelectedCharacterId(characterId);
    setError(null);
  };

  const handleSelectCharacter = async () => {
    if (!selectedCharacterId) return;
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await apiRequest('/api/player/active-character', {
        method: 'PATCH',
        body: JSON.stringify({ characterId: selectedCharacterId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(data.message || 'Character selected successfully!');
        setSelectedCharacterId(null);
        
        // Refresh player state to update UI
        if (refreshPlayerState) {
          await refreshPlayerState();
        }
        
        // Auto-close success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        const data = await response.json();
        setError(data.error || data.message || 'Failed to set active character');
      }
    } catch (err) {
      console.error('Error setting active character:', err);
      setError('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGallery = () => {
    if (openMenu) {
      onClose();
      openMenu('character-gallery');
    }
  };

  if (!isOpen) return null;

  const unlockedCharacters = characters.filter(
    char => !char.unlockLevel || state.level >= char.unlockLevel
  );

  const lockedCharacters = characters.filter(
    char => char.unlockLevel && state.level < char.unlockLevel
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-purple-500/30 bg-gradient-to-r from-purple-900/40 to-pink-900/40">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                👑 Character Selection
              </h2>
              <p className="text-sm text-gray-300 mt-1">
                @{state.username} · Level {state.level}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Current: <span className="text-purple-400 font-semibold">{state.activeCharacter || 'None'}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {openMenu && (
                <button
                  onClick={handleOpenGallery}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 rounded-lg border border-purple-500/30 text-purple-300 hover:text-purple-100 transition-colors"
                  title="Open Character Gallery"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">Gallery</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <span className="text-white text-xl">×</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4" />
              {successMessage}
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              ⚠️ {error}
            </div>
          )}
          
          {/* Unlocked Characters */}
          {unlockedCharacters.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>✨ Available Characters</span>
                <span className="text-xs text-gray-400">({unlockedCharacters.length})</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {unlockedCharacters.map((character) => {
                  const isActive = state.activeCharacter === character.id;
                  const isSelected = selectedCharacterId === character.id;
                  return (
                    <button
                      key={character.id}
                      onClick={() => handleCardClick(character.id)}
                      disabled={loading}
                      className={`
                        relative p-4 rounded-xl border-2 transition-all duration-200
                        ${isActive ? 'border-green-500 bg-green-500/20 shadow-lg shadow-green-500/50'
                        : isSelected ? 'border-purple-400 bg-purple-800/30 ring-2 ring-purple-300 scale-105'
                        :'border-purple-500/30 bg-gray-800/50 hover:border-purple-500 hover:bg-gray-800 hover:scale-105'}
                        ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {isActive && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {isSelected && !isActive && (
                        <div className="absolute inset-0 rounded-xl bg-purple-700/10 ring-2 ring-purple-400 pointer-events-none" style={{zIndex:10}}></div>
                      )}
                      <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-900">
                        <img
                          src={character.defaultImage || '/placeholder-character.png'}
                          alt={character.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-character.png';
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-white text-sm truncate">
                          {character.name}
                        </p>
                        {character.unlockLevel && (
                          <p className="text-xs text-gray-400 mt-1">
                            Unlocked at Lv.{character.unlockLevel}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-center mt-8">
                <button
                  className="px-8 py-3 rounded-lg bg-purple-600 text-white font-bold text-lg shadow hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  disabled={!selectedCharacterId || loading || selectedCharacterId === state.activeCharacter}
                  onClick={handleSelectCharacter}
                >
                  {loading ? 'Selecting...' : `Select ${selectedCharacterId ? characters.find(x=>x.id===selectedCharacterId)?.name : ''}`}
                </button>
              </div>
            </div>
          )}
          
          {/* Locked Characters */}
          {lockedCharacters.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>🔒 Locked Characters</span>
                <span className="text-xs text-gray-400">({lockedCharacters.length})</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {lockedCharacters.map((character) => (
                  <div
                    key={character.id}
                    className="relative p-4 rounded-xl border-2 border-gray-700 bg-gray-900/50 opacity-60"
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                      <div className="text-center">
                        <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-300 font-semibold">
                          Level {character.unlockLevel}
                        </p>
                      </div>
                    </div>
                    <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-900 blur-sm">
                      <img
                        src={character.defaultImage || '/placeholder-character.png'}
                        alt={character.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-500 text-sm truncate">
                        {character.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {characters.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👻</span>
              </div>
              <p className="text-gray-400 text-lg font-medium">No characters available</p>
              <p className="text-gray-500 text-sm mt-2">Check back later!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
