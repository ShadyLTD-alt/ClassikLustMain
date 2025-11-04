import React, { useState } from 'react';

// Import section managers
import BottomMenuManager from './menu-bottom/BottomMenuManager';
import TopMenuManager from './menu-top/TopMenuManager';
import SideMenuManager from './menu-side/SideMenuManager';

/**
 * MenuCore - Central menu management system
 * Coordinates all menu sections: bottom, top, side
 */
export default function MenuCore() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const openMenu = (menuId: string) => setActiveMenu(menuId);
  const closeMenu = () => setActiveMenu(null);

  return (
    <>
      {/* Bottom Menu Section */}
      <BottomMenuManager activeMenu={activeMenu} openMenu={openMenu} closeMenu={closeMenu} />
      
      {/* Top Menu Section */}
      <TopMenuManager activeMenu={activeMenu} openMenu={openMenu} closeMenu={closeMenu} />
      
      {/* Side Menu Section */}
      <SideMenuManager activeMenu={activeMenu} openMenu={openMenu} closeMenu={closeMenu} />
    </>
  );
}