import React, { useState, useEffect } from 'react';
import { X, Crown, Star, Lock, Unlock, Sparkles } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { ScrollContainer } from '@/components/layout/ScrollContainer';

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
  const { state, characters, images } = useGame();
  const [highlighted, setHighlighted] = useState<Character | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unlocked' | 'locked' | 'vip'>('all');
  const [showGallery, setShowGallery] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    // Initialize highlighted with current selected character
    const current = characters.find(c => c.id === state?.selectedCharacterId);
    if (current) setHighlighted(current as Character);
    else if (characters.length) setHighlighted(characters[0] as Character);
  }, [isOpen, state?.selectedCharacterId, characters]);

  // 🎯 JSON-FIRST: Use dedicated character selection endpoint with better error handling
  const persistSelection = async (characterId: string) => {
    if (saving) return;
    setSaving(true);
    
    try {
      console.log(`🎭 Selecting character ${characterId}...`);
      
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        throw new Error('No session token found');
      }
      
      const response = await fetch('/api/player/select-character', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${sessionToken}` 
        },
        body: JSON.stringify({ characterId }),
        // 🔧 FIX: Add abort controller to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Character ${characterId} selected successfully`);
      
      if (onSelect && highlighted) {
        onSelect(highlighted);
      }
      
      onClose();
      
      // 🔧 FIX: Just close the modal - let the game context handle the refresh
      // The GameContext autosync will pick up the change within 10 seconds
      
    } catch (error) {
      console.error('🔴 Failed to save character selection:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(`Failed to select character: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // Handle image load errors
  const handleImageError = (imageUrl: string) => {
    console.warn(`🔴 Failed to load image: ${imageUrl}`);
    setImageErrors(prev => new Set(prev).add(imageUrl));
  };

  // Get fallback image URL
  const getFallbackImageUrl = (character: any): string | null => {
    const { defaultImage, avatarImage, displayImage } = character;
    
    // Try each image in order, skipping ones that failed to load
    const candidates = [displayImage, defaultImage, avatarImage].filter(Boolean);
    
    for (const url of candidates) {
      if (!imageErrors.has(url)) {
        return url;
      }
    }
    
    return null; // All images failed
  };

  const getRarityConfig = (rarity: string) => {
    switch (rarity) {
      case 'common': return { border: 'border-gray-400 ring-gray-400/30', bg: 'bg-gray-900/20', gradient: 'from-gray-600 to-gray-800' };
      case 'rare': return { border: 'border-blue-400 ring-blue-400/30', bg: 'bg-blue-900/20', gradient: 'from-blue-600 to-blue-800' };
      case 'epic': return { border: 'border-purple-400 ring-purple-400/30', bg: 'bg-purple-900/20', gradient: 'from-purple-600 to-purple-800' };
      case 'legendary': return { border: 'border-orange-400 ring-orange-400/30', bg: 'bg-orange-900/20', gradient: 'from-orange-500 to-red-600' };
      default: return { border: 'border-gray-400', bg: 'bg-gray-900/20', gradient: 'from-gray-600 to-gray-800' };
    }
  };

  const filterCharacters = () => {
    const filtered = characters.filter(char => {
      const unlocked = state?.unlockedCharacters?.includes(char.id) || char.unlockLevel <= (state?.level || 1);
      switch (activeTab) {
        case 'unlocked': return unlocked;
        case 'locked': return !unlocked;
        case 'vip': return char.vip;
        default: return true;
      }
    });
    const rarityOrder: Record<string, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };
    return filtered.sort((a,b) => (rarityOrder[b.rarity]||0) - (rarityOrder[a.rarity]||0));
  };

  if (!isOpen) return null;
  const filtered = filterCharacters();

  const getImageCount = (id: string) => images.filter(i => i.characterId === id && !i.isHidden).length;
  const isHighlightedUnlocked = highlighted && (state?.unlockedCharacters?.includes(highlighted.id) || highlighted.unlockLevel <= (state?.level || 1));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <div className="bg-purple-600 p-2 rounded-lg"><Crown className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-xl font-bold text-white">Character Selection</h2>
              <div className="text-sm text-gray-400">@{state?.username || 'Player'} • Level {state?.level || 1}</div>
            </div>
            <div className="flex bg-gray-800 rounded-lg p-1 ml-6">
              {['all','unlocked','locked','vip'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-3 py-1 rounded-md text-xs font-semibold ${activeTab===tab?'bg-purple-600 text-white':'text-gray-400 hover:text-white hover:bg-gray-700'}`}>{tab[0].toUpperCase()+tab.slice(1)}</button>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800/50"><X className="w-5 h-5"/></button>
        </div>

        {/* Grid */}
        <div className="flex-1 min-h-0">
          <ScrollContainer height="h-full">
            <div className="p-6">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 pb-4">
                {filtered.map(c => {
                  const unlocked = state?.unlockedCharacters?.includes(c.id) || c.unlockLevel <= (state?.level || 1);
                  const rare = getRarityConfig(c.rarity);
                  const selected = highlighted?.id === c.id;
                  const fallbackImage = getFallbackImageUrl(c);
                  
                  return (
                    <div key={c.id} onClick={() => setHighlighted(c as Character)} className={`relative bg-gray-800/50 border-2 rounded-xl p-2 cursor-pointer transition-all ${selected? `${rare.border} ring-2 ring-purple-400/50 bg-purple-900/30` : unlocked? `${rare.border}` : 'border-gray-600 opacity-60'}`}>
                      <div className="aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                        {!unlocked ? (
                          <div className="text-center"><Lock className="w-6 h-6 text-gray-500 mb-1"/><div className="text-xs text-gray-400 font-semibold">Lv{c.unlockLevel}</div></div>
                        ) : fallbackImage ? (
                          <img 
                            src={fallbackImage} 
                            alt={c.name} 
                            className="w-full h-full object-cover" 
                            onError={() => handleImageError(fallbackImage)}
                            loading="lazy"
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${rare.gradient} flex items-center justify-center`}>
                            <Crown className="w-8 h-8 text-white/60"/>
                            <div className="absolute bottom-1 left-1 text-xs text-white/80 bg-black/50 px-1 rounded">No Image</div>
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <h3 className="text-white font-bold mb-1 text-xs">{c.name}</h3>
                        <div className="text-gray-500 text-xs">{getImageCount(c.id)} imgs</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollContainer>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-700 p-4 bg-gray-800/50 flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            {highlighted ? (<>
              Selected: <strong className="text-purple-400">{highlighted.name}</strong> • Gallery: <strong>{getImageCount(highlighted.id)} images</strong>
            </>) : 'Pick a character'}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowGallery(true)} 
              disabled={!highlighted} 
              className="px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50"
            >
              Open Gallery
            </button>
            <button 
              onClick={() => highlighted && isHighlightedUnlocked && persistSelection(highlighted.id)} 
              disabled={!highlighted || !isHighlightedUnlocked || saving} 
              className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 min-w-[80px]"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : 'Select'}
            </button>
          </div>
        </div>
      </div>

      {/* Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={()=>setShowGallery(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="text-white font-semibold">Gallery • {highlighted?.name}</div>
              <button className="text-gray-400 hover:text-white" onClick={()=>setShowGallery(false)}><X className="w-5 h-5"/></button>
            </div>
            <ScrollContainer height="h-[70vh]">
              <div className="p-4 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {images.filter(img=> img.characterId===highlighted?.id && !img.isHidden).map(img=> (
                  <div key={img.id} className="aspect-square rounded-lg overflow-hidden border border-gray-700">
                    <img 
                      src={img.url} 
                      alt="Gallery image" 
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/uploads/placeholder-character.jpg';
                      }}
                    />
                  </div>
                ))}
                {images.filter(img=> img.characterId===highlighted?.id && !img.isHidden).length===0 && (
                  <div className="col-span-full text-center text-gray-500 py-8">No images yet</div>
                )}
              </div>
            </ScrollContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterSelectionScrollable;