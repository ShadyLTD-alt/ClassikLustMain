import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

export default function CharacterDisplay() {
  const { state, characters, images, tap, calculateTapValue } = useGame();
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
    
    // Use ACTUAL tap value from GameContext (synced after tap())
    const actualTapValue = state.lastTapValue || calculateTapValue();
    
    setTapEffects(prev => [...prev, { id: nextId, x, y, value: actualTapValue }]);
    setNextId(prev => prev + 1);

    // Log tap to LunaBug if available
    if ((window as any).LunaBug?.core) {
      (window as any).LunaBug.core.logEvent('character_tap', {
        characterId: state.selectedCharacterId,
        tapValue: actualTapValue,
        energyAfter: state.energy - 1,
        position: { x, y }
      });
    }
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
    <div className="flex flex-col items-center justify-center flex-1 p-4">
      <div className="mb-6">
        <Badge 
          variant="secondary" 
          className="text-xl px-6 py-2 lust-brand border border-purple-400/30 bg-black/40"
        >
          {selectedCharacter?.name || 'Loading...'}
        </Badge>
      </div>

      <div className="relative select-none">
        <motion.div
          whileTap={{ scale: 0.95 }}
          onClick={handleTap}
          className="cursor-pointer hover-elevate active-elevate-2 rounded-2xl overflow-hidden shadow-2xl border border-purple-400/20"
          style={{ 
            width: '480px', // Enlarged from 400px
            maxWidth: '95vw',
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
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center border-2 border-dashed border-gray-600">
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-4">🎆</div>
                <span className="text-lg">Tap to select character</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Floating Tap Effects - NOW SHOWS REAL VALUES */}
        <AnimatePresence>
          {tapEffects.map(effect => (
            <motion.div
              key={effect.id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -60, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute pointer-events-none text-3xl font-bold text-green-400 drop-shadow-lg z-10"
              style={{ left: effect.x - 20, top: effect.y - 10 }}
            >
              +{effect.value}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Energy Warning */}
      {state.energy < state.energyMax * 0.2 && (
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-sm text-yellow-400 text-center px-4 py-2 bg-yellow-900/20 rounded-lg border border-yellow-500/30"
        >
          ⚡ Low energy! Wait for regeneration or upgrade energy capacity...
        </motion.p>
      )}

      {/* Tap Value Info for Admin Debug */}
      {state.isAdmin && (
        <div className="mt-4 text-xs text-gray-400 text-center space-y-1">
          <div>Tap Value: +{state.lastTapValue || calculateTapValue()} | Energy: {state.energy}/{state.maxEnergy}</div>
          <div className="text-purple-400">🌙 LunaBug: {(window as any).LunaBug ? 'Online' : 'Offline'}</div>
        </div>
      )}
    </div>
  );
}