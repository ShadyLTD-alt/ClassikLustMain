import { useState } from 'react';
import { Settings, Save, RotateCcw } from 'lucide-react';
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
import ImageUploader from './ImageUploader';
import type { UpgradeConfig, CharacterConfig } from '@shared/gameConfig';

export default function AdminPanel() {
  const { state, upgrades, characters, updateUpgradeConfig, updateCharacterConfig, resetGame } = useGame();
  const { toast } = useToast();
  const [editingUpgrade, setEditingUpgrade] = useState<UpgradeConfig | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<CharacterConfig | null>(null);

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
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="upgrades" data-testid="tab-admin-upgrades">Upgrades</TabsTrigger>
            <TabsTrigger value="characters" data-testid="tab-admin-characters">Characters</TabsTrigger>
            <TabsTrigger value="images" data-testid="tab-admin-images">Images</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-admin-settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="upgrades" className="space-y-4">
            <ScrollArea className="h-[500px]">
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
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="characters" className="space-y-4">
            <ScrollArea className="h-[500px]">
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
                          <div>
                            <Label>Rarity</Label>
                            <Select
                              value={editingCharacter.rarity}
                              onValueChange={(value: any) => setEditingCharacter({ ...editingCharacter, rarity: value })}
                            >
                              <SelectTrigger data-testid="select-character-rarity">
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
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={editingCharacter.description}
                            onChange={(e) => setEditingCharacter({ ...editingCharacter, description: e.target.value })}
                            data-testid="input-character-desc"
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
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <ImageUploader adminMode />
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
