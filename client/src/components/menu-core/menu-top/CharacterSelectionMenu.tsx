import React from 'react';
import CharacterSelection from './character-ui/CharacterSelection';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  openMenu?: (menuId: string) => void;
}

export default function CharacterSelectionMenu({ isOpen, onClose, openMenu }: Props) {
  return <CharacterSelection isOpen={isOpen} onClose={onClose} openMenu={openMenu} />;
}
