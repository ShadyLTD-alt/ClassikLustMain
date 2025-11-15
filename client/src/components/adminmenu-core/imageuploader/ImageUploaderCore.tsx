import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Image as ImageIcon, Copy, CheckCircle, X, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// ...rest of component code above remains the same ...

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('GET', '/api/media');
      const data = await response.json();
      setImages(data.media || []);
    } catch (error) {
      console.error('Failed to load images:', error);
      alert('Failed to load images.');
    } finally {
      setLoading(false);
    }
  };
  // ...rest remains unchanged ...
  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete image "${filename}"?`)) return;
    
    try {
      const response = await apiRequest('DELETE', `/api/media/${encodeURIComponent(filename)}`);
      if (response.ok) {
        await loadImages();
        alert('Image deleted successfully!');
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert('Failed to delete image.');
    }
  };
// ...rest of code below unchanged...
