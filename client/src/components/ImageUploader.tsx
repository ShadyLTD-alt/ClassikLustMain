import { useState, useEffect, useCallback } from 'react';
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