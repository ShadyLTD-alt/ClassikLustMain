import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";

// Import all menu addons
import UpgradeMenu from '@/components/menu-main/menu-addons/UpgradeMenu';
import LevelMenu from '@/components/menu-main/menu-addons/LevelMenu';
import ChatMenu from '@/components/menu-main/menu-addons/ChatMenu';
import TasksMenu from '@/components/menu-main/menu-addons/TasksMenu';

export interface MenuItemConfig {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType<{ isOpen: boolean; onClose: () => void }>;
  getBadgeCount?: () => number;
  isVisible?: () => boolean;
}

// Menu configuration - easy to add/remove menu items
const MENU_ITEMS: MenuItemConfig[] = [
  {
    id: 'upgrades',
    label: 'Upgrades', 
    icon: '⬆️',
    component: UpgradeMenu
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
      // Will be implemented by TasksMenu to show claimable rewards
      return (window as any).tasksBadgeCount || 0;
    }
  }
];

export default function MenuCore() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const openMenu = (menuId: string) => setActiveMenu(menuId);
  const closeMenu = () => setActiveMenu(null);

  const getVisibleMenus = () => {
    return MENU_ITEMS.filter(menu => !menu.isVisible || menu.isVisible());
  };

  const visibleMenus = getVisibleMenus();
  const gridCols = visibleMenus.length === 3 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <>
      {/* Bottom Navigation */}
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

      {/* Render Active Menu */}
      {activeMenu && (() => {
        const menuConfig = MENU_ITEMS.find(m => m.id === activeMenu);
        if (!menuConfig) return null;
        
        const MenuComponent = menuConfig.component;
        return <MenuComponent isOpen={true} onClose={closeMenu} />;
      })()}
    </>
  );
}