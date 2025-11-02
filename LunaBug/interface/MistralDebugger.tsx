/**
 * LunaBug/interface/MistralDebugger.tsx
 * Last Edited: 2025-11-02 by Steven
 *
 * LunaBug: STANDALONE AI-powered debugging interface
 * - Independent of GameContext 
 * - Boots before main game systems
 * - Emergency mode when React/Game crashes
 * - Progressive enhancement with game integration
 */

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";

interface DebugRequest {
  language: string;
  debugType: string;
  code: string;
  error?: string;
  context?: string;
}

interface DebugResponse {
  analysis: string;
  suggestions: string[];
  codeSnippet?: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
}

interface DebugHistoryEntry {
  timestamp: string;
  language: string;
  debugType: string;
  code: string;
  error?: string;
  context?: string;
  result: DebugResponse;
}

interface MistralDebuggerProps {
  isOpen: boolean;
  onClose: () => void;
}

// LunaBug Global State (independent of GameContext)
class LunaBugCore {
  private static instance: LunaBugCore;
  private logs: Array<any> = [];
  private isInitialized: boolean = false;

  static getInstance(): LunaBugCore {
    if (!LunaBugCore.instance) {
      LunaBugCore.instance = new LunaBugCore();
    }
    return LunaBugCore.instance;
  }

  init() {
    if (this.isInitialized) return;
    console.log('🌙 LunaBug Core initializing...');
    
    // Global error capture
    window.addEventListener('error', (event) => {
      this.logEvent('global_error', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack
      });
    });

    // Unhandled promise rejection capture
    window.addEventListener('unhandledrejection', (event) => {
      this.logEvent('unhandled_rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });

    // Expose global access for emergency debugging
    (window as any).LunaBug = {
      logs: () => this.logs,
      emergency: () => this.openEmergencyMode(),
      clear: () => this.clearLogs()
    };

    this.isInitialized = true;
    console.log('🌙 LunaBug Core initialized - Standing by...');
  }

  logEvent(eventType: string, payload: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      eventType,
      payload,
      source: 'lunabug_core'
    };
    
    this.logs.push(entry);
    
    // Keep last 1000 entries in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    // Persist to localStorage
    try {
      const persistent = JSON.parse(localStorage.getItem("lunabug_core_logs") || "[]");
      localStorage.setItem("lunabug_core_logs", JSON.stringify([...persistent.slice(-999), entry]));
    } catch (err) {
      console.warn("LunaBug: Failed to persist log:", err);
    }

    // Console output with LunaBug branding
    console.log(`🌙 [LunaBug] ${eventType}:`, payload);
  }

  openEmergencyMode() {
    console.log('🚨 LunaBug Emergency Mode Activated!');
    // Create emergency overlay if React is broken
    const emergency = document.createElement('div');
    emergency.innerHTML = `
      <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);color:white;z-index:999999;padding:20px;font-family:monospace;">
        <h2>🌙 LunaBug Emergency Mode</h2>
        <p>React appears to be crashed. Emergency debugging active.</p>
        <pre>${JSON.stringify(this.logs.slice(-10), null, 2)}</pre>
      </div>
    `;
    document.body.appendChild(emergency);
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem("lunabug_core_logs");
    console.log('🌙 LunaBug logs cleared');
  }
}

export function MistralDebugger({ isOpen, onClose }: MistralDebuggerProps) {
  const lunaBug = LunaBugCore.getInstance();
  const [messages, setMessages] = useState<Array<{ type: 'user' | 'assistant'; content: string; timestamp: Date }>>([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [debugType, setDebugType] = useState('general');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [context, setContext] = useState('');
  const [assistance, setAssistance] = useState<DebugResponse | null>(null);
  const [historyEntries, setHistoryEntries] = useState<DebugHistoryEntry[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize LunaBug Core on mount
  useEffect(() => {
    lunaBug.init();
  }, []);

  // Load debug history from localStorage on mount
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem("lunabug_debug_history") || "[]");
      setHistoryEntries(history.slice(-10));
    } catch (err) {
      lunaBug.logEvent('history_load_error', err);
    }
  }, []);

  // LunaBug local memory cache function
  const saveToDebugCache = (data: DebugResponse) => {
    try {
      const history = JSON.parse(localStorage.getItem("lunabug_debug_history") || "[]");
      const newEntry: DebugHistoryEntry = {
        timestamp: new Date().toISOString(),
        language,
        debugType,
        code,
        error,
        context,
        result: data,
      };
      localStorage.setItem("lunabug_debug_history", JSON.stringify([...history.slice(-99), newEntry]));
      setHistoryEntries(prev => [...prev.slice(-9), newEntry]);
      
      // Log to LunaBug Core
      lunaBug.logEvent('debug_session', {
        language,
        debugType,
        analysis: data.analysis,
        confidence: data.confidence,
        severity: data.severity
      });
    } catch (err) {
      lunaBug.logEvent('cache_save_error', err);
    }
  };

