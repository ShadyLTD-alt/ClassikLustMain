import { GameProvider } from '@/contexts/GameContext';
import CharacterGallery from '../CharacterGallery';

export default function CharacterGalleryExample() {
  return (
    <GameProvider>
      <div className="p-8">
        <CharacterGallery />
      </div>
    </GameProvider>
  );
}
