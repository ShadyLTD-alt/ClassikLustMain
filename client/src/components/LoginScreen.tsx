
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import TelegramAuth from './TelegramAuth';
import { useState } from 'react';
import { Loader2, User } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (sessionToken: string, playerData: any) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [devUsername, setDevUsername] = useState('');
  const [isDevLoading, setIsDevLoading] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);
  const isDev = import.meta.env.DEV;

  const handleTelegramAuth = (sessionToken: string, player: any) => {
    console.log('Telegram auth successful:', player);
    onLogin(sessionToken, player);
  };

  const handleDevLogin = async () => {
    if (!devUsername.trim()) {
      setDevError('Please enter a username');
      return;
    }

    setIsDevLoading(true);
    setDevError(null);

    try {
      const response = await fetch('/api/auth/dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: devUsername }),
      });

      const data = await response.json();

      if (data.success && data.player && data.sessionToken) {
        console.log('✅ Dev login successful');
        onLogin(data.sessionToken, data.player);
      } else {
        setDevError(data.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Dev login error:', error);
      setDevError(error.message || 'Login failed');
    } finally {
      setIsDevLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center p-4">
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
            Welcome! Choose your login method to start playing
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <TelegramAuth onAuth={handleTelegramAuth} />
            <p className="text-xs text-gray-400 text-center">
              Login with Telegram to play. Your progress will be saved to the cloud.
            </p>
          </div>

          {isDev && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gray-900 px-2 text-gray-400">Or for testing</span>
                </div>
              </div>

              <div className="space-y-3">
                {devError && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{devError}</p>
                  </div>
                )}
                
                <Input
                  data-testid="input-dev-username"
                  type="text"
                  placeholder="Enter username for testing"
                  value={devUsername}
                  onChange={(e) => setDevUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDevLogin()}
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                  disabled={isDevLoading}
                />
                
                <Button
                  data-testid="button-dev-login"
                  onClick={handleDevLogin}
                  className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800"
                  disabled={isDevLoading || !devUsername.trim()}
                >
                  {isDevLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4 mr-2" />
                      Dev Login
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-gray-500 text-center">
                  Development mode only - for testing without Telegram
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
