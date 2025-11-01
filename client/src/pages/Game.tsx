import GameInterface from '@/components/GameInterface';

export default function Game() {
  console.log('🎮 [v3.0] Game component rendering');
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900">
      <GameInterface />
    </div>
  );
}