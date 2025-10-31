import { GameProvider } from '@/contexts/GameContext';
import UpgradePanel from '../UpgradePanel';

export default function UpgradePanelExample() {
  return (
    <GameProvider>
      <div className="h-screen">
        <UpgradePanel />
      </div>
    </GameProvider>
  );
}
