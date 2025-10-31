import { GameProvider } from '@/contexts/GameContext';
import StatsHeader from '../StatsHeader';

export default function StatsHeaderExample() {
  return (
    <GameProvider>
      <StatsHeader />
    </GameProvider>
  );
}
