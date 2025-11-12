import React from 'react';

export default function GalleryGrid({ images, characters, onImageClick }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((img) => (
        <div key={img.filename} className="bg-gray-800 rounded-lg overflow-hidden group hover:bg-gray-750 transition-all">
          <div className="aspect-square bg-gray-900 flex items-center justify-center overflow-hidden relative">
            <img
              src={img.path}
              alt={img.filename}
              className="max-w-full max-h-full object-contain"
              onClick={() => onImageClick && onImageClick(img)}
              style={{ cursor: onImageClick ? 'pointer' : 'default' }}
            />
            {img.metadata?.nsfw && (
              <span className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded">NSFW</span>
            )}
            {img.metadata?.vip && (
              <span className="absolute top-2 left-2 px-2 py-1 bg-yellow-600 text-white text-xs rounded">VIP</span>
            )}
          </div>
          <div className="p-3 space-y-2">
            <div>
              <p className="text-sm text-white truncate font-medium" title={img.filename}>{img.filename}</p>
              <div className="flex gap-2 mt-1">
                {img.metadata?.characterId && (
                  <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded-full">
                    {characters.find(c => c.id === img.metadata.characterId)?.name || img.metadata.characterId}
                  </span>
                )}
                {img.metadata?.type && (
                  <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded-full">{img.metadata.type}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
