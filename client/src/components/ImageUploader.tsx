
import { useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Edit, Plus } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ImageConfig } from '@shared/gameConfig';

interface ImageUploaderProps {
  adminMode?: boolean;
}

export default function ImageUploader({ adminMode = false }: ImageUploaderProps) {
  const { state, characters, images, addImage, updateImage, removeImage, selectImage } = useGame();
  const [categories, setCategories] = useState({
    nsfw: false,
    vip: false,
    event: false,
    random: false
  });
  const [unlockLevel, setUnlockLevel] = useState(1);
  const [imageType, setImageType] = useState<'character' | 'avatar' | 'vip' | 'other'>('character');
  const [editingImage, setEditingImage] = useState<ImageConfig | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState(state.selectedCharacterId);
  const [selectedPoses, setSelectedPoses] = useState<string[]>([]);
  const [newPoseInput, setNewPoseInput] = useState('');
  const [isHidden, setIsHidden] = useState(false);
  const [availablePoses, setAvailablePoses] = useState<string[]>(() => {
    const saved = localStorage.getItem('availablePoses');
    return saved ? JSON.parse(saved) : ['sitting', 'standing', 'casual', 'formal', 'bikini', 'dress'];
  });

  useEffect(() => {
    localStorage.setItem('availablePoses', JSON.stringify(availablePoses));
  }, [availablePoses]);

  useEffect(() => {
    setSelectedCharacterId(state.selectedCharacterId);
  }, [state.selectedCharacterId]);

  const characterImages = adminMode 
    ? images.filter(img => img.characterId === selectedCharacterId)
    : images.filter(img => img.characterId === selectedCharacterId && !img.isHidden);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setPreviewUrl(imageUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddPose = () => {
    if (newPoseInput.trim() && !availablePoses.includes(newPoseInput.trim().toLowerCase())) {
      setAvailablePoses([...availablePoses, newPoseInput.trim().toLowerCase()]);
      setNewPoseInput('');
    }
  };

  const togglePose = (pose: string) => {
    setSelectedPoses(prev =>
      prev.includes(pose) ? prev.filter(p => p !== pose) : [...prev, pose]
    );
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Get the character name for the folder structure
    const selectedChar = characters.find(c => c.id === selectedCharacterId);
    if (!selectedChar) {
      alert('Please select a character first');
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('characterId', selectedCharacterId);
    formData.append('characterName', selectedChar.name);
    formData.append('imageType', imageType);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      addImage({
        id: `img-${Date.now()}`,
        characterId: selectedCharacterId,
        url: data.url,
        unlockLevel: unlockLevel,
        isAvatar: false,
        isDisplay: false,
        imageType: imageType,
        categories: { ...categories },
        poses: selectedPoses,
        isHidden: isHidden
      });
      
      setSelectedFile(null);
      setPreviewUrl(null);
      setUnlockLevel(1);
      setImageType('character');
      setCategories({ nsfw: false, vip: false, event: false, random: false });
      setSelectedPoses([]);
      setIsHidden(false);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    }
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUnlockLevel(1);
    setImageType('character');
    setCategories({ nsfw: false, vip: false, event: false, random: false });
    setSelectedPoses([]);
  };

  const handleSaveEdit = () => {
    if (editingImage) {
      updateImage(editingImage);
      setEditingImage(null);
    }
  };

  const handleSetAsDisplay = (imageId: string) => {
    selectImage(imageId);
  };

  const UploaderContent = () => (
    <div className="space-y-4">
      {adminMode && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label htmlFor="character-select">Select Character</Label>
              <Select value={selectedCharacterId} onValueChange={setSelectedCharacterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a character" />
                </SelectTrigger>
                <SelectContent>
                  {characters.map(char => (
                    <SelectItem key={char.id} value={char.id}>
                      {char.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!selectedCharacterId && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                Please select a character before uploading images
              </div>
            )}

            <div>
              <Label htmlFor="image-type-select">Image Type</Label>
              <Select value={imageType} onValueChange={(value: any) => setImageType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select image type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="character">Character</SelectItem>
                  <SelectItem value="avatar">Avatar</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="image-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-lg p-8 hover-elevate flex flex-col items-center justify-center gap-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to select image</span>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-image-upload"
                />
              </Label>
            </div>

            {previewUrl && (
              <div className="space-y-3">
                <div className="relative w-full aspect-square max-w-xs mx-auto rounded-lg overflow-hidden border-2 border-primary">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
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

                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      id="hidden"
                      checked={isHidden}
                      onCheckedChange={(checked) => setIsHidden(!!checked)}
                      data-testid="checkbox-hidden"
                    />
                    <Label htmlFor="hidden" className="cursor-pointer">Hide from Character Gallery</Label>
                  </div>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Poses</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a pose (e.g., sitting, bikini)"
                        value={newPoseInput}
                        onChange={(e) => setNewPoseInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddPose()}
                      />
                      <Button onClick={handleAddPose} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availablePoses.map(pose => (
                        <Badge
                          key={pose}
                          variant={selectedPoses.includes(pose) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => togglePose(pose)}
                        >
                          {pose}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <span className="font-semibold">Upload Settings</span>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="nsfw"
                          checked={categories.nsfw}
                          onCheckedChange={(checked) => setCategories(prev => ({ ...prev, nsfw: !!checked }))}
                          data-testid="checkbox-nsfw"
                        />
                        <Label htmlFor="nsfw" className="cursor-pointer">NSFW Content</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="vip"
                          checked={categories.vip}
                          onCheckedChange={(checked) => setCategories(prev => ({ ...prev, vip: !!checked }))}
                          data-testid="checkbox-vip"
                        />
                        <Label htmlFor="vip" className="cursor-pointer">VIP Content</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="event"
                          checked={categories.event}
                          onCheckedChange={(checked) => setCategories(prev => ({ ...prev, event: !!checked }))}
                          data-testid="checkbox-event"
                        />
                        <Label htmlFor="event" className="cursor-pointer">Event Content</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="random"
                          checked={categories.random}
                          onCheckedChange={(checked) => setCategories(prev => ({ ...prev, random: !!checked }))}
                          data-testid="checkbox-random"
                        />
                        <Label htmlFor="random" className="cursor-pointer">Enable for Chat</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button onClick={handleUpload} className="flex-1" data-testid="button-upload">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload with Metadata
                  </Button>
                  <Button onClick={handleCancelUpload} variant="outline" data-testid="button-cancel-upload">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="font-semibold mb-2">
          {adminMode ? `Uploaded Images (${characterImages.length})` : `Image Gallery (${characterImages.length})`}
        </h3>
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
                  onClick={() => isUnlocked && !adminMode && handleSetAsDisplay(image.id)}
                  data-testid={`image-${image.id}`}
                >
                  <img
                    src={image.url}
                    alt="Character"
                    className={`w-full h-full object-cover ${!isUnlocked && 'blur-sm'}`}
                  />
                  
                  {adminMode && (
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
                  )}

                  {!adminMode && isUnlocked && (
                    <div className="absolute top-1 right-1">
                      <Badge className="bg-primary text-xs cursor-pointer">
                        {isSelected ? 'Display' : 'Set'}
                      </Badge>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-background/90 p-1 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs px-1">Lv.{image.unlockLevel}</Badge>
                    {image.imageType && <Badge className="text-xs px-1 capitalize">{image.imageType}</Badge>}
                    {image.categories.nsfw && <Badge variant="destructive" className="text-xs px-1">NSFW</Badge>}
                    {image.categories.vip && <Badge variant="secondary" className="text-xs px-1">VIP</Badge>}
                    {image.categories.event && <Badge className="text-xs px-1">Event</Badge>}
                    {image.poses && image.poses.map(pose => (
                      <Badge key={pose} variant="outline" className="text-xs px-1">{pose}</Badge>
                    ))}
                  </div>
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
              <DialogDescription>Update image settings and categories</DialogDescription>
            </DialogHeader>
            {editingImage && (
              <div className="space-y-4">
                <div>
                  <Label>Character</Label>
                  <Select 
                    value={editingImage.characterId} 
                    onValueChange={(value) => setEditingImage({ ...editingImage, characterId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {characters.map(char => (
                        <SelectItem key={char.id} value={char.id}>
                          {char.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Image Type</Label>
                  <Select 
                    value={editingImage.imageType || 'character'} 
                    onValueChange={(value: any) => setEditingImage({ ...editingImage, imageType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="character">Character</SelectItem>
                      <SelectItem value="avatar">Avatar</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                
                <div>
                  <Label>Poses</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {availablePoses.map(pose => (
                      <Badge
                        key={pose}
                        variant={editingImage.poses?.includes(pose) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const newPoses = editingImage.poses?.includes(pose)
                            ? editingImage.poses.filter(p => p !== pose)
                            : [...(editingImage.poses || []), pose];
                          setEditingImage({ ...editingImage, poses: newPoses });
                        }}
                      >
                        {pose}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      id="edit-hidden"
                      checked={editingImage.isHidden || false}
                      onCheckedChange={(checked) => setEditingImage({ 
                        ...editingImage, 
                        isHidden: !!checked
                      })}
                    />
                    <Label htmlFor="edit-hidden">Hide from Character Gallery</Label>
                  </div>
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
          <DialogTitle>Image Gallery - {characters.find(c => c.id === selectedCharacterId)?.name}</DialogTitle>
          <DialogDescription>Select an unlocked image to set as your display picture</DialogDescription>
        </DialogHeader>
        <UploaderContent />
      </DialogContent>
    </Dialog>
  );
}
