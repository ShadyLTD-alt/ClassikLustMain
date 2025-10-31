import { useGame } from '@/contexts/GameContext';
import StatsHeader from '@/components/StatsHeader';
import CharacterDisplay from '@/components/CharacterDisplay';
import BottomNav from '@/components/BottomNav';
import AdminPanel from '@/components/AdminPanel';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';

export default function Game() {
  const { toggleAdmin, state } = useGame();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <StatsHeader />
      
      <div className="flex-1 flex flex-col overflow-hidden pb-20">
        <div className="p-4 border-b border-border flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAdmin}
            data-testid="button-toggle-admin"
          >
            Admin: {state.isAdmin ? 'ON' : 'OFF'}
          </Button>
          <AdminPanel />
          <ThemeToggle />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <CharacterDisplay />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
