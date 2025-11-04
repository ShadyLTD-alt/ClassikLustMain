import React from 'react';

// Import all side menu plugins (when needed)
// import QuickActionsMenu from './QuickActionsMenu';
// import InventoryMenu from './InventoryMenu';

export interface SideMenuConfig {
  id: string;
  component: React.ComponentType<{ isOpen: boolean; onClose: () => void }>;
  position: 'left' | 'right';
  isVisible?: () => boolean;
}

// Side menu configuration - currently empty, ready for expansion
const SIDE_MENUS: SideMenuConfig[] = [
  // Future side menu items will go here
  // {
  //   id: 'quick-actions',
  //   component: QuickActionsMenu,
  //   position: 'left'
  // }
];

interface Props {
  activeMenu: string | null;
  openMenu: (menuId: string) => void;
  closeMenu: () => void;
}

export default function SideMenuManager({ activeMenu, openMenu, closeMenu }: Props) {
  // Currently no side menus, but structure is ready
  const visibleMenus = SIDE_MENUS.filter(menu => !menu.isVisible || menu.isVisible());
  
  if (visibleMenus.length === 0) {
    return null;
  }

  return (
    <>
      {/* Side menu bars would go here when needed */}
      
      {/* Render Active Side Menu */}
      {activeMenu && (() => {
        const menuConfig = SIDE_MENUS.find(m => m.id === activeMenu);
        if (!menuConfig) return null;
        
        const MenuComponent = menuConfig.component;
        return <MenuComponent isOpen={true} onClose={closeMenu} />;
      })()}
    </>
  );
}