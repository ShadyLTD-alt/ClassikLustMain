import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import GameLayout from "@/components/GameLayout";
import { useGame } from "@/contexts/GameContext";
import CharacterSelector from "@/components/CharacterSelector";
import UpgradePanel from "@/components/UpgradePanel";
import LevelUp from "@/components/LevelUp";
import ChatModal from "@/components/ChatModal";
import AdminPanel from "@/components/AdminPanel";
import { AdminFAB } from "@/components/AdminFAB";
import ImageUploader from "@/components/ImageUploader";
import { apiRequest } from "@/lib/queryClient";
import { User, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { debouncedSave } from "@/utils/debouncedSave";

export default function GameInterfaceV2() {
  const { state, tap } = useGame();
  const [showCharacters, setShowCharacters] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showLevel, setShowLevel] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false);
  const [tapEffects, setTapEffects] = useState<Array<{id: string, x: number, y: number, value: number}>>([]);

  // Fetch current character data
  const { data: currentCharacter } = useQuery({
    queryKey: ['/api/characters', state?.selectedCharacterId],
    queryFn: async () => {
      if (!state?.selectedCharacterId) return null;
      const response = await apiRequest('GET', `/api/characters/${state.selectedCharacterId}`);
      return await response.json();
    },
    enabled: !!state?.selectedCharacterId,
  });

  const handleTap = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!state || state.energy <= 0) return;
    
    // Get tap position for animation
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calculate tap value (base 1, upgrades calculated in context)
    const tapValue = 1; // This will be enhanced by GameContext tap() logic
    
    // Add floating animation
    const effectId = crypto.randomUUID();
    setTapEffects(prev => [...prev, { id: effectId, x, y, value: tapValue }]);
    
    // Remove animation after it completes
    setTimeout(() => {
      setTapEffects(prev => prev.filter(e => e.id !== effectId));
    }, 2000);
    
    // Trigger game tap - this will handle LP/energy updates and use debouncedSave
    tap();
  };

  const getCharacterImage = () => {
    if (state?.displayImage) return state.displayImage;
    if (currentCharacter?.defaultImage) return currentCharacter.defaultImage;
    return null;
  };

  const characterImage = getCharacterImage();

  return (
    <GameLayout
      onOpenCharacters={() => setShowCharacters(true)}
      onOpenUpgrades={() => setShowUpgrades(true)}
      onOpenLevel={() => setShowLevel(true)}
      onOpenChat={() => setShowChat(true)}
    >
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center relative">
          <div className="text-sm text-gray-400 mb-4">Tap to earn points!</div>
          
          <div className="relative">
            {/* Character Display Area - RESTORED TAP HANDLER */}
            <div
              className="w-80 h-80 mx-auto rounded-2xl bg-gradient-to-br from-purple-800/40 via-black/50 to-pink-800/40 border-2 border-purple-500/40 flex items-center justify-center cursor-pointer hover:border-purple-400/60 transition-all active:scale-[0.98] overflow-hidden relative group"
              onClick={handleTap}
              style={{
                boxShadow: '0 8px 32px rgba(168, 85, 247, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              {/* Ripple effect overlay */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-purple-400/10 opacity-0 group-active:opacity-100 transition-opacity duration-150" />
              </div>
              
              {/* Character Image */}
              {characterImage ? (
                <img
                  src={characterImage}
                  alt={currentCharacter?.name || 'Character'}
                  className="w-full h-full object-cover rounded-2xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/uploads/placeholder-character.jpg';
                  }}
                />
              ) : (
                <div className="text-gray-400 text-center p-8">
                  <User className="w-20 h-20 mx-auto mb-4 opacity-50" />
                  <div className="text-lg mb-2">No character selected</div>
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCharacters(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 mt-4"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Select Character
                  </Button>
                </div>
              )}
              
              {/* Character name overlay */}
              {currentCharacter && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-400/30">
                  <div className="text-white font-semibold text-lg flex items-center justify-between">
                    <span>{currentCharacter.name}</span>
                    {state?.isAdmin && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">Admin</span>
                    )}
                  </div>
                  <div className="text-purple-300 text-sm">Level {state?.level} • Tap to interact</div>
                </div>
              )}
            </div>

            {/* Floating +points animations */}
            {tapEffects.map(effect => (
              <div
                key={effect.id}
                className="absolute pointer-events-none text-green-400 font-bold text-xl animate-bounce"
                style={{
                  left: `${effect.x}px`,
                  top: `${effect.y}px`,
                  transform: 'translate(-50%, -50%)',
                  animation: 'float-up 2s ease-out forwards'
                }}
              >
                +{effect.value}
              </div>
            ))}
          </div>
          
          {/* Energy line removed as requested */}
        </div>
      </div>

      {/* USE YOUR EXISTING AdminFAB */}
      <AdminFAB onOpenDebugger={() => setShowDebugger(true)} />

      {/* Modals */}
      {showCharacters && <CharacterSelector isOpen={showCharacters} onClose={() => setShowCharacters(false)} />}
      {showUpgrades && <UpgradePanel isOpen={showUpgrades} onClose={() => setShowUpgrades(false)} />}
      {showLevel && <LevelUp isOpen={showLevel} onClose={() => setShowLevel(false)} />}
      {showChat && <ChatModal isOpen={showChat} onClose={() => setShowChat(false)} />}
      {showAdmin && <AdminPanel />}
      {showImageUploader && <ImageUploader adminMode={true} />}
      {showDebugger && <div className="fixed inset-0 z-50 bg-black/80 text-white p-4">DEBUG PANEL PLACEHOLDER</div>}
      
      {/* CSS Animation for floating points */}
      <style jsx>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -120px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -180px) scale(0.8);
          }
        }
      `}</style>
    </GameLayout>
  );
}