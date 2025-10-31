import { Lock } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CharacterGallery() {
  const { state, characters, selectCharacter } = useGame();

  const rarityColors = {
    common: 'bg-muted',
    rare: 'bg-blue-500/20',
    epic: 'bg-purple-500/20',
    legendary: 'bg-amber-500/20'
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-open-gallery">
          Characters
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Character Collection</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {characters.map(character => {
              const isUnlocked = state.unlockedCharacters.includes(character.id);
              const isSelected = state.selectedCharacterId === character.id;

              return (
                <div
                  key={character.id}
                  className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 ${
                    isSelected ? 'border-primary' : 'border-card-border'
                  } ${isUnlocked ? 'hover-elevate cursor-pointer' : 'opacity-50'}`}
                  onClick={() => isUnlocked && selectCharacter(character.id)}
                  data-testid={`character-${character.id}`}
                >
                  {character.defaultImage ? (
                    <img
                      src={character.defaultImage}
                      alt={character.name}
                      className={`w-full h-full object-cover ${!isUnlocked && 'grayscale'}`}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground">No Image</span>
                    </div>
                  )}

                  {!isUnlocked && (
                    <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
                      <Lock className="w-8 h-8" />
                      <span className="text-sm font-medium">Level {character.unlockLevel}</span>
                    </div>
                  )}

                  <div className={`absolute bottom-0 left-0 right-0 p-2 ${rarityColors[character.rarity]}`}>
                    <p className="font-semibold text-sm">{character.name}</p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {character.rarity}
                    </Badge>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-primary text-primary-foreground">Active</Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
