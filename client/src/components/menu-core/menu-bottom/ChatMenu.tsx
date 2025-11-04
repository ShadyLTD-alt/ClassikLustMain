import React from 'react';
import ChatModal from '@/components/ChatModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatMenu({ isOpen, onClose }: Props) {
  return <ChatModal isOpen={isOpen} onClose={onClose} />;
}