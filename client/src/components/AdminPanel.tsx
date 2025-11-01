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
import upgradeTemplates from '../../../main-gamedata/upgrade-templates.json';
import characterMaster from '../../../main-gamedata/character-master.json';

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
      const response = await fetch('/api/admin/players', {
        headers: {
          'x-admin-token': adminToken
        }
      });
      if (!response.ok) throw new Error('Failed to fetch players');
      return response.json();
    }
  });

  const updatePlayerMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/admin/players/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
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
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify(upgrade)
      });
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
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify(character)
      });
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
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify(level)
      });
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
    const config = {
      upgrades,
      characters,
      levelConfigs,
      timestamp: new Date().toISOString()
    };
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
      await fetch(`/api/admin/upgrades/${upgradeId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': adminToken
        }
      });
      deleteUpgrade(upgradeId);
      setEditingUpgrade(null);
      toast({
        title: "Success",
        description: "Upgrade deleted and JSON file removed"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete upgrade",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    try {
      await fetch(`/api/admin/characters/${characterId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': adminToken
        }
      });
      deleteCharacter(characterId);
      setEditingCharacter(null);
      toast({
        title: "Success",
        description: "Character deleted and JSON file removed"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete character",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLevel = async (level: number) => {
    try {
      await fetch(`/api/admin/levels/${level}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': adminToken
        }
      });
      deleteLevel(level);
      setEditingLevel(null);
      toast({
        title: "Success",
        description: "Level deleted and JSON file removed"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete level",
        variant: "destructive"
      });
    }
  };

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
                      <Select
                        value={createTemplate}
                        onValueChange={setCreateTemplate}
                      >
                        <SelectTrigger data-testid="select-upgrade-template">
                          <SelectValue placeholder="Choose a template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {upgradeTemplates.templates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => {
                        const template = upgradeTemplates.templates.find(t => t.id === createTemplate);
                        if (template) {
                          const newUpgrade: UpgradeConfig = {
                            id: `upgrade-${Date.now()}`,
                            name: template.name || '',
                            description: template.description || '',
                            maxLevel: template.fields.maxLevel.default,
                            baseCost: template.fields.baseCost.default,
                            costMultiplier: template.fields.costMultiplier.default,
                            baseValue: template.fields.baseValue.default,
                            valueIncrement: template.fields.valueIncrement.default,
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingUpgrade(upgrade)}
                          data-testid={`button-edit-upgrade-${upgrade.id}`}
                        >
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
                        <Input
                          value={editingUpgrade.name}
                          onChange={(e) => setEditingUpgrade({ ...editingUpgrade, name: e.target.value })}
                          data-testid="input-upgrade-name"
                        />
                      </div>
                      <div>
                        <Label>Max Level</Label>
                        <Input
                          type="number"
                          value={editingUpgrade.maxLevel}
                          onChange={(e) => setEditingUpgrade({ ...editingUpgrade, maxLevel: parseInt(e.target.value) })}
                          data-testid="input-upgrade-maxlevel"
                        />
                      </div>
                      <div>
                        <Label>Base Cost</Label>
                        <Input
                          type="number"
                          value={editingUpgrade.baseCost}
                          onChange={(e) => setEditingUpgrade({ ...editingUpgrade, baseCost: parseFloat(e.target.value) })}
                          data-testid="input-upgrade-basecost"
                        />
                      </div>
                      <div>
                        <Label>Cost Multiplier</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingUpgrade.costMultiplier}
                          onChange={(e) => setEditingUpgrade({ ...editingUpgrade, costMultiplier: parseFloat(e.target.value) })}
                          data-testid="input-upgrade-costmult"
                        />
                      </div>
                      <div>
                        <Label>Base Value</Label>
                        <Input
                          type="number"
                          value={editingUpgrade.baseValue}
                          onChange={(e) => setEditingUpgrade({ ...editingUpgrade, baseValue: parseFloat(e.target.value) })}
                          data-testid="input-upgrade-basevalue"
                        />
                      </div>
                      <div>
                        <Label>Value Increment</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={editingUpgrade.valueIncrement}
                          onChange={(e) => setEditingUpgrade({ ...editingUpgrade, valueIncrement: parseFloat(e.target.value) })}
                          data-testid="input-upgrade-valueinc"
                        />
                      </div>
                      <div>
                        <Label>Passive Income Time (Minutes)</Label>
                        <Input
                          type="number"
                          value={editingUpgrade.passiveIncomeTime || 0}
                          onChange={(e) => setEditingUpgrade({ ...editingUpgrade, passiveIncomeTime: parseInt(e.target.value) || 0 })}
                          data-testid="input-upgrade-passive-time"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={editingUpgrade.description}
                        onChange={(e) => setEditingUpgrade({ ...editingUpgrade, description: e.target.value })}
                        data-testid="input-upgrade-desc"
                      />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="upgrade-vip"
                          checked={editingUpgrade.isVip || false}
                          onCheckedChange={(checked) => setEditingUpgrade({ ...editingUpgrade, isVip: checked as boolean })}
                          data-testid="checkbox-upgrade-vip"
                        />
                        <Label htmlFor="upgrade-vip">VIP Upgrade</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="upgrade-event"
                          checked={editingUpgrade.isEvent || false}
                          onCheckedChange={(checked) => setEditingUpgrade({ ...editingUpgrade, isEvent: checked as boolean })}
                          data-testid="checkbox-upgrade-event"
                        />
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
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`Delete upgrade "${editingUpgrade.name}"?`)) {
                            handleDeleteUpgrade(editingUpgrade.id);
                          }
                        }}
                        data-testid="button-delete-upgrade"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          <TabsContent value="characters" className="space-y-4">
            <div className="flex justify-end mb-3">
              <Dialog open={showCreateCharacter} onOpenChange={setShowCreateCharacter}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-character">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Character
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Character</DialogTitle>
                    <DialogDescription>Enter character information to create a new character</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label>Character Name</Label>
                        <Input placeholder="Enter character name" id="new-char-name" />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea placeholder="Enter description" id="new-char-desc" />
                      </div>
                      <Button
                        onClick={() => {
                          const nameInput = document.getElementById('new-char-name') as HTMLInputElement;
                          const descInput = document.getElementById('new-char-desc') as HTMLTextAreaElement;
                          setEditingCharacter({
                            id: `character-${Date.now()}`,
                            name: nameInput?.value || characterMaster.name,
                            description: descInput?.value || characterMaster.description,
                            unlockLevel: characterMaster.unlockLevel,
                            rarity: characterMaster.rarity as any,
                            defaultImage: characterMaster.defaultImage,
                            avatarImage: characterMaster.avatarImage,
                            displayImage: characterMaster.displayImage
                          });
                          setShowCreateCharacter(false);
                        }}
                        className="w-full"
                      >
                        Create
                      </Button>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCharacter(character)}
                          data-testid={`button-edit-character-${character.id}`}
                        >
                          Edit
                        </Button>
                      </div>
                    </CardHeader>
                    {editingCharacter?.id === character.id && (
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={editingCharacter.name}
                              onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })}
                              data-testid="input-character-name"
                            />
                          </div>
                          <div>
                            <Label>Unlock Level</Label>
                            <Input
                              type="number"
                              value={editingCharacter.unlockLevel}
                              onChange={(e) => setEditingCharacter({ ...editingCharacter, unlockLevel: parseInt(e.target.value) })}
                              data-testid="input-character-unlock"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={editingCharacter.description}
                            onChange={(e) => setEditingCharacter({ ...editingCharacter, description: e.target.value })}
                            data-testid="input-character-desc"
                          />
                        </div>
                        <div>
                          <Label>Avatar Image URL (for top-left icon)</Label>
                          <Input
                            value={editingCharacter.avatarImage}
                            onChange={(e) => setEditingCharacter({ ...editingCharacter, avatarImage: e.target.value })}
                            placeholder="URL for avatar image"
                          />
                        </div>
                        <div>
                          <Label>Display Image URL (default character image)</Label>
                          <Input
                            value={editingCharacter.displayImage}
                            onChange={(e) => setEditingCharacter({ ...editingCharacter, displayImage: e.target.value })}
                            placeholder="URL for display image"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleSaveCharacter} data-testid="button-save-character">
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </Button>
                          <Button variant="outline" onClick={() => setEditingCharacter(null)}>
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete character "${editingCharacter.name}"?`)) {
                                handleDeleteCharacter(editingCharacter.id);
                              }
                            }}
                            data-testid={`button-delete-character-${character.id}`}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
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
              <Button
                onClick={() => {
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

                  const newLevel = {
                    level: nextLevel,
                    cost: 100,
                    requirements: [],
                    unlocks: []
                  };
                  setEditingLevel(newLevel);
                  setTimeout(() => {
                    document.getElementById('level-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
                data-testid="button-create-level"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Level
              </Button>
            </div>
            <ScrollArea className="h-[350px]">
              <div className="space-y-3 pr-4">
                {levelConfigs.map(levelConfig => (
                  <Card key={levelConfig.level} className={editingLevel?.level === levelConfig.level ? 'border-primary' : ''}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Level {levelConfig.level}</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingLevel(levelConfig)}
                          data-testid={`button-edit-level-${levelConfig.level}`}
                        >
                          Edit
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {editingLevel && (
              <Dialog open={!!editingLevel} onOpenChange={(open) => !open && setEditingLevel(null)}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Editing: Level {editingLevel.level}</DialogTitle>
                  </DialogHeader>
                  <div id="level-edit-form" className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Level Number</Label>
                        <Input
                          type="number"
                          min="1"
                          value={editingLevel.level}
                          onChange={(e) => setEditingLevel({ ...editingLevel, level: parseInt(e.target.value) || 1 })}
                          data-testid="input-level-number"
                        />
                      </div>
                      <div>
                        <Label>Cost (Points Required)</Label>
                        <Input
                          type="number"
                          value={editingLevel.cost}
                          onChange={(e) => setEditingLevel({ ...editingLevel, cost: parseInt(e.target.value) })}
                          data-testid="input-level-cost"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Requirements</Label>
                      {editingLevel.requirements.map((req, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                          <Select
                            value={req.upgradeId}
                            onValueChange={(value) => {
                              const newReqs = [...editingLevel.requirements];
                              newReqs[idx] = { ...req, upgradeId: value };
                              setEditingLevel({ ...editingLevel, requirements: newReqs });
                            }}
                          >
                            <SelectTrigger data-testid={`select-req-upgrade-${idx}`}>
                              <SelectValue />
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
                            value={req.minLevel}
                            onChange={(e) => {
                              const newReqs = [...editingLevel.requirements];
                              newReqs[idx] = { ...req, minLevel: parseInt(e.target.value) };
                              setEditingLevel({ ...editingLevel, requirements: newReqs });
                            }}
                            data-testid={`input-req-level-${idx}`}
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLevel({
                                ...editingLevel,
                                requirements: editingLevel.requirements.filter((_, i) => i !== idx)
                              });
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingLevel({
                            ...editingLevel,
                            requirements: [...editingLevel.requirements, { upgradeId: upgrades[0]?.id || '', minLevel: 1 }]
                          });
                        }}
                        data-testid="button-add-requirement"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Requirement
                      </Button>
                    </div>

                    <div>
                      <Label>Unlocks</Label>
                      {editingLevel.unlocks.map((unlock, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                          <Input
                            value={unlock}
                            onChange={(e) => {
                              const newUnlocks = [...editingLevel.unlocks];
                              newUnlocks[idx] = e.target.value;
                              setEditingLevel({ ...editingLevel, unlocks: newUnlocks });
                            }}
                            data-testid={`input-unlock-${idx}`}
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLevel({
                                ...editingLevel,
                                unlocks: editingLevel.unlocks.filter((_, i) => i !== idx)
                              });
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingLevel({
                            ...editingLevel,
                            unlocks: [...editingLevel.unlocks, 'New unlock']
                          });
                        }}
                        data-testid="button-add-unlock"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Unlock
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSaveLevel} data-testid="button-save-level">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setEditingLevel(null)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete Level ${editingLevel.level}? This cannot be undone.`)) {
                            handleDeleteLevel(editingLevel.level);
                          }
                        }}
                        data-testid="button-delete-level"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                <ImageUploader adminMode={true} />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            {!adminToken ? (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Admin Token Required</h3>
                  <p className="text-sm text-muted-foreground">Enter your ADMIN_TOKEN to manage players</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="admin-token">Admin Token</Label>
                    <Input
                      id="admin-token"
                      type="password"
                      placeholder="Enter ADMIN_TOKEN"
                      value={adminToken}
                      onChange={(e) => {
                        setAdminToken(e.target.value);
                        localStorage.setItem('adminToken', e.target.value);
                      }}
                      data-testid="input-admin-token"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This token is used to authenticate admin API requests for player management.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Player Management
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          View and edit player stats
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAdminToken('');
                          localStorage.removeItem('adminToken');
                        }}
                      >
                        Clear Token
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {playersLoading ? (
                      <p className="text-muted-foreground">Loading players...</p>
                    ) : !playersData?.players || playersData.players.length === 0 ? (
                      <p className="text-muted-foreground">No players found. Players will appear here when they authenticate via Telegram.</p>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3 pr-4">
                          {playersData.players.map((player: any) => (
                            <Card key={player.id} className={editingPlayer?.id === player.id ? 'border-primary' : ''}>
                              <CardHeader>
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-semibold">{player.username}</h4>
                                    <p className="text-xs text-muted-foreground">
                                      ID: {player.id} | Telegram: {player.telegramId || 'N/A'}
                                    </p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingPlayer(player)}
                                    data-testid={`button-edit-player-${player.id}`}
                                  >
                                    Edit
                                  </Button>
                                </div>
                              </CardHeader>
                              {editingPlayer?.id === player.id && (
                                <CardContent className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label>Points</Label>
                                      <Input
                                        type="number"
                                        value={editingPlayer.points}
                                        onChange={(e) => setEditingPlayer({ ...editingPlayer, points: parseInt(e.target.value) || 0 })}
                                        data-testid="input-player-points"
                                      />
                                    </div>
                                    <div>
                                      <Label>Energy</Label>
                                      <Input
                                        type="number"
                                        value={editingPlayer.energy}
                                        onChange={(e) => setEditingPlayer({ ...editingPlayer, energy: parseInt(e.target.value) || 0 })}
                                        data-testid="input-player-energy"
                                      />
                                    </div>
                                    <div>
                                      <Label>Max Energy</Label>
                                      <Input
                                        type="number"
                                        value={editingPlayer.maxEnergy}
                                        onChange={(e) => setEditingPlayer({ ...editingPlayer, maxEnergy: parseInt(e.target.value) || 0 })}
                                        data-testid="input-player-max-energy"
                                      />
                                    </div>
                                    <div>
                                      <Label>Level</Label>
                                      <Input
                                        type="number"
                                        value={editingPlayer.level}
                                        onChange={(e) => setEditingPlayer({ ...editingPlayer, level: parseInt(e.target.value) || 1 })}
                                        data-testid="input-player-level"
                                      />
                                    </div>
                                    <div>
                                      <Label>Passive Income Rate</Label>
                                      <Input
                                        type="number"
                                        value={editingPlayer.passiveIncomeRate}
                                        onChange={(e) => setEditingPlayer({ ...editingPlayer, passiveIncomeRate: parseInt(e.target.value) || 0 })}
                                        data-testid="input-player-passive-income"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => updatePlayerMutation.mutate({
                                        id: editingPlayer.id,
                                        updates: {
                                          points: editingPlayer.points,
                                          energy: editingPlayer.energy,
                                          maxEnergy: editingPlayer.maxEnergy,
                                          level: editingPlayer.level,
                                          passiveIncomeRate: editingPlayer.passiveIncomeRate
                                        }
                                      })}
                                      disabled={updatePlayerMutation.isPending}
                                      data-testid="button-save-player"
                                    >
                                      <Save className="w-4 h-4 mr-2" />
                                      {updatePlayerMutation.isPending ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button variant="outline" onClick={() => setEditingPlayer(null)}>
                                      Cancel
                                    </Button>
                                  </div>
                                </CardContent>
                              )}
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="theme" className="space-y-4">
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Theme Customization</h3>
                <p className="text-sm text-muted-foreground">Customize colors using HSL format (H S% L%)</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Primary Color</Label>
                    <Input
                      value={editingTheme?.primary || theme.primary}
                      onChange={(e) => setEditingTheme({ ...(editingTheme || theme), primary: e.target.value })}
                      placeholder="270 60% 50%"
                      data-testid="input-theme-primary"
                    />
                  </div>
                  <div>
                    <Label>Secondary Color</Label>
                    <Input
                      value={editingTheme?.secondary || theme.secondary}
                      onChange={(e) => setEditingTheme({ ...(editingTheme || theme), secondary: e.target.value })}
                      placeholder="240 5% 26%"
                      data-testid="input-theme-secondary"
                    />
                  </div>
                  <div>
                    <Label>Accent Color</Label>
                    <Input
                      value={editingTheme?.accent || theme.accent}
                      onChange={(e) => setEditingTheme({ ...(editingTheme || theme), accent: e.target.value })}
                      placeholder="280 65% 60%"
                      data-testid="input-theme-accent"
                    />
                  </div>
                  <div>
                    <Label>Background Color</Label>
                    <Input
                      value={editingTheme?.background || theme.background}
                      onChange={(e) => setEditingTheme({ ...(editingTheme || theme), background: e.target.value })}
                      placeholder="240 10% 8%"
                      data-testid="input-theme-background"
                    />
                  </div>
                  <div>
                    <Label>Card Color</Label>
                    <Input
                      value={editingTheme?.card || theme.card}
                      onChange={(e) => setEditingTheme({ ...(editingTheme || theme), card: e.target.value })}
                      placeholder="240 8% 12%"
                      data-testid="input-theme-card"
                    />
                  </div>
                  <div>
                    <Label>Muted Color</Label>
                    <Input
                      value={editingTheme?.muted || theme.muted}
                      onChange={(e) => setEditingTheme({ ...(editingTheme || theme), muted: e.target.value })}
                      placeholder="240 5% 20%"
                      data-testid="input-theme-muted"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveTheme} data-testid="button-save-theme">
                    <Save className="w-4 h-4 mr-2" />
                    Apply Theme
                  </Button>
                  <Button variant="outline" onClick={() => setEditingTheme(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-semibold">Game Management</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={handleExportConfig} variant="outline" className="w-full" data-testid="button-export-config">
                  <Save className="w-4 h-4 mr-2" />
                  Export Configuration
                </Button>
                <p className="text-sm text-muted-foreground">
                  Warning: Resetting will delete all game progress and return to default settings.
                </p>
                <Button variant="destructive" onClick={handleResetGame} data-testid="button-reset-game">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Game
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Separate level editing dialog component is removed as it's now integrated.