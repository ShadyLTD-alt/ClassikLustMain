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

  // Debug helpers
  useEffect(() => {
    if (isOpen) {
      console.log('🔥 [CHARACTER_SELECTOR] images loaded', images.length, images);
      console.log('🔥 [CHARACTER_SELECTOR] characters', characters);
    }
  }, [isOpen, images, characters]);

  // --- filterCharacters helper
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

  // ... Add all pervious modal, grid, UI code here ...

  if (!isOpen) return null;
  const filtered = filterCharacters();
  const adminMissingCharId = images.filter(img => !img.characterId || img.characterId === '');
  const adminNoUrl = images.filter(img => !img.url);
  const getImageCount = (id: string) => images.filter(i => i.characterId === id && (!i.isHidden || showForceAll)).length;
  const isHighlightedUnlocked = highlighted && (state?.unlockedCharacters?.includes(highlighted.id) || highlighted.unlockLevel <= (state?.level || 1));
  const galleryImages = highlighted ? images.filter(img => img.characterId === highlighted.id && (!img.isHidden || showForceAll)) : [];

  // ... return the full modal JSX logic instead of return null ...

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* ... header, grid, debug info, modal, and gallery as in working version ... */}
        {/* To keep it concise here, use your last working UI block! */}
      </div>
    </div>
  );
};

export default CharacterSelectionScrollable;
