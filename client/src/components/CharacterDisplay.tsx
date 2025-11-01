import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

export default function CharacterDisplay() {
  const { state, characters, images, tap } = useGame();
  const [tapEffects, setTapEffects] = useState<Array<{ id: number; x: number; y: number; value: number }>>([]);
  const [nextId, setNextId] = useState(0);

  const selectedCharacter = characters.find(c => c.id === state.selectedCharacterId);
  const selectedImage = state.selectedImageId 
    ? images.find(img => img.id === state.selectedImageId)
    : null;

  // Prioritize displayImage from state, then selected image, then character default
  const displayImage = state.displayImage || selectedImage?.url || selectedCharacter?.defaultImage;

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (state.energy < 1) return;
    
    tap();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const tapPowerUpgrades = state.upgrades['tap-power'] || 0;
    const value = 1 + tapPowerUpgrades;
    
    setTapEffects(prev => [...prev, { id: nextId, x, y, value }]);
    setNextId(prev => prev + 1);
  };

  useEffect(() => {
    if (tapEffects.length > 0) {
      const timer = setTimeout(() => {
        setTapEffects(prev => prev.slice(1));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [tapEffects]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8">
      <div className="mb-4">
        <Badge variant="secondary" className="text-lg px-4 py-1">
          {selectedCharacter?.name || 'Unknown'}
        </Badge>
      </div>

      <div className="relative select-none">
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={handleTap}
          className="cursor-pointer hover-elevate active-elevate-2 rounded-2xl overflow-hidden"
          style={{ 
            width: '400px',
            maxWidth: '90vw',
            aspectRatio: '3/4'
          }}
          data-testid="character-tap-area"
        >
          {displayImage ? (
            <img 
              src={displayImage}
              alt={selectedCharacter?.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground">No character selected</span>
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {tapEffects.map(effect => (
            <motion.div
              key={effect.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -50, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute pointer-events-none text-2xl font-bold text-primary"
              style={{ left: effect.x, top: effect.y }}
            >
              +{effect.value}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {state.energy < state.maxEnergy * 0.2 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Low energy! Wait for regeneration...
        </p>
      )}
    </div>
  );
}
