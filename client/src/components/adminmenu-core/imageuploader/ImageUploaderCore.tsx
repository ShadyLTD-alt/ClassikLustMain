import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';

interface UploadedImage {
  filename: string;
  path: string;
  size: number;
  uploadedAt: string;
}

export default function ImageUploaderCore() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/images');
      const data = await response.json();
      setImages(data.images || []);
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      const response = await fetch('/api/admin/images', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await loadImages();
        e.target.value = ''; // Reset input
      } else {
        alert('Failed to upload images');
      }
    } catch (error) {
      console.error('Failed to upload images:', error);
      alert('Failed to upload images. Check console for details.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete image "${filename}"? This cannot be undone.`)) return;
    
    try {
      const response = await fetch(`/api/admin/images/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadImages();
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Image Management</h3>
        <label className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Upload Images'}
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          <p className="text-gray-400 col-span-full">Loading images...</p>
        ) : images.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <ImageIcon className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No images uploaded yet. Upload your first image!</p>
          </div>
        ) : (
          images.map((image) => (
            <div key={image.filename} className="bg-gray-800 rounded-lg overflow-hidden group relative">
              <div className="aspect-square">
                <img
                  src={image.path}
                  alt={image.filename}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <p className="text-xs text-white truncate" title={image.filename}>
                  {image.filename}
                </p>
                <p className="text-xs text-gray-500">{formatFileSize(image.size)}</p>
              </div>
              <button
                onClick={() => handleDelete(image.filename)}
                className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}