
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, ExternalLink, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TelegramAuthProps {
  onAuthSuccess: (user: any) => void;
}

export default function TelegramAuth({ onAuthSuccess }: TelegramAuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're running inside Telegram WebApp
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      handleTelegramAuth(tg.initData);
    }
  }, []);

  const handleTelegramAuth = async (initData: string) => {
    if (!initData) {
      setError("No Telegram data available");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/auth/telegram", { initData });
      const data = await response.json();

      if (data.success) {
        onAuthSuccess(data.user);
      } else {
        setError(data.error || "Authentication failed");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  // No mock login - require real Telegram authentication only

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2760%27 height=%2760%27 viewBox=%270 0 60 60%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27none%27 fill-rule=%27evenodd%27%3E%3Cg fill=%27%23ff69b4%27 fill-opacity=%270.05%27%3E%3Ccircle cx=%2730%27 cy=%2730%27 r=%272%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>

      <Card className="w-full max-w-md bg-gray-900/90 backdrop-blur-sm border-gray-700 relative z-10">
        <CardHeader className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 shadow-2xl flex items-center justify-center border-4 border-pink-400/50">
            <span className="text-3xl font-bold text-white">CL</span>
          </div>
          
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-400 bg-clip-text text-transparent">
            ClassikLust
          </CardTitle>
          
          <CardDescription className="text-white/70">
            🚀 Welcome to ClassikLust! 
            <br />Login with Telegram or continue as guest!
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-white/80">
              <Smartphone className="w-5 h-5" />
              <span>Connect via Telegram</span>
            </div>

            <p className="text-sm text-white/60">
              Start the game by opening it through our Telegram bot: 
              <br />
              <span className="font-mono bg-gray-800/50 px-2 py-1 rounded text-blue-400 mt-1 inline-block">
                @ClassikLust_Bot
              </span>
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => window.open("https://t.me/ClassikLust_Bot", "_blank")}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-lg py-3"
                disabled={isLoading}
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                🚀 Start with Telegram Bot
              </Button>

              <div className="text-center text-xs text-white/40">
                Telegram authentication required for full game access
              </div>
            </div>

            <div className="text-center py-3 border-t border-gray-700/50 mt-4">
              <p className="text-xs text-white/30">
                v2.0.0 - Secure Telegram Authentication
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
