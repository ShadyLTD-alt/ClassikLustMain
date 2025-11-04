import React from 'react';
import CharacterSelectionScrollable from '@/components/CharacterSelectionScrollable';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CharacterGalleryMenu({ isOpen, onClose }: Props) {
  return <CharacterSelectionScrollable isOpen={isOpen} onClose={onClose} />;
}