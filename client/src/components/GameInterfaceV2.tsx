import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import GameLayout from '@/components/GameLayout';
import { useGame } from '@/contexts/GameContext';
import { apiRequest } from '@/lib/queryClient';
import { User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MenuCore from '@/components/menu-core/MenuCore';
import AdminMenuCore from '@/components/adminmenu-core/AdminMenuCore';

export default function GameInterfaceV2() {
  const { state, tap } = useGame();
  const [showDebugger, setShowDebugger] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [tapEffects, setTapEffects] = useState<Array<{id: string, x: number, y: number, value: number}>>([]);

  const { data: currentCharacter } = useQuery({
    queryKey: ['/api/characters', state?.selectedCharacterId],
    queryFn: async () => {
      if (!state?.selectedCharacterId) return null;
      const r = await apiRequest('GET', `/api/characters/${state.selectedCharacterId}`);
      return await r.json();
    },
    enabled: !!state?.selectedCharacterId,
  });

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!state || state.energy <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const val = Math.round(state.lastTapValue || 1);
    const id = crypto.randomUUID();
    setTapEffects(p => [...p, { id, x, y, value: val }]);
    setTimeout(() => setTapEffects(p => p.filter(e => e.id !== id)), 2000);
    tap();
  };

  const getCharacterImage = () => {
    if (state?.displayImage) return state.displayImage;
    if (currentCharacter?.defaultImage) return currentCharacter.defaultImage.startsWith('/') ? currentCharacter.defaultImage : `/uploads/${currentCharacter.defaultImage}`;
    return null;
  };

  const charImg = getCharacterImage();

  return (
    <GameLayout>
      <div className="flex items-center justify-center min-h-[60vh] mt-16">
        <div className="text-center relative">
          <div className="text-sm text-gray-400 mb-4">Tap to earn points!</div>
          <div className="relative">
            <div 
              className="w-[560px] md:w-[700px] h-[560px] md:h-[700px] max-w-[90vw] max-h-[90vw] mx-auto rounded-3xl bg-gradient-to-br from-purple-800/40 via-black/50 to-pink-800/40 border-4 border-purple-500/40 flex items-center justify-center cursor-pointer hover:border-purple-400/60 transition-all active:scale-[0.98] overflow-hidden relative group" 
              onClick={handleTap} 
              style={{boxShadow:'0 12px 48px rgba(168,85,247,0.2)'}}
            >
              {state?.boostActive && (
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 via-yellow-400/20 to-orange-400/20 animate-pulse" />
                  <div className="absolute top-6 left-6 bg-orange-500/90 text-white text-sm font-bold px-3 py-1.5 rounded-full border border-orange-300">
                    {state.boostMultiplier}x BOOST
                  </div>
                </div>
              )}
              <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-purple-400/10 opacity-0 group-active:opacity-100 transition-opacity" />
              </div>
              {charImg ? (
                <img 
                  src={charImg} 
                  alt={currentCharacter?.name||'Character'} 
                  className="w-full h-full object-cover rounded-3xl" 
                  onError={(e)=>{(e.target as HTMLImageElement).src='/uploads/placeholder-character.jpg';}} 
                />
              ) : (
                <div className="text-gray-400 text-center p-8">
                  <User className="w-24 h-24 mx-auto mb-6 opacity-50" />
                  <div className="text-xl mb-3">No character selected</div>
                  <div className="text-sm text-purple-300">Click crown to select</div>
                </div>
              )}
              {currentCharacter && (
                <div className="absolute bottom-6 left-6 right-6 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-purple-400/30">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-white font-semibold text-xl">{currentCharacter.name}</div>
                      <div className="text-purple-300 text-sm">Tap to interact</div>
                    </div>
                    {state?.isAdmin && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {tapEffects.map(ef => (
              <div 
                key={ef.id} 
                className={`absolute pointer-events-none font-bold text-xl z-10 ${state?.boostActive?'text-orange-400':'text-green-400'}`} 
                style={{
                  left:`${ef.x}px`,
                  top:`${ef.y}px`,
                  transform:'translate(-50%,-50%)',
                  animation:'float-up 2s ease-out forwards'
                }}
              >
                +{Math.round(ef.value)}{state?.boostActive?' ⚡':''}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin Floating Action Button - Only show for admins */}
      {state?.isAdmin && (
        <button
          onClick={() => setShowAdminPanel(true)}
          className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          title="Open Admin Panel"
        >
          <Settings className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Admin Panel Modal */}
      {state?.isAdmin && (
        <AdminMenuCore 
          isOpen={showAdminPanel} 
          onClose={() => setShowAdminPanel(false)} 
        />
      )}

      {/* Debug Panel */}
      {showDebugger && (
        <div className="fixed inset-0 z-50 bg-black/80 text-white p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">🌙 Debug</h2>
              <Button onClick={() => setShowDebugger(false)} variant="outline">Close</Button>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm">
              <pre className="text-xs text-gray-300">
                {JSON.stringify({
                  level: state?.level,
                  lustPoints: state?.lustPoints || state?.points,
                  lustGems: state?.lustGems,
                  energy: state?.energy,
                  boostActive: state?.boostActive,
                  selectedCharacterId: state?.selectedCharacterId,
                  isAdmin: state?.isAdmin
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      <MenuCore />

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