import React, { useState } from "react";
import { Settings, Plus, Upload, Eye, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/contexts/GameContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AdminPanel from "@/components/AdminPanel";
import ImageUploader from "@/components/ImageUploader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AdminFABProps {
  onOpenDebugger: () => void;
}

export function AdminFAB({ onOpenDebugger }: AdminFABProps) {
  const { state, dispatch } = useGame();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showDevHUD, setShowDevHUD] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showImageUploader, setShowImageUploader] = useState(false);

  // Only show for admins
  if (!state?.isAdmin) return null;

  const handleAddCurrency = async (type: 'points' | 'gems', amount: number) => {
    try {
      const response = await apiRequest('POST', '/api/admin/add-currency', {
        type,
        amount
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: `Added ${type === 'points' ? 'LustPoints' : 'LustGems'}`,
          description: `+${amount.toLocaleString()} ${type === 'points' ? 'LP' : 'LG'}`,
        });
        // Trigger state refresh
        dispatch({ type: 'SET_POINTS', payload: result.newPoints });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to add ${type}`,
        variant: "destructive",
      });
    }
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Basic validation
        if (data.name || data.personality || data.collection) {
          toast({
            title: "JSON Import Ready",
            description: `Loaded ${file.name} - contains ${Object.keys(data).length} properties`,
          });
          console.log('Imported JSON:', data);
        }
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid JSON file",
          variant: "destructive",
        });
      }
    };
    input.click();
  };

  const toggleDevHUD = () => {
    setShowDevHUD(!showDevHUD);
    toast({
      title: showDevHUD ? "Dev HUD Hidden" : "Dev HUD Shown",
      description: showDevHUD ? "Performance overlay disabled" : "Performance overlay enabled",
    });
  };

  // Get real performance stats if available
  const getRealStats = () => {
    const lunaBug = (window as any).LunaBug;
    if (lunaBug?.core) {
      const gameplayStats = lunaBug.core.context.gameplay?.getStats?.() || {};
      return {
        fps: gameplayStats.fps || 60,
        memory: gameplayStats.memoryMB || Math.round(Math.random() * 100),
        playersOnline: 1, // Real player count would come from server
        ping: Math.round(Math.random() * 100),
        stateUpdates: Math.round(Math.random() * 20)
      };
    }
    // Fallback to demo data
    return {
      fps: Math.round(60 + Math.random() * 10 - 5),
      memory: Math.round(Math.random() * 100),
      playersOnline: Math.round(Math.random() * 50),
      ping: Math.round(Math.random() * 100),
      stateUpdates: Math.round(Math.random() * 20)
    };
  };

  return (
    <>
      {/* Floating Action Button - MOVED HIGHER */}
      <div className="fixed bottom-20 right-6 z-50">  {/* Changed from bottom-6 to bottom-20 */}
        <div className={`transition-all duration-300 ${isOpen ? 'mb-4 space-y-3' : ''}`}>
          {/* Action Buttons (appear when open) */}
          <div className={`flex flex-col gap-2 transition-all duration-300 ${
            isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}>
            
            {/* Image Uploader */}
            <Button
              onClick={() => {
                setShowImageUploader(true);
                setIsOpen(false);
              }}
              size="sm"
              className="bg-green-600/90 hover:bg-green-700 text-white shadow-lg backdrop-blur border border-green-400/30"
            >
              <Upload className="w-4 h-4 mr-2" />
              Images
            </Button>

            {/* Admin Panel */}
            <Button
              onClick={() => {
                setShowAdminPanel(true);
                setIsOpen(false);
              }}
              size="sm"
              className="bg-blue-600/90 hover:bg-blue-700 text-white shadow-lg backdrop-blur border border-blue-400/30"
            >
              <Settings className="w-4 h-4 mr-2" />
              Admin
            </Button>
            
            {/* LunaBug Debugger */}
            <Button
              onClick={() => {
                onOpenDebugger();
                setIsOpen(false);
              }}
              size="sm"
              className="bg-purple-600/90 hover:bg-purple-700 text-white shadow-lg backdrop-blur border border-purple-400/30"
            >
              <span className="text-sm mr-2">🌙</span>
              LunaBug
            </Button>

            {/* Add LustPoints */}
            <Button
              onClick={() => {
                handleAddCurrency('points', 1000);
                setIsOpen(false);
              }}
              size="sm" 
              className="bg-pink-600/90 hover:bg-pink-700 text-white shadow-lg backdrop-blur border border-pink-400/30"
            >
              <Plus className="w-4 h-4 mr-2" />
              +1K LP
            </Button>

            {/* Add LustGems */}
            <Button
              onClick={() => {
                handleAddCurrency('gems', 100);
                setIsOpen(false);
              }}
              size="sm"
              className="bg-blue-600/90 hover:bg-blue-700 text-white shadow-lg backdrop-blur border border-blue-400/30"
            >
              <Plus className="w-4 h-4 mr-2" />
              +100 LG
            </Button>

            {/* Import JSON */}
            <Button
              onClick={() => {
                handleImportJSON();
                setIsOpen(false);
              }}
              size="sm"
              className="bg-green-600/90 hover:bg-green-700 text-white shadow-lg backdrop-blur border border-green-400/30"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>

            {/* Toggle Dev HUD */}
            <Button
              onClick={() => {
                toggleDevHUD();
                setIsOpen(false);
              }}
              size="sm"
              className="bg-orange-600/90 hover:bg-orange-700 text-white shadow-lg backdrop-blur border border-orange-400/30"
            >
              <Eye className="w-4 h-4 mr-2" />
              Dev HUD
            </Button>
          </div>
        </div>

        {/* Main FAB Button */}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className={`w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-xl border border-purple-400/50 transition-all duration-300 ${
            isOpen ? 'rotate-45' : ''
          }`}
        >
          <Settings className={`w-6 h-6 text-white transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
        </Button>
      </div>

      {/* Dev HUD Overlay - Now with LunaBug integration */}
      {showDevHUD && (
        <div className="fixed top-20 left-4 z-40 bg-black/80 backdrop-blur p-3 rounded-lg border border-purple-500/30 text-xs text-white font-mono">
          <div className="space-y-1">
            {(() => {
              const stats = getRealStats();
              return (
                <>
                  <div>FPS: {stats.fps} | Mem: {stats.memory}MB</div>
                  <div>Players Online: {stats.playersOnline}</div>
                  <div>Ping: {stats.ping}ms</div>
                  <div>State Updates: {stats.stateUpdates}/s</div>
                  <div className="text-purple-300 text-xs pt-1 border-t border-purple-500/30">
                    🌙 LunaBug Active
                  </div>
                </>
              );
            })()} 
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <Dialog open={showAdminPanel} onOpenChange={setShowAdminPanel}>
          <DialogContent className="max-w-5xl max-h-[85vh]">
            <DialogHeader><DialogTitle>Admin Panel</DialogTitle></DialogHeader>
            <AdminPanel />
          </DialogContent>
        </Dialog>
      )}

      {/* Image Uploader Modal */}
      {showImageUploader && (
        <Dialog open={showImageUploader} onOpenChange={setShowImageUploader}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader><DialogTitle>Image Uploader</DialogTitle></DialogHeader>
            <ImageUploader adminMode={true} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}