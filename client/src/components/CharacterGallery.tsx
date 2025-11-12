import { Lock } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollContainer } from '@/components/layout/ScrollContainer';
import { useState } from 'react';

interface CharacterGalleryProps {
  inline?: boolean;
}

export default function CharacterGallery({ inline = false }: CharacterGalleryProps) {
  const { state, images, characters, selectImage } = useGame();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  console.log('🖼️ [GALLERY] Rendering with images:', images.length);

  const ImageCard = ({ image }: any) => {
    const character = characters.find(c => c.id === image.characterId);
    const isUnlocked = !image.unlockLevel || state.level >= image.unlockLevel;
    const isSelected = state.selectedImageId === image.id;
    
    return (
      <div
        style={{ contentVisibility: 'auto' }}
        className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all duration-200 ${
          isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-card-border'
        } ${
          isUnlocked 
            ? 'hover:border-primary/70 hover:scale-105 hover:shadow-lg cursor-pointer transform-gpu' 
            : 'opacity-50 cursor-not-allowed'
        }`}
        onClick={() => {
          if (isUnlocked && image.id) {
            console.log('🖼️ [GALLERY] Selecting image:', image.id);
            selectImage(image.id);
          }
        }}
        data-testid={`image-${image.id}`}
      >
        {image.url ? (
          <img
            src={image.url}
            alt={image.id || 'Gallery Image'}
            className={`w-full h-full object-cover transition-all duration-200 ${
              !isUnlocked ? 'grayscale' : 'grayscale-0'
            }`}
            loading="lazy"
            onError={(e) => {
              console.error('🖼️ [GALLERY] Image load failed:', image.url);
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EError%3C/text%3E%3C/svg%3E';
            }}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-xs text-center px-2">No Image URL</span>
          </div>
        )}

        {!isUnlocked && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <Lock className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm font-medium text-center">
              Level {image.unlockLevel}
            </span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <p className="font-semibold text-sm text-white text-center mb-1 truncate">
            {character?.name || image.characterId || 'Unknown'}
          </p>
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {image.categories && image.categories.length > 0 && (
              <Badge variant="secondary" className="text-xs bg-purple-500/30 text-purple-300 border-purple-500/50">
                {image.categories[0]}
              </Badge>
            )}
            {image.poses && image.poses.length > 0 && (
              <Badge variant="secondary" className="text-xs bg-blue-500/30 text-blue-300 border-blue-500/50">
                {image.poses[0]}
              </Badge>
            )}
          </div>
        </div>

        {isSelected && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-primary text-primary-foreground pulse-ring">
              Active
            </Badge>
          </div>
        )}
      </div>
    );
  };

  const filteredImages = selectedFilter === 'all' 
    ? images 
    : images.filter(img => img.characterId === selectedFilter);

  const GalleryGrid = () => {
    console.log('🖼️ [GALLERY] Rendering grid with', filteredImages.length, 'images');
    
    return (
      <div>
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4 overflow-x-auto p-2">
          <Button
            variant={selectedFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('all')}
          >
            All ({images.length})
          </Button>
          {characters.map(char => {
            const count = images.filter(img => img.characterId === char.id).length;
            if (count === 0) return null;
            return (
              <Button
                key={char.id}
                variant={selectedFilter === char.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter(char.id)}
              >
                {char.name} ({count})
              </Button>
            );
          })}
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
          {filteredImages.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <p className="text-lg font-medium mb-2">No Images Available</p>
              <p className="text-sm text-center">Upload images in the admin panel to see them here!</p>
            </div>
          )}
          {filteredImages.map((image, idx) => (
            <ImageCard key={image.id || `img-${idx}`} image={image} />
          ))}
        </div>
      </div>
    );
  };

  if (inline) {
    return (
      <div className="h-64 overflow-hidden">
        <ScrollContainer height="h-64">
          <GalleryGrid />
        </ScrollContainer>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-open-gallery" className="hover:bg-primary/10">
          🖼️ Gallery ({images.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🖼️ Image Gallery
            <Badge variant="outline">
              {images.length} Images
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <ScrollContainer height="h-[70vh]">
            <GalleryGrid />
          </ScrollContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}