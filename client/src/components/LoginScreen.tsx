
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TelegramAuth from './TelegramAuth';

interface LoginScreenProps {
  onLogin: (userId: string, userData?: any) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const handleTelegramAuth = (player: any) => {
    console.log('Telegram auth successful:', player);
    onLogin(player.id, player);
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
        </CardContent>
      </Card>
    </div>
  );
}
