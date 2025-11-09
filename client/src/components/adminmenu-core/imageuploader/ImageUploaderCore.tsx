import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Image as ImageIcon, Copy, CheckCircle, X, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ImageFile {
  filename: string;
  path: string;
  size: number;
  uploadedAt: string;
}

interface ImageMetadata {
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
}

interface PendingUpload {
  file: File;
  preview: string;
  metadata: ImageMetadata;
}

// 🏷️ PERSISTENT POSES MANAGER
const POSES_STORAGE_KEY = 'classiklust_global_poses';

const getPersistentPoses = (): string[] => {
  try {
    const stored = localStorage.getItem(POSES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : ['standing', 'sitting', 'laying', 'bikini', 'nude', 'clothed'];
  } catch {
    return ['standing', 'sitting', 'laying', 'bikini', 'nude', 'clothed'];
  }
};

const savePersistentPoses = (poses: string[]) => {
  localStorage.setItem(POSES_STORAGE_KEY, JSON.stringify(poses));
};

export default function ImageUploaderCore() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [globalPoses, setGlobalPoses] = useState<string[]>(getPersistentPoses());
  const [newPoseName, setNewPoseName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableCharacters = [
    { id: 'aria', name: 'Aria' },
    { id: 'frost', name: 'Frost' },
    { id: 'shadow', name: 'Shadow' },
    { id: 'ember', name: 'Ember' },
    { id: 'luna', name: 'Luna' },
    { id: 'stella', name: 'Stella' },
    { id: 'nova', name: 'Nova' },
    { id: 'other', name: 'Other/None' }
  ];

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/media');
      const data = await response.json();
      setImages(data.media || []);
    } catch (error) {
      console.error('Failed to load images:', error);
      alert('Failed to load images.');
    } finally {
      setLoading(false);
    }
  };

  const addGlobalPose = () => {
    if (!newPoseName.trim()) return;
    const trimmed = newPoseName.trim().toLowerCase();
    if (globalPoses.includes(trimmed)) {
      alert('Pose already exists!');
      return;
    }
    const updated = [...globalPoses, trimmed];
    setGlobalPoses(updated);
    savePersistentPoses(updated);
    setNewPoseName('');
    console.log('✅ [POSES] Added global pose:', trimmed);
  };

  const removeGlobalPose = (pose: string) => {
    const updated = globalPoses.filter(p => p !== pose);
    setGlobalPoses(updated);
    savePersistentPoses(updated);
    console.log('❌ [POSES] Removed global pose:', pose);
  };

  const togglePoseForUpload = (uploadIndex: number, pose: string) => {
    const updated = [...pendingUploads];
    const poses = updated[uploadIndex].metadata.poses;
    if (poses.includes(pose)) {
      updated[uploadIndex].metadata.poses = poses.filter(p => p !== pose);
    } else {
      updated[uploadIndex].metadata.poses = [...poses, pose];
    }
    setPendingUploads(updated);
  };

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type: ${file.type}`;
    }

    if (file.size > maxSize) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (Max: 10MB)`;
    }

    return null;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newPending: PendingUpload[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateFile(file);

      if (error) {
        alert(`${file.name}: ${error}`);
        continue;
      }

      const preview = URL.createObjectURL(file);
      newPending.push({
        file,
        preview,
        metadata: {
          characterId: 'aria',
          type: 'Character',
          levelRequired: 1,
          nsfw: false,
          vip: false,
          event: false,
          hideFromGallery: false,
          random: false,
          enableForChat: false,
          chatSendPercent: 0,
          poses: []
        }
      });
    }

    setPendingUploads([...pendingUploads, ...newPending]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePending = (index: number) => {
    const updated = [...pendingUploads];
    URL.revokeObjectURL(updated[index].preview);
    updated.splice(index, 1);
    setPendingUploads(updated);
  };

  const updatePendingMetadata = (index: number, field: keyof ImageMetadata, value: any) => {
    const updated = [...pendingUploads];
    updated[index].metadata = { ...updated[index].metadata, [field]: value };
    setPendingUploads(updated);
  };

  const handleUploadAll = async () => {
    if (pendingUploads.length === 0) return;

    setUploading(true);
    const token = localStorage.getItem('sessionToken');
    let successCount = 0;
    let failCount = 0;

    for (const pending of pendingUploads) {
      try {
        const formData = new FormData();
        formData.append('file', pending.file);
        formData.append('metadata', JSON.stringify(pending.metadata));

        const response = await fetch('/api/media', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (response.ok) {
          successCount++;
          URL.revokeObjectURL(pending.preview);
        } else {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Failed to upload ${pending.file.name}:`, error);
        failCount++;
      }
    }

    setUploading(false);
    setPendingUploads([]);

    if (successCount > 0) {
      await loadImages();
      alert(`Successfully uploaded ${successCount} image(s)${failCount > 0 ? `, ${failCount} failed` : ''}!`);
    } else if (failCount > 0) {
      alert(`Failed to upload ${failCount} image(s).`);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete image "${filename}"?`)) return;
    
    try {
      const response = await apiRequest(`/api/media/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      if (response.ok) {
        await loadImages();
        alert('Image deleted successfully!');
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert('Failed to delete image.');
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      alert('Failed to copy URL');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Image Upload Manager
          </h3>
          <p className="text-sm text-gray-400">Upload images with metadata (auto-sorted by character/type)</p>
        </div>
      </div>

      {/* 🏷️ PERSISTENT POSES MANAGER */}
      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-purple-300 mb-3">🏷️ Global Poses Library</h4>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newPoseName}
            onChange={(e) => setNewPoseName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addGlobalPose()}
            placeholder="Create new pose..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          />
          <button
            onClick={addGlobalPose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add Pose
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {globalPoses.map((pose) => (
            <span key={pose} className="px-3 py-1 bg-purple-900/50 text-purple-200 rounded-full text-sm flex items-center gap-2">
              {pose}
              <button
                onClick={() => removeGlobalPose(pose)}
                className="hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-purple-500 bg-purple-900/20' 
            : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        
        <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
        <h4 className="text-md font-semibold text-white mb-2">Click to select images</h4>
        <p className="text-sm text-gray-400 mb-4">Auto-sorted by character → type (e.g. /aria/avatar/)</p>
        <label
          htmlFor="file-upload"
          className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors cursor-pointer"
        >
          <ImageIcon className="w-4 h-4" />
          Choose Files
        </label>
      </div>

      {/* Pending Uploads */}
      {pendingUploads.length > 0 && (
        <div className="space-y-4 bg-gray-900/50 p-4 rounded-lg border border-purple-500/30">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-semibold text-purple-300">
              📤 Ready to Upload ({pendingUploads.length} file{pendingUploads.length > 1 ? 's' : ''})
            </h4>
            <button
              onClick={handleUploadAll}
              disabled={uploading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 font-semibold"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload All with Metadata'}
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {pendingUploads.map((pending, idx) => (
              <div key={idx} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex gap-4">
                  <div className="w-32 h-32 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={pending.preview} alt="Preview" className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-white truncate">{pending.file.name}</p>
                      <button onClick={() => removePending(idx)} className="text-gray-400 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-400">Character</label>
                        <select
                          value={pending.metadata.characterId}
                          onChange={(e) => updatePendingMetadata(idx, 'characterId', e.target.value)}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        >
                          {availableCharacters.map(char => (
                            <option key={char.id} value={char.id}>{char.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-gray-400">Type</label>
                        <select
                          value={pending.metadata.type}
                          onChange={(e) => updatePendingMetadata(idx, 'type', e.target.value)}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        >
                          <option value="Avatar">Avatar</option>
                          <option value="Character">Character</option>
                          <option value="NSFW">NSFW</option>
                          <option value="Background">Background</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-400">Level</label>
                        <input
                          type="number"
                          value={pending.metadata.levelRequired}
                          onChange={(e) => updatePendingMetadata(idx, 'levelRequired', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          min="1"
                        />
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <label className="flex items-center gap-1 text-gray-300">
                        <input
                          type="checkbox"
                          checked={pending.metadata.nsfw}
                          onChange={(e) => updatePendingMetadata(idx, 'nsfw', e.target.checked)}
                        />
                        NSFW
                      </label>
                      <label className="flex items-center gap-1 text-gray-300">
                        <input
                          type="checkbox"
                          checked={pending.metadata.vip}
                          onChange={(e) => updatePendingMetadata(idx, 'vip', e.target.checked)}
                        />
                        VIP
                      </label>
                      <label className="flex items-center gap-1 text-gray-300">
                        <input
                          type="checkbox"
                          checked={pending.metadata.enableForChat}
                          onChange={(e) => updatePendingMetadata(idx, 'enableForChat', e.target.checked)}
                        />
                        Chat
                      </label>
                    </div>

                    {/* Chat Send % */}
                    {pending.metadata.enableForChat && (
                      <div>
                        <label className="text-xs text-gray-400 flex justify-between">
                          <span>Chat Send %</span>
                          <span className="text-purple-400 font-semibold">{pending.metadata.chatSendPercent}%</span>
                        </label>
                        <input
                          type="range"
                          value={pending.metadata.chatSendPercent}
                          onChange={(e) => updatePendingMetadata(idx, 'chatSendPercent', parseInt(e.target.value) || 0)}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          min="0"
                          max="100"
                          step="5"
                        />
                      </div>
                    )}

                    {/* ✅ TOGGLE POSES */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Poses (click to toggle)</label>
                      <div className="flex flex-wrap gap-2">
                        {globalPoses.map((pose) => {
                          const isActive = pending.metadata.poses.includes(pose);
                          return (
                            <button
                              key={pose}
                              onClick={() => togglePoseForUpload(idx, pose)}
                              className={`px-3 py-1 rounded-full text-sm transition-all ${
                                isActive
                                  ? 'bg-purple-600 text-white border-2 border-purple-400'
                                  : 'bg-gray-700 text-gray-400 border-2 border-gray-600 hover:border-gray-500'
                              }`}
                            >
                              {isActive && '✓ '}{pose}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gallery */}
      <div>
        <h4 className="text-md font-semibold text-white mb-3">
          🖼️ Recent Uploads {images.length > 0 && `(${images.length})`}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-400">Loading...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="col-span-full text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
              <p className="text-gray-400">No images yet.</p>
            </div>
          ) : (
            images.slice(0, 8).map((image) => (
              <div key={image.filename} className="bg-gray-800 rounded-lg overflow-hidden group">
                <div className="aspect-square bg-gray-900 flex items-center justify-center overflow-hidden">
                  <img src={image.path} alt={image.filename} className="max-w-full max-h-full object-contain" />
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm text-white truncate">{image.filename}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(image.size)}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(image.path)}
                      className={`flex-1 p-2 rounded text-xs ${
                        copiedUrl === image.path ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {copiedUrl === image.path ? <><CheckCircle className="w-3 h-3 inline" /> Copied</> : <><Copy className="w-3 h-3 inline" /> Copy</>}
                    </button>
                    <button onClick={() => handleDelete(image.filename)} className="p-2 bg-red-600 hover:bg-red-700 rounded">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {images.length > 8 && (
          <p className="text-sm text-gray-400 text-center mt-4">
            Showing 8 of {images.length} images. View all in Gallery tab →
          </p>
        )}
      </div>
    </div>
  );
}