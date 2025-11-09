import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Activity, Database, Zap, Trash2, RefreshCw } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export default function DevToolsCore() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Intercept console methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      addLog('info', args.join(' '));
      originalLog.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      addLog('warn', args.join(' '));
      originalWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
      addLog('error', args.join(' '));
      originalError.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const addLog = (level: 'info' | 'warn' | 'error', message: string) => {
    setLogs(prev => {
      const newLogs = [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message
      }];
      // Keep only last 100 logs
      return newLogs.slice(-100);
    });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = logs.filter(log => 
    filter === 'all' || log.level === filter
  );

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-900/20 border-red-500/30';
      case 'warn': return 'bg-yellow-900/20 border-yellow-500/30';
      case 'info': return 'bg-blue-900/20 border-blue-500/30';
      default: return 'bg-gray-800/50 border-gray-700/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-400" />
            Developer Tools
          </h3>
          <p className="text-sm text-gray-400">Debug console, performance monitor, and dev utilities</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Performance</span>
          </div>
          <p className="text-xl font-bold text-white">60 FPS</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Memory</span>
          </div>
          <p className="text-xl font-bold text-white">45 MB</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">API Calls</span>
          </div>
          <p className="text-xl font-bold text-white">{logs.length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-yellow-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400">Console Logs</span>
          </div>
          <p className="text-xl font-bold text-white">{logs.length}</p>
        </div>
      </div>

      {/* Console Controls */}
      <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All ({logs.length})
          </button>
          <button
            onClick={() => setFilter('info')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'info' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Info ({logs.filter(l => l.level === 'info').length})
          </button>
          <button
            onClick={() => setFilter('warn')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'warn' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Warnings ({logs.filter(l => l.level === 'warn').length})
          </button>
          <button
            onClick={() => setFilter('error')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'error' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Errors ({logs.filter(l => l.level === 'error').length})
          </button>
        </div>

        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            Auto-scroll
          </label>
          <button
            onClick={clearLogs}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Console Output */}
      <div className="bg-gray-950 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
        {filteredLogs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No logs to display. Console output will appear here.</p>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, idx) => (
              <div key={idx} className={`p-2 rounded border ${getLevelBg(log.level)}`}>
                <span className="text-gray-500 text-xs">[{log.timestamp}]</span>
                <span className={`ml-2 text-xs font-semibold ${getLevelColor(log.level)}`}>
                  [{log.level.toUpperCase()}]
                </span>
                <span className="ml-2 text-gray-300">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Quick Actions</h4>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => {
              localStorage.clear();
              alert('✅ Cache cleared! Reload page to reset.');
            }}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear Cache
          </button>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>
          <button
            onClick={() => {
              console.log('=== GAME STATE DUMP ===');
              console.log('LocalStorage:', localStorage);
              console.log('SessionStorage:', sessionStorage);
              console.log('Current URL:', window.location.href);
              alert('✅ State dumped to console!');
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center justify-center gap-2"
          >
            <Database className="w-4 h-4" />
            Dump State
          </button>
        </div>
      </div>
    </div>
  );
}