import { Lock } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CharacterGalleryProps {
  inline?: boolean;
}

export default function CharacterGallery({ inline = false }: CharacterGalleryProps) {
  const { state, characters, selectCharacter } = useGame();

  const rarityColors = {
    common: 'bg-muted',
    rare: 'bg-blue-500/20',
    epic: 'bg-purple-500/20',
    legendary: 'bg-amber-500/20'
  };

  const GalleryContent = () => (
    // ✅ LUNA FIX: Enhanced scrolling with proper height and performance
    <div className="h-full overflow-hidden">
      <ScrollArea className="h-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
          {characters.map(character => {
            const isUnlocked = state.unlockedCharacters.includes(character.id);
            const isSelected = state.selectedCharacterId === character.id;

            return (
              <div
                key={character.id}
                className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-card-border'
                } ${
                  isUnlocked 
                    ? 'hover:border-primary/70 hover:scale-105 hover:shadow-lg cursor-pointer transform-gpu' 
                    : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => isUnlocked && selectCharacter(character.id)}
                data-testid={`character-${character.id}`}
              >
                {character.defaultImage ? (
                  <img
                    src={character.defaultImage}
                    alt={character.name}
                    className={`w-full h-full object-cover transition-all duration-200 ${
                      !isUnlocked ? 'grayscale' : 'grayscale-0'
                    }`}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-xs text-center px-2">No Image</span>
                  </div>
                )}

                {/* ✅ UNLOCK STATUS OVERLAY */}
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm font-medium text-center">
                      Level {character.unlockLevel}
                    </span>
                  </div>
                )}

                {/* ✅ CHARACTER INFO BOTTOM OVERLAY */}
                <div className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent`}>
                  <p className="font-semibold text-sm text-white text-center mb-1">
                    {character.name}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        character.rarity === 'legendary' ? 'bg-amber-500/30 text-amber-300 border-amber-500/50' :
                        character.rarity === 'epic' ? 'bg-purple-500/30 text-purple-300 border-purple-500/50' :
                        character.rarity === 'rare' ? 'bg-blue-500/30 text-blue-300 border-blue-500/50' :
                        'bg-slate-500/30 text-slate-300 border-slate-500/50'
                      }`}
                    >
                      {character.rarity}
                    </Badge>
                  </div>
                </div>

                {/* ✅ ACTIVE CHARACTER INDICATOR */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-primary text-primary-foreground pulse-ring">
                      Active
                    </Badge>
                  </div>
                )}

                {/* ✅ CHARACTER STATS PREVIEW (if unlocked) */}
                {isUnlocked && character.bonuses && (
                  <div className="absolute top-2 left-2">
                    <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                      <div className="text-xs text-green-300 font-medium">
                        +{character.bonuses.tapMultiplier || 0}% Tap
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* ✅ LUNA FIX: Empty state for no characters */}
          {characters.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <p className="text-lg font-medium mb-2">No Characters Available</p>
              <p className="text-sm text-center">Characters will appear here as you unlock them!</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  if (inline) {
    return (
      <div className="h-64 overflow-hidden">
        <GalleryContent />
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-open-gallery" className="hover:bg-primary/10">
          🖼️ Characters ({characters.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🖼️ Character Collection
            <Badge variant="outline">
              {state.unlockedCharacters.length}/{characters.length} Unlocked
            </Badge>
          </DialogTitle>
        </DialogHeader>
        {/* ✅ LUNA FIX: Full height scrollable area */}
        <div className="flex-1 min-h-0">
          <GalleryContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
