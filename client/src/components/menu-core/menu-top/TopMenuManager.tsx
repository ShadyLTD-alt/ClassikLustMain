import React from 'react';

// Import all top menu plugins (when needed)
// import NotificationMenu from './NotificationMenu';
// import UserMenu from './UserMenu';

export interface TopMenuConfig {
  id: string;
  component: React.ComponentType<{ isOpen: boolean; onClose: () => void }>;
  position: 'left' | 'center' | 'right';
  isVisible?: () => boolean;
}

// Top menu configuration - currently empty, ready for expansion
const TOP_MENUS: TopMenuConfig[] = [
  // Future top menu items will go here
  // {
  //   id: 'notifications',
  //   component: NotificationMenu,
  //   position: 'right'
  // }
];

interface Props {
  activeMenu: string | null;
  openMenu: (menuId: string) => void;
  closeMenu: () => void;
}

export default function TopMenuManager({ activeMenu, openMenu, closeMenu }: Props) {
  // Currently no top menus, but structure is ready
  const visibleMenus = TOP_MENUS.filter(menu => !menu.isVisible || menu.isVisible());
  
  if (visibleMenus.length === 0) {
    return null;
  }

  return (
    <>
      {/* Top menu bar would go here when needed */}
      
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