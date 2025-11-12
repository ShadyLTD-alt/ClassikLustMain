import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { User, Crown, Zap, Flame, Image } from 'lucide-react';
import PlayerInfoMenu from './PlayerInfoMenu';
import CharacterSelectionMenu from './CharacterSelectionMenu';
import CharacterGalleryMenu from './CharacterGalleryMenu';
import BoostStatusMenu from './BoostStatusMenu';

export interface TopMenuConfig {
  id: string;
  component: React.ComponentType<{ isOpen: boolean; onClose: () => void; openMenu?: (menuId: string) => void }>;
  position: 'left' | 'center' | 'right';
  isVisible?: () => boolean;
}

const TOP_MENUS: TopMenuConfig[] = [
  { id: 'player-info', component: PlayerInfoMenu, position: 'left' },
  { id: 'character-selection', component: CharacterSelectionMenu, position: 'center' },
  { id: 'character-gallery', component: CharacterGalleryMenu, position: 'center' },
  { id: 'boost-status', component: BoostStatusMenu, position: 'right' }
];

interface Props {
  activeMenu: string | null;
  openMenu: (menuId: string) => void;
  closeMenu: () => void;
}

export default function TopMenuManager({ activeMenu, openMenu, closeMenu }: Props) {
  const { state } = useGame();
  
  return (
    <>
      {/* TOP NAV BAR - CROWN INCLUDED! */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-black/90 backdrop-blur border-b border-gray-700">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Player Info Button */}
            <button 
              onClick={() => openMenu('player-info')} 
              className="flex items-center gap-3 hover:bg-purple-600/10 px-3 py-2 rounded-lg transition-colors"
              title="Player Info Menu"
            >
              <User className="w-4 h-4 text-white" />
              <div className="text-left">
                <div className="text-purple-300 text-xs font-medium uppercase tracking-wide">LustPoints</div>
                <div 
                  className="text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-pink-500 bg-clip-text font-bold text-lg" 
                  style={{ textShadow: '0 0 20px rgba(168, 85, 247, 0.5)' }}
                >
                  {Math.round(state?.lustPoints || state?.points || 0).toLocaleString()}
                </div>
                <div className="text-emerald-300 text-xs font-medium uppercase tracking-wide mt-1">LustGems</div>
                <div 
                  className="text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-500 bg-clip-text font-semibold text-sm" 
                  style={{ textShadow: '0 0 15px rgba(52, 211, 153, 0.5)' }}
                >
                  💎 {Math.round(state?.lustGems || 0).toLocaleString()}
                </div>
              </div>
            </button>
            
            {/* Character Selection Button (Crown) */}
            <button 
              onClick={() => openMenu('character-selection')} 
              className="bg-purple-600/20 hover:bg-purple-600/40 px-2 py-2 rounded-full border border-purple-500/30 flex items-center justify-center transition-colors"
              title="Character Selection"
            >
              <Crown className="w-5 h-5 text-purple-400" />
            </button>
            
            {/* LP/HR Display */}
            <div className="text-center">
              <div className="text-purple-300 text-xs font-medium uppercase">LP/HR</div>
              <div className="text-white font-bold text-lg">
                {Math.round(state?.passiveIncomeRate || 0).toLocaleString()}
              </div>
            </div>
            
            {/* Energy & Boosters */}
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-purple-300 text-xs font-medium uppercase">Energy</div>
                <div className="text-white font-bold text-sm">
                  {Math.round(state?.energy || 0)}/{Math.round(state?.energyMax || 3300)}
                </div>
                <button 
                  onClick={() => openMenu('boost-status')} 
                  className="mt-1 flex items-center gap-1 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 px-2 py-0.5 rounded-full text-xs font-semibold border border-orange-400/30"
                >
                  <Flame className="w-3 h-3" />Boosters
                </button>
              </div>
              {state?.boostActive && (
                <div className="bg-orange-600/20 text-orange-300 px-3 py-1 rounded-full text-xs font-bold border border-orange-400/30 animate-pulse">
                  <Zap className="w-3 h-3 inline mr-1" />{state.boostMultiplier}x
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Render Active Top Menu */}
      {activeMenu && (() => { 
        const cfg = TOP_MENUS.find(m => m.id === activeMenu); 
        if (!cfg) return null; 
        const Comp = cfg.component; 
        return <Comp isOpen={true} onClose={closeMenu} openMenu={openMenu} />; 
      })()}
    </>
  );
}
