import { useState } from 'react';
import { Settings, Save, RotateCcw, Plus, X, Users } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
import ImageUploader from '@/components/ImageUploader';
import type { UpgradeConfig, CharacterConfig, LevelConfig, ThemeConfig } from '@shared/gameConfig';
import upgradeMaster from '../../../main-gamedata/master-data/upgrades-master.json';
import characterMaster from '../../../main-gamedata/master-data/character-master.json';

export default function AdminPanel() {
  const { state, upgrades, characters, levelConfigs, theme, updateUpgradeConfig, updateCharacterConfig, updateLevelConfig, updateTheme, deleteUpgrade, deleteCharacter, deleteLevel, resetGame } = useGame();
  const { toast } = useToast();
  const [editingUpgrade, setEditingUpgrade] = useState<UpgradeConfig | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<CharacterConfig | null>(null);
  const [editingLevel, setEditingLevel] = useState<LevelConfig | null>(null);
  const [editingTheme, setEditingTheme] = useState<ThemeConfig | null>(null);
  const [showCreateUpgrade, setShowCreateUpgrade] = useState(false);
  const [showCreateCharacter, setShowCreateCharacter] = useState(false);
  const [createTemplate, setCreateTemplate] = useState<string>('');
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [editingPlayer, setEditingPlayer] = useState<any>(null);

  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ['/api/admin/players'],
    enabled: !!adminToken && state.isAdmin,
    queryFn: async () => {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
      };
      
      if (adminToken) {
        headers['x-admin-token'] = adminToken;
      }
      
      const response = await fetch('/api/admin/players', { headers });
      if (!response.ok) throw new Error('Failed to fetch players');
      return response.json();
    }
  });

  const updatePlayerMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
      };
      
      if (adminToken) {
        headers['x-admin-token'] = adminToken;
      }
      
      const response = await fetch(`/api/admin/players/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update player');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/players'] });
      toast({ title: 'Player updated', description: 'Player data has been updated successfully.' });
      setEditingPlayer(null);
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
      
      if (adminToken) {
        headers['x-admin-token'] = adminToken;
      }
      
      const response = await fetch(url, { method, headers, body: JSON.stringify(upgrade) });
      if (!response.ok) throw new Error('Failed to save upgrade');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/upgrades'] });
      updateUpgradeConfig(variables);
      toast({ title: 'Upgrade saved', description: `${variables.name} has been saved and JSON file created.` });
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
      
      if (adminToken) {
        headers['x-admin-token'] = adminToken;
      }
      
      const response = await fetch(url, { method, headers, body: JSON.stringify(character) });
      if (!response.ok) throw new Error('Failed to save character');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/characters'] });
      updateCharacterConfig(variables);
      toast({ title: 'Character saved', description: `${variables.name} has been saved and JSON file created.` });
      setEditingCharacter(null);
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
      
      if (adminToken) {
        headers['x-admin-token'] = adminToken;
      }
      
      const response = await fetch(url, { method, headers, body: JSON.stringify(level) });
      if (!response.ok) throw new Error('Failed to save level');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/levels'] });
      updateLevelConfig(variables);
      toast({ title: 'Level config saved', description: `Level ${variables.level} has been saved and JSON file created.` });
      setEditingLevel(null);
    }
  });

  if (!state.isAdmin) return null;

  const handleSaveUpgrade = () => {
    if (!editingUpgrade) return;
    saveUpgradeMutation.mutate(editingUpgrade);
  };

  const handleSaveCharacter = () => {
    if (!editingCharacter) return;
    saveCharacterMutation.mutate(editingCharacter);
  };

  const handleSaveLevel = () => {
    if (!editingLevel) return;
    saveLevelMutation.mutate(editingLevel);
  };

  const handleSaveTheme = () => {
    if (!editingTheme) return;
    updateTheme(editingTheme);
    toast({ title: 'Theme saved', description: 'Theme has been applied successfully.' });
    setEditingTheme(null);
  };

  const handleResetGame = () => {
    if (confirm('Are you sure you want to reset all game data? This cannot be undone.')) {
      resetGame();
      toast({ title: 'Game reset', description: 'All data has been reset to defaults.' });
    }
  };

  const handleExportConfig = () => {
    const config = { upgrades, characters, levelConfigs, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game-config.json';
    a.click();
    toast({ title: 'Config exported', description: 'Configuration has been downloaded.' });
  };

  const handleDeleteUpgrade = async (upgradeId: string) => {
    try {
      const headers: Record<string, string> = { 'Authorization': `Bearer ${localStorage.getItem('sessionToken')}` };
      if (adminToken) headers['x-admin-token'] = adminToken;
      await fetch(`/api/admin/upgrades/${upgradeId}`, { method: 'DELETE', headers });
      deleteUpgrade(upgradeId);
      setEditingUpgrade(null);
      toast({ title: 'Success', description: 'Upgrade deleted and JSON file removed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete upgrade', variant: 'destructive' });
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    try {
      const headers: Record<string, string> = { 'Authorization': `Bearer ${localStorage.getItem('sessionToken')}` };
      if (adminToken) headers['x-admin-token'] = adminToken;
      await fetch(`/api/admin/characters/${characterId}`, { method: 'DELETE', headers });
      deleteCharacter(characterId);
      setEditingCharacter(null);
      toast({ title: 'Success', description: 'Character deleted and JSON file removed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete character', variant: 'destructive' });
    }
  };

  const handleDeleteLevel = async (level: number) => {
    try {
      const headers: Record<string, string> = { 'Authorization': `Bearer ${localStorage.getItem('sessionToken')}` };
      if (adminToken) headers['x-admin-token'] = adminToken;
      await fetch(`/api/admin/levels/${level}`, { method: 'DELETE', headers });
      deleteLevel(level);
      setEditingLevel(null);
      toast({ title: 'Success', description: 'Level deleted and JSON file removed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete level', variant: 'destructive' });
    }
  };

  const templates = (upgradeMaster as any)?.upgrades ?? [];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" data-testid="button-open-admin">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Admin Panel</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upgrades" className="flex-1">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="upgrades" data-testid="tab-admin-upgrades">Upgrades</TabsTrigger>
            <TabsTrigger value="characters" data-testid="tab-admin-characters">Characters</TabsTrigger>
            <TabsTrigger value="levels" data-testid="tab-admin-levels">Levels</TabsTrigger>
            <TabsTrigger value="images" data-testid="tab-admin-images">Images</TabsTrigger>
            <TabsTrigger value="players" data-testid="tab-admin-players">Players</TabsTrigger>
            <TabsTrigger value="theme" data-testid="tab-admin-theme">Theme</TabsTrigger>
          </TabsList>

          <TabsContent value="upgrades" className="space-y-4">
            <div className="flex justify-end mb-3">
              <Dialog open={showCreateUpgrade} onOpenChange={setShowCreateUpgrade}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-upgrade">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Upgrade
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Upgrade</DialogTitle>
                    <DialogDescription>Choose a template to create a new upgrade</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Select Template</Label>
                      <Select value={createTemplate} onValueChange={setCreateTemplate}>
                        <SelectTrigger data-testid="select-upgrade-template">
                          <SelectValue placeholder="Choose a template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template: any) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => {
                        const template = templates.find((t: any) => t.id === createTemplate);
                        if (template) {
                          const newUpgrade: UpgradeConfig = {
                            id: `upgrade-${Date.now()}`,
                            name: template.name || '',
                            description: template.description || '',
                            maxLevel: template.maxLevel,
                            baseCost: template.baseCost,
                            costMultiplier: template.costMultiplier,
                            baseValue: template.baseValue,
                            valueIncrement: template.valueIncrement,
                            icon: template.icon,
                            type: template.type as any,
                            isVip: false,
                            isEvent: false,
                            passiveIncomeTime: 0
                          };
                          updateUpgradeConfig(newUpgrade);
                          setShowCreateUpgrade(false);
                          setCreateTemplate('');
                          setTimeout(() => setEditingUpgrade(newUpgrade), 100);
                        }
                      }}
                      disabled={!createTemplate}
                      className="w-full"
                    >
                      Create
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <ScrollArea className="h-[350px]">
              <div className="space-y-3 pr-4">
                {upgrades.map(upgrade => (
                  <Card key={upgrade.id} className={editingUpgrade?.id === upgrade.id ? 'border-primary' : ''}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold">{upgrade.name}</h3>
                        <Button variant="outline" size="sm" onClick={() => setEditingUpgrade(upgrade)} data-testid={`button-edit-upgrade-${upgrade.id}`}>
                          Edit
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {editingUpgrade && (
              <Dialog open={!!editingUpgrade} onOpenChange={(open) => !open && setEditingUpgrade(null)}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Editing: {editingUpgrade.name}</DialogTitle>
                  </DialogHeader>
                  <div id="upgrade-edit-form" className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Name</Label>
                        <Input value={editingUpgrade.name} onChange={(e) => setEditingUpgrade({ ...editingUpgrade, name: e.target.value })} data-testid="input-upgrade-name" />
                      </div>
                      <div>
                        <Label>Max Level</Label>
                        <Input type="number" value={editingUpgrade.maxLevel} onChange={(e) => setEditingUpgrade({ ...editingUpgrade, maxLevel: parseInt(e.target.value) })} data-testid="input-upgrade-maxlevel" />
                      </div>
                      <div>
                        <Label>Base Cost</Label>
                        <Input type="number" value={editingUpgrade.baseCost} onChange={(e) => setEditingUpgrade({ ...editingUpgrade, baseCost: parseFloat(e.target.value) })} data-testid="input-upgrade-basecost" />
                      </div>
                      <div>
                        <Label>Cost Multiplier</Label>
                        <Input type="number" step="0.01" value={editingUpgrade.costMultiplier} onChange={(e) => setEditingUpgrade({ ...editingUpgrade, costMultiplier: parseFloat(e.target.value) })} data-testid="input-upgrade-costmult" />
                      </div>
                      <div>
                        <Label>Base Value</Label>
                        <Input type="number" value={editingUpgrade.baseValue} onChange={(e) => setEditingUpgrade({ ...editingUpgrade, baseValue: parseFloat(e.target.value) })} data-testid="input-upgrade-basevalue" />
                      </div>
                      <div>
                        <Label>Value Increment</Label>
                        <Input type="number" step="0.1" value={editingUpgrade.valueIncrement} onChange={(e) => setEditingUpgrade({ ...editingUpgrade, valueIncrement: parseFloat(e.target.value) })} data-testid="input-upgrade-valueinc" />
                      </div>
                      <div>
                        <Label>Passive Income Time (Minutes)</Label>
                        <Input type="number" value={editingUpgrade.passiveIncomeTime || 0} onChange={(e) => setEditingUpgrade({ ...editingUpgrade, passiveIncomeTime: parseInt(e.target.value) || 0 })} data-testid="input-upgrade-passive-time" />
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={editingUpgrade.description} onChange={(e) => setEditingUpgrade({ ...editingUpgrade, description: e.target.value })} data-testid="input-upgrade-desc" />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="upgrade-vip" checked={editingUpgrade.isVip || false} onCheckedChange={(checked) => setEditingUpgrade({ ...editingUpgrade, isVip: checked as boolean })} data-testid="checkbox-upgrade-vip" />
                        <Label htmlFor="upgrade-vip">VIP Upgrade</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="upgrade-event" checked={editingUpgrade.isEvent || false} onCheckedChange={(checked) => setEditingUpgrade({ ...editingUpgrade, isEvent: checked as boolean })} data-testid="checkbox-upgrade-event" />
                        <Label htmlFor="upgrade-event">Event Upgrade</Label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveUpgrade} data-testid="button-save-upgrade">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setEditingUpgrade(null)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={() => { if (confirm(`Delete upgrade "${editingUpgrade.name}"?`)) { handleDeleteUpgrade(editingUpgrade.id); } }} data-testid="button-delete-upgrade">
                        <X className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Characters and Levels tabs remain unchanged below */}
