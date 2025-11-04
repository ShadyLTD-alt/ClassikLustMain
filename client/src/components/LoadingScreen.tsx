import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameDiagnostics } from '@/utils/diagnostics';

interface LoadingScreenProps {
  message?: string;
  progress?: number;
  error?: string | null;
}

export default function LoadingScreen({ message = 'Loading game...', progress = 0, error }: LoadingScreenProps) {
  const [loadingTime, setLoadingTime] = useState(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  
  // 🔧 ANTI-HANG: Track loading time and offer recovery options
  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setLoadingTime(elapsed);
      
      // Show diagnostics option if loading takes too long
      if (elapsed > 10 && !showDiagnostics) {
        console.warn(`⚠️ [LOADING] Taking longer than expected (${elapsed}s)`);
        setShowDiagnostics(true);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [showDiagnostics]);
  
  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const results = await GameDiagnostics.runHealthCheck();
      setDiagnosticResults(results);
      
      // Auto-refresh if too many errors
      if (results.errors.length > 2) {
        console.warn('🚑 [LOADING] Multiple errors detected - will force refresh in 5s');
        setTimeout(() => {
          GameDiagnostics.forceRefresh();
        }, 5000);
      }
    } catch (error) {
      console.error('❌ [LOADING] Diagnostics failed:', error);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };
  
  const forceRefresh = () => {
    console.log('🔄 [LOADING] Force refresh triggered');
    GameDiagnostics.forceRefresh();
  };
  
  const clearCacheAndReload = () => {
    console.log('🧹 [LOADING] Clearing cache and reloading');
    
    // Keep only essential data
    const sessionToken = localStorage.getItem('sessionToken');
    localStorage.clear();
    
    if (sessionToken) {
      localStorage.setItem('sessionToken', sessionToken);
    }
    
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full space-y-6">
        {/* Loading Animation */}
        <div className="mb-8">
          <div className="relative mx-auto w-20 h-20">
            {error ? (
              <AlertTriangle className="w-20 h-20 text-red-400" />
            ) : (
              <Loader2 className="w-20 h-20 text-purple-400 animate-spin" />
            )}
            
            {/* Progress Ring */}
            {progress > 0 && !error && (
              <svg className="absolute inset-0 w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-purple-600/30"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                  className="text-purple-400 transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">
            {error ? '❌ Loading Failed' : '🌙 ClassikLust'}
          </h2>
          <p className="text-purple-200">
            {error || message}
          </p>
          
          {progress > 0 && !error && (
            <p className="text-sm text-purple-300">
              {progress}% complete
            </p>
          )}
          
          {loadingTime > 5 && !error && (
            <p className="text-xs text-yellow-400">
              Loading for {loadingTime}s...
            </p>
          )}
        </div>

        {/* Error Actions */}
        {error && (
          <div className="space-y-3">
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-left">
              <h3 className="font-semibold text-red-400 mb-2">🔍 Error Details:</h3>
              <p className="text-sm text-red-200">{error}</p>
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.reload()} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
              <Button onClick={clearCacheAndReload} variant="secondary">
                🧹 Clear Cache
              </Button>
            </div>
          </div>
        )}

        {/* Diagnostics Panel */}
        {showDiagnostics && !error && (
          <div className="space-y-3">
            <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <h3 className="font-semibold text-yellow-400 mb-2">⚠️ Loading slowly...</h3>
              <p className="text-sm text-yellow-200 mb-3">
                The game is taking longer than usual to load. This might be due to:
              </p>
              <ul className="text-xs text-yellow-200 space-y-1 text-left">
                <li>• Server overloaded or restarting</li>
                <li>• Network connection issues</li>
                <li>• Large game data being loaded</li>
                <li>• Authentication problems</li>
              </ul>
            </div>
            
            <div className="flex gap-2 justify-center flex-wrap">
              <Button 
                onClick={runDiagnostics} 
                disabled={isRunningDiagnostics}
                variant="outline"
                size="sm"
              >
                {isRunningDiagnostics ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Bug className="w-4 h-4 mr-2" />
                    Run Diagnostics
                  </>
                )}
              </Button>
              
              <Button onClick={forceRefresh} variant="secondary" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Force Refresh
              </Button>
              
              <Button onClick={clearCacheAndReload} variant="destructive" size="sm">
                🧹 Reset App
              </Button>
            </div>
          </div>
        )}

        {/* Diagnostic Results */}
        {diagnosticResults && (
          <div className="mt-4 p-4 bg-gray-900/50 border border-gray-600/30 rounded-lg text-left">
            <h3 className="font-semibold text-blue-400 mb-3">📊 Diagnostic Results:</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Server:</span>
                <span className={diagnosticResults.serverConnection ? 'text-green-400' : 'text-red-400'}>
                  {diagnosticResults.serverConnection ? '✅ Connected' : '❌ Failed'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-300">Authentication:</span>
                <span className={diagnosticResults.playerData ? 'text-green-400' : 'text-red-400'}>
                  {diagnosticResults.playerData ? '✅ Valid' : '❌ Invalid'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-300">Config Loaded:</span>
                <span className="text-blue-400">
                  {Object.values(diagnosticResults.gameConfig).filter((c: any) => c.status === 'ok').length}/4 OK
                </span>
              </div>
              
              {diagnosticResults.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <p className="text-red-400 font-semibold text-xs mb-2">❌ Issues Found:</p>
                  {diagnosticResults.errors.slice(0, 3).map((error: string, i: number) => (
                    <p key={i} className="text-xs text-red-300">• {error}</p>
                  ))}
                  {diagnosticResults.errors.length > 3 && (
                    <p className="text-xs text-gray-400">...and {diagnosticResults.errors.length - 3} more</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Tips */}
        {loadingTime > 3 && !error && !showDiagnostics && (
          <div className="text-xs text-gray-400 space-y-1">
            <p>✨ Loading game data...</p>
            <p>This may take a moment on first load</p>
          </div>
        )}
        
        {loadingTime > 20 && (
          <div className="text-xs text-orange-400">
            <p>⏱️ Still loading after {loadingTime}s...</p>
            <p>If this continues, try refreshing the page</p>
          </div>
        )}
      </div>
    </div>
  );
}