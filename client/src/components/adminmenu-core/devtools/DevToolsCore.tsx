import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Activity, Database, Zap, Trash2, RefreshCw, Moon, MessageSquare, Code, Send } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

interface ChatMessage {
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

export default function DevToolsCore() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeView, setActiveView] = useState<'console' | 'luna'>('console');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Luna Chat State
  const [lunaMessages, setLunaMessages] = useState<ChatMessage[]>([
    {
      text: "🌙 Hey, i'm LunaBug! Interactive AI Debugger Chat.",
      sender: 'bot',
      timestamp: new Date().toISOString()
    }
  ]);
  const [lunaChatInput, setLunaChatInput] = useState('');
  const [lunaLoading, setLunaLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('mistral_api_key') || '');
  const [apiKeySet, setApiKeySet] = useState(() => !!localStorage.getItem('mistral_api_key'));
  const [structuredDebugData, setStructuredDebugData] = useState({
    code: '',
    error: '',
    context: '',
    language: 'typescript'
  });
  const lunaMessagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (lunaMessagesEndRef.current) {
      lunaMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lunaMessages]);

  const addLog = (level: 'info' | 'warn' | 'error', message: string) => {
    setLogs(prev => {
      const newLogs = [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message
      }];
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

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      alert('API Key Required');
      return;
    }
    localStorage.setItem('mistral_api_key', apiKey);
    setApiKeySet(true);
    alert('🌙 Luna AI Connected!');
  };

  const handleStructuredDebug = async () => {
    if (!structuredDebugData.code || !structuredDebugData.error) {
      alert('Please provide both code and error message');
      return;
    }

    setLunaLoading(true);

    try {
      const prompt = `Debug this ${structuredDebugData.language} code:

Code:
${structuredDebugData.code}

Error:
${structuredDebugData.error}

Context: ${structuredDebugData.context || 'None'}

Provide a clear analysis and solution.`;

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'open-mistral-7b',
          messages: [
            { role: 'system', content: 'You are Luna, an expert debugging assistant for ClassikLust game.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.07,
          max_tokens: 1500
        })
      });

      if (!response.ok) throw new Error('API request failed');
      
      const result = await response.json();
      const botResponse = result.choices?.[0]?.message?.content || 'No response received';

      setLunaMessages(prev => [
        ...prev,
        {
          text: `🔍 Debugging: ${structuredDebugData.error.substring(0, 50)}...`,
          sender: 'user',
          timestamp: new Date().toISOString()
        },
        {
          text: botResponse,
          sender: 'bot',
          timestamp: new Date().toISOString()
        }
      ]);

      // Clear form
      setStructuredDebugData({ code: '', error: '', context: '', language: 'typescript' });
    } catch (error: any) {
      alert(`Luna Error: ${error.message}`);
    } finally {
      setLunaLoading(false);
    }
  };

  const handleChatSend = async () => {
    if (!lunaChatInput.trim() || lunaLoading) return;
    if (!apiKeySet) {
      alert('Please set your Mistral AI API key first');
      return;
    }

    const userMessage: ChatMessage = {
      text: lunaChatInput,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setLunaMessages(prev => [...prev, userMessage]);
    setLunaChatInput('');
    setLunaLoading(true);

    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'open-mistral-7b',
          messages: [
            { role: 'system', content: 'You are Luna, intelligent debugging assistant for ClassikLust game.' },
            { role: 'user', content: lunaChatInput }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) throw new Error('API request failed');
      
      const result = await response.json();
      const botResponse = result.choices?.[0]?.message?.content || 'No response received';

      setLunaMessages(prev => [
        ...prev,
        {
          text: botResponse,
          sender: 'bot',
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (error: any) {
      setLunaMessages(prev => [
        ...prev,
        {
          text: `❌ ${error.message}`,
          sender: 'bot',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLunaLoading(false);
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
          <p className="text-sm text-gray-400">Console viewer + Luna AI debugging assistant</p>
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

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView('console')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeView === 'console'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Terminal className="w-4 h-4 inline mr-2" />
          Console Viewer
        </button>
        <button
          onClick={() => setActiveView('luna')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeView === 'luna'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Moon className="w-4 h-4 inline mr-2" />
          🌙 Luna AI Debug
        </button>
      </div>

      {/* CONSOLE VIEW */}
      {activeView === 'console' && (
        <>
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
        </>
      )}

      {/* LUNA AI VIEW */}
      {activeView === 'luna' && (
        <div className="space-y-4">
          {/* API Key Setup */}
          {!apiKeySet && (
            <div className="bg-yellow-900/40 border border-yellow-500/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-yellow-400" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-300 mb-2">Mistral AI API Key Required</h4>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your Mistral AI API key..."
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                    />
                    <button onClick={handleSaveApiKey} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded">
                      Save Key
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Structured Debug */}
            <div className="bg-gray-800 rounded-lg p-4 border border-purple-500/30">
              <h4 className="text-md font-semibold text-purple-300 mb-3 flex items-center gap-2">
                <Code className="w-4 h-4" />
                Structured Debug
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400">Language</label>
                  <select
                    value={structuredDebugData.language}
                    onChange={(e) => setStructuredDebugData({ ...structuredDebugData, language: e.target.value })}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                    <option value="react">React</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Code</label>
                  <textarea
                    value={structuredDebugData.code}
                    onChange={(e) => setStructuredDebugData({ ...structuredDebugData, code: e.target.value })}
                    placeholder="Paste your problematic code..."
                    className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Error Message</label>
                  <textarea
                    value={structuredDebugData.error}
                    onChange={(e) => setStructuredDebugData({ ...structuredDebugData, error: e.target.value })}
                    placeholder="Paste the error message..."
                    className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Context (Optional)</label>
                  <input
                    type="text"
                    value={structuredDebugData.context}
                    onChange={(e) => setStructuredDebugData({ ...structuredDebugData, context: e.target.value })}
                    placeholder="What were you trying to do?"
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  />
                </div>
                <button
                  onClick={handleStructuredDebug}
                  disabled={lunaLoading || !apiKeySet}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded font-semibold"
                >
                  {lunaLoading ? 'Analyzing...' : '🔍 Analyze Code'}
                </button>
              </div>
            </div>

            {/* AI Chat */}
            <div className="bg-gray-800 rounded-lg p-4 border border-purple-500/30 flex flex-col">
              <h4 className="text-md font-semibold text-purple-300 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                AI Chat
              </h4>
              <div className="flex-1 overflow-y-auto mb-3 space-y-2 max-h-80">
                {lunaMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[95%] p-2 rounded-lg ${
                      msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={lunaMessagesEndRef} />
              </div>
              <div className="flex gap-2">
                <input
                  value={lunaChatInput}
                  onChange={(e) => setLunaChatInput(e.target.value)}
                  placeholder="Ask anything"
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                  className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  disabled={lunaLoading || !apiKeySet}
                />
                <button
                  onClick={handleChatSend}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded"
                  disabled={lunaLoading || !lunaChatInput.trim() || !apiKeySet}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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