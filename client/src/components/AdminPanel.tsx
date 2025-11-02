import { useState } from 'react';
import { Settings, Save, RotateCcw, Plus, X, Users, Upload, Palette, Crown, Star, Zap, Heart, Gem, TrendingUp, Trash2, Edit } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import ImageUploader from '@/components/ImageUploader';
import type { UpgradeConfig, CharacterConfig, LevelConfig, ThemeConfig } from '@shared/gameConfig';

export default function AdminPanel() {
  const { state, upgrades, characters, levelConfigs, theme, updateUpgradeConfig, updateCharacterConfig, updateLevelConfig, updateTheme, deleteUpgrade, deleteCharacter, deleteLevel, resetGame } = useGame();
  const { toast } = useToast();
  const [editingUpgrade, setEditingUpgrade] = useState<UpgradeConfig | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<CharacterConfig | null>(null);
  const [editingLevel, setEditingLevel] = useState<LevelConfig | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [adminToken] = useState(localStorage.getItem('adminToken') || '');

  // Fetch players data
  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ['/api/admin/players'],
    enabled: !!adminToken && state.isAdmin,
    queryFn: async () => {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
      };
      if (adminToken) headers['x-admin-token'] = adminToken;
      const response = await fetch('/api/admin/players', { headers });
      if (!response.ok) throw new Error('Failed to fetch players');
      return response.json();
    }
  });

  // Mutations for server sync
  const saveUpgradeMutation = useMutation({
    mutationFn: async (upgrade: UpgradeConfig) => {
      const existing = upgrades.find(u => u.id === upgrade.id);
      const method = existing ? 'PATCH' : 'POST';
      const url = existing ? `/api/admin/upgrades/${upgrade.id}` : '/api/admin/upgrades';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
      };
      if (adminToken) headers['x-admin-token'] = adminToken;
      const response = await fetch(url, { method, headers, body: JSON.stringify(upgrade) });
      if (!response.ok) throw new Error('Failed to save upgrade');
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/upgrades'] });
      updateUpgradeConfig(variables);
      toast({ title: 'Upgrade saved', description: `${variables.name} saved to master JSON and DB.` });
      setEditingUpgrade(null);
    },
    onError: (error) => {
      toast({ title: 'Error saving upgrade', description: error.message, variant: 'destructive' });
    }
  });

  const saveCharacterMutation = useMutation({
    mutationFn: async (character: CharacterConfig) => {
      const existing = characters.find(c => c.id === character.id);
      const method = existing ? 'PATCH' : 'POST';
      const url = existing ? `/api/admin/characters/${character.id}` : '/api/admin/characters';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
      };
      if (adminToken) headers['x-admin-token'] = adminToken;
      const response = await fetch(url, { method, headers, body: JSON.stringify(character) });
      if (!response.ok) throw new Error('Failed to save character');
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/characters'] });
      updateCharacterConfig(variables);
      toast({ title: 'Character saved', description: `${variables.name} saved to master JSON and DB.` });
      setEditingCharacter(null);
    },
    onError: (error) => {
      toast({ title: 'Error saving character', description: error.message, variant: 'destructive' });
    }
  });

  const saveLevelMutation = useMutation({
    mutationFn: async (level: LevelConfig) => {
      const existing = levelConfigs.find(l => l.level === level.level);
      const method = existing ? 'PATCH' : 'POST';
      const url = existing ? `/api/admin/levels/${level.level}` : '/api/admin/levels';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
      };
      if (adminToken) headers['x-admin-token'] = adminToken;
      const response = await fetch(url, { method, headers, body: JSON.stringify(level) });
      if (!response.ok) throw new Error('Failed to save level');
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/levels'] });
      updateLevelConfig(variables);
      toast({ title: 'Level saved', description: `Level ${variables.level} saved to master JSON and DB.` });
      setEditingLevel(null);
    },
    onError: (error) => {
      toast({ title: 'Error saving level', description: error.message, variant: 'destructive' });
    }
  });

  const deleteUpgradeMutation = useMutation({
    mutationFn: async (upgradeId: string) => {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
      };
      if (adminToken) headers['x-admin-token'] = adminToken;
      const response = await fetch(`/api/admin/upgrades/${upgradeId}`, { method: 'DELETE', headers });
      if (!response.ok) throw new Error('Failed to delete upgrade');
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/upgrades'] });
      deleteUpgrade(variables);
      toast({ title: 'Upgrade deleted', description: 'Upgrade removed from master JSON and DB.' });
      setEditingUpgrade(null);
    }
  });

  const deleteCharacterMutation = useMutation({
    mutationFn: async (characterId: string) => {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
      };
      if (adminToken) headers['x-admin-token'] = adminToken;
      const response = await fetch(`/api/admin/characters/${characterId}`, { method: 'DELETE', headers });
      if (!response.ok) throw new Error('Failed to delete character');
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/characters'] });
      deleteCharacter(variables);
      toast({ title: 'Character deleted', description: 'Character removed from master JSON and DB.' });
      setEditingCharacter(null);
    }
  });

  const deleteLevelMutation = useMutation({
    mutationFn: async (level: number) => {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
      };
      if (adminToken) headers['x-admin-token'] = adminToken;
      const response = await fetch(`/api/admin/levels/${level}`, { method: 'DELETE', headers });
      if (!response.ok) throw new Error('Failed to delete level');
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/levels'] });
      deleteLevel(variables);
      toast({ title: 'Level deleted', description: `Level ${variables} removed from master JSON and DB.` });
      setEditingLevel(null);
    }
  });

  // Player admin actions
  const updatePlayerMutation = useMutation({
    mutationFn: async ({ playerId, updates }: { playerId: string, updates: any }) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
      };
      if (adminToken) headers['x-admin-token'] = adminToken;
      const response = await fetch(`/api/admin/players/${playerId}`, { 
        method: 'PATCH', 
        headers, 
        body: JSON.stringify(updates) 
      });
      if (!response.ok) throw new Error('Failed to update player');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/players'] });
      toast({ title: 'Player updated', description: 'Player data saved successfully.' });
      setEditingPlayer(null);
    }
  });

  if (!state.isAdmin) return null;

  const handleCreateUpgrade = () => {
    const newUpgrade: UpgradeConfig = {
      id: `upgrade-${Date.now()}`,
      name: 'New Upgrade',
      description: 'A powerful upgrade',
      type: 'perTap',
      maxLevel: 30,
      baseCost: 10,
      costMultiplier: 1.2,
      baseValue: 1,
      valueIncrement: 1,
      icon: '⚡',
      isHidden: false
    };
    setEditingUpgrade(newUpgrade);
  };

  const handleCreateCharacter = () => {
    const newCharacter: CharacterConfig = {
      id: `character-${Date.now()}`,
      name: 'New Character',
      description: 'A mysterious character',
      unlockLevel: 1,
      rarity: 'common',
      defaultImage: '',
      avatarImage: '',
      displayImage: '',
      vip: false
    };
    setEditingCharacter(newCharacter);
  };

  const handleCreateLevel = () => {
    const existingLevels = levelConfigs.map(l => l.level).sort((a, b) => a - b);
    let nextLevel = 1;
    for (let i = 0; i < existingLevels.length; i++) {
      if (existingLevels[i] !== i + 1) {
        nextLevel = i + 1;
        break;
      }
    }
    if (nextLevel === 1 && existingLevels.length > 0) {
      nextLevel = Math.max(...existingLevels) + 1;
    }

    const newLevel: LevelConfig = {
      level: nextLevel,
      cost: 100 * nextLevel,
      requirements: [],
      unlocks: []
    };
    setEditingLevel(newLevel);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="bg-purple-600/10 border-purple-500/30 hover:bg-purple-600/20">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-purple-400">🔧 Admin Panel</DialogTitle>
          <DialogDescription>Manage game configuration, players, and content</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="upgrades" className="h-full flex flex-col">
            <TabsList className="grid grid-cols-6 w-full mb-4">
              <TabsTrigger value="upgrades" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Upgrades
              </TabsTrigger>
              <TabsTrigger value="characters" className="flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Characters
              </TabsTrigger>
              <TabsTrigger value="levels" className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Levels
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Images
              </TabsTrigger>
              <TabsTrigger value="players" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Players
              </TabsTrigger>
              <TabsTrigger value="theme" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Theme
              </TabsTrigger>
            </TabsList>

            {/* UPGRADES TAB */}
            <TabsContent value="upgrades" className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Upgrade Management</h3>
                <Button onClick={handleCreateUpgrade} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />Create Upgrade
                </Button>
              </div>
              
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
                  {upgrades.map(upgrade => (
                    <Card key={upgrade.id} className={`${editingUpgrade?.id === upgrade.id ? 'border-blue-500 bg-blue-950/20' : ''}`}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{upgrade.icon}</span>
                            <div>
                              <CardTitle className="text-lg">{upgrade.name}</CardTitle>
                              <p className="text-sm text-gray-400">{upgrade.description}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">{upgrade.type}</Badge>
                                <Badge variant="secondary" className="text-xs">Max: {upgrade.maxLevel}</Badge>
                                <Badge variant="secondary" className="text-xs">Base: {upgrade.baseCost} LP</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingUpgrade({ ...upgrade })}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => {
                              if (confirm(`Delete upgrade "${upgrade.name}"? This action cannot be undone.`)) {
                                deleteUpgradeMutation.mutate(upgrade.id);
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      {editingUpgrade?.id === upgrade.id && (
                        <CardContent className="space-y-4 border-t border-gray-700">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`name-${upgrade.id}`}>Name</Label>
                              <Input 
                                id={`name-${upgrade.id}`}
                                value={editingUpgrade.name} 
                                onChange={(e) => setEditingUpgrade({ ...editingUpgrade, name: e.target.value })} 
                              />
                            </div>
                            <div>
                              <Label htmlFor={`type-${upgrade.id}`}>Type</Label>
                              <Select value={editingUpgrade.type} onValueChange={(value) => setEditingUpgrade({ ...editingUpgrade, type: value as any })}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="perTap">Per Tap</SelectItem>
                                  <SelectItem value="perHour">Per Hour</SelectItem>
                                  <SelectItem value="energyMax">Max Energy</SelectItem>
                                  <SelectItem value="energyRegen">Energy Regen</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor={`desc-${upgrade.id}`}>Description</Label>
                            <Textarea 
                              id={`desc-${upgrade.id}`}
                              value={editingUpgrade.description} 
                              onChange={(e) => setEditingUpgrade({ ...editingUpgrade, description: e.target.value })} 
                            />
                          </div>
                          
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <Label htmlFor={`maxLevel-${upgrade.id}`}>Max Level</Label>
                              <Input 
                                id={`maxLevel-${upgrade.id}`}
                                type="number" 
                                value={editingUpgrade.maxLevel} 
                                onChange={(e) => setEditingUpgrade({ ...editingUpgrade, maxLevel: parseInt(e.target.value) })} 
                              />
                            </div>
                            <div>
                              <Label htmlFor={`baseCost-${upgrade.id}`}>Base Cost</Label>
                              <Input 
                                id={`baseCost-${upgrade.id}`}
                                type="number" 
                                value={editingUpgrade.baseCost} 
                                onChange={(e) => setEditingUpgrade({ ...editingUpgrade, baseCost: parseInt(e.target.value) })} 
                              />
                            </div>
                            <div>
                              <Label htmlFor={`costMult-${upgrade.id}`}>Cost Multiplier</Label>
                              <Input 
                                id={`costMult-${upgrade.id}`}
                                type="number" 
                                step="0.01" 
                                value={editingUpgrade.costMultiplier} 
                                onChange={(e) => setEditingUpgrade({ ...editingUpgrade, costMultiplier: parseFloat(e.target.value) })} 
                              />
                            </div>
                            <div>
                              <Label htmlFor={`baseValue-${upgrade.id}`}>Base Value</Label>
                              <Input 
                                id={`baseValue-${upgrade.id}`}
                                type="number" 
                                step="0.1"
                                value={editingUpgrade.baseValue} 
                                onChange={(e) => setEditingUpgrade({ ...editingUpgrade, baseValue: parseFloat(e.target.value) })} 
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`valueInc-${upgrade.id}`}>Value Increment</Label>
                              <Input 
                                id={`valueInc-${upgrade.id}`}
                                type="number" 
                                step="0.1"
                                value={editingUpgrade.valueIncrement} 
                                onChange={(e) => setEditingUpgrade({ ...editingUpgrade, valueIncrement: parseFloat(e.target.value) })} 
                              />
                            </div>
                            <div>
                              <Label htmlFor={`icon-${upgrade.id}`}>Icon (emoji)</Label>
                              <Input 
                                id={`icon-${upgrade.id}`}
                                value={editingUpgrade.icon} 
                                onChange={(e) => setEditingUpgrade({ ...editingUpgrade, icon: e.target.value })} 
                                maxLength={2}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id={`hidden-${upgrade.id}`}
                              checked={editingUpgrade.isHidden} 
                              onCheckedChange={(checked) => setEditingUpgrade({ ...editingUpgrade, isHidden: !!checked })} 
                            />
                            <Label htmlFor={`hidden-${upgrade.id}`}>Hidden from players</Label>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button onClick={() => saveUpgradeMutation.mutate(editingUpgrade)} disabled={saveUpgradeMutation.isPending}>
                              <Save className="w-4 h-4 mr-2" />
                              {saveUpgradeMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button variant="outline" onClick={() => setEditingUpgrade(null)}>Cancel</Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* CHARACTERS TAB */}
            <TabsContent value="characters" className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Character Management</h3>
                <Button onClick={handleCreateCharacter} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />Create Character
                </Button>
              </div>
              
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
                  {characters.map(character => (
                    <Card key={character.id} className={`${editingCharacter?.id === character.id ? 'border-blue-500 bg-blue-950/20' : ''}`}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden border">
                              {character.avatarImage ? (
                                <img src={character.avatarImage} alt={character.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                  <Crown className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{character.name}</CardTitle>
                              <p className="text-sm text-gray-400">{character.description}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs capitalize">{character.rarity}</Badge>
                                <Badge variant="secondary" className="text-xs">Level {character.unlockLevel}</Badge>
                                {character.vip && <Badge className="text-xs bg-yellow-600">VIP</Badge>}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingCharacter({ ...character })}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => {
                              if (confirm(`Delete character "${character.name}"? This will also delete all associated images.`)) {
                                deleteCharacterMutation.mutate(character.id);
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      {editingCharacter?.id === character.id && (
                        <CardContent className="space-y-4 border-t border-gray-700">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`char-name-${character.id}`}>Name</Label>
                              <Input 
                                id={`char-name-${character.id}`}
                                value={editingCharacter.name} 
                                onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })} 
                              />
                            </div>
                            <div>
                              <Label htmlFor={`char-unlock-${character.id}`}>Unlock Level</Label>
                              <Input 
                                id={`char-unlock-${character.id}`}
                                type="number" 
                                value={editingCharacter.unlockLevel} 
                                onChange={(e) => setEditingCharacter({ ...editingCharacter, unlockLevel: parseInt(e.target.value) })} 
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor={`char-desc-${character.id}`}>Description</Label>
                            <Textarea 
                              id={`char-desc-${character.id}`}
                              value={editingCharacter.description} 
                              onChange={(e) => setEditingCharacter({ ...editingCharacter, description: e.target.value })} 
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`char-rarity-${character.id}`}>Rarity</Label>
                              <Select value={editingCharacter.rarity} onValueChange={(value) => setEditingCharacter({ ...editingCharacter, rarity: value as any })}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="common">Common</SelectItem>
                                  <SelectItem value="rare">Rare</SelectItem>
                                  <SelectItem value="epic">Epic</SelectItem>
                                  <SelectItem value="legendary">Legendary</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center space-x-2 pt-6">
                              <Checkbox 
                                id={`char-vip-${character.id}`}
                                checked={editingCharacter.vip} 
                                onCheckedChange={(checked) => setEditingCharacter({ ...editingCharacter, vip: !!checked })} 
                              />
                              <Label htmlFor={`char-vip-${character.id}`}>VIP Character</Label>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor={`char-default-${character.id}`}>Default Image URL</Label>
                              <Input 
                                id={`char-default-${character.id}`}
                                value={editingCharacter.defaultImage} 
                                onChange={(e) => setEditingCharacter({ ...editingCharacter, defaultImage: e.target.value })} 
                                placeholder="/uploads/characters/character-name/default.jpg"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`char-avatar-${character.id}`}>Avatar Image URL</Label>
                              <Input 
                                id={`char-avatar-${character.id}`}
                                value={editingCharacter.avatarImage} 
                                onChange={(e) => setEditingCharacter({ ...editingCharacter, avatarImage: e.target.value })} 
                                placeholder="/uploads/characters/character-name/avatar.jpg"
                              />
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button onClick={() => saveCharacterMutation.mutate(editingCharacter)} disabled={saveCharacterMutation.isPending}>
                              <Save className="w-4 h-4 mr-2" />
                              {saveCharacterMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button variant="outline" onClick={() => setEditingCharacter(null)}>Cancel</Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* LEVELS TAB - FIXED TO HANDLE UNDEFINED COST */}
            <TabsContent value="levels" className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Level Management</h3>
                <Button onClick={handleCreateLevel} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />Create Level
                </Button>
              </div>
              
              <ScrollArea className="h-[400px]">
                <div className="space-y-3 pr-4">
                  {levelConfigs.sort((a, b) => a.level - b.level).map(levelConfig => (
                    <Card key={levelConfig.level} className={`${editingLevel?.level === levelConfig.level ? 'border-blue-500 bg-blue-950/20' : ''}`}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-lg">Level {levelConfig.level}</CardTitle>
                            <p className="text-sm text-gray-400">
                              Cost: {(levelConfig.cost || 0).toLocaleString()} LP
                            </p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">{(levelConfig.requirements || []).length} requirements</Badge>
                              <Badge variant="secondary" className="text-xs">{(levelConfig.unlocks || []).length} unlocks</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingLevel({ ...levelConfig })}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => {
                              if (confirm(`Delete Level ${levelConfig.level}? This action cannot be undone.`)) {
                                deleteLevelMutation.mutate(levelConfig.level);
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              
              {/* LEVEL EDITING MODAL - FIXED TO HANDLE UNDEFINED VALUES */}
              {editingLevel && (
                <Dialog open={!!editingLevel} onOpenChange={(open) => !open && setEditingLevel(null)}>
                  <DialogContent className="max-w-3xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>Editing Level {editingLevel.level}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[600px] pr-4">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Level Number</Label>
                            <Input 
                              type="number" 
                              min="1" 
                              value={editingLevel.level} 
                              onChange={(e) => setEditingLevel({ ...editingLevel, level: parseInt(e.target.value) || 1 })} 
                            />
                          </div>
                          <div>
                            <Label>Cost (LustPoints Required)</Label>
                            <Input 
                              type="number" 
                              value={editingLevel.cost || 0} 
                              onChange={(e) => setEditingLevel({ ...editingLevel, cost: parseInt(e.target.value) || 0 })} 
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Requirements (Upgrades needed)</Label>
                          <div className="space-y-2">
                            {(editingLevel.requirements || []).map((req, idx) => (
                              <div key={idx} className="flex gap-2">
                                <Select value={req.upgradeId} onValueChange={(value) => {
                                  const reqs = [...(editingLevel.requirements || [])];
                                  reqs[idx] = { ...req, upgradeId: value };
                                  setEditingLevel({ ...editingLevel, requirements: reqs });
                                }}>
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select upgrade" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {upgrades.map(u => (
                                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input 
                                  type="number" 
                                  placeholder="Min Level" 
                                  className="w-24"
                                  value={req.minLevel} 
                                  onChange={(e) => {
                                    const reqs = [...(editingLevel.requirements || [])];
                                    reqs[idx] = { ...req, minLevel: parseInt(e.target.value) || 1 };
                                    setEditingLevel({ ...editingLevel, requirements: reqs });
                                  }} 
                                />
                                <Button variant="destructive" size="icon" onClick={() => {
                                  setEditingLevel({ 
                                    ...editingLevel, 
                                    requirements: (editingLevel.requirements || []).filter((_, i) => i !== idx) 
                                  });
                                }}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                const firstUpgrade = upgrades[0];
                                if (firstUpgrade) {
                                  setEditingLevel({ 
                                    ...editingLevel, 
                                    requirements: [...(editingLevel.requirements || []), { upgradeId: firstUpgrade.id, minLevel: 1 }] 
                                  });
                                }
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />Add Requirement
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label>Unlocks (What this level provides)</Label>
                          <div className="space-y-2">
                            {(editingLevel.unlocks || []).map((unlock, idx) => (
                              <div key={idx} className="flex gap-2">
                                <Input 
                                  value={unlock} 
                                  onChange={(e) => {
                                    const unlocks = [...(editingLevel.unlocks || [])];
                                    unlocks[idx] = e.target.value;
                                    setEditingLevel({ ...editingLevel, unlocks });
                                  }} 
                                  placeholder="e.g. Character: Luna, Upgrade: Energy Boost"
                                  className="flex-1"
                                />
                                <Button variant="destructive" size="icon" onClick={() => {
                                  setEditingLevel({ 
                                    ...editingLevel, 
                                    unlocks: (editingLevel.unlocks || []).filter((_, i) => i !== idx) 
                                  });
                                }}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setEditingLevel({ 
                                ...editingLevel, 
                                unlocks: [...(editingLevel.unlocks || []), 'New unlock'] 
                              })}
                            >
                              <Plus className="w-4 h-4 mr-2" />Add Unlock
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button onClick={() => saveLevelMutation.mutate(editingLevel)} disabled={saveLevelMutation.isPending}>
                            <Save className="w-4 h-4 mr-2" />
                            {saveLevelMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                          <Button variant="outline" onClick={() => setEditingLevel(null)}>Cancel</Button>
                        </div>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              )}
            </TabsContent>

            {/* IMAGES TAB - YOUR EXISTING FULL IMAGEUPLOADER */}
            <TabsContent value="images" className="flex-1 overflow-hidden">
              <div className="h-full">
                <ImageUploader adminMode={true} />
              </div>
            </TabsContent>

            {/* PLAYERS TAB */}
            <TabsContent value="players" className="flex-1 overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Users className="w-6 h-6" />
                    <div>
                      <h3 className="text-lg font-semibold">Player Management</h3>
                      <p className="text-sm text-gray-400">{playersData?.players?.length || 0} registered players</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/players'] })}>
                    <RotateCcw className="w-4 h-4 mr-2" />Refresh
                  </Button>
                </div>
                
                {playersLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading players...</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[450px]">
                    <div className="space-y-3 pr-4">
                      {playersData?.players?.map((player: any) => (
                        <Card key={player.id}>
                          <CardHeader>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg overflow-hidden border">
                                  {player.displayImage ? (
                                    <img src={player.displayImage} alt={player.username} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                      <Users className="w-6 h-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    {player.username}
                                    {player.isAdmin && <Badge className="text-xs bg-yellow-600">Admin</Badge>}
                                  </CardTitle>
                                  <div className="text-sm text-gray-400 space-y-1">
                                    <div>Level {player.level} • {Math.floor(player.lustPoints || player.points || 0).toLocaleString()} LP</div>
                                    <div className="flex gap-4 text-xs">
                                      <span>Energy: {player.energy}/{player.maxEnergy}</span>
                                      <span>LG: {player.lustGems || 0}</span>
                                      {player.boostActive && <span className="text-orange-400">Boost: {player.boostMultiplier}x</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => {
                                  setEditingPlayer(player);
                                  setShowPlayerDetails(true);
                                }}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" onClick={() => {
                                  updatePlayerMutation.mutate({
                                    playerId: player.id,
                                    updates: { lustPoints: (player.lustPoints || player.points || 0) + 1000 }
                                  });
                                }} className="bg-pink-600 hover:bg-pink-700">
                                  <Heart className="w-4 h-4 mr-1" />+1K LP
                                </Button>
                                <Button size="sm" onClick={() => {
                                  updatePlayerMutation.mutate({
                                    playerId: player.id,
                                    updates: { lustGems: (player.lustGems || 0) + 100 }
                                  });
                                }} className="bg-cyan-600 hover:bg-cyan-700">
                                  <Gem className="w-4 h-4 mr-1" />+100 LG
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      )) || <p className="text-center py-8 text-gray-500">No players found</p>}
                    </div>
                  </ScrollArea>
                )}
              </div>
              
              {/* PLAYER DETAILS MODAL */}
              {showPlayerDetails && editingPlayer && (
                <Dialog open={showPlayerDetails} onOpenChange={setShowPlayerDetails}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Player Details: {editingPlayer.username}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Username</Label>
                          <Input value={editingPlayer.username} onChange={(e) => setEditingPlayer({ ...editingPlayer, username: e.target.value })} />
                        </div>
                        <div>
                          <Label>Level</Label>
                          <Input type="number" value={editingPlayer.level} onChange={(e) => setEditingPlayer({ ...editingPlayer, level: parseInt(e.target.value) })} />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>LustPoints</Label>
                          <Input type="number" value={editingPlayer.lustPoints || editingPlayer.points} onChange={(e) => setEditingPlayer({ ...editingPlayer, lustPoints: parseInt(e.target.value) })} />
                        </div>
                        <div>
                          <Label>LustGems</Label>
                          <Input type="number" value={editingPlayer.lustGems || 0} onChange={(e) => setEditingPlayer({ ...editingPlayer, lustGems: parseInt(e.target.value) })} />
                        </div>
                        <div>
                          <Label>Energy</Label>
                          <Input type="number" value={editingPlayer.energy} onChange={(e) => setEditingPlayer({ ...editingPlayer, energy: parseInt(e.target.value) })} />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox checked={editingPlayer.isAdmin} onCheckedChange={(checked) => setEditingPlayer({ ...editingPlayer, isAdmin: !!checked })} />
                        <Label>Admin privileges</Label>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button onClick={() => {
                          updatePlayerMutation.mutate({
                            playerId: editingPlayer.id,
                            updates: {
                              username: editingPlayer.username,
                              level: editingPlayer.level,
                              lustPoints: editingPlayer.lustPoints,
                              lustGems: editingPlayer.lustGems,
                              energy: editingPlayer.energy,
                              isAdmin: editingPlayer.isAdmin
                            }
                          });
                          setShowPlayerDetails(false);
                        }} disabled={updatePlayerMutation.isPending}>
                          <Save className="w-4 h-4 mr-2" />
                          {updatePlayerMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowPlayerDetails(false)}>Cancel</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </TabsContent>

            {/* THEME TAB */}
            <TabsContent value="theme" className="flex-1 overflow-hidden">
              <div className="space-y-6">
                <div className="text-center">
                  <Palette className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                  <h3 className="text-xl font-semibold mb-2">Theme Customization</h3>
                  <p className="text-gray-400">Customize the game's visual appearance and colors</p>
                </div>
                
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Primary Color</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="color" 
                          value={theme.primaryColor || '#8b5cf6'} 
                          onChange={(e) => updateTheme({ ...theme, primaryColor: e.target.value })} 
                          className="w-16 h-10"
                        />
                        <Input 
                          value={theme.primaryColor || '#8b5cf6'} 
                          onChange={(e) => updateTheme({ ...theme, primaryColor: e.target.value })} 
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Background Style</Label>
                      <Select value={theme.background || 'gradient'} onValueChange={(value) => updateTheme({ ...theme, background: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gradient">Gradient</SelectItem>
                          <SelectItem value="solid">Solid</SelectItem>
                          <SelectItem value="image">Image</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Card Background</Label>
                      <Input value={theme.card || '240 8% 12%'} onChange={(e) => updateTheme({ ...theme, card: e.target.value })} />
                    </div>
                    <div>
                      <Label>Accent Color</Label>
                      <Input value={theme.accent || '280 65% 60%'} onChange={(e) => updateTheme({ ...theme, accent: e.target.value })} />
                    </div>
                    <div>
                      <Label>Muted Color</Label>
                      <Input value={theme.muted || '240 5% 20%'} onChange={(e) => updateTheme({ ...theme, muted: e.target.value })} />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => {
                      updateTheme(theme);
                      toast({ title: 'Theme applied', description: 'Visual changes have been applied to the game.' });
                    }}>
                      <Save className="w-4 h-4 mr-2" />Apply Theme
                    </Button>
                    <Button variant="outline" onClick={() => {
                      const defaultTheme = {
                        primary: '270 60% 50%',
                        secondary: '240 5% 26%',
                        accent: '280 65% 60%',
                        background: '240 10% 8%',
                        card: '240 8% 12%',
                        muted: '240 5% 20%',
                        primaryColor: '#8b5cf6'
                      };
                      updateTheme(defaultTheme);
                    }}>
                      <RotateCcw className="w-4 h-4 mr-2" />Reset to Default
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* FOOTER */}
        <div className="border-t border-gray-700 pt-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Admin Panel • {upgrades.length} upgrades • {characters.length} characters • {levelConfigs.length} levels
            </div>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => {
                if (confirm('Reset ALL game data? This will delete all progress and cannot be undone.')) {
                  resetGame();
                  toast({ title: 'Game reset', description: 'All game data has been reset to defaults.' });
                }
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />Reset Game
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}