import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, Lock, Star, X } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';

interface CharacterSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CharacterSelector({ isOpen, onClose }: CharacterSelectorProps) {
  const { state, characters, images, selectCharacter } = useGame();
  const [selectedTab, setSelectedTab] = useState('all');

  const getCharacterImages = (characterId: string) => {
    return images.filter(img => img.characterId === characterId && !img.isHidden);
  };

  const getFilteredCharacters = () => {
    switch (selectedTab) {
      case 'unlocked':
        return characters.filter(c => state.unlockedCharacters.includes(c.id));
      case 'locked':
        return characters.filter(c => !state.unlockedCharacters.includes(c.id));
      case 'vip':
        return characters.filter(c => c.vip === true);
      default:
        return characters;
    }
  };

  const handleCharacterSelect = (characterId: string) => {
    if (state.unlockedCharacters.includes(characterId)) {
      selectCharacter(characterId);
      onClose();
    }
  };

  const selectedCharacter = characters.find(c => c.id === state.selectedCharacterId);
  const filteredCharacters = getFilteredCharacters();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900/95 backdrop-blur-lg text-white border-purple-500/50 overflow-hidden">
        {/* SINGLE Header with close button */}
        <DialogHeader className="border-b border-purple-500/30 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold lust-brand">
                Character Selection
              </DialogTitle>
              <div className="text-gray-400 text-sm mt-1">
                {selectedCharacter ? (
                  <>
                    @{selectedCharacter.name} | Level {state.level} | {Math.floor(state.points).toLocaleString()} points
                  </>
                ) : (
                  '@Unknown | No character selected'
                )}
              </div>
            </div>
            {/* SINGLE close button */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 bg-black/40 mb-4">
              <TabsTrigger value="all" className="data-[state=active]:bg-purple-600 text-white">
                All
              </TabsTrigger>
              <TabsTrigger value="unlocked" className="data-[state=active]:bg-purple-600 text-white">
                Unlocked
              </TabsTrigger>
              <TabsTrigger value="locked" className="data-[state=active]:bg-purple-600 text-white">
                Locked
              </TabsTrigger>
              <TabsTrigger value="vip" className="data-[state=active]:bg-purple-600 text-white">
                VIP
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="flex-1 overflow-auto">
              {filteredCharacters.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                  {filteredCharacters.map((character) => {
                    const isUnlocked = state.unlockedCharacters.includes(character.id);
                    const isSelected = state.selectedCharacterId === character.id;
                    const characterImages = getCharacterImages(character.id);

                    return (
                      <Card
                        key={character.id}
                        className={`cursor-pointer transition-all duration-200 border-2 ${
                          isSelected
                            ? 'border-purple-400 bg-purple-900/30'
                            : isUnlocked
                            ? 'border-purple-600/50 bg-black/40 hover:border-purple-500 hover:bg-purple-900/20'
                            : 'border-gray-600 bg-gray-800/40 opacity-60'
                        }`}
                        onClick={() => handleCharacterSelect(character.id)}
                      >
                        <CardContent className="p-4">
                          <div className="relative">
                            {/* Character Image */}
                            <div className="aspect-[3/4] mb-3 rounded-lg overflow-hidden bg-gray-800">
                              {character.defaultImage ? (
                                <img
                                  src={character.defaultImage}
                                  alt={character.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/uploads/placeholder-character.jpg';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                  <Crown className="w-12 h-12" />
                                </div>
                              )}
                            </div>

                            {/* Character Info */}
                            <div className="text-center">
                              <h3 className="font-semibold text-white mb-1">{character.name}</h3>
                              <div className="flex items-center justify-center gap-2 mb-2">
                                {character.vip && (
                                  <Badge variant="secondary" className="text-xs bg-yellow-600/20 text-yellow-400">
                                    <Crown className="w-3 h-3 mr-1" />
                                    VIP
                                  </Badge>
                                )}
                                {isSelected && (
                                  <Badge variant="secondary" className="text-xs bg-purple-600/20 text-purple-400">
                                    <Star className="w-3 h-3 mr-1" />
                                    Selected
                                  </Badge>
                                )}
                              </div>

                              {/* Unlock Status */}
                              {isUnlocked ? (
                                <div className="text-green-400 text-xs">
                                  Unlocked | {characterImages.length} images
                                </div>
                              ) : (
                                <div className="text-gray-400 text-xs flex items-center justify-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  Unlock at Level {character.unlockLevel}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <div className="w-16 h-16 mb-4 rounded-lg bg-gray-700 flex items-center justify-center">
                    <Crown className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No characters found for this filter</h3>
                  <p className="text-sm text-center">Try switching to a different tab or unlock more characters</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t border-purple-500/30 pt-4 mt-4">
          <div className="text-center text-gray-400 text-sm">
            Characters
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}