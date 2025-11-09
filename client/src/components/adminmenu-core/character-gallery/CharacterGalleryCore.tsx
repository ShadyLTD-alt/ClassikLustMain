import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Eye, Filter, X, Save } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ImageData {
  filename: string;
  path: string;
  size: number;
  uploadedAt: string;
  metadata?: {
    characterId: string;
    type: string;
    levelRequired: number;
    nsfw: boolean;
    vip: boolean;
    event: boolean;
    hideFromGallery: boolean;
    random: boolean;
    enableForChat: boolean;
    chatSendPercent: number;
    poses: string[];
  };
}

export default function CharacterGalleryCore() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingImage, setEditingImage] = useState<ImageData | null>(null);
  const [editedMetadata, setEditedMetadata] = useState<any>(null);

  const characters = [
    { id: 'all', name: 'All Characters' },
    { id: 'aria', name: 'Aria' },
    { id: 'frost', name: 'Frost' },
    { id: 'shadow', name: 'Shadow' },
    { id: 'ember', name: 'Ember' },
    { id: 'luna', name: 'Luna' },
    { id: 'stella', name: 'Stella' },
    { id: 'nova', name: 'Nova' },
  ];

  const types = [
    { id: 'all', name: 'All Types' },
    { id: 'avatar', name: 'Avatar' },
    { id: 'character', name: 'Character' },
    { id: 'nsfw', name: 'NSFW' },
    { id: 'background', name: 'Background' },
    { id: 'other', name: 'Other' },
  ];

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/media');
      const data = await response.json();
      console.log('📸 [GALLERY] Loaded images:', data);
      setImages(data.media || []);
    } catch (error) {
      console.error('Failed to load images:', error);
      alert('Failed to load images.');
    } finally {
      setLoading(false);
    }
  };

  const filteredImages = images.filter(img => {
    const charMatch = selectedCharacter === 'all' || img.metadata?.characterId === selectedCharacter;
    const typeMatch = selectedType === 'all' || img.metadata?.type?.toLowerCase() === selectedType;
    const searchMatch = img.filename.toLowerCase().includes(searchQuery.toLowerCase());
    return charMatch && typeMatch && searchMatch;
  });

  const handleEdit = (image: ImageData) => {
    setEditingImage(image);
    setEditedMetadata({ ...image.metadata });
  };

  const handleSaveEdit = async () => {
    if (!editingImage) return;

    try {
      const response = await apiRequest(`/api/media/${editingImage.filename}`, {
        method: 'PUT',
        body: JSON.stringify({ metadata: editedMetadata })
      });

      if (response.ok) {
        await loadImages();
        setEditingImage(null);
        setEditedMetadata(null);
        alert('✅ Metadata updated!');
      }
    } catch (error) {
      console.error('Failed to update metadata:', error);
      alert('Failed to update metadata.');
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete "${filename}"?`)) return;

    try {
      const response = await apiRequest(`/api/media/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadImages();
        alert('✅ Image deleted!');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete image.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            🖼️ Character Gallery
          </h3>
          <p className="text-sm text-gray-400">Browse and edit uploaded images by character</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Character</label>
          <select
            value={selectedCharacter}
            onChange={(e) => setSelectedCharacter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
          >
            {characters.map(char => (
              <option key={char.id} value={char.id}>{char.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
          >
            {types.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Search</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search filename..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
          />
        </div>
      </div>

      {/* Results Info */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Filter className="w-4 h-4" />
        Showing {filteredImages.length} of {images.length} images
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-400">Loading images...</p>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="col-span-full text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <p className="text-gray-400">No images found.</p>
          </div>
        ) : (
          filteredImages.map((image) => (
            <div key={image.filename} className="bg-gray-800 rounded-lg overflow-hidden group hover:bg-gray-750 transition-all">
              <div className="aspect-square bg-gray-900 flex items-center justify-center overflow-hidden relative">
                <img
                  src={image.path}
                  alt={image.filename}
                  className="max-w-full max-h-full object-contain"
                />
                {image.metadata?.nsfw && (
                  <span className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded">
                    NSFW
                  </span>
                )}
                {image.metadata?.vip && (
                  <span className="absolute top-2 left-2 px-2 py-1 bg-yellow-600 text-white text-xs rounded">
                    VIP
                  </span>
                )}
              </div>
              <div className="p-3 space-y-2">
                <div>
                  <p className="text-sm text-white truncate font-medium" title={image.filename}>
                    {image.filename}
                  </p>
                  <div className="flex gap-2 mt-1">
                    {image.metadata?.characterId && (
                      <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded-full">
                        {characters.find(c => c.id === image.metadata.characterId)?.name || image.metadata.characterId}
                      </span>
                    )}
                    {image.metadata?.type && (
                      <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded-full">
                        {image.metadata.type}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {formatFileSize(image.size)}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(image)}
                    className="flex-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center justify-center gap-1 text-xs"
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(image.filename)}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4" style={{ zIndex: 50 }}>
          <div className="bg-gray-900 rounded-lg w-full max-w-2xl p-6 border border-purple-500/30">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-white">Edit Image Metadata</h4>
              <button onClick={() => setEditingImage(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400">Character</label>
                  <select
                    value={editedMetadata?.characterId || ''}
                    onChange={(e) => setEditedMetadata({ ...editedMetadata, characterId: e.target.value })}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    {characters.filter(c => c.id !== 'all').map(char => (
                      <option key={char.id} value={char.id}>{char.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Type</label>
                  <select
                    value={editedMetadata?.type || ''}
                    onChange={(e) => setEditedMetadata({ ...editedMetadata, type: e.target.value })}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="Avatar">Avatar</option>
                    <option value="Character">Character</option>
                    <option value="NSFW">NSFW</option>
                    <option value="Background">Background</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={editedMetadata?.nsfw || false}
                    onChange={(e) => setEditedMetadata({ ...editedMetadata, nsfw: e.target.checked })}
                  />
                  NSFW
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={editedMetadata?.vip || false}
                    onChange={(e) => setEditedMetadata({ ...editedMetadata, vip: e.target.checked })}
                  />
                  VIP
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={editedMetadata?.enableForChat || false}
                    onChange={(e) => setEditedMetadata({ ...editedMetadata, enableForChat: e.target.checked })}
                  />
                  Chat
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
                <button
                  onClick={() => setEditingImage(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}