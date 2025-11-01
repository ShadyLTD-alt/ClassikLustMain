import { useState } from 'react';
import { Settings, Save, RotateCcw, Plus, X, Users, Upload, Palette } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { UpgradeConfig, CharacterConfig, LevelConfig, ThemeConfig } from '@shared/gameConfig';
import upgradeMaster from '@master/upgrades-master.json';
import characterMaster from '@master/character-master.json';

export default function AdminPanel() {
  const { state, upgrades, characters, levelConfigs, theme, updateUpgradeConfig, updateCharacterConfig, updateLevelConfig, updateTheme, deleteUpgrade, deleteCharacter, deleteLevel, resetGame } = useGame();
  const { toast } = useToast();
  const [editingUpgrade, setEditingUpgrade] = useState<UpgradeConfig | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<CharacterConfig | null>(null);
  const [editingLevel, setEditingLevel] = useState<LevelConfig | null>(null);
  const [editingTheme, setEditingTheme] = useState<ThemeConfig | null>(null);
  const [showCreateUpgrade, setShowCreateUpgrade] = useState(false);
  const [showCreateCharacter, setShowCreateCharacter] = useState(false);
  const [adminToken] = useState(localStorage.getItem('adminToken') || '');
  const [editingPlayer, setEditingPlayer] = useState<any>(null);

  const upgradeTemplates = (upgradeMaster as any)?.upgrades ?? [];
  const characterTemplates = (characterMaster as any)?.characters ?? [];

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
      toast({ title: 'Upgrade saved', description: `${variables.name} saved to JSON and DB.` });
      setEditingUpgrade(null);
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
      toast({ title: 'Character saved', description: `${variables.name} saved to JSON and DB.` });
      setEditingCharacter(null);
    }
  });

  const saveLevelMutation = useMutation({
    mutationFn: async (level: LevelConfig & { experienceRequired?: number }) => {
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
      toast({ title: 'Level saved', description: `Level ${variables.level} saved to JSON and DB.` });
      setEditingLevel(null);
    }
  });

  if (!state.isAdmin) return null;

  const handleSaveUpgrade = () => editingUpgrade && saveUpgradeMutation.mutate(editingUpgrade);
  const handleSaveCharacter = () => editingCharacter && saveCharacterMutation.mutate(editingCharacter);
  const handleSaveLevel = () => editingLevel && saveLevelMutation.mutate(editingLevel as any);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon"><Settings className="w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader><DialogTitle>Admin Panel</DialogTitle></DialogHeader>
        <Tabs defaultValue="upgrades" className="flex-1">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
            <TabsTrigger value="characters">Characters</TabsTrigger>
            <TabsTrigger value="levels">Levels</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
          </TabsList>

          <TabsContent value="upgrades" className="space-y-4">
            <div className="flex justify-end mb-3">
              <Dialog open={showCreateUpgrade} onOpenChange={setShowCreateUpgrade}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Create Upgrade</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Upgrade</DialogTitle>
                    <DialogDescription>Use defaults from master or enter values</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Upgrade Name</Label>
                      <Input id="new-upgrade-name" placeholder="Enter upgrade name" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea id="new-upgrade-desc" placeholder="Enter description" />
                    </div>
                    <Button
                      onClick={() => {
                        const nameInput = document.getElementById('new-upgrade-name') as HTMLInputElement;
                        const descInput = document.getElementById('new-upgrade-desc') as HTMLTextAreaElement;
                        const template = upgradeTemplates[0] || { name: 'New Upgrade', description: 'A powerful upgrade', type: 'perTap', maxLevel: 30, baseCost: 10, costMultiplier: 1.2, baseValue: 1, valueIncrement: 1, icon: '⚡' };
                        const u: UpgradeConfig = {
                          id: `upgrade-${Date.now()}`,
                          name: nameInput?.value || template.name,
                          description: descInput?.value || template.description,
                          type: template.type,
                          maxLevel: template.maxLevel,
                          baseCost: template.baseCost,
                          costMultiplier: template.costMultiplier,
                          baseValue: template.baseValue,
                          valueIncrement: template.valueIncrement,
                          icon: template.icon,
                          isHidden: false
                        };
                        updateUpgradeConfig(u);
                        setShowCreateUpgrade(false);
                        setTimeout(() => setEditingUpgrade(u), 100);
                      }}
                      className="w-full"
                    >Create</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <ScrollArea className="h-[450px]">
              <div className="space-y-3 pr-4">
                {upgrades.map(upgrade => (
                  <Card key={upgrade.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold">{upgrade.name}</h3>
                        <Button variant="outline" size="sm" onClick={() => setEditingUpgrade(upgrade)}>Edit</Button>
                      </div>
                    </CardHeader>
                    {editingUpgrade?.id === upgrade.id && (
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label>Name</Label><Input value={editingUpgrade.name} onChange={(e) => setEditingUpgrade({ ...editingUpgrade, name: e.target.value })} /></div>
                          <div><Label>Max Level</Label><Input type="number" value={editingUpgrade.maxLevel} onChange={(e) => setEditingUpgrade({ ...editingUpgrade, maxLevel: parseInt(e.target.value) })} /></div>
                        </div>
                        <div><Label>Description</Label><Textarea value={editingUpgrade.description} onChange={(e) => setEditingUpgrade({ ...editingUpgrade, description: e.target.value })} /></div>
                        <div className="grid grid-cols-3 gap-3">
                          <div><Label>Base Cost</Label><Input type="number" value={editingUpgrade.baseCost} onChange={(e) => setEditingUpgrade({ ...editingUpgrade, baseCost: parseInt(e.target.value) })} /></div>
                          <div><Label>Cost Multiplier</Label><Input type="number" step="0.1" value={editingUpgrade.costMultiplier} onChange={(e) => setEditingUpgrade({ ...editingUpgrade, costMultiplier: parseFloat(e.target.value) })} /></div>
                          <div><Label>Base Value</Label><Input type="number" value={editingUpgrade.baseValue} onChange={(e) => setEditingUpgrade({ ...editingUpgrade, baseValue: parseFloat(e.target.value) })} /></div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleSaveUpgrade}><Save className="w-4 h-4 mr-2" />Save</Button>
                          <Button variant="outline" onClick={() => setEditingUpgrade(null)}>Cancel</Button>
                          <Button variant="destructive" onClick={() => { if (confirm(`Delete upgrade "${editingUpgrade.name}"?`)) { deleteUpgrade(editingUpgrade.id); setEditingUpgrade(null); } }}><X className="w-4 h-4 mr-2" />Delete</Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="characters" className="space-y-4">
            <div className="flex justify-end mb-3">
              <Dialog open={showCreateCharacter} onOpenChange={setShowCreateCharacter}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Create Character</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Character</DialogTitle>
                    <DialogDescription>Use defaults from master or enter values</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label>Character Name</Label>
                        <Input id="new-char-name" placeholder="Enter character name" />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea id="new-char-desc" placeholder="Enter description" />
                      </div>
                      <Button
                        onClick={() => {
                          const nameInput = document.getElementById('new-char-name') as HTMLInputElement;
                          const descInput = document.getElementById('new-char-desc') as HTMLTextAreaElement;
                          const template = characterTemplates[0] || { name: 'New Character', description: 'A mysterious character', unlockLevel: 1, rarity: 'common', defaultImage: '', avatarImage: '', displayImage: '' };
                          const c: CharacterConfig = {
                            id: `character-${Date.now()}`,
                            name: nameInput?.value || template.name,
                            description: descInput?.value || template.description,
                            unlockLevel: template.unlockLevel,
                            rarity: template.rarity as any,
                            defaultImage: template.defaultImage,
                            avatarImage: template.avatarImage,
                            displayImage: template.displayImage,
                          };
                          updateCharacterConfig(c);
                          setShowCreateCharacter(false);
                          setTimeout(() => setEditingCharacter(c), 100);
                        }}
                        className="w-full"
                      >Create</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <ScrollArea className="h-[450px]">
              <div className="space-y-3 pr-4">
                {characters.map(character => (
                  <Card key={character.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold">{character.name}</h3>
                        <Button variant="outline" size="sm" onClick={() => setEditingCharacter(character)}>Edit</Button>
                      </div>
                    </CardHeader>
                    {editingCharacter?.id === character.id && (
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label>Name</Label><Input value={editingCharacter.name} onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })} /></div>
                          <div><Label>Unlock Level</Label><Input type="number" value={editingCharacter.unlockLevel} onChange={(e) => setEditingCharacter({ ...editingCharacter, unlockLevel: parseInt(e.target.value) })} /></div>
                        </div>
                        <div><Label>Description</Label><Textarea value={editingCharacter.description} onChange={(e) => setEditingCharacter({ ...editingCharacter, description: e.target.value })} /></div>
                        <div><Label>Avatar Image URL</Label><Input value={editingCharacter.avatarImage} onChange={(e) => setEditingCharacter({ ...editingCharacter, avatarImage: e.target.value })} /></div>
                        <div><Label>Display Image URL</Label><Input value={editingCharacter.displayImage} onChange={(e) => setEditingCharacter({ ...editingCharacter, displayImage: e.target.value })} /></div>
                        <div className="flex gap-2">
                          <Button onClick={handleSaveCharacter}><Save className="w-4 h-4 mr-2" />Save</Button>
                          <Button variant="outline" onClick={() => setEditingCharacter(null)}>Cancel</Button>
                          <Button variant="destructive" onClick={() => { if (confirm(`Delete character "${editingCharacter.name}"?`)) { deleteCharacter(editingCharacter.id); setEditingCharacter(null); } }}><X className="w-4 h-4 mr-2" />Delete</Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="levels" className="space-y-4">
            <div className="flex justify-end mb-3">
              <Button onClick={() => {
                const existing = levelConfigs.map(l => l.level).sort((a,b)=>a-b);
                let next = 1; for (let i=0;i<existing.length;i++){ if (existing[i] !== i+1){ next = i+1; break; } }
                if (next === 1 && existing.length>0) next = Math.max(...existing)+1;
                const lvl: LevelConfig & { experienceRequired?: number } = { level: next, cost: 100, requirements: [], unlocks: [], experienceRequired: undefined };
                setEditingLevel(lvl);
                setTimeout(()=>{ document.getElementById('level-edit-form')?.scrollIntoView({behavior:'smooth', block:'center'}); },100);
              }}><Plus className="w-4 h-4 mr-2" />Create Level</Button>
            </div>
            <ScrollArea className="h-[350px]">
              <div className="space-y-3 pr-4">
                {levelConfigs.map(levelConfig => (
                  <Card key={levelConfig.level} className={editingLevel?.level === levelConfig.level ? 'border-primary' : ''}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Level {levelConfig.level} - Cost: {levelConfig.cost} points</h3>
                        <Button variant="outline" size="sm" onClick={() => setEditingLevel({ ...levelConfig })}>Edit</Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {editingLevel && (
              <Dialog open={!!editingLevel} onOpenChange={(open)=>!open && setEditingLevel(null)}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Editing: Level {editingLevel.level}</DialogTitle></DialogHeader>
                  <div id="level-edit-form" className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Level Number</Label><Input type="number" min="1" value={editingLevel.level} onChange={(e)=> setEditingLevel({ ...editingLevel, level: parseInt(e.target.value)||1 })} /></div>
                      <div><Label>Cost (Points Required)</Label><Input type="number" value={editingLevel.cost} onChange={(e)=> setEditingLevel({ ...editingLevel, cost: parseInt(e.target.value)||0 })} /></div>
                    </div>

                    <div>
                      <Label>Requirements</Label>
                      {(editingLevel.requirements||[]).map((req, idx)=> (
                        <div key={idx} className="flex gap-2 mb-2">
                          <Select value={req.upgradeId} onValueChange={(value)=>{ const reqs=[...editingLevel.requirements]; reqs[idx] = { ...req, upgradeId: value }; setEditingLevel({ ...editingLevel, requirements: reqs }); }}>
                            <SelectTrigger><SelectValue placeholder="Select upgrade"/></SelectTrigger>
                            <SelectContent>
                              {upgrades.map(u=> (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                          <Input type="number" placeholder="Min Level" value={req.minLevel} onChange={(e)=>{ const reqs=[...editingLevel.requirements]; reqs[idx] = { ...req, minLevel: parseInt(e.target.value)||1 }; setEditingLevel({ ...editingLevel, requirements: reqs }); }} />
                          <Button variant="destructive" size="icon" onClick={(e)=>{ e.stopPropagation(); setEditingLevel({ ...editingLevel, requirements: editingLevel.requirements.filter((_,i)=>i!==idx) }); }}><X className="w-4 h-4"/></Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={()=> setEditingLevel({ ...editingLevel, requirements: [...(editingLevel.requirements||[]), { upgradeId: upgrades[0]?.id || '', minLevel: 1 }] }) }><Plus className="w-4 h-4 mr-2"/>Add Requirement</Button>
                    </div>

                    <div>
                      <Label>Unlocks</Label>
                      {(editingLevel.unlocks||[]).map((unlock, idx)=> (
                        <div key={idx} className="flex gap-2 mb-2">
                          <Input value={unlock} onChange={(e)=> { const unlocks=[...(editingLevel.unlocks||[])]; unlocks[idx] = e.target.value; setEditingLevel({ ...editingLevel, unlocks }); }} />
                          <Button variant="destructive" size="icon" onClick={(e)=>{ e.stopPropagation(); setEditingLevel({ ...editingLevel, unlocks: (editingLevel.unlocks||[]).filter((_,i)=>i!==idx) }); }}><X className="w-4 h-4"/></Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={()=> setEditingLevel({ ...editingLevel, unlocks: [...(editingLevel.unlocks||[]), 'New unlock'] }) }><Plus className="w-4 h-4 mr-2"/>Add Unlock</Button>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSaveLevel}><Save className="w-4 h-4 mr-2"/>Save</Button>
                      <Button variant="outline" onClick={()=> setEditingLevel(null)}>Cancel</Button>
                      <Button variant="destructive" onClick={(e)=>{ e.stopPropagation(); if (confirm(`Delete Level ${editingLevel.level}?`)) { deleteLevel(editingLevel.level); setEditingLevel(null); } }}><X className="w-4 h-4 mr-2"/>Delete</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <div className="text-center py-8">
              <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Image Management</h3>
              <p className="text-gray-500 mb-4">Upload and manage character images</p>
              <Button><Upload className="w-4 h-4 mr-2" />Upload Images</Button>
            </div>
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            {playersLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Loading players...</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <Users className="w-6 h-6" />
                  <h3 className="text-lg font-semibold">Player Management</h3>
                  <span className="text-sm text-gray-500">{playersData?.players?.length || 0} players</span>
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {playersData?.players?.map((player: any) => (
                      <Card key={player.id}>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-semibold">{player.username}</h4>
                              <p className="text-sm text-gray-500">Level {player.level} • {player.points} points</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setEditingPlayer(player)}>View</Button>
                          </div>
                        </CardHeader>
                      </Card>
                    )) || <p className="text-center py-8 text-gray-500">No players found</p>}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="theme" className="space-y-4">
            <div className="text-center py-8">
              <Palette className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Theme Settings</h3>
              <p className="text-gray-500 mb-4">Customize the game's appearance</p>
              <div className="space-y-4 max-w-md mx-auto">
                <div>
                  <Label>Primary Color</Label>
                  <Input type="color" value={theme.primaryColor || '#8b5cf6'} onChange={(e) => updateTheme({ ...theme, primaryColor: e.target.value })} />
                </div>
                <div>
                  <Label>Background</Label>
                  <Select value={theme.background || 'gradient'} onValueChange={(value) => updateTheme({ ...theme, background: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gradient">Gradient</SelectItem>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => updateTheme(theme)}>
                  <Save className="w-4 h-4 mr-2" />Apply Theme
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}