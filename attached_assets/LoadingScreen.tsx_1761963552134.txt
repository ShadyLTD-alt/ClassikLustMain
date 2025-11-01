
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

interface LoadingScreenProps {
  progress: number;
}

export function LoadingScreen({ progress }: LoadingScreenProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);

    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2760%27 height=%2760%27 viewBox=%270 0 60 60%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27none%27 fill-rule=%27evenodd%27%3E%3Cg fill=%27%23ff69b4%27 fill-opacity=%270.05%27%3E%3Ccircle cx=%2730%27 cy=%2730%27 r=%272%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      
      {/* Game Logo */}
      <div className="relative z-10 mb-8 text-center">
        <div className="w-32 h-32 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 shadow-2xl flex items-center justify-center border-4 border-pink-400/50">
          <span className="text-4xl font-bold text-white">CL</span>
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-400 bg-clip-text text-transparent mb-4">
          ClassikLust
        </h1>
        <p className="text-white/80 text-lg mb-2">
          🚀 New Auto-Authentication
        </p>
        <p className="text-white/60 text-sm">
          Feature! Click /start in Telegram
        </p>
        <p className="text-white/60 text-sm mb-8">
          for instant login!
        </p>
        <p className="text-white/80 text-sm">
          v2.0.0
        </p>
      </div>

      {/* Loading Progress */}
      <div className="relative z-10 w-80 max-w-sm mx-auto mb-6">
        <Progress 
          value={displayProgress} 
          className="h-2 bg-gray-800/50" 
        />
        <div className="text-center mt-4 text-white/70 text-sm">
          Loading user data... {Math.round(displayProgress)}%
        </div>
      </div>

      {/* Animated Loading Dots */}
      <div className="flex space-x-2 mb-8">
        <div className="w-3 h-3 bg-pink-500 rounded-full animate-pulse"></div>
        <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse delay-100"></div>
        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse delay-200"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-4 h-4 bg-pink-400/30 rounded-full animate-bounce delay-300"></div>
      <div className="absolute top-32 right-32 w-6 h-6 bg-purple-400/30 rounded-full animate-bounce delay-700"></div>
      <div className="absolute bottom-20 left-32 w-5 h-5 bg-indigo-400/30 rounded-full animate-bounce delay-500"></div>
      <div className="absolute bottom-32 right-20 w-3 h-3 bg-pink-400/30 rounded-full animate-bounce delay-900"></div>
    </div>
  );
}
