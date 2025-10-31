import { GameProvider } from '@/contexts/GameContext';
import BottomNav from '../BottomNav';

export default function BottomNavExample() {
  return (
    <GameProvider>
      <div className="h-screen flex flex-col pb-20">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Content area</p>
        </div>
        <BottomNav />
      </div>
    </GameProvider>
  );
}
