import { GameProvider } from '@/contexts/GameContext';
import CharacterDisplay from '../CharacterDisplay';

export default function CharacterDisplayExample() {
  return (
    <GameProvider>
      <div className="h-screen flex flex-col">
        <CharacterDisplay />
      </div>
    </GameProvider>
  );
}
