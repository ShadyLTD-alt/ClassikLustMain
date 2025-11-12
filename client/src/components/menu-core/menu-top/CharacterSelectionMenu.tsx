import React from 'react';
import CharacterSelection from './character-ui/CharacterSelection';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  openMenu?: (menuId: string) => void;
}

export default function CharacterSelectionMenu({ isOpen, onClose, openMenu }: Props) {
  const handleClose = () => {
    onClose();
    // Optionally open character gallery after selection
    // if (openMenu) openMenu('character-gallery');
  };

  return <CharacterSelection isOpen={isOpen} onClose={handleClose} />;
}
