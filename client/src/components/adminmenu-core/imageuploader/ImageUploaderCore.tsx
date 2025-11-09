import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Image as ImageIcon, Copy, CheckCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ImageFile {
  filename: string;
  path: string;
  size: number;
  uploadedAt: string;
}

export default function ImageUploaderCore() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/admin/images');
      const data = await response.json();
      setImages(data.images || []);
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
      return `Invalid file type: ${file.type}. Allowed: JPG, PNG, GIF, WEBP`;
    }

    if (file.size > maxSize) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: 10MB`;
    }

    return null;
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const token = localStorage.getItem('sessionToken');
    let successCount = 0;
    let failCount = 0;

    setUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateFile(file);

      if (error) {
        alert(`${file.name}: ${error}`);
        failCount++;
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/media', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (response.ok) {
          successCount++;
        } else {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        failCount++;
      }

      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setUploading(false);
    setUploadProgress(0);

    if (successCount > 0) {
      await loadImages();
      alert(`Successfully uploaded ${successCount} image(s)${failCount > 0 ? `, ${failCount} failed` : ''}!`);
    } else if (failCount > 0) {
      alert(`Failed to upload ${failCount} image(s).`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      console.error('Failed to copy:', error);
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
      handleUpload(e.dataTransfer.files);
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
          <p className="text-sm text-gray-400">Upload and manage game images</p>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
          onChange={(e) => handleUpload(e.target.files)}
          disabled={uploading}
          className="hidden"
          id="file-upload"
        />
        
        {uploading ? (
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-purple-300 font-semibold">Uploading {uploadProgress}%</p>
            <div className="w-full max-w-md mx-auto bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-purple-500 h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h4 className="text-lg font-semibold text-white mb-2">Drop images here or click to browse</h4>
            <p className="text-sm text-gray-400 mb-4">Supports JPG, PNG, GIF, WEBP (Max 10MB per file)</p>
            <label
              htmlFor="file-upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Choose Files
            </label>
          </>
        )}
      </div>

      {/* Gallery */}
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
            <div key={image.filename} className="bg-gray-800 rounded-lg overflow-hidden group hover:bg-gray-750 transition-all hover:scale-105">
              <div className="aspect-square bg-gray-900 flex items-center justify-center overflow-hidden">
                <img
                  src={image.path}
                  alt={image.filename}
                  className="max-w-full max-h-full object-contain"
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
      
      {!loading && images.length > 0 && (
        <div className="text-sm text-gray-400 text-center pt-2 border-t border-gray-800">
          Total Images: {images.length} • Total Size: {formatFileSize(images.reduce((sum, img) => sum + img.size, 0))}
        </div>
      )}
    </div>
  );
}