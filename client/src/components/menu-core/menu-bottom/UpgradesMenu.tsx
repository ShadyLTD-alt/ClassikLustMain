import React from 'react';
import UpgradePanel from '@/components/UpgradePanel';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradesMenu({ isOpen, onClose }: Props) {
  return <UpgradePanel isOpen={isOpen} onClose={onClose} />;
}