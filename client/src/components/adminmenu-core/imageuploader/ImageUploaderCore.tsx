import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
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

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('GET', '/api/admin/images');
      const data = await response.json();
      setImages(data.images || []);
    } catch (error) {
      console.error('Failed to load images:', error);
      alert('Failed to load images. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('sessionToken');
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        await loadImages();
        alert('Image uploaded successfully!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image.');
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete image "${filename}"? This cannot be undone.`)) return;
    
    try {
      const response = await apiRequest('DELETE', `/api/admin/images/${encodeURIComponent(filename)}`);
      if (response.ok) {
        await loadImages();
        alert('Image deleted successfully!');
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
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
            <ImageIcon className="w-5 h-5" />
            Image Management
          </h3>
          <p className="text-sm text-gray-400">Upload and manage game images</p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Upload Image'}
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-400">Loading images...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="col-span-full text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <p className="text-gray-400 mb-2">No images found.</p>
            <p className="text-sm text-gray-500">Upload your first image to get started!</p>
          </div>
        ) : (
          images.map((image) => (
            <div key={image.filename} className="bg-gray-800 rounded-lg overflow-hidden group hover:bg-gray-750 transition-colors">
              <div className="aspect-square bg-gray-900 flex items-center justify-center">
                <img
                  src={image.path}
                  alt={image.filename}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="p-3">
                <p className="text-sm text-white truncate" title={image.filename}>
                  {image.filename}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(image.size)}
                </p>
                <button
                  onClick={() => handleDelete(image.filename)}
                  className="mt-2 w-full p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
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