import { useState } from "react";
import GameLayout from "@/components/GameLayout";
import { useGame } from "@/contexts/GameContext";
import CharacterSelector from "@/components/CharacterSelector";
import UpgradePanel from "@/components/UpgradePanel";
import LevelUp from "@/components/LevelUp";
import ChatModal from "@/components/ChatModal";

export default function GameInterfaceV2() {
  const { state, tap } = useGame();
  const [showCharacters, setShowCharacters] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showLevel, setShowLevel] = useState(false);
  const [showChat, setShowChat] = useState(false);

  return (
    <GameLayout
      onOpenCharacters={() => setShowCharacters(true)}
      onOpenUpgrades={() => setShowUpgrades(true)}
      onOpenLevel={() => setShowLevel(true)}
      onOpenChat={() => setShowChat(true)}
    >
      <div className="flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-2">Tap to earn points</div>
          <div
            className="w-72 h-72 mx-auto rounded-xl bg-gray-800/40 border-2 border-purple-500/30 flex items-center justify-center cursor-pointer hover:border-purple-400/50 transition-all active:scale-95 overflow-hidden"
            onClick={() => state.energy > 0 && tap()}
          >
            <div className="text-gray-400">
              <div className="text-6xl mb-2">👤</div>
              <div>No character selected</div>
            </div>
          </div>
        </div>
      </div>

      {showCharacters && <CharacterSelector isOpen={showCharacters} onClose={() => setShowCharacters(false)} />}
      {showUpgrades && <UpgradePanel isOpen={showUpgrades} onClose={() => setShowUpgrades(false)} />}
      {showLevel && <LevelUp isOpen={showLevel} onClose={() => setShowLevel(false)} />}
      {showChat && <ChatModal isOpen={showChat} onClose={() => setShowChat(false)} />}
    </GameLayout>
  );
}
