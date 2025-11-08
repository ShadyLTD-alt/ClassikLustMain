This is for the new modularized admin menu.

Please create a "adminmenu-core" plugin that will serve as the front end UI (just like menu-core/MenuCore.tsx), which will serve as the core UI handler for the modular admin menu tabs.

Each directory -
*characters
*upgrades
*levelup
*tasks
*achievements
*imageuploader

Will have its own create/edit functions and UI that will will be plugged into the core UI. This will allow us to create additional menus without having to edit a bunch of different files and keeps everything separated and organized.

