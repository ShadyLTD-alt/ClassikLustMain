import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import GameLayout from "@/components/GameLayout";
import { useGame } from "@/contexts/GameContext";
import { AdminFAB } from "@/components/AdminFAB";
import { apiRequest } from "@/lib/queryClient";
import { User, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import MenuCore from "@/components/menu-core/MenuCore";

export default function GameInterfaceV2() {
  const { state, tap } = useGame();
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
    
    // Calculate tap value (GameContext will handle boost multipliers)
    const tapValue = Math.round(state.lastTapValue || 1);
    
    // Add floating animation
    const effectId = crypto.randomUUID();
    setTapEffects(prev => [...prev, { id: effectId, x, y, value: tapValue }]);
    
    // Remove animation after it completes
    setTimeout(() => {
      setTapEffects(prev => prev.filter(e => e.id !== effectId));
    }, 2000);
    
    // Trigger game tap - this will handle LP/energy updates, boosts, and debouncedSave
    tap();
  };

  const getCharacterImage = () => {
    if (state?.displayImage) return state.displayImage;
    if (currentCharacter?.defaultImage) {
      // Ensure absolute path for images
      return currentCharacter.defaultImage.startsWith('/') ? currentCharacter.defaultImage : `/uploads/${currentCharacter.defaultImage}`;
    }
    return null;
  };

  const characterImage = getCharacterImage();

  return (
    <GameLayout>
      {/* Main character display area - ENLARGED and clean */}
      <div className="flex items-center justify-center min-h-[60vh] mt-16">
        <div className="text-center relative">
          <div className="text-sm text-gray-400 mb-4">Tap to earn points!</div>
          
          <div className="relative">
            {/* Character Display Area - ENLARGED from 320px to 420px */}
            <div
              className="w-[420px] h-[420px] mx-auto rounded-2xl bg-gradient-to-br from-purple-800/40 via-black/50 to-pink-800/40 border-2 border-purple-500/40 flex items-center justify-center cursor-pointer hover:border-purple-400/60 transition-all active:scale-[0.98] overflow-hidden relative group"
              onClick={handleTap}
              style={{
                boxShadow: '0 8px 32px rgba(168, 85, 247, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              {/* Boost Active Overlay */}
              {state?.boostActive && (
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 via-yellow-400/20 to-orange-400/20 animate-pulse" />
                  <div className="absolute top-4 left-4 bg-orange-500/90 text-white text-xs font-bold px-2 py-1 rounded-full border border-orange-300">
                    {state.boostMultiplier}x BOOST
                  </div>
                </div>
              )}
              
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
                    console.log('Image failed to load:', characterImage);
                    (e.target as HTMLImageElement).src = '/uploads/placeholder-character.jpg';
                  }}
                />
              ) : (
                <div className="text-gray-400 text-center p-8">
                  <User className="w-20 h-20 mx-auto mb-4 opacity-50" />
                  <div className="text-lg mb-2">No character selected</div>
                  <div className="text-sm text-purple-300 mb-4">Click the crown in top menu to select</div>
                </div>
              )}
              
              {/* Character name overlay */}
              {currentCharacter && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-400/30">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-white font-semibold text-lg">{currentCharacter.name}</div>
                      <div className="text-purple-300 text-sm">Tap to interact</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {state?.isAdmin && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">Admin</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Floating +points animations */}
            {tapEffects.map(effect => (
              <div
                key={effect.id}
                className={`absolute pointer-events-none font-bold text-xl z-10 ${
                  state?.boostActive ? 'text-orange-400' : 'text-green-400'
                }`}
                style={{
                  left: `${effect.x}px`,
                  top: `${effect.y}px`,
                  transform: 'translate(-50%, -50%)',
                  animation: 'float-up 2s ease-out forwards'
                }}
              >
                +{Math.round(effect.value)}{state?.boostActive ? ' ⚡' : ''}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* USE EXISTING AdminFAB */}
      <AdminFAB onOpenDebugger={() => setShowDebugger(true)} />
      
      {/* Debug Panel */}
      {showDebugger && (
        <div className="fixed inset-0 z-50 bg-black/80 text-white p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">🌙 LunaBug Debug Panel</h2>
              <Button onClick={() => setShowDebugger(false)} variant="outline">Close</Button>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm">
              <div className="text-green-400">LunaBug Debug Status: {(window as any).LunaBug ? "Active" : "Inactive"}</div>
              <div className="text-blue-400 mt-2">Game State:</div>
              <pre className="text-xs mt-1 text-gray-300">{JSON.stringify({
                level: state?.level,
                lustPoints: state?.lustPoints || state?.points,
                lustGems: state?.lustGems,
                energy: state?.energy,
                boostActive: state?.boostActive,
                boostMultiplier: state?.boostMultiplier,
                selectedCharacterId: state?.selectedCharacterId,
                isAdmin: state?.isAdmin,
                experience: state?.experience,
                upgradesCount: Object.keys(state?.upgrades || {}).length,
                unlockedCharacters: (state?.unlockedCharacters || []).length,
                passiveIncomeRate: state?.passiveIncomeRate
              }, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
      
      {/* NEW: Complete Modular Menu System */}
      <MenuCore />
      
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