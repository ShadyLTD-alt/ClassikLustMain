import React, { useState, useEffect } from 'react';
import { X, Crown, Star, Lock, Unlock, Sparkles, Play, Pause, Image, BarChart3 } from 'lucide-react';
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
  const [settingDisplayImage, setSettingDisplayImage] = useState<string | null>(null);
  
  // 🎥 Gallery slideshow state
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideshowInterval, setSlideshowInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Initialize highlighted with current selected character
    const current = characters.find(c => c.id === state?.selectedCharacterId);
    if (current) setHighlighted(current as Character);
    else if (characters.length) setHighlighted(characters[0] as Character);
  }, [isOpen, state?.selectedCharacterId, characters]);

  // 🎥 Slideshow effect
  useEffect(() => {
    if (!slideshowActive || !highlighted) return;
    
    const galleryImages = images.filter(img => img.characterId === highlighted.id && !img.isHidden);
    if (galleryImages.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % galleryImages.length);
    }, 6000); // 6 second intervals
    
    setSlideshowInterval(interval);
    
    return () => {
      clearInterval(interval);
      setSlideshowInterval(null);
    };
  }, [slideshowActive, highlighted, images]);

  // 🎥 Update display image via slideshow
  useEffect(() => {
    if (!slideshowActive || !highlighted) return;
    
    const galleryImages = images.filter(img => img.characterId === highlighted.id && !img.isHidden);
    if (galleryImages.length === 0) return;
    
    const currentImage = galleryImages[currentSlideIndex];
    if (currentImage && currentImage.url !== state?.displayImage) {
      // Automatically update display image during slideshow
      updateDisplayImage(currentImage.url, false); // silent update
    }
  }, [currentSlideIndex, slideshowActive, highlighted]);

  // 🎯 JSON-FIRST: Use dedicated character selection endpoint
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
        signal: AbortSignal.timeout(10000)
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

  // 🖼️ Set display image
  const updateDisplayImage = async (imageUrl: string, showFeedback = true) => {
    if (settingDisplayImage) return;
    setSettingDisplayImage(imageUrl);
    
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) throw new Error('No session token');
      
      const response = await fetch('/api/player/set-display-image', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${sessionToken}` 
        },
        body: JSON.stringify({ imageUrl }),
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (showFeedback) {
        console.log('✅ Display image updated successfully');
        // Show brief success indicator
        setTimeout(() => setSettingDisplayImage(null), 1000);
      } else {
        setSettingDisplayImage(null);
      }
    } catch (error) {
      console.error('🔴 Failed to update display image:', error);
      if (showFeedback) alert('Failed to set display image');
      setSettingDisplayImage(null);
    }
  };

  // Handle image load errors
  const handleImageError = (imageUrl: string) => {
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

  const toggleSlideshow = () => {
    if (slideshowActive) {
      setSlideshowActive(false);
      if (slideshowInterval) {
        clearInterval(slideshowInterval);
        setSlideshowInterval(null);
      }
    } else {
      setSlideshowActive(true);
      setCurrentSlideIndex(0);
    }
  };

  if (!isOpen) return null;
  const filtered = filterCharacters();

  const getImageCount = (id: string) => images.filter(i => i.characterId === id && !i.isHidden).length;
  const isHighlightedUnlocked = highlighted && (state?.unlockedCharacters?.includes(highlighted.id) || highlighted.unlockLevel <= (state?.level || 1));
  const galleryImages = highlighted ? images.filter(img => img.characterId === highlighted.id && !img.isHidden) : [];

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

      {/* 🎥 Enhanced Gallery Modal with Slideshow */}
      {showGallery && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={()=>setShowGallery(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden" onClick={e=>e.stopPropagation()}>
            {/* 📊 Gallery Header with Stats and Slideshow */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <div className="text-white font-semibold flex items-center gap-2">
                  <Image className="w-5 h-5 text-purple-400" />
                  Gallery • {highlighted?.name}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-blue-400">
                    <BarChart3 className="w-4 h-4" />
                    <span>Total Images: <strong>{galleryImages.length}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-gray-300 text-sm flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={slideshowActive}
                        onChange={toggleSlideshow}
                        className="rounded" 
                      />
                      <div className="flex items-center gap-1">
                        {slideshowActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        <span>Slideshow</span>
                      </div>
                    </label>
                    {slideshowActive && galleryImages.length > 0 && (
                      <span className="text-xs text-gray-400">({currentSlideIndex + 1}/{galleryImages.length})</span>
                    )}
                  </div>
                </div>
              </div>
              <button className="text-gray-400 hover:text-white" onClick={()=>{
                setSlideshowActive(false);
                if (slideshowInterval) clearInterval(slideshowInterval);
                setShowGallery(false);
              }}>
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <ScrollContainer height="h-[70vh]">
              <div className="p-4 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {galleryImages.map((img, index) => {
                  const isCurrentSlide = slideshowActive && index === currentSlideIndex;
                  const isSettingThisImage = settingDisplayImage === img.url;
                  const isCurrentDisplay = state?.displayImage === img.url;
                  
                  return (
                    <div key={img.id} className={`relative aspect-square rounded-lg overflow-hidden border transition-all ${
                      isCurrentSlide ? 'border-yellow-400 ring-2 ring-yellow-400/50' :
                      isCurrentDisplay ? 'border-green-400 ring-1 ring-green-400/30' :
                      'border-gray-700 hover:border-gray-600'
                    }`}>
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
                      
                      {/* 🖼️ Set as Display Image Button */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateDisplayImage(img.url);
                          }}
                          disabled={isSettingThisImage || isCurrentDisplay}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
                        >
                          {isSettingThisImage ? (
                            <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                          ) : isCurrentDisplay ? (
                            <>✅ Current</>
                          ) : (
                            <>🖼️ Set Display</>
                          )}
                        </button>
                      </div>
                      
                      {/* 🎥 Slideshow indicator */}
                      {isCurrentSlide && (
                        <div className="absolute top-2 left-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold">
                          🎥 LIVE
                        </div>
                      )}
                      
                      {/* Current display indicator */}
                      {isCurrentDisplay && !isCurrentSlide && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white px-1 py-1 rounded text-xs">
                          ✅
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {galleryImages.length === 0 && (
                  <div className="col-span-full text-center text-gray-500 py-8">
                    <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No images yet</p>
                    <p className="text-xs mt-1">Upload some images to see them here</p>
                  </div>
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