import React, { useState, useEffect, useCallback } from 'react';
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

interface ImageUploaderProps { adminMode?: boolean }

export default function ImageUploader({ adminMode = false }: ImageUploaderProps) {
  const { state, characters, images, addImage, updateImage, removeImage, selectImage } = useGame();
  const { toast } = useToast();

  const [categories, setCategories] = useState({ nsfw: false, vip: false, event: false, random: false });
  const [unlockLevel, setUnlockLevel] = useState(1);
  const [imageType, setImageType] = useState<'character'|'avatar'|'vip'|'other'>('character');
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
    imageTypes: { available: ['character','avatar','vip','other','background','outfit'], descriptions: { character: 'Main character display image', avatar: 'Small profile picture', vip: 'Premium content image', other: 'General purpose image', background: 'Scene background', outfit: 'Character outfit variant' } }
  });

  const [isLoadingArrays, setIsLoadingArrays] = useState(false);

  useEffect(() => { localStorage.setItem('availablePoses', JSON.stringify(availablePoses)); }, [availablePoses]);
  useEffect(() => { setSelectedCharacterId(state.selectedCharacterId); }, [state.selectedCharacterId]);

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
    } catch (e: any) {
      toast({ title: '❌ Failed to load data arrays', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally { setIsLoadingArrays(false); }
  }, [images, toast]);

  const addNewPoseToMasterArray = useCallback((pose: string) => {
    const clean = pose.trim().toLowerCase();
    if (!clean || availablePoses.includes(clean)) return;
    setAvailablePoses(prev => [...prev, clean].sort());
    setImageDataArrays(prev => ({ ...prev, poses: { ...prev.poses, available: [...prev.poses.available, clean].sort(), custom: [...prev.poses.custom, clean].sort() } }));
    toast({ title: `✨ Added pose: ${clean}` });
  }, [availablePoses, toast]);

  const addNewCategoryToMasterArray = useCallback((category: string) => {
    const clean = category.trim().toLowerCase();
    if (!clean || imageDataArrays.categories.available.includes(clean)) return;
    setImageDataArrays(prev => ({ ...prev, categories: { ...prev.categories, available: [...prev.categories.available, clean].sort(), custom: [...prev.categories.custom, clean].sort() } }));
    toast({ title: `✨ Added category: ${clean}` });
  }, [imageDataArrays.categories.available, toast]);

  const syncArraysToServer = useCallback(async () => {
    try {
      const payload = { poses: imageDataArrays.poses.available, categories: imageDataArrays.categories.available, imageTypes: imageDataArrays.imageTypes.available, lastUpdated: new Date().toISOString() };
      const res = await fetch('/api/admin/image-arrays', { method: 'PATCH', headers: { 'Content-Type':'application/json','Authorization': `Bearer ${localStorage.getItem('sessionToken')}` }, body: JSON.stringify(payload) });
      if (res.ok) toast({ title: '✅ Arrays synced to server' }); else toast({ title: '⚠️ Server sync failed, saved locally' });
    } catch { toast({ title: '⚠️ Server sync failed, saved locally' }); }
  }, [imageDataArrays, toast]);

  const resetArraysToDefaults = useCallback(() => {
    setImageDataArrays({
      categories: { default: ['nsfw','vip','event','random'], available: ['nsfw','vip','event','random','exclusive','seasonal','bonus'], custom: [] },
      poses: { default: ['sitting','standing','casual','formal'], available: ['sitting','standing','casual','formal','bikini','dress','playful','seductive','cute','elegant'], custom: [] },
      imageTypes: { available: ['character','avatar','vip','other','background','outfit'], descriptions: { character:'Main character display image', avatar:'Small profile picture', vip:'Premium content image', other:'General purpose image', background:'Scene background', outfit:'Character outfit variant' } }
    });
    toast({ title: '✅ Arrays reset to defaults' });
  }, [toast]);

  const characterImages = (adminMode ? images.filter(i=> i.characterId===selectedCharacterId) : images.filter(i=> i.characterId===selectedCharacterId && !i.isHidden));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader(); reader.onload = (ev) => setPreviewUrl(ev.target?.result as string); reader.readAsDataURL(file); e.target.value='';
  };

  const handleAddPose = () => { if (newPoseInput.trim()) { addNewPoseToMasterArray(newPoseInput); setNewPoseInput(''); } };
  const togglePose = (pose: string) => setSelectedPoses(prev => prev.includes(pose) ? prev.filter(p=>p!==pose) : [...prev, pose]);

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
    formData.append('unlockLevel', String(unlockLevel));
    formData.append('categories', JSON.stringify(categories));
    formData.append('poses', JSON.stringify(selectedPoses));
    formData.append('isHidden', String(isHidden));
    formData.append('chatEnable', String(chatEnable));
    formData.append('chatSendPercent', String(chatSendPercent));
    formData.append('availablePoses', JSON.stringify(availablePoses));
    formData.append('dataArrays', JSON.stringify(imageDataArrays));

    const res = await fetch('/api/upload', { method:'POST', headers:{ 'Authorization': `Bearer ${sessionToken}` }, body: formData });
    if (!res.ok) { const t = await res.text(); return toast({ title: '❌ Upload failed', description: t, variant:'destructive' }); }
    const data = await res.json();

    const newImage: ImageConfig = { id: data.media?.id || `img-${Date.now()}`, characterId: selectedCharacterId, url: data.url, unlockLevel, isAvatar: imageType==='avatar', isDisplay: imageType==='character', imageType, categories: { ...categories }, poses: [...selectedPoses], isHidden, chatEnable, chatSendPercent, uploadedAt: new Date().toISOString(), arrayVersion: imageDataArrays.poses.available.length, metadata: { originalFileName: selectedFile.name, fileSize: selectedFile.size, fileType: selectedFile.type } };
    addImage(newImage);
    if (imageType==='character') selectImage(newImage.id);
    const newPoses = selectedPoses.filter(p=>!availablePoses.includes(p)); newPoses.forEach(p=>addNewPoseToMasterArray(p));
    resetUploadForm();
    toast({ title: '✅ Image uploaded successfully!', description: `Added to ${selectedChar.name} with ${selectedPoses.length} poses` });
    if (newPoses.length>0) await syncArraysToServer();
  };

  const resetUploadForm = useCallback(() => { setSelectedFile(null); setPreviewUrl(null); setUnlockLevel(1); setImageType('character'); setCategories({ nsfw:false, vip:false, event:false, random:false }); setSelectedPoses([]); setIsHidden(false); setChatEnable(false); setChatSendPercent(0); }, []);

  const handleCancelUpload = () => resetUploadForm();
  const handleSaveEdit = () => { if (editingImage) { updateImage(editingImage); setEditingImage(null); toast({ title: '✅ Image updated successfully' }); } };
  const handleSetAsDisplay = (imageId: string) => { selectImage(imageId); toast({ title:'✅ Display image updated' }); };

  const UploaderContent = () => (
    <div className="space-y-4">
      {adminMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">🆼️ Enhanced Image Uploader
              <div className="flex gap-2">
                <Button onClick={loadDataArraysFromServer} disabled={isLoadingArrays} size="sm" variant="outline">{isLoadingArrays ? (<RefreshCw className="w-4 h-4 animate-spin" />) : (<Database className="w-4 h-4" />)}Sync Arrays</Button>
                <Button onClick={syncArraysToServer} size="sm" variant="outline"><Upload className="w-4 h-4" />Save Arrays</Button>
                <Button onClick={resetArraysToDefaults} size="sm" variant="outline"><RefreshCw className="w-4 h-4" />Reset</Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <Card className="bg-muted/30"><CardContent className="p-3"><div className="grid grid-cols-3 gap-4 text-sm"><div className="text-center"><div className="font-semibold text-blue-400">Poses Available</div><div className="text-2xl font-bold">{imageDataArrays.poses.available.length}</div><div className="text-xs text-muted-foreground">Custom: {imageDataArrays.poses.custom.length}</div></div><div className="text-center"><div className="font-semibold text-green-400">Categories</div><div className="text-2xl font-bold">{imageDataArrays.categories.available.length}</div><div className="text-xs text-muted-foreground">Custom: {imageDataArrays.categories.custom.length}</div></div><div className="text-center"><div className="font-semibold text-purple-400">Image Types</div><div className="text-2xl font-bold">{imageDataArrays.imageTypes.available.length}</div></div></div></CardContent></Card>
            <div><Label htmlFor="character-select">Select Character</Label><Select value={selectedCharacterId} onValueChange={setSelectedCharacterId}><SelectTrigger><SelectValue placeholder="Select a character" /></SelectTrigger><SelectContent>{characters.map(char => (<SelectItem key={char.id} value={char.id}>{char.name}</SelectItem>))}</SelectContent></Select></div>
            {!selectedCharacterId && (<div className="text-sm text-muted-foreground bg-muted p-3 rounded">Please select a character before uploading images</div>)}
            <div><input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleFileSelect} data-testid="input-image-upload" /><Label htmlFor="image-upload" className="cursor-pointer block"><div className="border-2 border-dashed border-border rounded-lg p-8 hover-elevate flex flex-col items-center justify-center gap-2"><Upload className="w-8 h-8 text-muted-foreground" /><span className="text-sm text-muted-foreground">Click to select image</span></div></Label></div>
            {previewUrl && (<div className="space-y-3"><div className="relative w-full aspect-square max-w-xs mx-auto rounded-lg overflow-hidden border-2 border-primary"><img src={previewUrl} alt="Preview" className="w-full h-full object-cover" /></div><div><Label htmlFor="unlock-level">Unlock Level Required</Label><Input id="unlock-level" type="number" min="1" value={unlockLevel} onChange={(e)=> setUnlockLevel(parseInt(e.target.value)||1)} /></div><div className="flex items-center space-x-2 mb-3"><Checkbox id="hidden" checked={isHidden} onCheckedChange={(c)=> setIsHidden(!!c)} /><Label htmlFor="hidden">Hide from Character Gallery</Label></div><Card><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center justify-between">🎭 Poses ({selectedPoses.length} selected)<Badge variant="outline">{imageDataArrays.poses.available.length} available</Badge></CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex gap-2"><Input placeholder="Add new pose" value={newPoseInput} onChange={(e)=> setNewPoseInput(e.target.value)} onKeyDown={(e)=> e.key==='Enter' && handleAddPose()} /><Button onClick={handleAddPose} size="sm"><Plus className="w-4 h-4" /></Button></div><ScrollArea className="h-[60vh] md:h-[70vh]"><div className="flex flex-wrap gap-2">{imageDataArrays.poses.available.map(pose => (<Badge key={pose} variant={selectedPoses.includes(pose)?'default':'outline'} className="cursor-pointer hover:scale-105 transition-transform" onClick={()=> togglePose(pose)}>{pose}{imageDataArrays.poses.custom.includes(pose) && (<span className="ml-1 text-xs">✨</span>)}</Badge>))}</div></ScrollArea></CardContent></Card><Card><CardHeader className="pb-3"><CardTitle className="text-sm">Upload Settings & Categories</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-4">{imageDataArrays.categories.available.map(category => (<div key={category} className="flex items-center space-x-2"><Checkbox id={category} checked={(categories as any)[category]||false} onCheckedChange={(c)=> setCategories(prev=> ({ ...prev, [category]: !!c }))} /><Label htmlFor={category} className="cursor-pointer capitalize">{category}{imageDataArrays.categories.custom.includes(category) && (<span className="ml-1 text-xs text-blue-400">✨</span>)}</Label></div>))}</div></CardContent></Card><div className="flex gap-2"><Button onClick={handleUpload} className="flex-1"><Upload className="w-4 h-4 mr-2" />✨ Enhanced Upload</Button><Button onClick={handleCancelUpload} variant="outline">Cancel</Button></div></div>)}
          </CardContent>
        </Card>
      )}

      <Card><CardHeader><CardTitle className="flex items-center justify-between">{adminMode ? '🖼️ Uploaded Images' : '🆼️ Image Gallery'}<div className="flex gap-2"><Badge variant="outline">{characterImages.length} images</Badge>{adminMode && (<Badge className="bg-green-600">{images.filter(img=> img.poses && img.poses.length>0).length} with poses</Badge>)}</div></CardTitle></CardHeader><CardContent><ScrollArea className="h-[60vh] md:h-[70vh]"><div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">{characterImages.map(image => { const isSelected = state.selectedImageId===image.id; const isUnlocked = state.level>=image.unlockLevel; return (<div key={image.id} className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 ${isSelected ? 'border-primary ring-2 ring-primary/50':'border-card-border'} ${isUnlocked ? 'hover:border-primary/70 hover:scale-105 cursor-pointer transform-gpu':'opacity-50 cursor-not-allowed'}`} onClick={()=> isUnlocked && !adminMode && handleSetAsDisplay(image.id)}><img src={image.url} alt="Character" className={`w-full h-full object-cover ${!isUnlocked && 'blur-sm'}`} loading="lazy" />{adminMode && (<div className="absolute top-1 right-1 flex gap-1"><Button variant="secondary" size="icon" className="h-6 w-6 bg-blue-600/80 hover:bg-blue-700" onClick={(e)=> { e.stopPropagation(); setEditingImage(image); }}><Edit className="w-3 h-3" /></Button><Button variant="destructive" size="icon" className="h-6 w-6" onClick={(e)=> { e.stopPropagation(); removeImage(image.id); toast({ title: '✅ Image deleted' }); }}><X className="w-3 h-3" /></Button></div>)}{!adminMode && isUnlocked && (<div className="absolute top-1 right-1"><Badge className="bg-primary text-xs cursor-pointer">{isSelected ? 'Display':'Set'}</Badge></div>)}<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2"><div className="flex flex-wrap gap-1 justify-center"><Badge variant="outline" className="text-xs px-1">Lv.{image.unlockLevel}</Badge>{(image as any).imageType && (<Badge className="text-xs px-1 capitalize">{(image as any).imageType}</Badge>)}{(image as any).categories?.nsfw && <Badge variant="destructive" className="text-xs px-1">NSFW</Badge>}{(image as any).categories?.vip && <Badge className="bg-blue-500 text-xs px-1">VIP</Badge>}{(image as any).categories?.event && <Badge className="bg-purple-500 text-xs px-1">Event</Badge>}{image.poses && image.poses.length>0 && (<Badge className="bg-cyan-500 text-xs px-1">{image.poses.length} poses</Badge>)}</div></div></div>); })}{characterImages.length===0 && (<div className="col-span-full flex flex-col items-center justify-center py-8 text-muted-foreground"><ImageIcon className="w-12 h-12 mb-4 opacity-50" /><p>No images for {characters.find(c=>c.id===selectedCharacterId)?.name || 'this character'}</p><p className="text-xs mt-1">Upload some images to get started!</p></div>)}</div></ScrollArea></CardContent></Card>
    </div>
  );

  if (adminMode) {
    return (<>
      <UploaderContent />
      <Dialog open={!!editingImage} onOpenChange={(open)=> !open && setEditingImage(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>✏️ Edit Image Metadata</DialogTitle>
            <DialogDescription>Update image settings, categories, and pose data</DialogDescription>
          </DialogHeader>
          {editingImage && (<div className="space-y-4">
            <div><Label>Character</Label><Select value={editingImage.characterId} onValueChange={(v)=> setEditingImage({ ...editingImage, characterId: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{characters.map(char=> (<SelectItem key={char.id} value={char.id}>{char.name}</SelectItem>))}</SelectContent></Select></div>
            <div><Label>Image Type</Label><Select value={(editingImage as any).imageType || 'character'} onValueChange={(v:any)=> setEditingImage({ ...editingImage, imageType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{imageDataArrays.imageTypes.available.map(t=> (<SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>))}</SelectContent></Select></div>
            <div><Label>Unlock Level</Label><Input type="number" min="1" value={editingImage.unlockLevel} onChange={(e)=> setEditingImage({ ...editingImage, unlockLevel: parseInt(e.target.value)||1 })} /></div>
            <div><Label>Poses ({editingImage.poses?.length || 0} selected)</Label><ScrollArea className="h-[60vh] md:h-[70vh]"><div className="flex flex-wrap gap-2">{imageDataArrays.poses.available.map(pose => (<Badge key={pose} variant={editingImage.poses?.includes(pose)?'default':'outline'} className="cursor-pointer" onClick={()=> { const np = editingImage.poses?.includes(pose) ? editingImage.poses.filter(p=>p!==pose) : [...(editingImage.poses||[]), pose]; setEditingImage({ ...editingImage, poses: np }); }}>{pose}</Badge>))}</div></ScrollArea></div>
            <div className="flex items-center space-x-2"><Checkbox id="edit-hidden" checked={editingImage.isHidden || false} onCheckedChange={(c)=> setEditingImage({ ...editingImage, isHidden: !!c })} /><Label htmlFor="edit-hidden">Hide from Character Gallery</Label></div>
            <div className="grid grid-cols-3 gap-4">{imageDataArrays.categories.available.map(category => (<div key={category} className="flex items-center space-x-2"><Checkbox id={`edit-${category}`} checked={(editingImage as any).categories?.[category] || false} onCheckedChange={(c)=> setEditingImage({ ...editingImage, categories: { ...(editingImage as any).categories, [category]: !!c } })} /><Label htmlFor={`edit-${category}`} className="capitalize">{category}</Label></div>))}</div>
            <Button onClick={handleSaveEdit} className="w-full"><CheckCircle className="w-4 h-4 mr-2" />Save Changes</Button>
          </div>)}
        </DialogContent>
      </Dialog>
    </>);
  }

  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline"><ImageIcon className="w-4 h-4 mr-2" />Image Gallery</Button></DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden"><DialogHeader><DialogTitle>Image Gallery - {characters.find(c=>c.id===selectedCharacterId)?.name}</DialogTitle><DialogDescription>Select an unlocked image to set as your display picture</DialogDescription></DialogHeader><UploaderContent /></DialogContent>
    </Dialog>
  );
}
