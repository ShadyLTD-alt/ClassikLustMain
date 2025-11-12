import React, { useState, useEffect } from 'react';
import { X, Crown, Star, Lock, Unlock, Sparkles, Play, Pause, Image, BarChart3, AlertTriangle } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { ScrollContainer } from '@/components/layout/ScrollContainer';
// (keep Character, CharacterSelectionScrollableProps, etc. as before)

const CharacterSelectionScrollable: React.FC<CharacterSelectionScrollableProps> = ({ 
  isOpen, 
  onClose, 
  onSelect 
}) => {
  const { state, characters, images, selectCharacter, dispatch } = useGame();
  const [highlighted, setHighlighted] = useState<Character | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unlocked' | 'locked' | 'vip'>('all');
  const [showGallery, setShowGallery] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [settingDisplayImage, setSettingDisplayImage] = useState<string | null>(null);
  const [showForceAll, setShowForceAll] = useState(false); // ADMIN: force-show toggle

  useEffect(() => {
    if (isOpen) {
      console.log('🔥 [CHARACTER_SELECTOR] images loaded', images.length, images);
      console.log('🔥 [CHARACTER_SELECTOR] characters', characters);
    }
  }, [isOpen, images, characters]);

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
  const adminMissingCharId = images.filter(img => !img.characterId || img.characterId === '');
  const adminNoUrl = images.filter(img => !img.url);
  const getImageCount = (id: string) => images.filter(i => i.characterId === id && (!i.isHidden || showForceAll)).length;
  const isHighlightedUnlocked = highlighted && (state?.unlockedCharacters?.includes(highlighted.id) || highlighted.unlockLevel <= (state?.level || 1));
  const galleryImages = highlighted ? images.filter(img => img.characterId === highlighted.id && (!img.isHidden || showForceAll)) : [];

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
              {process.env.NODE_ENV === 'development' && state?.selectedCharacterId && (
                <div className="text-xs text-purple-400">Current: {state.selectedCharacterId}</div>
              )}
            </div>
            <div className="flex bg-gray-800 rounded-lg p-1 ml-6">
              {['all','unlocked','locked','vip'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-3 py-1 rounded-md text-xs font-semibold ${activeTab===tab?'bg-purple-600 text-white':'text-gray-400 hover:text-white hover:bg-gray-700'}`}>{tab[0].toUpperCase()+tab.slice(1)}</button>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800/50"><X className="w-5 h-5"/></button>
        </div>
        {(state?.isAdmin || process.env.NODE_ENV === 'development') && (
          <div className="bg-yellow-700/10 text-yellow-300 text-xs px-4 py-2 border-b border-yellow-700 flex gap-4 items-center">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Debug: {images.length} total images • {adminMissingCharId.length} missing characterId • {adminNoUrl.length} missing URL
            <button className="ml-8 text-yellow-300 underline" onClick={()=>setShowForceAll(v=>!v)}>
              {showForceAll ? 'Hide Hidden Images' : 'Show All (ignore isHidden)'}
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0">
          <ScrollContainer height="h-full">
            <div className="p-6">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 pb-4">
                {filtered.map(c => {
                  const unlocked = state?.unlockedCharacters?.includes(c.id) || c.unlockLevel <= (state?.level || 1);
                  const rare = { border: 'border-gray-400 ring-gray-400/30', bg: 'bg-gray-900/20', gradient: 'from-gray-600 to-gray-800' };
                  const selected = highlighted?.id === c.id;
                  const isCurrentlySelected = state?.selectedCharacterId === c.id;
                  const fallbackImage = c.displayImage || c.defaultImage || c.avatarImage || null;
                  return (
                    <div key={c.id} onClick={() => setHighlighted(c as any)} className={`relative bg-gray-800/50 border-2 rounded-xl p-2 cursor-pointer transition-all ${
                      isCurrentlySelected ? 'border-green-400 ring-2 ring-green-400/50 bg-green-900/20' :
                      selected ? `${rare.border} ring-2 ring-purple-400/50 bg-purple-900/30` : 
                      unlocked ? `${rare.border}` : 'border-gray-600 opacity-60'
                    }`}>
                      <div className="aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                        {!unlocked ? (
                          <div className="text-center"><Lock className="w-6 h-6 text-gray-500 mb-1"/><div className="text-xs text-gray-400 font-semibold">Lv{c.unlockLevel}</div></div>
                        ) : fallbackImage ? (
                          <img 
                            src={fallbackImage} 
                            alt={c.name} 
                            className="w-full h-full object-cover" 
                            onError={() => setImageErrors(prev => new Set(prev).add(fallbackImage))}
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
                        {isCurrentlySelected && (
                          <div className="text-xs text-green-400 font-semibold">✅ Active</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollContainer>
        </div>
        <div className="border-t border-gray-700 p-4 bg-gray-800/50 flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            {highlighted ? (<>
              Selected: <strong className="text-purple-400">{highlighted.name}</strong> • Gallery: <strong>{getImageCount(highlighted.id)} images</strong>
              {state?.selectedCharacterId === highlighted.id && (
                <span className="text-green-400 ml-2">✅ Currently Active</span>
              )}
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
              onClick={() => highlighted && isHighlightedUnlocked && selectCharacter(highlighted.id)} 
              disabled={!highlighted || !isHighlightedUnlocked || saving || state?.selectedCharacterId === highlighted?.id} 
              className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 min-w-[80px]"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : state?.selectedCharacterId === highlighted?.id ? 'Selected' : 'Select'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterSelectionScrollable;
