import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGame } from "@/contexts/GameContext";
import CharacterSelectionScrollable from "@/components/CharacterSelectionScrollable";
import UpgradePanel from "@/components/UpgradePanel";
import LevelUp from "@/components/LevelUp";
import ChatModal from "@/components/ChatModal";
import { AdminFAB } from "@/components/AdminFAB";
import { apiRequest } from "@/lib/queryClient";
import { User, Crown, Zap, Heart, Gem, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

// 🎆 Enhanced floating tap effects with better animations
interface TapEffect {
  id: string;
  x: number;
  y: number;
  value: number;
  type: 'points' | 'boost' | 'gems';
}

export default function GameInterfaceV3() {
  const { state, tap } = useGame();
  const [showCharacters, setShowCharacters] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showLevel, setShowLevel] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false);
  const [tapEffects, setTapEffects] = useState<TapEffect[]>([]);
  const [iconsLoaded, setIconsLoaded] = useState({ hearts: false, gems: false });

  // Fetch current character data
  const { data: currentCharacter } = useQuery({
    queryKey: ['/api/characters', state?.selectedCharacterId],
    queryFn: async () => {
      if (!state?.selectedCharacterId) return null;
      try {
        const response = await apiRequest('GET', `/api/characters/${state.selectedCharacterId}`);
        return await response.json();
      } catch (error) {
        console.warn('⚠️ [CHARACTER FETCH] Failed to fetch character:', error);
        return null;
      }
    },
    enabled: !!state?.selectedCharacterId,
  });

  // 🔍 Fetch player data for username display
  const { data: playerData } = useQuery({
    queryKey: ['/api/player/me'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/player/me');
      return await response.json();
    },
    staleTime: 15000
  });

  const handleTap = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!state || state.energy <= 0) return;
    
    // Get tap position for animation
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calculate tap value (GameContext will handle boost multipliers)
    const tapValue = state.lastTapValue || 1;
    const effectType: TapEffect['type'] = state.boostActive ? 'boost' : 'points';
    
    // Add floating animation with enhanced effects
    const effectId = crypto.randomUUID();
    setTapEffects(prev => [...prev, { id: effectId, x, y, value: tapValue, type: effectType }]);
    
    // Remove animation after it completes
    setTimeout(() => {
      setTapEffects(prev => prev.filter(e => e.id !== effectId));
    }, 3000); // Longer animation duration
    
    // Trigger game tap - this will handle LP/energy updates, boosts, and debouncedSave
    tap();
  };

  const getCharacterImage = () => {
    if (state?.displayImage) return state.displayImage;
    if (currentCharacter?.defaultImage) return currentCharacter.defaultImage;
    return null;
  };

  const getAvatarImage = () => {
    if (currentCharacter?.avatarImage) return currentCharacter.avatarImage;
    return null;
  };

  // 🛡️ Safe icon rendering with fallbacks
  const HeartIcon = ({ className }: { className?: string }) => {
    if (iconsLoaded.hearts) {
      return (
        <img 
          src="/uploads/gameui/floatinghearts.png" 
          alt="♥" 
          className={className}
          onError={() => setIconsLoaded(prev => ({ ...prev, hearts: false }))}
        />
      );
    }
    return <Heart className={className || "w-4 h-4"} />;
  };

  const GemIcon = ({ className }: { className?: string }) => {
    if (iconsLoaded.gems) {
      return (
        <img 
          src="/uploads/gameui/lustgems.png" 
          alt="💎" 
          className={className}
          onError={() => setIconsLoaded(prev => ({ ...prev, gems: false }))}
        />
      );
    }
    return <Gem className={className || "w-4 h-4"} />;
  };

  // Check if icons exist on mount
  useState(() => {
    const checkIcon = async (url: string, key: 'hearts' | 'gems') => {
      try {
        const img = new Image();
        img.onload = () => setIconsLoaded(prev => ({ ...prev, [key]: true }));
        img.onerror = () => setIconsLoaded(prev => ({ ...prev, [key]: false }));
        img.src = url;
      } catch {
        // Icon doesn't exist, use fallback
      }
    };
    
    checkIcon('/uploads/gameui/floatinghearts.png', 'hearts');
    checkIcon('/uploads/gameui/lustgems.png', 'gems');
  });

  const characterImage = getCharacterImage();
  const avatarImage = getAvatarImage();
  const playerUsername = playerData?.player?.username || playerData?.username || 'Player';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* 🎨 REDESIGNED TOP BAR */}
      <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-gray-900/95 via-purple-900/90 to-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-black/60 border-b border-purple-500/20">
        <div className="mx-auto max-w-5xl px-4 py-3">
          {/* Top Row: Avatar Section + LustPoints per Hour Center */}
          <div className="flex items-center justify-between mb-2">
            {/* LEFT: Avatar + Player Info + LustPoints/LustGems */}
            <div className="flex items-center gap-4">
              {/* Player Info + Avatar */}
              <div className="flex flex-col items-center">
                {/* 🎯 FIXED: Username above avatar */}
                <div className="text-sm font-bold text-white mb-1">{playerUsername}</div>
                
                {/* 🎯 25% Bigger Avatar */}
                <div 
                  className="relative cursor-pointer group"
                  onClick={() => setShowCharacters(true)}
                >
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600/40 via-pink-600/40 to-purple-800/60 border-2 border-purple-400/50 flex items-center justify-center overflow-hidden transition-all group-hover:border-purple-300/70 group-hover:shadow-lg group-hover:shadow-purple-500/20">
                    {avatarImage ? (
                      <img
                        src={avatarImage}
                        alt={currentCharacter?.name || 'Character'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/uploads/placeholder-avatar.jpg';
                        }}
                      />
                    ) : (
                      <User className="w-8 h-8 text-purple-300" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-purple-600 border border-purple-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-white">📷</span>
                  </div>
                </div>
                
                {/* 🎯 FIXED: Level below avatar */}
                <div className="text-xs text-purple-300 font-medium mt-1">Level {state?.level || 1}</div>
                {state?.isAdmin && (
                  <div className="text-[10px] text-green-400 font-semibold">Admin</div>
                )}
              </div>
              
              {/* LustPoints + LustGems */}
              <div className="flex flex-col gap-2">
                {/* 🎯 LustPoints with heart icon */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/30 border border-purple-500/20 min-w-[120px]">
                  <HeartIcon className="w-4 h-4 opacity-80" />
                  <div>
                    <div className="text-[10px] text-purple-300 font-semibold tracking-wider">LUST<span className="text-pink-400">POINTS</span></div>
                    <div className="text-white text-sm font-bold tabular-nums leading-tight">{Math.floor(state?.lustPoints || state?.points || 0).toLocaleString()}</div>
                  </div>
                </div>
                
                {/* 🎯 LustGems with gem icon */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/30 border border-cyan-500/20 min-w-[120px]">
                  <GemIcon className="w-4 h-4 opacity-80" />
                  <div>
                    <div className="text-[10px] text-cyan-300 font-semibold tracking-wider">LUST<span className="text-cyan-400">GEMS</span></div>
                    <div className="text-white text-sm font-bold tabular-nums leading-tight">{state?.lustGems || 0}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* CENTER: LustPoints per Hour */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/30 border border-purple-500/20">
              <HeartIcon className="w-4 h-4 opacity-80" />
              <div>
                <div className="text-[10px] text-purple-300 font-semibold tracking-wide">LUSTPOINTS PER HOUR</div>
                <div className="text-white text-sm font-bold tabular-nums leading-tight">{Math.floor(state?.passiveIncomeRate || 0).toLocaleString()}</div>
              </div>
            </div>
            
            {/* RIGHT: Admin badge (if needed) */}
            <div className="w-32"> {/* Spacer for balance */}
              {state?.isAdmin && (
                <div className="text-xs px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 text-center">
                  🛡️ Admin
                </div>
              )}
            </div>
          </div>
          
          {/* Bottom Row: Energy + Boosts */}
          <div className="flex items-center justify-between">
            {/* LEFT: Energy */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 border border-yellow-500/20">
              <Zap className="w-4 h-4 text-yellow-400" />
              <div>
                <div className="text-[9px] text-yellow-300 font-semibold tracking-wide">ENERGY</div>
                <div className="text-white text-sm font-bold tabular-nums leading-tight">
                  {state?.energy || 0}/{state?.energyMax || 1000}
                </div>
              </div>
            </div>
            
            {/* CENTER: Boosts Frame */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-black/30 border border-orange-500/20">
              {state?.boostActive ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                  <div>
                    <div className="text-[9px] text-orange-300 font-semibold tracking-wide">ACTIVE BOOST</div>
                    <div className="text-orange-400 text-sm font-bold">{state.boostMultiplier}x Multiplier</div>
                  </div>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-[9px] text-gray-400 font-semibold tracking-wide">BOOSTS</div>
                    <div className="text-gray-400 text-sm font-bold">Ready</div>
                  </div>
                </>
              )}
            </div>
            
            {/* RIGHT: Energy Regen Rate */}
            <div className="px-3 py-1.5 rounded-lg bg-black/30 border border-green-500/20">
              <div className="text-[9px] text-green-300 font-semibold tracking-wide">REGEN</div>
              <div className="text-green-400 text-sm font-bold tabular-nums">+{state?.energyRegenRate || 1}/s</div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">
        <div className="flex items-center justify-center min-h-[65vh]">
          <div className="text-center relative">
            <div className="text-sm text-gray-400 mb-6">Tap to earn points!</div>
            
            <div className="relative">
              {/* 🎯 2.5x BIGGER Character Display Area */}
              <div
                className="w-96 h-96 mx-auto rounded-3xl bg-gradient-to-br from-purple-800/40 via-black/50 to-pink-800/40 border-3 border-purple-500/40 flex items-center justify-center cursor-pointer hover:border-purple-400/60 transition-all active:scale-[0.98] overflow-hidden relative group character-frame"
                onClick={handleTap}
                style={{
                  boxShadow: '0 12px 48px rgba(168, 85, 247, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Boost Active Overlay */}
                {state?.boostActive && (
                  <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-400/30 via-yellow-400/30 to-orange-400/30 animate-pulse" />
                    <div className="absolute top-6 left-6 bg-orange-500/90 text-white text-sm font-bold px-3 py-2 rounded-full border border-orange-300">
                      {state.boostMultiplier}x BOOST ⚡
                    </div>
                  </div>
                )}
                
                {/* Ripple effect overlay */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 bg-purple-400/15 opacity-0 group-active:opacity-100 transition-opacity duration-200" />
                </div>
                
                {/* Character Image */}
                {characterImage ? (
                  <img
                    src={characterImage}
                    alt={currentCharacter?.name || 'Character'}
                    className="w-full h-full object-cover rounded-3xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/uploads/placeholder-character.jpg';
                    }}
                  />
                ) : (
                  <div className="text-gray-400 text-center p-8">
                    <User className="w-24 h-24 mx-auto mb-6 opacity-50" />
                    <div className="text-xl mb-4">No character selected</div>
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCharacters(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-lg px-6 py-3"
                    >
                      <Crown className="w-5 h-5 mr-2" />
                      Select Character
                    </Button>
                  </div>
                )}
                
                {/* Character name overlay */}
                {currentCharacter && (
                  <div className="absolute bottom-6 left-6 right-6 bg-black/70 backdrop-blur-sm rounded-xl px-4 py-3 border border-purple-400/30">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <div className="text-white font-bold text-xl">{currentCharacter.name}</div>
                        <div className="text-purple-300 text-sm">Tap to interact ✨</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentCharacter.rarity && (
                          <span className={`text-xs px-2 py-1 rounded-full border ${
                            currentCharacter.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' :
                            currentCharacter.rarity === 'epic' ? 'bg-purple-500/20 text-purple-300 border-purple-400/30' :
                            currentCharacter.rarity === 'rare' ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' :
                            'bg-gray-500/20 text-gray-300 border-gray-400/30'
                          }`}>
                            {currentCharacter.rarity.charAt(0).toUpperCase() + currentCharacter.rarity.slice(1)}
                          </span>
                        )}
                        {currentCharacter.vip && (
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">
                            👑 VIP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 🎆 ENHANCED: Floating tap effects with better animations and fallback icons */}
              {tapEffects.map(effect => (
                <div
                  key={effect.id}
                  className={`absolute pointer-events-none font-bold text-2xl z-20 flex items-center gap-1 ${
                    effect.type === 'boost' ? 'text-orange-400' :
                    effect.type === 'gems' ? 'text-cyan-400' :
                    'text-pink-400'
                  }`}
                  style={{
                    left: `${effect.x}px`,
                    top: `${effect.y}px`,
                    transform: 'translate(-50%, -50%)',
                    animation: 'enhanced-float-up 3s ease-out forwards'
                  }}
                >
                  {effect.type === 'boost' && <span>⚡</span>}
                  {effect.type === 'gems' && <GemIcon className="w-5 h-5" />}
                  {effect.type === 'points' && <HeartIcon className="w-5 h-5 opacity-90" />}
                  +{effect.value}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur border-t border-purple-500/20">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-around">
            <Button 
              onClick={() => setShowUpgrades(true)}
              variant="ghost" 
              className="flex flex-col items-center gap-1 text-purple-300 hover:text-purple-200 hover:bg-purple-900/30 px-6 py-3"
            >
              <TrendingUp className="w-6 h-6" />
              <span className="text-xs font-medium">Upgrades</span>
            </Button>
            
            <Button 
              onClick={() => setShowChat(true)}
              variant="ghost" 
              className="flex flex-col items-center gap-1 text-purple-300 hover:text-purple-200 hover:bg-purple-900/30 px-6 py-3"
            >
              <Heart className="w-6 h-6" />
              <span className="text-xs font-medium">AI Chat</span>
            </Button>
            
            <Button 
              onClick={() => setShowLevel(true)}
              variant="ghost" 
              className="flex flex-col items-center gap-1 text-purple-300 hover:text-purple-200 hover:bg-purple-900/30 px-6 py-3"
            >
              <Zap className="w-6 h-6" />
              <span className="text-xs font-medium">Level</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* USE EXISTING AdminFAB */}
      <AdminFAB onOpenDebugger={() => setShowDebugger(true)} />

      {/* Modals */}
      {showCharacters && <CharacterSelectionScrollable isOpen={showCharacters} onClose={() => setShowCharacters(false)} />}
      {showUpgrades && <UpgradePanel isOpen={showUpgrades} onClose={() => setShowUpgrades(false)} />}
      {showLevel && <LevelUp isOpen={showLevel} onClose={() => setShowLevel(false)} />}
      {showChat && <ChatModal isOpen={showChat} onClose={() => setShowChat(false)} />}
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
                experience: state?.experience,
                energy: state?.energy,
                boostActive: state?.boostActive,
                boostMultiplier: state?.boostMultiplier,
                selectedCharacterId: state?.selectedCharacterId,
                username: playerUsername,
                isAdmin: state?.isAdmin,
                iconsLoaded
              }, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
      
      {/* 🎆 ENHANCED CSS Animation for floating effects with transparency fade and rotation */}
      <style jsx>{`
        @keyframes enhanced-float-up {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
            filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.6));
          }
          25% {
            opacity: 1;
            transform: translate(-50%, -80px) scale(1.3) rotate(3deg);
            filter: drop-shadow(0 0 12px rgba(168, 85, 247, 0.8));
          }
          50% {
            opacity: 0.8;
            transform: translate(-50%, -140px) scale(1.1) rotate(-2deg);
            filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.6));
          }
          75% {
            opacity: 0.4;
            transform: translate(-50%, -200px) scale(0.9) rotate(1deg);
            filter: drop-shadow(0 0 6px rgba(168, 85, 247, 0.4));
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -260px) scale(0.7) rotate(0deg);
            filter: drop-shadow(0 0 0px rgba(168, 85, 247, 0));
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(168, 85, 247, 0.5), 0 0 50px rgba(236, 72, 153, 0.2);
          }
        }
        
        .character-frame {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        
        /* Loading shimmer for missing icons */
        .icon-loading {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}