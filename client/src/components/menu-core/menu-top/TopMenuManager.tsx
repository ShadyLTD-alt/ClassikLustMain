import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Crown, Zap } from 'lucide-react';

// Import all top menu plugins
import PlayerInfoMenu from './PlayerInfoMenu';
import CharacterGalleryMenu from './CharacterGalleryMenu';
import BoostStatusMenu from './BoostStatusMenu';

export interface TopMenuConfig {
  id: string;
  component: React.ComponentType<{ isOpen: boolean; onClose: () => void }>;
  position: 'left' | 'center' | 'right';
  isVisible?: () => boolean;
}

// Top menu configuration
const TOP_MENUS: TopMenuConfig[] = [
  {
    id: 'player-info',
    component: PlayerInfoMenu,
    position: 'left'
  },
  {
    id: 'character-gallery',
    component: CharacterGalleryMenu,
    position: 'center'
  },
  {
    id: 'boost-status',
    component: BoostStatusMenu,
    position: 'right'
  }
];

interface Props {
  activeMenu: string | null;
  openMenu: (menuId: string) => void;
  closeMenu: () => void;
}

export default function TopMenuManager({ activeMenu, openMenu, closeMenu }: Props) {
  const { state } = useGame();
  const visibleMenus = TOP_MENUS.filter(menu => !menu.isVisible || menu.isVisible());
  
  if (visibleMenus.length === 0) {
    return null;
  }

  return (
    <>
      {/* Top Stats Bar */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-black/90 backdrop-blur border-b border-gray-700">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Player Info + LustPoints/Gems */}
            <button 
              onClick={() => openMenu('player-info')}
              className="flex items-center gap-3 hover:bg-purple-600/10 px-3 py-2 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                {/* LustPoints with original gradient styling */}
                <div className="text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-pink-500 bg-clip-text font-bold text-lg" 
                     style={{ textShadow: '0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(236, 72, 153, 0.3)' }}>
                  {Math.round(state?.lustPoints || state?.points || 0).toLocaleString()}
                </div>
                {/* LustGems underneath with same styling */}
                <div className="text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-500 bg-clip-text font-semibold text-sm -mt-1" 
                     style={{ textShadow: '0 0 15px rgba(52, 211, 153, 0.5), 0 0 30px rgba(34, 197, 94, 0.3)' }}>
                  💎 {Math.round(state?.lustGems || 0).toLocaleString()}
                </div>
              </div>
            </button>
            
            {/* Center: LP/HR */}
            <div className="text-center">
              <div className="text-purple-300 text-xs font-medium">LP/HR</div>
              <div className="text-white font-bold text-lg">{Math.round(state?.passiveIncomeRate || 0).toLocaleString()}</div>
            </div>
            
            {/* Right: Energy + Character Gallery + Boost */}
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-purple-300 text-xs font-medium">ENERGY</div>
                <div className="text-white font-bold text-sm">
                  {Math.round(state?.energy || 0)}/{Math.round(state?.energyMax || 3300)}
                </div>
              </div>
              
              <button 
                onClick={() => openMenu('character-gallery')}
                className="hover:bg-purple-600/10 px-2 py-1 rounded-lg transition-colors"
              >
                <Crown className="w-5 h-5 text-purple-400" />
              </button>
              
              {state?.boostActive && (
                <button 
                  onClick={() => openMenu('boost-status')}
                  className="flex items-center gap-1 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 px-3 py-1 rounded-full text-xs font-bold border border-orange-400/30 animate-pulse"
                >
                  <Zap className="w-3 h-3" />
                  {state.boostMultiplier}x
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Render Active Top Menu */}
      {activeMenu && (() => {
        const menuConfig = TOP_MENUS.find(m => m.id === activeMenu);
        if (!menuConfig) return null;
        
        const MenuComponent = menuConfig.component;
        return <MenuComponent isOpen={true} onClose={closeMenu} />;
      })()}
    </>
  );
}