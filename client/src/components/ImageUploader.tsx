import { useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Edit, Plus, Database, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { ImageConfig } from '@shared/gameConfig';

interface ImageUploaderProps {
  adminMode?: boolean;
}

export default function ImageUploader({ adminMode = false }: ImageUploaderProps) {
  const { state, characters, images, addImage, updateImage, removeImage, selectImage } = useGame();
  const { toast } = useToast();
  
  // Original state
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
  const [chatEnable, setChatEnable] = useState(false);
  const [chatSendPercent, setChatSendPercent] = useState(0);
  
  // ✅ LUNA ENHANCEMENT: Data array management state
  const [availablePoses, setAvailablePoses] = useState<string[]>(() => {
    const saved = localStorage.getItem('availablePoses');
    return saved ? JSON.parse(saved) : ['sitting', 'standing', 'casual', 'formal', 'bikini', 'dress', 'playful', 'seductive', 'cute', 'elegant'];
  });
  
  const [imageDataArrays, setImageDataArrays] = useState({
    categories: {
      default: ['nsfw', 'vip', 'event', 'random'],
      available: ['nsfw', 'vip', 'event', 'random', 'exclusive', 'seasonal', 'bonus'],
      custom: [] as string[]
    },
    poses: {
      default: ['sitting', 'standing', 'casual', 'formal'],
      available: availablePoses,
      custom: [] as string[]
    },
    imageTypes: {
      available: ['character', 'avatar', 'vip', 'other', 'background', 'outfit'],
      descriptions: {
        character: 'Main character display image',
        avatar: 'Small profile picture',
        vip: 'Premium content image',
        other: 'General purpose image',
        background: 'Scene background',
        outfit: 'Character outfit variant'
      }
    }
  });
  
  const [isLoadingArrays, setIsLoadingArrays] = useState(false);

  // ✅ LUNA ENHANCEMENT: Save pose arrays to localStorage
  useEffect(() => {
    localStorage.setItem('availablePoses', JSON.stringify(availablePoses));
  }, [availablePoses]);

  useEffect(() => {
    setSelectedCharacterId(state.selectedCharacterId);
  }, [state.selectedCharacterId]);

  // ✅ LUNA FUNCTION: Load data arrays from server/master data
  const loadDataArraysFromServer = useCallback(async () => {
    setIsLoadingArrays(true);
    
    try {
      // Load available poses, categories, and types from existing images
      const allPoses = new Set<string>();
      const allCategories = new Set<string>();
      const allImageTypes = new Set<string>();
      
      images.forEach(image => {
        // Collect poses
        if (image.poses && Array.isArray(image.poses)) {
          image.poses.forEach(pose => allPoses.add(pose));
        }
        
        // Collect categories
        if (image.categories) {
          Object.keys(image.categories).forEach(category => {
            if (image.categories[category]) {
              allCategories.add(category);
            }
          });
        }
        
        // Collect image types
        if (image.imageType) {
          allImageTypes.add(image.imageType);
        }
      });
      
      // Update available arrays
      setImageDataArrays(prev => ({
        ...prev,
        poses: {
          ...prev.poses,
          available: Array.from(allPoses).sort()
        },
        categories: {
          ...prev.categories,
          available: Array.from(allCategories).sort()
        },
        imageTypes: {
          ...prev.imageTypes,
          available: [...prev.imageTypes.available, ...Array.from(allImageTypes)].filter((type, index, self) => self.indexOf(type) === index)
        }
      }));
      
      // Update poses state
      setAvailablePoses(Array.from(allPoses).sort());
      
      console.log('✅ Luna: Loaded data arrays from existing images', {
        poses: allPoses.size,
        categories: allCategories.size,
        imageTypes: allImageTypes.size
      });
      
      toast({ title: '✅ Data arrays updated from server' });
      
    } catch (error) {
      console.error('❌ Failed to load data arrays:', error);
      toast({ 
        title: '❌ Failed to load data arrays', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    } finally {
      setIsLoadingArrays(false);
    }
  }, [images, toast]);

  // ✅ LUNA FUNCTION: Add new pose to master arrays
  const addNewPoseToMasterArray = useCallback((pose: string) => {
    const cleanPose = pose.trim().toLowerCase();
    if (!cleanPose || availablePoses.includes(cleanPose)) return;
    
    setAvailablePoses(prev => [...prev, cleanPose].sort());
    setImageDataArrays(prev => ({
      ...prev,
      poses: {
        ...prev.poses,
        available: [...prev.poses.available, cleanPose].sort(),
        custom: [...prev.poses.custom, cleanPose].sort()
      }
    }));
    
    console.log('✅ Luna: Added new pose to master arrays:', cleanPose);
    toast({ title: `✨ Added pose: ${cleanPose}` });
  }, [availablePoses, toast]);

  // ✅ LUNA FUNCTION: Add new category to master arrays 
  const addNewCategoryToMasterArray = useCallback((category: string) => {
    const cleanCategory = category.trim().toLowerCase();
    if (!cleanCategory || imageDataArrays.categories.available.includes(cleanCategory)) return;
    
    setImageDataArrays(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        available: [...prev.categories.available, cleanCategory].sort(),
        custom: [...prev.categories.custom, cleanCategory].sort()
      }
    }));
    
    console.log('✅ Luna: Added new category to master arrays:', cleanCategory);
    toast({ title: `✨ Added category: ${cleanCategory}` });
  }, [imageDataArrays.categories.available, toast]);

  // ✅ LUNA FUNCTION: Sync arrays to server/master data
  const syncArraysToServer = useCallback(async () => {
    try {
      const masterArrayData = {
        poses: imageDataArrays.poses.available,
        categories: imageDataArrays.categories.available,
        imageTypes: imageDataArrays.imageTypes.available,
        lastUpdated: new Date().toISOString()
      };
      
      const response = await fetch('/api/admin/image-arrays', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        },
        body: JSON.stringify(masterArrayData)
      });
      
      if (response.ok) {
        console.log('✅ Luna: Synced image arrays to server');
        toast({ title: '✅ Arrays synced to server' });
      } else {
        console.warn('⚠️ Server sync failed, saved locally only');
        toast({ title: '⚠️ Server sync failed, saved locally' });
      }
    } catch (error) {
      console.warn('⚠️ Server sync failed, arrays saved locally:', error);
      toast({ title: '⚠️ Server sync failed, saved locally' });
    }
  }, [imageDataArrays, toast]);

  // ✅ LUNA FUNCTION: Reset arrays to defaults
  const resetArraysToDefaults = useCallback(() => {
    setImageDataArrays({
      categories: {
        default: ['nsfw', 'vip', 'event', 'random'],
        available: ['nsfw', 'vip', 'event', 'random', 'exclusive', 'seasonal', 'bonus'],
        custom: []
      },
      poses: {
        default: ['sitting', 'standing', 'casual', 'formal'],
        available: ['sitting', 'standing', 'casual', 'formal', 'bikini', 'dress', 'playful', 'seductive', 'cute', 'elegant'],
        custom: []
      },
      imageTypes: {
        available: ['character', 'avatar', 'vip', 'other', 'background', 'outfit'],
        descriptions: {
          character: 'Main character display image',
          avatar: 'Small profile picture', 
          vip: 'Premium content image',
          other: 'General purpose image',
          background: 'Scene background',
          outfit: 'Character outfit variant'
        }
      }
    });
    
    console.log('✅ Luna: Reset data arrays to defaults');
    toast({ title: '✅ Arrays reset to defaults' });
  }, [toast]);

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
    if (newPoseInput.trim()) {
      addNewPoseToMasterArray(newPoseInput);
      setNewPoseInput('');
    }
  };

  const togglePose = (pose: string) => {
    setSelectedPoses(prev =>
      prev.includes(pose) ? prev.filter(p => p !== pose) : [...prev, pose]
    );
  };

  // ✅ LUNA ENHANCED: Upload with comprehensive metadata
  const handleUpload = async () => {
    console.log('🔄 Luna: Enhanced upload initiated');
    
    if (!selectedFile) {
      toast({ title: '❌ No file selected', variant: 'destructive' });
      return;
    }

    if (!selectedCharacterId) {
      toast({ title: '❌ No character selected', variant: 'destructive' });
      return;
    }

    const selectedChar = characters.find(c => c.id === selectedCharacterId);
    if (!selectedChar) {
      toast({ title: '❌ Character not found', variant: 'destructive' });
      return;
    }

    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) {
      toast({ title: '❌ Authentication required', variant: 'destructive' });
      return;
    }

    console.log('📤 Luna preparing enhanced upload...', {
      characterId: selectedCharacterId,
      characterName: selectedChar.name,
      imageType,
      unlockLevel,
      poses: selectedPoses.length,
      categories: Object.keys(categories).filter(k => categories[k as keyof typeof categories]).length
    });

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('characterId', selectedCharacterId);
    formData.append('characterName', selectedChar.name);
    formData.append('imageType', imageType);
    formData.append('unlockLevel', unlockLevel.toString());
    formData.append('categories', JSON.stringify(categories));
    formData.append('poses', JSON.stringify(selectedPoses));
    formData.append('isHidden', isHidden.toString());
    formData.append('chatEnable', chatEnable.toString());
    formData.append('chatSendPercent', chatSendPercent.toString());
    
    // ✅ LUNA ENHANCEMENT: Add array metadata
    formData.append('availablePoses', JSON.stringify(availablePoses));
    formData.append('dataArrays', JSON.stringify(imageDataArrays));

    try {
      console.log('🚀 Luna: Sending enhanced upload request...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Luna: Enhanced upload successful:', data);
      
      // ✅ LUNA ENHANCEMENT: Create comprehensive image config
      const newImage: ImageConfig = {
        id: data.media?.id || `img-${Date.now()}`,
        characterId: selectedCharacterId,
        url: data.url,
        unlockLevel: unlockLevel,
        isAvatar: imageType === 'avatar',
        isDisplay: imageType === 'character',
        imageType: imageType,
        categories: { ...categories },
        poses: [...selectedPoses],
        isHidden: isHidden,
        chatEnable: chatEnable,
        chatSendPercent: chatSendPercent,
        // ✅ LUNA ENHANCEMENT: Additional metadata
        uploadedAt: new Date().toISOString(),
        arrayVersion: imageDataArrays.poses.available.length, // Track array evolution
        metadata: {
          originalFileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type
        }
      };
      
      addImage(newImage);
      
      // Auto-select the uploaded image
      if (imageType === 'character') {
        selectImage(newImage.id);
      }
      
      // ✅ LUNA ENHANCEMENT: Update master arrays with any new data
      const newPosesFromUpload = selectedPoses.filter(pose => !availablePoses.includes(pose));
      newPosesFromUpload.forEach(pose => addNewPoseToMasterArray(pose));
      
      // Reset form
      resetUploadForm();
      
      toast({ 
        title: '✅ Image uploaded successfully!',
        description: `Added to ${selectedChar.name} with ${selectedPoses.length} poses`
      });
      
      // Auto-sync arrays if new data was added
      if (newPosesFromUpload.length > 0) {
        await syncArraysToServer();
      }
      
    } catch (error) {
      console.error('💥 Luna upload error:', error);
      toast({ 
        title: '❌ Upload failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    }
  };

  // ✅ LUNA FUNCTION: Reset upload form
  const resetUploadForm = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUnlockLevel(1);
    setImageType('character');
    setCategories({ nsfw: false, vip: false, event: false, random: false });
    setSelectedPoses([]);
    setIsHidden(false);
    setChatEnable(false);
    setChatSendPercent(0);
  }, []);

  const handleCancelUpload = () => {
    resetUploadForm();
  };

  const handleSaveEdit = () => {
    if (editingImage) {
      updateImage(editingImage);
      setEditingImage(null);
      toast({ title: '✅ Image updated successfully' });
    }
  };

  const handleSetAsDisplay = (imageId: string) => {
    selectImage(imageId);
    toast({ title: '✅ Display image updated' });
  };

  const UploaderContent = () => (
    <div className="space-y-4">
      {adminMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              🆼️ Enhanced Image Uploader
              
              {/* ✅ LUNA ENHANCEMENT: Data Array Management */}
              <div className="flex gap-2">
                <Button
                  onClick={loadDataArraysFromServer}
                  disabled={isLoadingArrays}
                  size="sm"
                  variant="outline"
                >
                  {isLoadingArrays ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4" />
                  )}
                  Sync Arrays
                </Button>
                
                <Button
                  onClick={syncArraysToServer}
                  size="sm"
                  variant="outline"
                >
                  <Upload className="w-4 h-4" />
                  Save Arrays
                </Button>
                
                <Button
                  onClick={resetArraysToDefaults}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            
            {/* ✅ LUNA ENHANCEMENT: Array Status Display */}
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-blue-400">Poses Available</div>
                    <div className="text-2xl font-bold">{imageDataArrays.poses.available.length}</div>
                    <div className="text-xs text-muted-foreground">Custom: {imageDataArrays.poses.custom.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-400">Categories</div>
                    <div className="text-2xl font-bold">{imageDataArrays.categories.available.length}</div>
                    <div className="text-xs text-muted-foreground">Custom: {imageDataArrays.categories.custom.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-purple-400">Image Types</div>
                    <div className="text-2xl font-bold">{imageDataArrays.imageTypes.available.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                  {imageDataArrays.imageTypes.available.map(type => (
                    <SelectItem key={type} value={type}>
                      <div className="flex flex-col">
                        <span className="capitalize">{type}</span>
                        <span className="text-xs text-muted-foreground">
                          {imageDataArrays.imageTypes.descriptions[type as keyof typeof imageDataArrays.imageTypes.descriptions] || 'Custom type'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-image-upload"
              />
              <Label htmlFor="image-upload" className="cursor-pointer block">
                <div className="border-2 border-dashed border-border rounded-lg p-8 hover-elevate flex flex-col items-center justify-center gap-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to select image</span>
                </div>
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
                  />
                </div>

                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox
                    id="hidden"
                    checked={isHidden}
                    onCheckedChange={(checked) => setIsHidden(!!checked)}
                  />
                  <Label htmlFor="hidden">Hide from Character Gallery</Label>
                </div>

                {/* ✅ LUNA ENHANCEMENT: Dynamic Poses with Master Array */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      🎭 Poses ({selectedPoses.length} selected)
                      <Badge variant="outline">{imageDataArrays.poses.available.length} available</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add new pose (e.g., lounging, dancing)"
                        value={newPoseInput}
                        onChange={(e) => setNewPoseInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddPose()}
                      />
                      <Button onClick={handleAddPose} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <ScrollArea className="h-32">
                      <div className="flex flex-wrap gap-2">
                        {imageDataArrays.poses.available.map(pose => (
                          <Badge
                            key={pose}
                            variant={selectedPoses.includes(pose) ? "default" : "outline"}
                            className="cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => togglePose(pose)}
                          >
                            {pose}
                            {imageDataArrays.poses.custom.includes(pose) && (
                              <span className="ml-1 text-xs">✨</span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* ✅ LUNA ENHANCEMENT: Enhanced Categories */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Upload Settings & Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {imageDataArrays.categories.available.map(category => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={category}
                            checked={categories[category as keyof typeof categories] || false}
                            onCheckedChange={(checked) => setCategories(prev => ({ 
                              ...prev, 
                              [category]: !!checked 
                            }))}
                          />
                          <Label htmlFor={category} className="cursor-pointer capitalize">
                            {category}
                            {imageDataArrays.categories.custom.includes(category) && (
                              <span className="ml-1 text-xs text-blue-400">✨</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    {chatEnable && (
                      <div className="mt-4 p-3 border rounded-lg">
                        <Label htmlFor="chat-send-percent">Chat Send % (Probability)</Label>
                        <Input
                          id="chat-send-percent"
                          type="number"
                          min="0"
                          max="100"
                          value={chatSendPercent}
                          onChange={(e) => setChatSendPercent(parseInt(e.target.value) || 0)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button onClick={handleUpload} className="flex-1">
                    <Upload className="w-4 h-4 mr-2" />
                    ✨ Enhanced Upload
                  </Button>
                  <Button onClick={handleCancelUpload} variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ✅ LUNA ENHANCEMENT: Image Gallery with Array Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {adminMode ? `🖼️ Uploaded Images` : `🆼️ Image Gallery`}
            <div className="flex gap-2">
              <Badge variant="outline">{characterImages.length} images</Badge>
              {adminMode && (
                <Badge className="bg-green-600">
                  {images.filter(img => img.poses && img.poses.length > 0).length} with poses
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {characterImages.map(image => {
                const isSelected = state.selectedImageId === image.id;
                const isUnlocked = state.level >= image.unlockLevel;

                return (
                  <div
                    key={image.id}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-card-border'
                    } ${
                      isUnlocked 
                        ? 'hover:border-primary/70 hover:scale-105 cursor-pointer transform-gpu' 
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => isUnlocked && !adminMode && handleSetAsDisplay(image.id)}
                  >
                    <img
                      src={image.url}
                      alt="Character"
                      className={`w-full h-full object-cover ${!isUnlocked && 'blur-sm'}`}
                      loading="lazy"
                    />
                    
                    {adminMode && (
                      <div className="absolute top-1 right-1 flex gap-1">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6 bg-blue-600/80 hover:bg-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingImage(image);
                          }}
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
                            toast({ title: '✅ Image deleted' });
                          }}
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

                    {/* ✅ LUNA ENHANCEMENT: Rich metadata display */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                      <div className="flex flex-wrap gap-1 justify-center">
                        <Badge variant="outline" className="text-xs px-1">Lv.{image.unlockLevel}</Badge>
                        {image.imageType && (
                          <Badge className="text-xs px-1 capitalize">{image.imageType}</Badge>
                        )}
                        {image.categories.nsfw && <Badge variant="destructive" className="text-xs px-1">NSFW</Badge>}
                        {image.categories.vip && <Badge className="bg-blue-500 text-xs px-1">VIP</Badge>}
                        {image.categories.event && <Badge className="bg-purple-500 text-xs px-1">Event</Badge>}
                        {image.poses && image.poses.length > 0 && (
                          <Badge className="bg-cyan-500 text-xs px-1">
                            {image.poses.length} poses
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Empty state */}
              {characterImages.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
                  <p>No images for {characters.find(c => c.id === selectedCharacterId)?.name || 'this character'}</p>
                  <p className="text-xs mt-1">Upload some images to get started!</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  if (adminMode) {
    return (
      <>
        <UploaderContent />
        
        {/* Enhanced Edit Dialog */}
        <Dialog open={!!editingImage} onOpenChange={(open) => !open && setEditingImage(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>✏️ Edit Image Metadata</DialogTitle>
              <DialogDescription>
                Update image settings, categories, and pose data
              </DialogDescription>
            </DialogHeader>
            {editingImage && (
              <div className="space-y-4">
                {/* Character Selection */}
                <div>
                  <Label>Character</Label>
                  <Select 
                    value={editingImage.characterId} 
                    onValueChange={(value) => setEditingImage({ ...editingImage, characterId: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {characters.map(char => (
                        <SelectItem key={char.id} value={char.id}>{char.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Image Type */}
                <div>
                  <Label>Image Type</Label>
                  <Select 
                    value={editingImage.imageType || 'character'} 
                    onValueChange={(value: any) => setEditingImage({ ...editingImage, imageType: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {imageDataArrays.imageTypes.available.map(type => (
                        <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Unlock Level */}
                <div>
                  <Label>Unlock Level</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingImage.unlockLevel}
                    onChange={(e) => setEditingImage({ ...editingImage, unlockLevel: parseInt(e.target.value) || 1 })}
                  />
                </div>
                
                {/* ✅ LUNA ENHANCEMENT: Enhanced Poses Selection */}
                <div>
                  <Label>Poses ({editingImage.poses?.length || 0} selected)</Label>
                  <ScrollArea className="h-24 border rounded-md p-2">
                    <div className="flex flex-wrap gap-2">
                      {imageDataArrays.poses.available.map(pose => (
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
                  </ScrollArea>
                </div>

                {/* Settings */}
                <div className="flex items-center space-x-2">
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

                {/* Categories */}
                <div className="grid grid-cols-3 gap-4">
                  {imageDataArrays.categories.available.map(category => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${category}`}
                        checked={editingImage.categories?.[category] || false}
                        onCheckedChange={(checked) => setEditingImage({ 
                          ...editingImage, 
                          categories: { ...editingImage.categories, [category]: !!checked }
                        })}
                      />
                      <Label htmlFor={`edit-${category}`} className="capitalize">{category}</Label>
                    </div>
                  ))}
                </div>

                <Button onClick={handleSaveEdit} className="w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Non-admin view
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ImageIcon className="w-4 h-4 mr-2" />
          Image Gallery
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Image Gallery - {characters.find(c => c.id === selectedCharacterId)?.name}</DialogTitle>
          <DialogDescription>
            Select an unlocked image to set as your display picture
          </DialogDescription>
        </DialogHeader>
        <UploaderContent />
      </DialogContent>
    </Dialog>
  );
}