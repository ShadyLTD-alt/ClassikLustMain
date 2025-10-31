import { GameProvider } from '@/contexts/GameContext';
import ImageUploader from '../ImageUploader';

export default function ImageUploaderExample() {
  return (
    <GameProvider>
      <div className="p-8">
        <ImageUploader />
      </div>
    </GameProvider>
  );
}
