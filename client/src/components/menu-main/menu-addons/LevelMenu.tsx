import React from 'react';
import LevelUp from '@/components/LevelUp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function LevelMenu({ isOpen, onClose }: Props) {
  return <LevelUp isOpen={isOpen} onClose={onClose} />;
}