import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Lock, 
  Unlock, 
  Crown,
  Star,
  Heart,
  ImageIcon,
  User,
  Gallery,
  X
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import type { Character } from "@shared/schema";
import CharacterGallery from "./CharacterGallery";

interface CharacterSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CharacterSelector({ isOpen, onClose }: CharacterSelectorProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked' | 'vip'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch player data to get current character and telegram info
  const { data: player } = useQuery({
    queryKey: ['/api/player/me'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/player/me');
      return await response.json();
    },
    enabled: isOpen
  });

  // Fetch characters
  const { data: characters = [], isLoading: charactersLoading } = useQuery({
    queryKey: ['/api/characters'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/characters');
      return await response.json();
    },
    enabled: isOpen
  });

  // Character selection mutation
  const selectCharacterMutation = useMutation({
    mutationFn: async (characterId: string) => {
      const response = await apiRequest("POST", `/api/player/select-character`, {
        characterId
      });
      if (!response.ok) {
        throw new Error("Failed to select character");
      }
      return response.json();
    },
    onSuccess: (data, characterId) => {
      const character = characters.find((c: Character) => c.id === characterId);
      toast({
        title: "Character Selected!",
        description: `You've chosen ${character?.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/player/me"] });
      setSelectedCharacterId(characterId);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to select character. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Filter characters based on current filter and unlocked status
  const filteredCharacters = characters.filter((char: Character) => {
    const isUnlocked = player?.unlockedCharacters?.includes(char.id) || false;
    
    switch (filter) {
      case 'unlocked': return isUnlocked;
      case 'locked': return !isUnlocked;
      case 'vip': return char.rarity === 'legendary' || char.rarity === 'epic';
      default: return true;
    }
  });

  const handleSelectCharacter = (characterId: string) => {
    const character = characters.find((c: Character) => c.id === characterId);
    const isUnlocked = player?.unlockedCharacters?.includes(characterId) || false;
    
    if (!isUnlocked) {
      toast({
        title: "Character Locked",
        description: `Unlock ${character?.name} by reaching level ${character?.unlockLevel || 1}`,
        variant: "destructive",
      });
      return;
    }
    
    selectCharacterMutation.mutate(characterId);
  };

  const getCharacterIcon = (char: Character) => {
    if (char.rarity === 'legendary') return <Crown className="w-4 h-4 text-yellow-400" />;
    if (char.rarity === 'epic') return <Star className="w-4 h-4 text-purple-400" />;
    if (char.rarity === 'rare') return <Star className="w-4 h-4 text-blue-400" />;
    return <Heart className="w-4 h-4 text-pink-400" />;
  };

  const getCurrentCharacter = () => {
    return characters.find((c: Character) => c.id === player?.selectedCharacterId);
  };

  const currentCharacter = getCurrentCharacter();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900/95 backdrop-blur-lg text-white border-purple-500/50 overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Character Selection
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* User Info with Telegram Username */}
            <div className="flex items-center gap-3 p-3 bg-black/40 rounded-lg border border-gray-700/50">
              <div className="relative">
                {currentCharacter ? (
                  <img
                    src={currentCharacter.defaultImage || '/uploads/placeholder-avatar.jpg'}
                    alt={currentCharacter.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-purple-400"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/uploads/placeholder-avatar.jpg';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-400">@{user?.username || player?.username || 'Unknown'}</div>
                <div className="text-lg font-semibold">
                  {currentCharacter ? currentCharacter.name : 'No character selected'}
                </div>
                <div className="text-sm text-purple-400">
                  Level {player?.level || 1} • {player?.points || 0} points
                </div>
              </div>
              {currentCharacter && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCharacterId(currentCharacter.id);
                    setShowImageGallery(true);
                  }}
                  className="border-purple-400/50 text-purple-400 hover:bg-purple-600/20"
                >
                  <Gallery className="w-4 h-4 mr-2" />
                  View Gallery
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filter Tabs */}
            <Tabs value={filter} onValueChange={(v: any) => setFilter(v)} className="w-full">
              <TabsList className="grid grid-cols-4 w-full bg-black/60 border border-purple-500/30">
                <TabsTrigger value="all" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">All</TabsTrigger>
                <TabsTrigger value="unlocked" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Unlocked</TabsTrigger>
                <TabsTrigger value="locked" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Locked</TabsTrigger>
                <TabsTrigger value="vip" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">VIP</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Characters Grid */}
            <div className="max-h-[60vh] overflow-y-auto">
              {charactersLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredCharacters.map((char: Character) => {
                    const isUnlocked = player?.unlockedCharacters?.includes(char.id) || false;
                    const isSelected = char.id === player?.selectedCharacterId;
                    
                    return (
                      <Card 
                        key={char.id}
                        className={`cursor-pointer transition-all hover:scale-105 relative ${
                          isSelected 
                            ? 'ring-2 ring-purple-400 bg-purple-900/30 border-purple-400' 
                            : isUnlocked
                            ? 'bg-gray-800/60 hover:bg-gray-700/80 border-gray-600'
                            : 'bg-gray-900/60 border-gray-700 opacity-75'
                        }`}
                        onClick={() => handleSelectCharacter(char.id)}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="relative mb-3">
                            <img
                              src={char.defaultImage || char.avatarImage || '/uploads/placeholder-avatar.jpg'}
                              alt={char.name}
                              className="w-20 h-20 mx-auto rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/uploads/placeholder-avatar.jpg';
                              }}
                            />
                            
                            {/* Lock overlay */}
                            {!isUnlocked && (
                              <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                                <Lock className="w-8 h-8 text-red-400" />
                              </div>
                            )}
                            
                            {/* Selected indicator */}
                            {isSelected && (
                              <div className="absolute -top-2 -right-2 bg-purple-600 rounded-full p-1">
                                <User className="w-4 h-4 text-white" />
                              </div>
                            )}
                            
                            {/* Character icon */}
                            <div className="absolute -bottom-1 -right-1">
                              {getCharacterIcon(char)}
                            </div>
                          </div>
                          
                          <h3 className="font-semibold text-sm mb-1">{char.name}</h3>
                          
                          <div className="space-y-1">
                            <div className="text-xs text-gray-400">
                              Unlock Level {char.unlockLevel || 1}
                            </div>
                            
                            {isUnlocked ? (
                              <Badge variant="secondary" className="bg-green-600/20 text-green-400 text-xs">
                                <Unlock className="w-3 h-3 mr-1" />
                                Unlocked
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-red-600/20 text-red-400 text-xs">
                                <Lock className="w-3 h-3 mr-1" />
                                Locked
                              </Badge>
                            )}
                          </div>
                          
                          {/* Gallery button for unlocked characters */}
                          {isUnlocked && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 w-full text-xs border-purple-400/50 text-purple-400 hover:bg-purple-600/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCharacterId(char.id);
                                setShowImageGallery(true);
                              }}
                            >
                              <Gallery className="w-3 h-3 mr-1" />
                              Gallery
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              
              {!charactersLoading && filteredCharacters.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No characters found for this filter</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Character Gallery Modal */}
      <CharacterGallery 
        isOpen={showImageGallery}
        onClose={() => setShowImageGallery(false)}
        userId={user?.id || ''}
        currentCharacterId={selectedCharacterId}
        onCharacterSelected={(characterId) => {
          handleSelectCharacter(characterId);
          setShowImageGallery(false);
        }}
      />
    </>
  );
}