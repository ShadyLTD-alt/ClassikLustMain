import { useGame } from '@/contexts/GameContext';
import StatsHeader from '@/components/StatsHeader';
import CharacterDisplay from '@/components/CharacterDisplay';
import UpgradePanel from '@/components/UpgradePanel';
import CharacterGallery from '@/components/CharacterGallery';
import ImageUploader from '@/components/ImageUploader';
import AdminPanel from '@/components/AdminPanel';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';

export default function Game() {
  const { toggleAdmin, state } = useGame();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <StatsHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <CharacterGallery />
              <ImageUploader />
            </div>
            <div className="flex gap-2">
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
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <CharacterDisplay />
          </div>
        </div>

        <div className="w-96 flex-shrink-0">
          <UpgradePanel />
        </div>
      </div>
    </div>
  );
}
