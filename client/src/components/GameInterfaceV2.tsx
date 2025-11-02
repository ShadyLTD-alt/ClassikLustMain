import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import GameLayout from "@/components/GameLayout";
import { useGame } from "@/contexts/GameContext";
import CharacterSelector from "@/components/CharacterSelector";
import UpgradePanel from "@/components/UpgradePanel";
import LevelUp from "@/components/LevelUp";
import ChatModal from "@/components/ChatModal";
import { apiRequest } from "@/lib/queryClient";
import { User, Crown, Shield, Settings, Sparkles, Database, Upload, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GameInterfaceV2() {
  const { state } = useGame();
  const [showCharacters, setShowCharacters] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showLevel, setShowLevel] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [tapEffects, setTapEffects] = useState<Array<{id: string, x: number, y: number, value: number}>>([]);
  const [showAdmin, setShowAdmin] = useState(false);

  // Fetch current character data
  const { data: currentCharacter } = useQuery({
    queryKey: ['/api/characters', state?.selectedCharacterId],
    queryFn: async () => {
      if (!state?.selectedCharacterId) return null;
      const response = await apiRequest('GET', `/api/characters/${state.selectedCharacterId}`);
      return await response.json();
    },
    enabled: !!state?.selectedCharacterId,
  });

  const getCharacterImage = () => {
    if (state?.displayImage) return state.displayImage;
    if (currentCharacter?.defaultImage) return currentCharacter.defaultImage;
    return null;
  };

  const characterImage = getCharacterImage();

  return (
    <GameLayout
      onOpenCharacters={() => setShowCharacters(true)}
      onOpenUpgrades={() => setShowUpgrades(true)}
      onOpenLevel={() => setShowLevel(true)}
      onOpenChat={() => setShowChat(true)}
    >
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center relative">
          <div className="text-sm text-gray-400 mb-4">Tap to earn points!</div>
          
          <div className="relative">
            {/* Character Display Area */}
            <div
              className="w-80 h-80 mx-auto rounded-2xl bg-gradient-to-br from-purple-800/40 via-black/50 to-pink-800/40 border-2 border-purple-500/40 flex items-center justify-center cursor-pointer hover:border-purple-400/60 transition-all active:scale-[0.98] overflow-hidden relative group"
              style={{
                boxShadow: '0 8px 32px rgba(168, 85, 247, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              {/* Ripple effect overlay */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-purple-400/10 opacity-0 group-active:opacity-100 transition-opacity duration-150" />
              </div>
              
              {/* Character Image */}
              {characterImage ? (
                <img
                  src={characterImage}
                  alt={currentCharacter?.name || 'Character'}
                  className="w-full h-full object-cover rounded-2xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/uploads/placeholder-character.jpg';
                  }}
                />
              ) : (
                <div className="text-gray-400 text-center p-8">
                  <User className="w-20 h-20 mx-auto mb-4 opacity-50" />
                  <div className="text-lg mb-2">No character selected</div>
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCharacters(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 mt-4"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Select Character
                  </Button>
                </div>
              )}
              
              {/* Character name overlay */}
              {currentCharacter && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-400/30">
                  <div className="text-white font-semibold text-lg flex items-center justify-between">
                    <span>{currentCharacter.name}</span>
                    {/* Tiny admin chip when isAdmin */}
                    {state?.isAdmin && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">Admin</span>
                    )}
                  </div>
                  <div className="text-purple-300 text-sm">Level {state?.level} • Tap to interact</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Energy line removed per request */}
        </div>

        {/* Admin FAB - visible only for admins */}
        {state?.isAdmin && (
          <button
            onClick={() => setShowAdmin(true)}
            className="fixed bottom-24 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 text-white shadow-xl border border-yellow-300/20 hover:scale-105 active:scale-95 transition-transform"
            title="Admin Tools"
          >
            <Shield className="w-6 h-6 mx-auto" />
          </button>
        )}
      </div>

      {/* Simple Admin Panel */}
      {showAdmin && state?.isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAdmin(false)}>
          <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-yellow-400" />
                <div>
                  <div className="text-white font-bold">Admin Tools</div>
                  <div className="text-xs text-gray-400">Quick maintenance panel</div>
                </div>
              </div>
              <button className="text-gray-400 hover:text-white" onClick={() => setShowAdmin(false)}>✕</button>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <AdminCard icon={<Sparkles className="w-5 h-5" />} title="Give 1K LP" desc="Quick test LP grant" onClick={async ()=>{
                const newLP = (state?.lustPoints || 0) + 1000;
                try {
                  await fetch('/api/player/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lustPoints: newLP }) });
                  alert('Granted 1,000 LP');
                } catch { alert('Failed to grant LP'); }
              }} />
              <AdminCard icon={<Database className="w-5 h-5" />} title="Save Now" desc="Force save player data" onClick={async()=>{
                try { await fetch('/api/player/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ forceSave: true }) }); alert('Saved'); } catch { alert('Save failed'); }
              }} />
              <AdminCard icon={<Upload className="w-5 h-5" />} title="Media Manager" desc="Open uploader" onClick={()=>{
                window.location.href = '/admin/media';
              }} />
              <AdminCard icon={<Settings className="w-5 h-5" />} title="Reload Config" desc="Reload game data JSON" onClick={async()=>{
                try { await fetch('/api/admin/reload', { method: 'POST' }); alert('Reload triggered'); } catch { alert('Reload failed'); }
              }} />
              <AdminCard icon={<Bug className="w-5 h-5" />} title="LunaBug Panel" desc="Open debugger" onClick={()=>{
                (window as any).LunaBug?.emergency?.();
                alert('LunaBug status: '+JSON.stringify((window as any).LunaBug?.status?.()))
              }} />
            </div>
            <div className="p-3 border-t border-gray-700 text-xs text-gray-500 text-center">Admin tools are visible only to admins</div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCharacters && <CharacterSelector isOpen={showCharacters} onClose={() => setShowCharacters(false)} />}
      {showUpgrades && <UpgradePanel isOpen={showUpgrades} onClose={() => setShowUpgrades(false)} />}
      {showLevel && <LevelUp isOpen={showLevel} onClose={() => setShowLevel(false)} />}
      {showChat && <ChatModal isOpen={showChat} onClose={() => setShowChat(false)} />}
      
    </GameLayout>
  );
}

function AdminCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: ()=>void }){
  return (
    <button onClick={onClick} className="bg-gray-800/60 hover:bg-gray-800 border border-gray-700 rounded-xl p-4 text-left transition-colors">
      <div className="flex items-center gap-3 mb-2 text-white font-semibold">{icon}<span>{title}</span></div>
      <div className="text-xs text-gray-400">{desc}</div>
    </button>
  );
}
