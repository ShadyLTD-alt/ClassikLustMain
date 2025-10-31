import { useState } from 'react';
import { Settings, Save, RotateCcw, Plus, X } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import ImageUploader from '@/components/ImageUploader';
import type { UpgradeConfig, CharacterConfig, LevelConfig, ThemeConfig } from '@shared/gameConfig';
import upgradeTemplates from '@/game-data/upgrade-templates.json';
import characterMaster from '@/game-data/character-master.json';

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

  if (!state.isAdmin) return null;

  const handleSaveUpgrade = () => {
    if (!editingUpgrade) return;
    updateUpgradeConfig(editingUpgrade);
    toast({ title: 'Upgrade saved', description: `${editingUpgrade.name} has been updated.` });
    setEditingUpgrade(null);
  };

  const handleSaveCharacter = () => {
    if (!editingCharacter) return;
    updateCharacterConfig(editingCharacter);
    toast({ title: 'Character saved', description: `${editingCharacter.name} has been updated.` });
    setEditingCharacter(null);
  };

  const handleSaveLevel = () => {
    if (!editingLevel) return;
    updateLevelConfig(editingLevel);
    toast({ title: 'Level config saved', description: `Level ${editingLevel.level} has been updated.` });
    setEditingLevel(null);
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
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="upgrades" data-testid="tab-admin-upgrades">Upgrades</TabsTrigger>
            <TabsTrigger value="characters" data-testid="tab-admin-characters">Characters</TabsTrigger>
            <TabsTrigger value="levels" data-testid="tab-admin-levels">Levels</TabsTrigger>
            <TabsTrigger value="images" data-testid="tab-admin-images">Images</TabsTrigger>
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
                          setEditingUpgrade({
                            id: `upgrade-${Date.now()}`,
                            name: template.name,
                            description: template.description,
                            maxLevel: template.fields.maxLevel.default,
                            baseCost: template.fields.baseCost.default,
                            costMultiplier: template.fields.costMultiplier.default,
                            baseValue: template.fields.baseValue.default,
                            valueIncrement: template.fields.valueIncrement.default,
                            icon: template.icon,
                            type: template.type as any
                          });
                          setShowCreateUpgrade(false);
                          setCreateTemplate('');
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
            <ScrollArea className="h-[450px]">
              <div className="space-y-3 pr-4">
                {upgrades.map(upgrade => (
                  <Card key={upgrade.id}>
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
                    {editingUpgrade?.id === upgrade.id && (
                      <CardContent className="space-y-3">
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
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={editingUpgrade.description}
                            onChange={(e) => setEditingUpgrade({ ...editingUpgrade, description: e.target.value })}
                            data-testid="input-upgrade-desc"
                          />
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
                                deleteUpgrade(editingUpgrade.id);
                                setEditingUpgrade(null);
                              }
                            }}
                            data-testid={`button-delete-upgrade-${upgrade.id}`}
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
                  </DialogHeader>
                  <div className="space-y-4">
                    <Button
                      onClick={() => {
                        setEditingCharacter({
                          id: `character-${Date.now()}`,
                          name: characterMaster.name,
                          description: characterMaster.description,
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
                            onClick={() => {
                              if (confirm(`Delete character "${editingCharacter.name}"?`)) {
                                deleteCharacter(editingCharacter.id);
                                setEditingCharacter(null);
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
                onClick={() => setEditingLevel({
                  level: levelConfigs.length + 1,
                  experienceRequired: 100,
                  requirements: [],
                  unlocks: []
                })}
                data-testid="button-create-level"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Level
              </Button>
            </div>
            <ScrollArea className="h-[450px]">
              <div className="space-y-3 pr-4">
                {levelConfigs.map(levelConfig => (
                  <Card key={levelConfig.level}>
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
                    {editingLevel?.level === levelConfig.level && (
                      <CardContent className="space-y-3">
                        <div>
                          <Label>Experience Required</Label>
                          <Input
                            type="number"
                            value={editingLevel.experienceRequired}
                            onChange={(e) => setEditingLevel({ ...editingLevel, experienceRequired: parseInt(e.target.value) })}
                            data-testid="input-level-exp"
                          />
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
                                onClick={() => {
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
                                onClick={() => {
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
                            onClick={() => {
                              if (confirm(`Delete Level ${editingLevel.level}?`)) {
                                deleteLevel(editingLevel.level);
                                setEditingLevel(null);
                              }
                            }}
                            data-testid={`button-delete-level-${levelConfig.level}`}
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

          <TabsContent value="images" className="space-y-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                <ImageUploader adminMode={true} />
              </div>
            </ScrollArea>
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
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingTheme(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Configuration Export/Import</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Export your game configuration as JSON to customize externally or share with others.
                </p>
                <Button onClick={handleExportConfig} data-testid="button-export-config">
                  Export Config (JSON)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-semibold text-destructive">Danger Zone</h3>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Reset all game data including progress, upgrades, and configurations.
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