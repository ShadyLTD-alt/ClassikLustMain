import { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ImageUploaderProps {
  adminMode?: boolean;
}

export default function ImageUploader({ adminMode = false }: ImageUploaderProps) {
  const { state, characters, images, addImage, removeImage, selectImage } = useGame();
  const [categories, setCategories] = useState({
    nsfw: false,
    vip: false,
    event: false,
    random: false
  });

  const selectedCharacter = characters.find(c => c.id === state.selectedCharacterId);
  const characterImages = images.filter(img => img.characterId === state.selectedCharacterId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      addImage({
        id: `img-${Date.now()}`,
        characterId: state.selectedCharacterId,
        url: imageUrl,
        unlockLevel: state.level,
        categories: { ...categories }
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const UploaderContent = () => (
    <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 hover-elevate flex flex-col items-center justify-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload image</span>
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    data-testid="input-image-upload"
                  />
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="nsfw"
                    checked={categories.nsfw}
                    onCheckedChange={(checked) => setCategories(prev => ({ ...prev, nsfw: !!checked }))}
                    data-testid="checkbox-nsfw"
                  />
                  <Label htmlFor="nsfw" className="cursor-pointer">NSFW Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vip"
                    checked={categories.vip}
                    onCheckedChange={(checked) => setCategories(prev => ({ ...prev, vip: !!checked }))}
                    data-testid="checkbox-vip"
                  />
                  <Label htmlFor="vip" className="cursor-pointer">VIP Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="event"
                    checked={categories.event}
                    onCheckedChange={(checked) => setCategories(prev => ({ ...prev, event: !!checked }))}
                    data-testid="checkbox-event"
                  />
                  <Label htmlFor="event" className="cursor-pointer">Event Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="random"
                    checked={categories.random}
                    onCheckedChange={(checked) => setCategories(prev => ({ ...prev, random: !!checked }))}
                    data-testid="checkbox-random"
                  />
                  <Label htmlFor="random" className="cursor-pointer">Random Sending</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="font-semibold mb-2">Uploaded Images ({characterImages.length})</h3>
            <ScrollArea className="h-[300px]">
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {characterImages.map(image => {
                  const isSelected = state.selectedImageId === image.id;
                  const isUnlocked = state.level >= image.unlockLevel;

                  return (
                    <div
                      key={image.id}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                        isSelected ? 'border-primary' : 'border-card-border'
                      } ${isUnlocked ? 'hover-elevate cursor-pointer' : 'opacity-50'}`}
                      onClick={() => isUnlocked && selectImage(image.id)}
                      data-testid={`image-${image.id}`}
                    >
                      <img
                        src={image.url}
                        alt="Character"
                        className={`w-full h-full object-cover ${!isUnlocked && 'blur-sm'}`}
                      />
                      
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(image.id);
                        }}
                        data-testid={`button-delete-${image.id}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>

                      <div className="absolute bottom-0 left-0 right-0 bg-background/90 p-1 flex flex-wrap gap-1">
                        {image.categories.nsfw && <Badge variant="destructive" className="text-xs px-1">NSFW</Badge>}
                        {image.categories.vip && <Badge variant="secondary" className="text-xs px-1">VIP</Badge>}
                        {image.categories.event && <Badge className="text-xs px-1">Event</Badge>}
                        {image.categories.random && <Badge variant="outline" className="text-xs px-1">Random</Badge>}
                      </div>

                      {isSelected && (
                        <div className="absolute top-1 left-1">
                          <Badge className="bg-primary text-xs">Active</Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
  );

  if (adminMode) {
    return <UploaderContent />;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-open-uploader">
          <ImageIcon className="w-4 h-4 mr-2" />
          Image Gallery
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Image Gallery - {selectedCharacter?.name}</DialogTitle>
        </DialogHeader>
        <UploaderContent />
      </DialogContent>
    </Dialog>
  );
}
