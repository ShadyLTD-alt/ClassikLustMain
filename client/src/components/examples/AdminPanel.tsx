import { GameProvider, useGame } from '@/contexts/GameContext';
import AdminPanel from '../AdminPanel';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

function AdminPanelWithToggle() {
  const { toggleAdmin, state } = useGame();
  
  useEffect(() => {
    if (!state.isAdmin) {
      toggleAdmin();
    }
  }, []);

  return (
    <div className="p-8 space-y-4">
      <div className="flex gap-2">
        <Button onClick={toggleAdmin}>
          Toggle Admin: {state.isAdmin ? 'ON' : 'OFF'}
        </Button>
        <AdminPanel />
      </div>
    </div>
  );
}

export default function AdminPanelExample() {
  return (
    <GameProvider>
      <AdminPanelWithToggle />
    </GameProvider>
  );
}
