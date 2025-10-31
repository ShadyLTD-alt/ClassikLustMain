import { useState } from 'react';
import { Upload, X, Image as ImageIcon, Edit } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ImageConfig } from '@shared/gameConfig';

interface ImageUploaderProps {
  adminMode?: boolean;
}

export default function ImageUploader({ adminMode = false }: ImageUploaderProps) {
  const { state, characters, images, addImage, updateImage, removeImage, selectImage, selectAvatar } = useGame();
  const [categories, setCategories] = useState({
    nsfw: false,
    vip: false,
    event: false,
    random: false
  });
  const [unlockLevel, setUnlockLevel] = useState(1);
  const [editingImage, setEditingImage] = useState<ImageConfig | null>(null);

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
        unlockLevel: unlockLevel,
        isAvatar: false,
        isDisplay: false,
        categories: { ...categories }
      });
      setUnlockLevel(1);
      setCategories({ nsfw: false, vip: false, event: false, random: false });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveEdit = () => {
    if (editingImage) {
      updateImage(editingImage);
      setEditingImage(null);
    }
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

              <div>
                <Label htmlFor="unlock-level">Unlock Level Required</Label>
                <Input
                  id="unlock-level"
                  type="number"
                  min="1"
                  value={unlockLevel}
                  onChange={(e) => setUnlockLevel(parseInt(e.target.value) || 1)}
                  data-testid="input-unlock-level"
                />
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
                  const isAvatar = state.selectedAvatarId === image.id;
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
                      
                      <div className="absolute top-1 right-1 flex gap-1">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingImage(image);
                          }}
                          data-testid={`button-edit-${image.id}`}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(image.id);
                          }}
                          data-testid={`button-delete-${image.id}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 bg-background/90 p-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs px-1">Lv.{image.unlockLevel}</Badge>
                        {image.categories.nsfw && <Badge variant="destructive" className="text-xs px-1">NSFW</Badge>}
                        {image.categories.vip && <Badge variant="secondary" className="text-xs px-1">VIP</Badge>}
                        {image.categories.event && <Badge className="text-xs px-1">Event</Badge>}
                        {image.categories.random && <Badge variant="outline" className="text-xs px-1">Random</Badge>}
                      </div>

                      {isSelected && (
                        <div className="absolute top-1 left-1">
                          <Badge className="bg-primary text-xs">Display</Badge>
                        </div>
                      )}
                      {isAvatar && (
                        <div className="absolute top-7 left-1">
                          <Badge className="bg-accent text-xs">Avatar</Badge>
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
    return (
      <>
        <UploaderContent />
        
        <Dialog open={!!editingImage} onOpenChange={(open) => !open && setEditingImage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Image</DialogTitle>
            </DialogHeader>
            {editingImage && (
              <div className="space-y-4">
                <div>
                  <Label>Unlock Level</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingImage.unlockLevel}
                    onChange={(e) => setEditingImage({ ...editingImage, unlockLevel: parseInt(e.target.value) || 1 })}
                    data-testid="input-edit-unlock-level"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-nsfw"
                      checked={editingImage.categories.nsfw}
                      onCheckedChange={(checked) => setEditingImage({ 
                        ...editingImage, 
                        categories: { ...editingImage.categories, nsfw: !!checked }
                      })}
                    />
                    <Label htmlFor="edit-nsfw">NSFW</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-vip"
                      checked={editingImage.categories.vip}
                      onCheckedChange={(checked) => setEditingImage({ 
                        ...editingImage, 
                        categories: { ...editingImage.categories, vip: !!checked }
                      })}
                    />
                    <Label htmlFor="edit-vip">VIP</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-event"
                      checked={editingImage.categories.event}
                      onCheckedChange={(checked) => setEditingImage({ 
                        ...editingImage, 
                        categories: { ...editingImage.categories, event: !!checked }
                      })}
                    />
                    <Label htmlFor="edit-event">Event</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-random"
                      checked={editingImage.categories.random}
                      onCheckedChange={(checked) => setEditingImage({ 
                        ...editingImage, 
                        categories: { ...editingImage.categories, random: !!checked }
                      })}
                    />
                    <Label htmlFor="edit-random">Random</Label>
                  </div>
                </div>

                <Button onClick={handleSaveEdit} className="w-full" data-testid="button-save-image-edit">
                  Save Changes
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
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