  // Safe API request (works even if game APIs are down)
  const safeMistralRequest = async (endpoint: string, data: any) => {
    try {
      const response = await fetch(`/api/lunabug${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        // Fallback to main API if LunaBug API not ready
        const fallbackResponse = await fetch(`/api/mistral${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        return await fallbackResponse.json();
      }
      
      return await response.json();
    } catch (err) {
      lunaBug.logEvent('api_error', { endpoint, error: err });
      throw err;
    }
  };

  const debugMutation = useMutation({
    mutationFn: async (request: DebugRequest) => {
      return await safeMistralRequest('/debug', request);
    },
    onSuccess: (data) => {
      setAssistance(data);
      saveToDebugCache(data);
      
      // Toast alternative if game toast system is down
      lunaBug.logEvent('debug_success', {
        confidence: data.confidence,
        severity: data.severity
      });
    },
    onError: (error) => {
      lunaBug.logEvent('debug_error', error);
    }
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      return await safeMistralRequest('/chat', { message });
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, 
        { type: 'assistant', content: data.response, timestamp: new Date() }
      ]);
      lunaBug.logEvent('chat_response', { response: data.response });
    },
    onError: (error) => {
      lunaBug.logEvent('chat_error', error);
    }
  });

  const handleDebugSubmit = () => {
    if (!code.trim()) {
      lunaBug.logEvent('debug_validation_error', 'Missing code input');
      return;
    }

    lunaBug.logEvent('debug_request', { language, debugType, codeLength: code.length });
    
    debugMutation.mutate({
      language,
      debugType,
      code,
      error: error || undefined,
      context: context || undefined,
    });
  };

  const handleChatSubmit = () => {
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, 
      { type: 'user', content: input, timestamp: new Date() }
    ]);
    
    lunaBug.logEvent('chat_message', input);
    chatMutation.mutate(input);
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[90vh] bg-gray-900/95 backdrop-blur-lg text-white border border-purple-500/50 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                🌙 LunaBug Debugger
              </h2>
              <p className="text-gray-400 text-sm">
                Standalone AI debugging system - Independent of game state
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
          {/* Debug Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-black/40 border border-gray-600 rounded p-2 text-white"
                >
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                  <option value="react">React</option>
                  <option value="sql">SQL</option>
                  <option value="css">CSS</option>
                </select>
                
                <select 
                  value={debugType} 
                  onChange={(e) => setDebugType(e.target.value)}
                  className="bg-black/40 border border-gray-600 rounded p-2 text-white"
                >
                  <option value="general">General</option>
                  <option value="performance">Performance</option>
                  <option value="logic">Logic Error</option>
                  <option value="ui">UI/UX</option>
                  <option value="database">Database</option>
                  <option value="api">API</option>
                </select>
              </div>

              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your code here..."
                className="w-full h-32 bg-black/40 border border-gray-600 rounded p-3 text-green-400 font-mono text-sm resize-none"
              />

              <textarea
                value={error}
                onChange={(e) => setError(e.target.value)}
                placeholder="Error message (optional)..."
                className="w-full h-20 bg-black/40 border border-gray-600 rounded p-3 text-red-400 font-mono text-sm resize-none"
              />

              <button
                onClick={handleDebugSubmit}
                disabled={debugMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {debugMutation.isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    🌙 LunaBug Analyzing...
                  </div>
                ) : (
                  "🌙 Ask LunaBug"
                )}
              </button>
            </div>

            {/* Results Section */}
            <div className="space-y-4">
              {assistance && (
                <div className="bg-black/40 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-purple-300 font-semibold">🌙 LunaBug's Analysis</h3>
                    <div className="text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded">
                      {assistance.severity} | {Math.round(assistance.confidence * 100)}%
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="text-purple-300 text-sm font-medium mb-1">Analysis</div>
                      <div className="bg-black/60 p-3 rounded border border-gray-600 text-gray-200 text-sm">
                        {assistance.analysis}
                      </div>
                    </div>
                    
                    {assistance.suggestions.length > 0 && (
                      <div>
                        <div className="text-purple-300 text-sm font-medium mb-1">Suggestions</div>
                        <div className="space-y-2">
                          {assistance.suggestions.map((suggestion, index) => (
                            <div key={index} className="bg-black/60 p-2 rounded border border-gray-600 text-gray-200 text-xs">
                              • {suggestion}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {assistance.codeSnippet && (
                      <div>
                        <div className="text-purple-300 text-sm font-medium mb-1">Code Solution</div>
                        <pre className="bg-black/80 p-3 rounded border border-gray-600 text-green-400 text-xs font-mono overflow-auto max-h-32">
                          <code>{assistance.codeSnippet}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Logs */}
              <div className="bg-black/40 border border-purple-500/30 rounded-lg p-4">
                <h3 className="text-purple-300 font-semibold mb-3">🌙 Recent Activity</h3>
                <div className="space-y-2 max-h-32 overflow-auto">
                  {lunaBug.getInstance().logs.slice(-5).map((log, index) => (
                    <div key={index} className="text-xs">
                      <span className="text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="text-purple-300 ml-2">{log.eventType}</span>
                    </div>
                  ))}
                  {lunaBug.getInstance().logs.length === 0 && (
                    <div className="text-gray-400 text-xs">No activity yet...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// FIXED: Only export LunaBugCore, not MistralDebugger again
export { LunaBugCore };