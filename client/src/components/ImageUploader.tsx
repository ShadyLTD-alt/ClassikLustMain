import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Edit, Plus, Database, RefreshCw, CheckCircle } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogContent } from '@/components/ui/dialog';
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

  const [availablePoses, setAvailablePoses] = useState<string[]>(() => {
    const saved = localStorage.getItem('availablePoses');
    return saved ? JSON.parse(saved) : ['sitting','standing','casual','formal','bikini','dress','playful','seductive','cute','elegant'];
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

  const handleUpload = async () => {
    if (!selectedFile) return toast({ title: '❌ No file selected', variant: 'destructive' });
    if (!selectedCharacterId) return toast({ title: '❌ No character selected', variant: 'destructive' });
    const selectedChar = characters.find(c=>c.id===selectedCharacterId); if (!selectedChar) return toast({ title:'❌ Character not found', variant:'destructive' });
    const sessionToken = localStorage.getItem('sessionToken'); if (!sessionToken) return toast({ title:'❌ Authentication required', variant:'destructive' });

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

    const res = await fetch('/api/upload', { method:'POST', headers:{ 'Authorization': `Bearer ${sessionToken}` }, body: formData });
    if (!res.ok) { const t = await res.text(); return toast({ title: '❌ Upload failed', description: t, variant:'destructive' }); }
    const data = await res.json();

    const newImage: ImageConfig = { id: data.media?.id || `img-${Date.now()}`, characterId: selectedCharacterId, url: data.url, unlockLevel: unlockLevel || 1, isAvatar: imageType==='avatar', isDisplay: imageType==='character', imageType, categories: { ...categories }, poses: [...selectedPoses], isHidden, chatEnable, chatSendPercent, uploadedAt: new Date().toISOString(), arrayVersion: imageDataArrays.poses.available.length, metadata: { originalFileName: selectedFile.name, fileSize: selectedFile.size, fileType: selectedFile.type } };
    addImage(newImage);
    if (imageType==='character') selectImage(newImage.id);
    setSelectedFile(null); setPreviewUrl(null); setUnlockLevel(1); setImageType('character'); setCategories({ nsfw:false, vip:false, event:false, random:false }); setSelectedPoses([]); setIsHidden(false); setChatEnable(false); setChatSendPercent(0);
    toast({ title: '✅ Image uploaded successfully!', description: `Added to ${selectedChar.name}` });
  };

  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline"><ImageIcon className="w-4 h-4 mr-2" />Image Gallery</Button></DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Enhanced Image Uploader</DialogTitle>
          <DialogDescription>Select a character, pick image type, level required, then upload with metadata</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="character-select">Select Character</Label>
              <Select value={selectedCharacterId} onValueChange={setSelectedCharacterId}>
                <SelectTrigger><SelectValue placeholder="Select a character" /></SelectTrigger>
                <SelectContent>
                  {characters.map(char => (<SelectItem key={char.id} value={char.id}>{char.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Restored: Image Type */}
            <div>
              <Label htmlFor="image-type">Image Type</Label>
              <Select value={imageType} onValueChange={(v:any)=> setImageType(v)}>
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

            {/* Restored: Level Required (default 1) */}
            <div>
              <Label htmlFor="unlock-level">Level Required</Label>
              <Input id="unlock-level" type="number" min="1" value={unlockLevel} onChange={(e)=> setUnlockLevel(parseInt(e.target.value)||1)} />
            </div>
          </div>

          <div>
            <input ref={fileInputRef} id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
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

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Upload Settings & Categories</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {['nsfw','vip','event','random'].map(category => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox id={category} checked={(categories as any)[category]||false} onCheckedChange={(c)=> setCategories(prev=> ({ ...prev, [category]: !!c }))} />
                        <Label htmlFor={category} className="capitalize">{category}</Label>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2">
                      <Checkbox id="hidden" checked={isHidden} onCheckedChange={(c)=> setIsHidden(!!c)} />
                      <Label htmlFor="hidden">Hide from Character Gallery</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="chatEnable" checked={chatEnable} onCheckedChange={(c)=> setChatEnable(!!c)} />
                      <Label htmlFor="chatEnable">Enable for Chat</Label>
                    </div>
                    <div>
                      <Label htmlFor="chatSendPercent">Chat Send %</Label>
                      <Input id="chatSendPercent" type="number" min="0" max="100" value={chatSendPercent} onChange={(e)=> setChatSendPercent(parseInt(e.target.value)||0)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={!selectedFile || !selectedCharacterId} className="flex-1"><Upload className="w-4 h-4 mr-2" />Upload with Metadata</Button>
                <Button variant="outline" onClick={()=> { setSelectedFile(null); setPreviewUrl(null); }}>
                  <X className="w-4 h-4" />Cancel
                </Button>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">{adminMode ? 'Uploaded Images' : 'Image Gallery'}
                <Badge variant="outline">{characterImages.length} images</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh] md:h-[70vh]">
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {characterImages.map(image => {
                    const isSelected = state.selectedImageId===image.id; const isUnlocked = state.level>=image.unlockLevel;
                    return (
                      <div key={image.id} className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 ${isSelected ? 'border-primary ring-2 ring-primary/50':'border-card-border'} ${isUnlocked ? 'hover:border-primary/70 hover:scale-105 cursor-pointer transform-gpu':'opacity-50 cursor-not-allowed'}`} onClick={()=> isUnlocked && !adminMode && selectImage(image.id)}>
                        <img src={image.url} alt="Character" className={`w-full h-full object-cover ${!isUnlocked && 'blur-sm'}`} loading="lazy" />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
