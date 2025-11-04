import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Edit, Plus, Database, RefreshCw, CheckCircle, Trash2, Save, ArrowLeftRight, Loader2 } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollContainer } from '@/components/layout/ScrollContainer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { ImageConfig } from '@shared/gameConfig';

export default function ImageUploader({ adminMode = false }: { adminMode?: boolean }) {
  const { state, characters, images, addImage, updateImage, removeImage, selectImage } = useGame();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState({ nsfw: false, vip: false, event: false, random: false });
  const [unlockLevel, setUnlockLevel] = useState(1);
  const [imageType, setImageType] = useState<'character'|'avatar'|'vip'|'background'|'other'>('character');
  const [editingImage, setEditingImage] = useState<ImageConfig | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState(state.selectedCharacterId);
  const [selectedPoses, setSelectedPoses] = useState<string[]>([]);
  const [newPoseInput, setNewPoseInput] = useState('');
  const [isHidden, setIsHidden] = useState(false);
  const [chatEnable, setChatEnable] = useState(false);
  const [chatSendPercent, setChatSendPercent] = useState(0);
  
  // 🔧 CRITICAL FIX: Upload state management with deduplication
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFiles] = useState(new Set<string>()); // Track files being uploaded

  const [availablePoses, setAvailablePoses] = useState<string[]>(() => {
    const saved = localStorage.getItem('availablePoses');
    return saved ? JSON.parse(saved) : ['sitting','standing','casual','formal','bikini','dress','playful','seductive','cute','elegant','dancing','sleeping','workout','bathing','reading'];
  });

  const [imageDataArrays, setImageDataArrays] = useState({
    categories: { default: ['nsfw','vip','event','random'], available: ['nsfw','vip','event','random','exclusive','seasonal','bonus'], custom: [] as string[] },
    poses: { default: ['sitting','standing','casual','formal'], available: availablePoses, custom: [] as string[] },
    imageTypes: { available: ['character','avatar','vip','background','other','outfit'], descriptions: { character:'Main character', avatar:'Profile avatar', vip:'Premium image', background:'Scene background', other:'General', outfit:'Outfit variant' } }
  });

  const [isLoadingArrays, setIsLoadingArrays] = useState(false);

  useEffect(() => { localStorage.setItem('availablePoses', JSON.stringify(availablePoses)); }, [availablePoses]);
  useEffect(() => { setSelectedCharacterId(state.selectedCharacterId); }, [state.selectedCharacterId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 🔧 DEDUPLICATION: Check if this file is already being processed
    const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
    if (uploadingFiles.has(fileKey)) {
      toast({ title: '⚠️ File already uploading', description: 'Please wait for current upload to complete', variant: 'destructive' });
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const characterImages = (adminMode ? images.filter(i=> i.characterId===selectedCharacterId) : images.filter(i=> i.characterId===selectedCharacterId && !i.isHidden));

  const addNewPoseToMasterArray = useCallback((pose: string) => {
    const clean = pose.trim().toLowerCase();
    if (!clean || availablePoses.includes(clean)) return;
    setAvailablePoses(prev => [...prev, clean].sort());
    setImageDataArrays(prev => ({ ...prev, poses: { ...prev.poses, available: [...prev.poses.available, clean].sort(), custom: [...prev.poses.custom, clean].sort() } }));
    toast({ title: `✨ Added pose: ${clean}` });
  }, [availablePoses, toast]);

  const loadDataArraysFromServer = useCallback(async () => {
    setIsLoadingArrays(true);
    try {
      const allPoses = new Set<string>();
      const allCategories = new Set<string>();
      const allImageTypes = new Set<string>();
      images.forEach(image => {
        if (Array.isArray(image.poses)) image.poses.forEach(p => allPoses.add(p));
        if ((image as any).categories) Object.keys((image as any).categories).forEach(c => (image as any).categories[c] && allCategories.add(c));
        if ((image as any).imageType) allImageTypes.add((image as any).imageType as string);
      });
      setImageDataArrays(prev => ({
        ...prev,
        poses: { ...prev.poses, available: Array.from(allPoses).sort() },
        categories: { ...prev.categories, available: Array.from(allCategories).sort() },
        imageTypes: { ...prev.imageTypes, available: [...prev.imageTypes.available, ...Array.from(allImageTypes)].filter((t,i,self)=> self.indexOf(t)===i) }
      }));
      setAvailablePoses(Array.from(allPoses).sort());
      toast({ title: '✅ Data arrays updated from server' });
    } catch (e:any) {
      toast({ title: '❌ Failed to load data arrays', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally { setIsLoadingArrays(false); }
  }, [images, toast]);

  // 🔧 FIXED: Upload with deduplication, loading states, and timeout handling
  const handleUpload = async () => {
    if (!selectedFile) return toast({ title: '❌ No file selected', variant: 'destructive' });
    if (!selectedCharacterId) return toast({ title: '❌ No character selected', variant: 'destructive' });
    if (isUploading) return toast({ title: '⚠️ Upload in progress', description: 'Please wait for current upload to finish', variant: 'destructive' });
    
    const selectedChar = characters.find(c=>c.id===selectedCharacterId); 
    if (!selectedChar) return toast({ title:'❌ Character not found', variant:'destructive' });
    
    const sessionToken = localStorage.getItem('sessionToken'); 
    if (!sessionToken) return toast({ title:'❌ Authentication required', variant:'destructive' });

    // 🔧 DEDUPLICATION: Track this file to prevent double uploads
    const fileKey = `${selectedFile.name}_${selectedFile.size}_${selectedFile.lastModified}`;
    if (uploadingFiles.has(fileKey)) {
      return toast({ title: '⚠️ Already uploading this file', description: 'Please wait...', variant: 'destructive' });
    }
    
    uploadingFiles.add(fileKey);
    setIsUploading(true);
    setUploadProgress(0);
    
    // Show immediate feedback
    toast({ title: '📤 Starting upload...', description: `Uploading ${selectedFile.name}` });

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('characterId', selectedCharacterId);
    formData.append('characterName', selectedChar.name);
    formData.append('imageType', imageType);
    formData.append('unlockLevel', String(unlockLevel || 1));
    formData.append('categories', JSON.stringify(categories));
    formData.append('poses', JSON.stringify(selectedPoses));
    formData.append('isHidden', String(isHidden));
    formData.append('chatEnable', String(chatEnable));
    formData.append('chatSendPercent', String(chatSendPercent));

    try {
      console.log(`📤 [UPLOAD] Starting upload for ${selectedFile.name} (${selectedFile.size} bytes)`);
      setUploadProgress(25);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` },
        body: formData,
        // 🔧 LONGER TIMEOUT: File uploads can take time
        signal: AbortSignal.timeout(30000) // 30 seconds for uploads
      });
      
      setUploadProgress(75);
      
      if (!res.ok) { 
        const errorText = await res.text(); 
        throw new Error(`Upload failed (${res.status}): ${errorText}`);
      }
      
      const data = await res.json();
      console.log(`✅ [UPLOAD] Success:`, data);
      setUploadProgress(100);

      const newImage: ImageConfig = { 
        id: data.media?.id || `img-${Date.now()}`, 
        characterId: selectedCharacterId, 
        url: data.url, 
        unlockLevel: unlockLevel || 1, 
        isAvatar: imageType==='avatar', 
        isDisplay: imageType==='character', 
        imageType, 
        categories: { ...categories }, 
        poses: [...selectedPoses], 
        isHidden, 
        chatEnable, 
        chatSendPercent, 
        uploadedAt: new Date().toISOString(), 
        arrayVersion: imageDataArrays.poses.available.length, 
        metadata: { 
          originalFileName: selectedFile.name, 
          fileSize: selectedFile.size, 
          fileType: selectedFile.type 
        } 
      };
      
      addImage(newImage);
      if (imageType==='character') selectImage(newImage.id);
      
      // Reset form
      setSelectedFile(null); 
      setPreviewUrl(null); 
      setUnlockLevel(1); 
      setImageType('character'); 
      setCategories({ nsfw:false, vip:false, event:false, random:false }); 
      setSelectedPoses([]); 
      setIsHidden(false); 
      setChatEnable(false); 
      setChatSendPercent(0);
      
      toast({ 
        title: '✅ Upload complete!', 
        description: `${selectedFile.name} added to ${selectedChar.name}` 
      });
      
    } catch (e: any) {
      console.error('🔴 [UPLOAD] Failed:', e);
      let errorMessage = 'Upload failed';
      
      if (e.name === 'AbortError') {
        errorMessage = 'Upload timeout - file may be too large or server is slow';
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      toast({ 
        title: '❌ Upload failed', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    } finally {
      // 🔧 CLEANUP: Always clean up state
      uploadingFiles.delete(fileKey);
      setIsUploading(false);
      setUploadProgress(0);
      
      // Clean up preview URL
      if (previewUrl) {
        try {
          URL.revokeObjectURL(previewUrl);
        } catch {}
      }
    }
  };

  const handleEditImage = async () => {
    if (!editingImage) return;
    if (isUploading) return toast({ title: '⚠️ Cannot edit while uploading', variant: 'destructive' });
    
    console.log('🖼️ [EDIT IMAGE] Updating image:', editingImage.id);
    console.log('🎭 [EDIT IMAGE] Character reassignment:', editingImage.characterId);
    console.log('🎪 [EDIT IMAGE] Poses:', editingImage.poses);
    
    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) return toast({ title: '❌ Authentication required', variant: 'destructive' });
    
    setIsUploading(true); // Prevent double-edits
    
    try {
      const updateData = {
        characterId: editingImage.characterId,
        imageType: editingImage.imageType,
        unlockLevel: editingImage.unlockLevel,
        categories: editingImage.categories,
        poses: editingImage.poses,
        isHidden: editingImage.isHidden,
        chatEnable: editingImage.chatEnable,
        chatSendPercent: editingImage.chatSendPercent
      };
      
      const res = await fetch(`/api/media/${editingImage.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(updateData),
        signal: AbortSignal.timeout(10000) // 10 second timeout for edits
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to update image (${res.status}): ${errorText}`);
      }
      
      updateImage(editingImage);
      toast({ 
        title: '✅ Image updated', 
        description: `Changes saved${editingImage.characterId !== selectedCharacterId ? ' (reassigned character)' : ''}` 
      });
      setEditingImage(null);
    } catch (e: any) {
      console.error('🔴 [EDIT IMAGE] Failed:', e);
      let errorMessage = 'Update failed';
      if (e.name === 'AbortError') {
        errorMessage = 'Update timeout - server may be busy';
      } else if (e.message) {
        errorMessage = e.message;
      }
      toast({ title: '❌ Update failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Delete this image? This action cannot be undone.')) return;
    if (isUploading) return toast({ title: '⚠️ Cannot delete while uploading', variant: 'destructive' });
    
    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) return toast({ title: '❌ Authentication required', variant: 'destructive' });
    
    setIsUploading(true); // Prevent actions during delete
    
    try {
      const res = await fetch(`/api/media/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to delete image (${res.status}): ${errorText}`);
      }
      
      removeImage(imageId);
      toast({ title: '✅ Image deleted', description: 'Image removed successfully' });
    } catch (e: any) {
      console.error('🔴 [DELETE IMAGE] Failed:', e);
      toast({ title: '❌ Delete failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePose = (poseToRemove: string) => {
    setSelectedPoses(prev => prev.filter(p => p !== poseToRemove));
  };

  const handleAddPose = (pose: string) => {
    if (!selectedPoses.includes(pose)) {
      setSelectedPoses(prev => [...prev, pose]);
    }
  };

  const handleEditingRemovePose = (poseToRemove: string) => {
    if (editingImage) {
      setEditingImage({
        ...editingImage,
        poses: editingImage.poses?.filter(p => p !== poseToRemove) || []
      });
    }
  };

  const handleEditingAddPose = (pose: string) => {
    if (editingImage && !editingImage.poses?.includes(pose)) {
      setEditingImage({
        ...editingImage,
        poses: [...(editingImage.poses || []), pose]
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-purple-400 mb-2">📷 Enhanced Image Uploader</h2>
        <p className="text-sm text-gray-400">Select character, image type, level required, then upload with metadata</p>
        
        {/* 🔧 LOADING STATE INDICATOR */}
        {isUploading && (
          <div className="mt-3 p-3 bg-blue-900/20 border border-blue-400/30 rounded-lg">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span className="text-blue-400">
                {uploadProgress < 25 ? 'Preparing upload...' :
                 uploadProgress < 75 ? 'Uploading file...' :
                 uploadProgress < 100 ? 'Processing...' : 'Finalizing...'}
              </span>
            </div>
            {uploadProgress > 0 && (
              <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-400 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">Please don't tap upload again - processing in background</p>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="character-select">Select Character</Label>
          <Select value={selectedCharacterId} onValueChange={setSelectedCharacterId} disabled={isUploading}>
            <SelectTrigger><SelectValue placeholder="Select a character" /></SelectTrigger>
            <SelectContent>
              {characters.map(char => (<SelectItem key={char.id} value={char.id}>{char.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="image-type">Image Type</Label>
          <Select value={imageType} onValueChange={(v:any)=> setImageType(v)} disabled={isUploading}>
            <SelectTrigger id="image-type"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="character">Character</SelectItem>
              <SelectItem value="avatar">Avatar</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="background">Background</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="unlock-level">Level Required</Label>
          <Input 
            id="unlock-level" 
            type="number" 
            min="1" 
            value={unlockLevel} 
            onChange={(e)=> setUnlockLevel(parseInt(e.target.value)||1)}
            disabled={isUploading}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            🎪 Poses & Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newPoseInput}
                onChange={(e) => setNewPoseInput(e.target.value)}
                placeholder="Add a new pose (e.g., dancing, reading, workout)"
                className="flex-1"
                disabled={isUploading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPoseInput.trim()) {
                    const cleanPose = newPoseInput.trim().toLowerCase();
                    addNewPoseToMasterArray(cleanPose);
                    handleAddPose(cleanPose);
                    setNewPoseInput('');
                    e.preventDefault();
                  }
                  if (e.key === 'Backspace' && newPoseInput === '' && selectedPoses.length > 0) {
                    handleRemovePose(selectedPoses[selectedPoses.length - 1]);
                  }
                }}
              />
              <Button 
                onClick={() => {
                  if (newPoseInput.trim()) {
                    const cleanPose = newPoseInput.trim().toLowerCase();
                    addNewPoseToMasterArray(cleanPose);
                    handleAddPose(cleanPose);
                    setNewPoseInput('');
                  }
                }}
                variant="outline"
                size="sm"
                disabled={!newPoseInput.trim() || isUploading}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Available Poses (click to add/remove)</Label>
              <div className="flex flex-wrap gap-2">
                {availablePoses.map(pose => (
                  <Badge
                    key={pose}
                    variant={selectedPoses.includes(pose) ? "default" : "outline"}
                    className={`cursor-pointer hover:bg-primary/80 transition-colors ${
                      isUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => {
                      if (isUploading) return;
                      selectedPoses.includes(pose) ? handleRemovePose(pose) : handleAddPose(pose);
                    }}
                  >
                    {pose}
                  </Badge>
                ))}
              </div>
            </div>

            {selectedPoses.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Selected Poses ({selectedPoses.length}) - Click X to remove</Label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedPoses.map(pose => (
                    <Badge key={pose} variant="secondary" className="text-xs group hover:bg-destructive/80 transition-colors">
                      {pose} 
                      <X 
                        className={`w-3 h-3 ml-1 cursor-pointer opacity-70 group-hover:opacity-100 ${
                          isUploading ? 'cursor-not-allowed opacity-30' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isUploading) handleRemovePose(pose);
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-center">
        <Button 
          onClick={loadDataArraysFromServer} 
          disabled={isLoadingArrays || isUploading} 
          variant="outline" 
          size="sm"
        >
          <Database className="w-4 h-4 mr-2" />
          {isLoadingArrays ? 'Loading...' : 'Sync Arrays'}
        </Button>
        <Button 
          onClick={() => {
            if (!isUploading) {
              setCategories({ nsfw:false, vip:false, event:false, random:false });
              setSelectedPoses([]);
            }
          }} 
          variant="outline" 
          size="sm"
          disabled={isUploading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />Reset Settings
        </Button>
      </div>

      <div>
        <input 
          ref={fileInputRef} 
          id="image-upload" 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileSelect}
          disabled={isUploading}
        />
        <Label 
          htmlFor="image-upload" 
          className={`cursor-pointer block ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div className={`border-2 border-dashed border-border rounded-lg p-8 hover-elevate flex flex-col items-center justify-center gap-2 ${
            isUploading ? 'pointer-events-none' : ''
          }`}>
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <span className="text-sm text-blue-400">Upload in progress...</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to select image</span>
              </>
            )}
          </div>
        </Label>
      </div>

      {previewUrl && !isUploading && (
        <div className="space-y-4">
          <div className="relative w-full aspect-square max-w-xs mx-auto rounded-lg overflow-hidden border-2 border-primary">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />Upload Settings & Categories
            </CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {['nsfw','vip','event','random'].map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox 
                      id={category} 
                      checked={(categories as any)[category]||false} 
                      onCheckedChange={(c)=> setCategories(prev=> ({ ...prev, [category]: !!c }))}
                      disabled={isUploading}
                    />
                    <Label htmlFor={category} className="capitalize">{category} Content</Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <Checkbox id="hidden" checked={isHidden} onCheckedChange={(c)=> setIsHidden(!!c)} disabled={isUploading} />
                  <Label htmlFor="hidden">Hide from Gallery</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="chatEnable" checked={chatEnable} onCheckedChange={(c)=> setChatEnable(!!c)} disabled={isUploading} />
                  <Label htmlFor="chatEnable">Enable for Chat</Label>
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="chatSendPercent">Chat Send Percent</Label>
                <Input 
                  id="chatSendPercent" 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={chatSendPercent} 
                  onChange={(e)=> setChatSendPercent(parseInt(e.target.value)||0)}
                  disabled={isUploading}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || !selectedCharacterId || isUploading} 
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload with Metadata
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={()=> { 
                if (!isUploading) {
                  setSelectedFile(null); 
                  setPreviewUrl(null); 
                  try { if (previewUrl) URL.revokeObjectURL(previewUrl); } catch {}
                }
              }}
              disabled={isUploading}
            >
              <X className="w-4 h-4" />Cancel
            </Button>
          </div>
        </div>
      )}

      {editingImage && (
        <Card className="border-blue-500 bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Edit className="w-5 h-5" />
              {isUploading ? 'Saving changes...' : 'Editing Image'}
              <Badge variant="outline" className="ml-auto">
                {characters.find(c => c.id === editingImage.characterId)?.name || 'Unknown Character'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-lg overflow-hidden border flex-shrink-0">
                <img 
                  src={editingImage.url?.startsWith('http') ? editingImage.url : `${location.origin}${editingImage.url}`} 
                  alt="Editing" 
                  className="w-full h-full object-cover bg-gray-800" 
                />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4" />
                    Reassign to Character
                  </Label>
                  <Select 
                    value={editingImage.characterId} 
                    onValueChange={(characterId) => setEditingImage({...editingImage, characterId})}
                    disabled={isUploading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select character" />
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
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Image Type</Label>
                    <Select 
                      value={editingImage.imageType || 'character'} 
                      onValueChange={(v:any)=> setEditingImage({...editingImage, imageType: v})}
                      disabled={isUploading}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="character">Character</SelectItem>
                        <SelectItem value="avatar">Avatar</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="background">Background</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Level Required</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={editingImage.unlockLevel} 
                      onChange={(e)=> setEditingImage({...editingImage, unlockLevel: parseInt(e.target.value)||1})}
                      disabled={isUploading}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {['nsfw','vip','event','random'].map(category => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox 
                        checked={editingImage.categories?.[category as keyof typeof editingImage.categories] || false} 
                        onCheckedChange={(c)=> setEditingImage({
                          ...editingImage, 
                          categories: {...(editingImage.categories || {}), [category]: !!c}
                        })}
                        disabled={isUploading}
                      />
                      <Label className="capitalize">{category}</Label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={editingImage.isHidden} 
                      onCheckedChange={(c)=> setEditingImage({...editingImage, isHidden: !!c})}
                      disabled={isUploading}
                    />
                    <Label>Hide from Gallery</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={editingImage.chatEnable} 
                      onCheckedChange={(c)=> setEditingImage({...editingImage, chatEnable: !!c})}
                      disabled={isUploading}
                    />
                    <Label>Enable for Chat</Label>
                  </div>
                </div>
                
                <div>
                  <Label>Chat Send Percent</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={editingImage.chatSendPercent || 0} 
                    onChange={(e)=> setEditingImage({...editingImage, chatSendPercent: parseInt(e.target.value)||0})}
                    disabled={isUploading}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                🎪 Edit Poses
              </Label>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Available Poses (click to add)</Label>
                  <div className="flex flex-wrap gap-2">
                    {availablePoses.map(pose => (
                      <Badge
                        key={pose}
                        variant={editingImage.poses?.includes(pose) ? "default" : "outline"}
                        className={`cursor-pointer hover:bg-primary/80 transition-colors text-xs ${
                          isUploading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => {
                          if (isUploading) return;
                          editingImage.poses?.includes(pose) ? handleEditingRemovePose(pose) : handleEditingAddPose(pose);
                        }}
                      >
                        {pose}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {editingImage.poses && editingImage.poses.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Current Poses ({editingImage.poses.length}) - Click X to remove</Label>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {editingImage.poses.map(pose => (
                        <Badge key={pose} variant="secondary" className="text-xs group hover:bg-destructive/80 transition-colors">
                          {pose} 
                          <X 
                            className={`w-3 h-3 ml-1 cursor-pointer opacity-70 group-hover:opacity-100 ${
                              isUploading ? 'cursor-not-allowed opacity-30' : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isUploading) handleEditingRemovePose(pose);
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleEditImage} 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (!isUploading) setEditingImage(null);
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {adminMode ? 'Uploaded Images' : 'Character Gallery'}
            <Badge variant="outline">{characterImages.length} images</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollContainer height="h-[50vh]">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4">
              {characterImages.map(image => {
                const isSelected = state.selectedImageId===image.id; 
                const isUnlocked = state.level>=image.unlockLevel;
                const imgSrc = image.url?.startsWith('http') ? image.url : `${location.origin}${image.url}`;
                
                return (
                  <div 
                    key={image.id} 
                    className="relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 group hover:border-primary/70 cursor-pointer"
                  >
                    <img src={imgSrc} alt="Character" className="w-full h-full object-cover bg-gray-800" loading="lazy" />
                    
                    {image.imageType && (
                      <Badge className="absolute top-1 left-1 text-xs bg-black/70 text-white">
                        {image.imageType}
                      </Badge>
                    )}
                    {image.unlockLevel > 1 && (
                      <Badge variant="secondary" className="absolute top-1 right-1 text-xs bg-black/70">
                        Lv{image.unlockLevel}
                      </Badge>
                    )}
                    
                    {image.poses && image.poses.length > 0 && (
                      <Badge className="absolute bottom-1 left-1 text-xs bg-purple-600/90 text-white">
                        {image.poses.length} poses
                      </Badge>
                    )}
                    
                    {adminMode && (
                      <div className={`absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 ${
                        isUploading ? 'pointer-events-none' : ''
                      }`}>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isUploading) setEditingImage({...image});
                          }}
                          className="bg-blue-600/90 hover:bg-blue-700 border-blue-400"
                          disabled={isUploading}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isUploading) handleDeleteImage(image.id);
                          }}
                          className="bg-red-600/90 hover:bg-red-700"
                          disabled={isUploading}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    
                    {!adminMode && isSelected && (
                      <div className="absolute inset-0 border-2 border-primary bg-primary/10"></div>
                    )}
                    
                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <div className="text-center text-white">
                          <div className="text-2xl mb-1">🔒</div>
                          <div className="text-xs">Level {image.unlockLevel}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {characterImages.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No images for this character yet</p>
                </div>
              )}
            </div>
          </ScrollContainer>
        </CardContent>
      </Card>
    </div>
  );
}