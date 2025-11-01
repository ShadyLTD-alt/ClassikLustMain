
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, ExternalLink, Loader2 } from "lucide-react";

interface TelegramAuthProps {
  onAuth: (userData: any) => void;
}

export default function TelegramAuth({ onAuth }: TelegramAuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're running inside Telegram WebApp
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.initData) {
      tg.ready();
      handleTelegramAuth(tg.initData);
    }
  }, []);

  const handleTelegramAuth = async (initData: string) => {
    if (!initData) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });

      const data = await response.json();

      if (data.success && data.player) {
        onAuth(data.player);
      } else {
        setError(data.error || "Authentication failed");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <Button
        onClick={() => window.open("https://t.me/ClassikLust_Bot", "_blank")}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Authenticating...
          </>
        ) : (
          <>
            <Smartphone className="w-4 h-4 mr-2" />
            Login with Telegram
          </>
        )}
      </Button>
    </div>
  );
}
