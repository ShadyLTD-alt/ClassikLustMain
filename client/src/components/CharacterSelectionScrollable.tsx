import React, { useState, useEffect } from 'react';
import { X, Crown, Star, Lock, Unlock, Sparkles, Gem } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

interface Character {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockLevel: number;
  description: string;
  defaultImage: string;
  avatarImage: string;
  displayImage: string;
  vip?: boolean;
}

interface CharacterSelectionScrollableProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (character: Character) => void;
}

const CharacterSelectionScrollable: React.FC<CharacterSelectionScrollableProps> = ({ 
  isOpen, 
  onClose, 
  onSelect 
}) => {
  const { state, characters, images, selectCharacter } = useGame();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unlocked' | 'locked' | 'vip'>('all');

  useEffect(() => {
    if (isOpen && characters.length > 0) {
      // Set current character from state
      const currentId = state?.selectedCharacterId || 'aria';
      const current = characters.find(char => {
        const isUnlocked = state?.unlockedCharacters?.includes(char.id) || char.unlockLevel <= (state?.level || 1);
        return char.id === currentId && isUnlocked;
      });
      
      if (current) {
        setSelectedCharacter(current as Character);
      } else {
        // Fallback to first unlocked character
        const firstUnlocked = characters.find(char => {
          return state?.unlockedCharacters?.includes(char.id) || char.unlockLevel <= (state?.level || 1);
        });
        if (firstUnlocked) {
          setSelectedCharacter(firstUnlocked as Character);
        }
      }
    }
  }, [isOpen, characters, state?.selectedCharacterId, state?.unlockedCharacters, state?.level]);

  const handleCharacterSelect = (character: Character) => {
    const isUnlocked = state?.unlockedCharacters?.includes(character.id) || character.unlockLevel <= (state?.level || 1);
    
    if (!isUnlocked) {
      // Show unlock requirements
      console.log(`Character ${character.name} is locked. Requirements:`, {
        level: character.unlockLevel,
        playerLevel: state?.level || 1
      });
      return;
    }
    
    setSelectedCharacter(character);
    selectCharacter(character.id);
    
    if (onSelect) {
      onSelect(character);
    }
    
    console.log(`🌙 Character selected: ${character.name}`);
  };

  const getRarityConfig = (rarity: string) => {
    switch (rarity) {
      case 'common': return { 
        border: 'border-gray-400 ring-gray-400/30', 
        bg: 'bg-gray-900/20',
        gradient: 'from-gray-600 to-gray-800',
        icon: null,
        glow: 'shadow-gray-400/20'
      };
      case 'rare': return { 
        border: 'border-blue-400 ring-blue-400/30', 
        bg: 'bg-blue-900/20',
        gradient: 'from-blue-600 to-blue-800',
        icon: <Star className="w-4 h-4" />,
        glow: 'shadow-blue-400/30'
      };
      case 'epic': return { 
        border: 'border-purple-400 ring-purple-400/30', 
        bg: 'bg-purple-900/20',
        gradient: 'from-purple-600 to-purple-800',
        icon: <Sparkles className="w-4 h-4" />,
        glow: 'shadow-purple-400/40'
      };
      case 'legendary': return { 
        border: 'border-orange-400 ring-orange-400/30', 
        bg: 'bg-orange-900/20',
        gradient: 'from-orange-500 to-red-600',
        icon: <Crown className="w-4 h-4" />,
        glow: 'shadow-orange-400/50'
      };
      default: return { 
        border: 'border-gray-400', 
        bg: 'bg-gray-900/20',
        gradient: 'from-gray-600 to-gray-800',
        icon: null,
        glow: ''
      };
    }
  };

  const filterCharacters = () => {
    const filtered = characters.filter(char => {
      const isUnlocked = state?.unlockedCharacters?.includes(char.id) || char.unlockLevel <= (state?.level || 1);
      
      switch (activeTab) {
        case 'unlocked': return isUnlocked;
        case 'locked': return !isUnlocked;
        case 'vip': return char.vip;
        default: return true;
      }
    });
    
    // Sort by rarity and unlock status
    return filtered.sort((a, b) => {
      const aIsUnlocked = state?.unlockedCharacters?.includes(a.id) || a.unlockLevel <= (state?.level || 1);
      const bIsUnlocked = state?.unlockedCharacters?.includes(b.id) || b.unlockLevel <= (state?.level || 1);
      
      if (aIsUnlocked !== bIsUnlocked) {
        return aIsUnlocked ? -1 : 1; // Unlocked first
      }
      
      const rarityOrder = { 'legendary': 4, 'epic': 3, 'rare': 2, 'common': 1 };
      return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
    });
  };

  const getCharacterImageCount = (characterId: string) => {
    return images.filter(img => img.characterId === characterId).length;
  };

  if (!isOpen) return null;

  const filteredCharacters = filterCharacters();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2 rounded-lg">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Character Selection</h2>
                <div className="text-sm text-gray-400">
                  @{state?.selectedCharacterId || 'Player'} • Level {state?.level || 1} • {Math.floor(state?.lustPoints || state?.points || 0).toLocaleString()} LP
                </div>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-gray-800 rounded-lg p-1 ml-6">
              {[
                { id: 'all', label: 'All', count: characters.length },
                { id: 'unlocked', label: 'Unlocked', count: characters.filter(c => state?.unlockedCharacters?.includes(c.id) || c.unlockLevel <= (state?.level || 1)).length },
                { id: 'locked', label: 'Locked', count: characters.filter(c => !(state?.unlockedCharacters?.includes(c.id) || c.unlockLevel <= (state?.level || 1))).length },
                { id: 'vip', label: 'VIP', count: characters.filter(c => c.vip).length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 transition-colors rounded-lg hover:bg-gray-800/50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Character Grid - FULLY SCROLLABLE */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-400 mx-auto mb-4"></div>
                <p className="text-gray-400 text-lg">Loading characters...</p>
                <p className="text-gray-500 text-sm mt-2">Preparing your collection</p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-purple-600">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-4">
                {filteredCharacters.map(character => {
                  const rarityConfig = getRarityConfig(character.rarity);
                  const isSelected = selectedCharacter?.id === character.id;
                  const isUnlocked = state?.unlockedCharacters?.includes(character.id) || character.unlockLevel <= (state?.level || 1);
                  const imageCount = getCharacterImageCount(character.id);
                  
                  return (
                    <div 
                      key={character.id}
                      onClick={() => handleCharacterSelect(character)}
                      className={`relative bg-gray-800/50 border-2 rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                        isSelected
                          ? `${rarityConfig.border} ring-4 ring-purple-400/50 bg-purple-900/30 shadow-xl ${rarityConfig.glow}`
                          : !isUnlocked
                            ? 'border-gray-600 opacity-60 hover:opacity-80 hover:border-gray-500'
                            : `${rarityConfig.border} hover:ring-2 ${rarityConfig.bg} ${rarityConfig.glow}`
                      }`}
                    >
                      {/* Rarity Glow Effect */}
                      {isUnlocked && (
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${rarityConfig.gradient} opacity-10 pointer-events-none`} />
                      )}
                      
                      {/* Character Image */}
                      <div className="aspect-[3/4] bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
                        {!isUnlocked ? (
                          <div className="text-center">
                            <Lock className="w-10 h-10 text-gray-500 mb-2" />
                            <div className="text-xs text-gray-400 font-semibold">Level {character.unlockLevel}</div>
                          </div>
                        ) : character.defaultImage ? (
                          <img 
                            src={character.defaultImage} 
                            alt={character.name} 
                            className="w-full h-full object-cover rounded-xl"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/uploads/placeholder-character.jpg';
                            }}
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${rarityConfig.gradient} flex items-center justify-center relative`}>
                            <div className="text-white/60 text-center">
                              <Crown className="w-16 h-16 mb-2 mx-auto" />
                              <div className="text-sm font-semibold">No Image</div>
                            </div>
                            
                            {/* Rarity sparkles animation */}
                            {character.rarity !== 'common' && (
                              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute -top-2 -right-2 text-white/30 animate-pulse">
                                  <Sparkles className="w-6 h-6" />
                                </div>
                                <div className="absolute -bottom-2 -left-2 text-white/20 animate-pulse" style={{animationDelay: '0.5s'}}>
                                  <Sparkles className="w-4 h-4" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Rarity Badge */}
                        <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${rarityConfig.bg} ${rarityConfig.border.replace('border-', 'text-')}`}>
                          {rarityConfig.icon}
                          <span className="capitalize">{character.rarity}</span>
                        </div>
                        
                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center rounded-xl">
                            <div className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                              ★ Selected
                            </div>
                          </div>
                        )}
                        
                        {/* VIP Badge */}
                        {character.vip && (
                          <div className="absolute top-2 left-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                            VIP
                          </div>
                        )}
                      </div>
                      
                      {/* Character Info */}
                      <div className="text-center">
                        <h3 className="text-white font-bold mb-1 text-sm">{character.name}</h3>
                        <p className="text-gray-400 text-xs mb-2 leading-tight h-8 overflow-hidden">
                          {character.description.slice(0, 60)}{character.description.length > 60 ? '...' : ''}
                        </p>
                        
                        <div className="flex items-center justify-center gap-2">
                          {!isUnlocked ? (
                            <div className="text-center">
                              <div className="text-red-400 text-xs font-semibold">🔒 Locked</div>
                              <div className="text-gray-500 text-xs">
                                Level {character.unlockLevel}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="text-green-400 text-xs font-semibold flex items-center justify-center gap-1">
                                <Unlock className="w-3 h-3" />
                                Unlocked
                              </div>
                              <div className="text-gray-500 text-xs">{imageCount} images • Ready to play</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Empty State */}
              {!loading && filteredCharacters.length === 0 && (
                <div className="text-center py-16">
                  <div className="bg-gray-800/50 rounded-2xl p-8 max-w-md mx-auto">
                    <Crown className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-3">
                      No {activeTab} characters
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {activeTab === 'locked' 
                        ? 'All characters have been unlocked! Amazing progress.' 
                        : activeTab === 'vip'
                          ? 'VIP characters are unlocked at higher levels. Keep playing to access exclusive content!'
                          : activeTab === 'unlocked'
                            ? 'No characters unlocked yet. Start your journey by unlocking your first character!'
                            : 'No characters available. Check the Characters tab in Admin Panel to add more.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer Info */}
        <div className="border-t border-gray-700 p-4 bg-gray-800/50">
          <div className="text-center text-gray-400 text-sm">
            {selectedCharacter ? (
              <div className="flex items-center justify-center gap-4">
                <span>Selected: <strong className="text-purple-400">{selectedCharacter.name}</strong></span>
                <span>•</span>
                <span>Rarity: <strong className="capitalize">{selectedCharacter.rarity}</strong></span>
                <span>•</span>
                <span>Gallery: <strong>{getCharacterImageCount(selectedCharacter.id)} images</strong></span>
              </div>
            ) : (
              <span>Select a character to begin your ClassikLust adventure!</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterSelectionScrollable;