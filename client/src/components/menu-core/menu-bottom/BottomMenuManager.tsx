import React from 'react';
import { Badge } from '@/components/ui/badge';

// Import all bottom menu plugins
import UpgradesMenu from './UpgradesMenu';
import ChatMenu from './ChatMenu';
import LevelMenu from './LevelMenu';
import TasksMenu from './TasksMenu';

export interface BottomMenuConfig {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType<{ isOpen: boolean; onClose: () => void }>;
  getBadgeCount?: () => number;
  isVisible?: () => boolean;
}

// Bottom menu configuration - easy to add new menu items
const BOTTOM_MENUS: BottomMenuConfig[] = [
  {
    id: 'upgrades',
    label: 'Upgrades', 
    icon: '⬆️',
    component: UpgradesMenu
  },
  {
    id: 'chat',
    label: 'AI Chat',
    icon: '💬', 
    component: ChatMenu
  },
  {
    id: 'level',
    label: 'Level',
    icon: '📈',
    component: LevelMenu
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: '🏆',
    component: TasksMenu,
    getBadgeCount: () => {
      return (window as any).tasksBadgeCount || 0;
    }
  }
];

interface Props {
  activeMenu: string | null;
  openMenu: (menuId: string) => void;
  closeMenu: () => void;
}

export default function BottomMenuManager({ activeMenu, openMenu, closeMenu }: Props) {
  const getVisibleMenus = () => {
    return BOTTOM_MENUS.filter(menu => !menu.isVisible || menu.isVisible());
  };

  const visibleMenus = getVisibleMenus();
  const gridCols = `grid-cols-${visibleMenus.length}`;

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur border-t border-gray-700">
        <div className={`mx-auto max-w-5xl px-2 py-2 grid ${gridCols} gap-2`}>
          {visibleMenus.map((menu) => {
            const badgeCount = menu.getBadgeCount?.() || 0;
            
            return (
              <button
                key={menu.id}
                onClick={() => openMenu(menu.id)}
                className="flex flex-col items-center py-2 rounded hover:bg-purple-600/10 text-xs text-gray-300 relative"
              >
                <span className="text-sm">{menu.icon}</span>
                <span>{menu.label}</span>
                {badgeCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-red-500 text-white border-2 border-red-400 min-w-[20px] h-5 rounded-full p-0 flex items-center justify-center text-xs font-bold">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Render Active Bottom Menu */}
      {activeMenu && (() => {
        const menuConfig = BOTTOM_MENUS.find(m => m.id === activeMenu);
        if (!menuConfig) return null;
        
        const MenuComponent = menuConfig.component;
        return <MenuComponent isOpen={true} onClose={closeMenu} />;
      })()}
    </>
  );
}