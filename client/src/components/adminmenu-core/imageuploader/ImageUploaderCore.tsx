import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Image as ImageIcon, Copy, CheckCircle, X } from 'lucide-react';
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

export default function ImageUploaderCore() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available characters list
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
      console.log('📷 [GALLERY] Loaded images:', data);
      setImages(data.media || []);
    } catch (error) {
      console.error('Failed to load images:', error);
      alert('Failed to load images. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

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

  const addPose = (index: number, pose: string) => {
    if (!pose.trim()) return;
    const updated = [...pendingUploads];
    if (!updated[index].metadata.poses.includes(pose)) {
      updated[index].metadata.poses.push(pose);
      setPendingUploads(updated);
    }
  };

  const removePose = (uploadIndex: number, poseIndex: number) => {
    const updated = [...pendingUploads];
    updated[uploadIndex].metadata.poses.splice(poseIndex, 1);
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

        console.log('📤 [UPLOAD] Uploading:', pending.file.name, 'with metadata:', pending.metadata);

        const response = await fetch('/api/media', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ [UPLOAD] Success:', result);
          successCount++;
          URL.revokeObjectURL(pending.preview);
        } else {
          const errorText = await response.text();
          console.error('❌ [UPLOAD] Failed:', response.status, errorText);
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
    if (!confirm(`Delete image "${filename}"? This cannot be undone.`)) return;
    
    try {
      const response = await apiRequest(`/api/admin/images/${encodeURIComponent(filename)}`, { method: 'DELETE' });
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
            Image Management
          </h3>
          <p className="text-sm text-gray-400">Upload images with metadata and character assignment</p>
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
        <p className="text-sm text-gray-400 mb-4">Supports JPG, PNG, GIF, WEBP (Max 10MB)</p>
        <label
          htmlFor="file-upload"
          className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors cursor-pointer"
        >
          <ImageIcon className="w-4 h-4" />
          Choose Files
        </label>
      </div>

      {/* Pending Uploads with Metadata */}
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
                  {/* Image Preview */}
                  <div className="w-32 h-32 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={pending.preview} alt="Preview" className="w-full h-full object-cover" />
                  </div>

                  {/* Metadata Form */}
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-white truncate">{pending.file.name}</p>
                      <button
                        onClick={() => removePending(idx)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* ✅ CHARACTER SELECTION */}
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
                        <label className="text-xs text-gray-400">Image Type</label>
                        <select
                          value={pending.metadata.type}
                          onChange={(e) => updatePendingMetadata(idx, 'type', e.target.value)}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        >
                          <option value="Character">Character</option>
                          <option value="Background">Background</option>
                          <option value="Item">Item</option>
                          <option value="UI">UI Element</option>
                          <option value="Icon">Icon</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-400">Level Required</label>
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
                          className="rounded"
                        />
                        NSFW
                      </label>
                      <label className="flex items-center gap-1 text-gray-300">
                        <input
                          type="checkbox"
                          checked={pending.metadata.vip}
                          onChange={(e) => updatePendingMetadata(idx, 'vip', e.target.checked)}
                          className="rounded"
                        />
                        VIP
                      </label>
                      <label className="flex items-center gap-1 text-gray-300">
                        <input
                          type="checkbox"
                          checked={pending.metadata.event}
                          onChange={(e) => updatePendingMetadata(idx, 'event', e.target.checked)}
                          className="rounded"
                        />
                        Event
                      </label>
                      <label className="flex items-center gap-1 text-gray-300">
                        <input
                          type="checkbox"
                          checked={pending.metadata.random}
                          onChange={(e) => updatePendingMetadata(idx, 'random', e.target.checked)}
                          className="rounded"
                        />
                        Random
                      </label>
                      <label className="flex items-center gap-1 text-gray-300">
                        <input
                          type="checkbox"
                          checked={pending.metadata.hideFromGallery}
                          onChange={(e) => updatePendingMetadata(idx, 'hideFromGallery', e.target.checked)}
                          className="rounded"
                        />
                        Hide
                      </label>
                      <label className="flex items-center gap-1 text-gray-300">
                        <input
                          type="checkbox"
                          checked={pending.metadata.enableForChat}
                          onChange={(e) => updatePendingMetadata(idx, 'enableForChat', e.target.checked)}
                          className="rounded"
                        />
                        Chat
                      </label>
                    </div>

                    {/* ✅ CHAT SEND PERCENT */}
                    {pending.metadata.enableForChat && (
                      <div>
                        <label className="text-xs text-gray-400 flex items-center justify-between">
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

                    {/* Poses */}
                    <div>
                      <label className="text-xs text-gray-400">Poses (comma-separated)</label>
                      <input
                        type="text"
                        placeholder="sitting, bikini, standing"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = (e.target as HTMLInputElement).value;
                            const poses = value.split(',').map(p => p.trim()).filter(Boolean);
                            poses.forEach(p => addPose(idx, p));
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      />
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pending.metadata.poses.map((pose, pIdx) => (
                          <span key={pIdx} className="px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded-full text-xs flex items-center gap-1">
                            {pose}
                            <button
                              onClick={() => removePose(idx, pIdx)}
                              className="hover:text-red-400"
                            >
                              <X className="w-2 h-2" />
                            </button>
                          </span>
                        ))}
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
        <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
          🖼️ Uploaded Images
          {images.length > 0 && <span className="text-sm text-gray-500">({images.length})</span>}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-400">Loading images...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="col-span-full text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
              <p className="text-gray-400 mb-2">No images uploaded yet.</p>
              <p className="text-sm text-gray-500">Upload your first image to get started!</p>
            </div>
          ) : (
            images.map((image) => (
              <div key={image.filename} className="bg-gray-800 rounded-lg overflow-hidden group hover:bg-gray-750 transition-all">
                <div className="aspect-square bg-gray-900 flex items-center justify-center overflow-hidden">
                  <img
                    src={image.path}
                    alt={image.filename}
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      console.error('🖼️ [GALLERY] Failed to load image:', image.path);
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23888"%3EError%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm text-white truncate font-medium" title={image.filename}>
                    {image.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(image.size)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(image.path)}
                      className={`flex-1 p-2 text-white rounded transition-colors flex items-center justify-center gap-1 text-xs ${
                        copiedUrl === image.path 
                          ? 'bg-green-600' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      title="Copy URL"
                    >
                      {copiedUrl === image.path ? (
                        <><CheckCircle className="w-3 h-3" /> Copied!</>
                      ) : (
                        <><Copy className="w-3 h-3" /> Copy</>  
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(image.filename)}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {!loading && images.length > 0 && (
        <div className="text-sm text-gray-400 text-center pt-2 border-t border-gray-800">
          Total Images: {images.length} • Total Size: {formatFileSize(images.reduce((sum, img) => sum + img.size, 0))}
        </div>
      )}
    </div>
  );
}