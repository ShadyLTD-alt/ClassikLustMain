import React from 'react';
import CharacterGallery from './character-ui/CharacterGallery';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CharacterGalleryMenu({ isOpen, onClose }: Props) {
  return <CharacterGallery isOpen={isOpen} onClose={onClose} />;
}
