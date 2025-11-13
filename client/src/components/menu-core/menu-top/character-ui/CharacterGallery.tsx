import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Lock, Image as ImageIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CharacterGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GalleryImage {
  id: string;
  filename: string;
  path: string;
  characterId: string;
  type: string;
  unlockLevel?: number;
  isUnlocked: boolean;
  metadata: {
    nsfw: boolean;
    vip: boolean;
    poses: string[];
  };
}

export default function CharacterGallery({ isOpen, onClose }: CharacterGalleryProps) {
  const { state, characters } = useGame();
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingImage, setSettingImage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCharacter) {
      loadImages(selectedCharacter);
    }
  }, [selectedCharacter]);

  useEffect(() => {
    if (isOpen && state.activeCharacter && !selectedCharacter) {
      setSelectedCharacter(state.activeCharacter);
    }
  }, [isOpen, state.activeCharacter]);

  const loadImages = async (characterId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiRequest(`/api/media`, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        const characterImages = (data.media || [])
          .filter((img: any) => img.metadata?.characterId?.toLowerCase() === characterId.toLowerCase())
          .map((img: any) => ({
            id: img.filename.split('.')[0],
            filename: img.filename,
            path: img.path,
            characterId: img.metadata?.characterId || characterId,
            type: img.metadata?.type || 'default',
            unlockLevel: img.metadata?.unlockLevel || 1,
            isUnlocked: !img.metadata?.unlockLevel || state.level >= img.metadata.unlockLevel,
            metadata: {
              nsfw: img.metadata?.categories?.includes('nsfw') || false,
              vip: img.metadata?.categories?.includes('vip') || false,
              poses: img.metadata?.poses || []
            }
          }));
        setImages(characterImages);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to load images');
        setImages([]);
      }
    } catch (err) {
      console.error('Error loading images:', err);
      setError('Network error - please try again');
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  // UPDATED: send the image path as imageUrl
  const handleSetDisplayImage = async (imageId: string) => {
    try {
      const selected = images.find(i => i.id === imageId);
      if (!selected) return;
      setSettingImage(imageId);
      setError(null);
      const response = await apiRequest('/api/player/set-display-image', {
        method: 'POST',
        body: JSON.stringify({
          imageUrl: selected.path,
          characterId: selectedCharacter,
        }),
      });
      if (response.ok) {
        await loadImages(selectedCharacter);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to set display image');
      }
    } catch (err) {
      console.error('Error setting display image:', err);
      setError('Network error - please try again');
    } finally {
      setSettingImage(null);
    }
  };

  if (!isOpen) return null;

  const unlockedImages = images.filter(img => img.isUnlocked);
  const lockedImages = images.filter(img => !img.isUnlocked);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative p-6 border-b border-purple-500/30 bg-gradient-to-r from-purple-900/40 to-pink-900/40 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                🖼️ Gallery
              </h2>
              <p className="text-sm text-gray-300 mt-1">
                Select an image as your display picture
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <span className="text-white text-xl">×</span>
            </button>
          </div>
          {/* Character Filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-300 font-medium">Character:</label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {characters
                .filter(char => !char.unlockLevel || state.level >= char.unlockLevel)
                .map(character => (
                  <button
                    key={character.id}
                    onClick={() => setSelectedCharacter(character.id)}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap
                      ${selectedCharacter === character.id
                        ? 'bg-purple-500 text-white shadow-lg'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}
                    `}
                  >
                    {character.name}
                  </button>
                ))
              }
            </div>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              ⚠️ {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading images...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Unlocked Images */}
              {unlockedImages.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>✨ Available Images</span>
                    <span className="text-xs text-gray-400">({unlockedImages.length})</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {unlockedImages.map((image) => (
                      <button
                        key={image.id}
                        onClick={() => handleSetDisplayImage(image.id)}
                        disabled={settingImage === image.id}
                        className="relative group aspect-[3/4] rounded-xl overflow-hidden border-2 border-purple-500/30 hover:border-purple-500 hover:scale-105 transition-all duration-200 bg-gray-900"
                      >
                        <img
                          src={image.path}
                          alt={image.filename}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = '/placeholder-image.png'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                          <div className="p-3 w-full">
                            <p className="text-white text-xs font-semibold truncate">{image.filename}</p>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {image.metadata.nsfw && (
                                <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-medium">NSFW</span>
                              )}
                              {image.metadata.vip && (
                                <span className="px-2 py-0.5 bg-yellow-500 text-black text-[10px] rounded-full font-medium">VIP</span>
                              )}
                              {image.type && (
                                <span className="px-2 py-0.5 bg-purple-500 text-white text-[10px] rounded-full font-medium">{image.type}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {settingImage === image.id && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ImageIcon className="w-4 h-4 text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Locked Images */}
              {lockedImages.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>🔒 Locked Images</span>
                    <span className="text-xs text-gray-400">({lockedImages.length})</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {lockedImages.map((image) => (
                      <div
                        key={image.id}
                        className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-gray-700 bg-gray-900 opacity-60"
                      >
                        <img
                          src={image.path}
                          alt={image.filename}
                          className="w-full h-full object-cover blur-sm"
                        />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="text-center">
                            <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-300 font-semibold">
                              Level {image.unlockLevel || '?'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!loading && images.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-400 text-lg font-medium">No images available</p>
                  <p className="text-gray-500 text-sm mt-2">
                    {selectedCharacter ? 'No images found for this character' : 'Select a character to view their gallery'}
                  </p>
                </div>
              )}
              {!selectedCharacter && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">👆</span>
                  </div>
                  <p className="text-gray-400 text-lg font-medium">Select a character</p>
                  <p className="text-gray-500 text-sm mt-2">Choose a character above to view their gallery</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
