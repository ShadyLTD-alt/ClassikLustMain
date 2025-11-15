import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Activity, Database, Zap, Trash2, RefreshCw, Moon, MessageSquare, Code, Send, Settings, Command, Play } from 'lucide-react';


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

interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

const DEFAULT_AI_CONFIG: AIConfig = {
  model: 'open-mistral-7b',
  temperature: 0.3,
  maxTokens: 2500,
  systemPrompt: `You are Luna, an expert debugging AI assistant for ClassikLust game development.

Your role:
- Provide detailed, educational explanations with code examples
- Break down complex errors into simple terms
- Explain WHY something went wrong, not just HOW to fix it
- Teach best practices and patterns
- Reference specific lines, functions, and technical concepts
- Use emojis strategically for readability
- Format code blocks properly with syntax highlighting hints

When debugging:
1. Analyze the root cause
2. Explain the technical reason
3. Provide a clear solution with code
4. Suggest best practices to prevent similar issues
5. Offer additional learning resources if relevant

Be thorough, technical, and educational. Users want to LEARN, not just get quick fixes.`
};

const CLI_COMMANDS = [
  { cmd: 'luna.cli.status()', desc: 'Show Luna system status', icon: '📊' },
  { cmd: 'luna.cli.health()', desc: 'Quick health check', icon: '💚' },
  { cmd: 'await luna.cli.diagnose()', desc: 'Run full system diagnostic', icon: '🔍' },
  { cmd: 'luna.cli.logs(20)', desc: 'Show last 20 log entries', icon: '📝' },
  { cmd: 'luna.cli.errors(10)', desc: 'Show last 10 errors', icon: '🚨' },
  { cmd: 'luna.cli.plugins()', desc: 'List all loaded plugins', icon: '🔌' },
  { cmd: 'await luna.cli.audit()', desc: 'Force schema audit', icon: '🧪' },
  { cmd: 'luna.cli.help()', desc: 'Show all available commands', icon: '❓' 
  },
];

export default function DevToolsCore() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeView, setActiveView] = useState<'console' | 'luna' | 'settings'>('console');
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

  // AI Configuration State
const [showSettings, setShowSettings] = useState(false);
const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
  const saved = localStorage.getItem('luna_ai_config');
  return saved ? JSON.parse(saved) : DEFAULT_AI_CONFIG;
});

// Console Enhancement State
const [consoleInput, setConsoleInput] = useState('');
const [consoleHistory, setConsoleHistory] = useState<string[]>([]);
const [historyIndex, setHistoryIndex] = useState(-1);
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
    alert(',🌙 [LunaBug] AI API Connected!');
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
          model: aiConfig.model,
          messages: [
            { role: 'system', content: aiConfig.systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: aiConfig.temperature,
          max_tokens: aiConfig.maxTokens
        })

      });

      if (!response.ok) throw new Error('API request failed');

      const result = await response.json();
      const botResponse = result.choices?.[0]?.message?.content || 'No response received';

      setLunaMessages(prev => [
        ...prev,
        {
          text: ` Debugging: ${structuredDebugData.error.substring(0, 50)}...`,
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
          model: aiConfig.model,
          messages: [
            { role: 'system', content: aiConfig.systemPrompt },
            { role: 'user', content: lunaChatInput }
          ],
          temperature: aiConfig.temperature,
          max_tokens: aiConfig.maxTokens
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
          text: ` ${error.message}`,
          sender: 'bot',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLunaLoading(false);
    }
  };



// Save AI config whenever it changes
useEffect(() => {
  localStorage.setItem('luna_ai_config', JSON.stringify(aiConfig));
}, [aiConfig]
         );

  const resetAIConfig = () => {
  if (confirm('Reset AI configuration to defaults?')) {
    setAiConfig(DEFAULT_AI_CONFIG);
    alert('AI Config reset to defaults!');
  }
};

  const executeConsoleCommand = async (command: string) => {
    try {
      setConsoleHistory(prev => [...prev, command]);
      setHistoryIndex(-1);
      addLog('info', `> ${command}`);

      // Luna CLI: route to API
      if (command.includes('luna.cli.')) {
        const methodMatch = command.match(/luna\.cli\.(\w+)\(/);
        if (methodMatch) {
          const method = methodMatch[1];
          addLog('info', `⏳ Executing ${method}...`);

          try {
            const response = await fetch(`/api/luna/${method}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
              throw new Error(`Luna API error: ${response.statusText}`);
            }

            const result = await response.json();
            const resultStr = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
            addLog('info', `✅ ${resultStr}`);
          } catch (apiError: any) {
            addLog('error', `❌ API Error: ${apiError.message}`);
          }
          return;
        } else {
          addLog('error', '❌ Invalid luna.cli command format');
          return;
        }
      }

      // Regular JavaScript eval for non-Luna commands
      const result = eval(command);
      if (result !== undefined) {
        const resultStr = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
        addLog('info', `← ${resultStr}`);
      }
    } catch (error: any) {
      addLog('error', `❌ ${error.message}`);
    }
  };



const handleConsoleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (consoleInput.trim()) {
      executeConsoleCommand(consoleInput);
      setConsoleInput('');
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (consoleHistory.length > 0 && historyIndex < consoleHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setConsoleInput(consoleHistory[consoleHistory.length - 1 - newIndex]);
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setConsoleInput(consoleHistory[consoleHistory.length - 1 - newIndex]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setConsoleInput('');
    }
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
<div className="flex justify-between items-center">
  <button
    onClick={() => setShowSettings(!showSettings)}
    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2"
  >
    <Settings className="w-4 h-4" />
    AI Settings
  </button>
</div>
      </div>
      {/* CONSOLE VIEW */}
      {activeView === 'console' && (
        <>
          {/* ðŸ“Ÿ Command List UI */}
    <div className="bg-gray-800 rounded-lg p-4 border border-green-500/30">
      <h4 className="text-sm font-semibold text-green-300 mb-3 flex items-center gap-2">
        <Command className="w-4 h-4" />
        Available Commands
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {CLI_COMMANDS.map((cmd, idx) => (
          <button
            key={idx}
            onClick={() => {
              setConsoleInput(cmd.cmd);
              // Auto-execute if it's a simple command
              if (!cmd.cmd.includes('await')) {
                executeConsoleCommand(cmd.cmd);
                setConsoleInput('');
              }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-left text-sm text-gray-300 hover:text-white transition-colors"
          >
            <span>{cmd.icon}</span>
            <div className="flex-1 min-w-0">
              <code className="text-xs text-green-400 block truncate">{cmd.cmd}</code>
              <span className="text-xs text-gray-500">{cmd.desc}</span>
            </div>
            <Play className="w-3 h-3 text-gray-500" />
          </button>
        ))}
      </div>
    </div>{/* Interactive Console Input */}
<div className="bg-gray-800 rounded-lg p-3 border border-green-500/30">
  <div className="flex items-center gap-2 mb-2">
    <Terminal className="w-4 h-4 text-green-400" />
    <span className="text-sm text-gray-300 font-semibold">Interactive Console</span>
  </div>
  <div className="flex gap-2">
    <span className="text-green-400 font-mono">&gt;</span>
    <input
      type="text"
      value={consoleInput}
      onChange={(e) => setConsoleInput(e.target.value)}
      onKeyDown={handleConsoleKeyDown}
            placeholder="Type command or select from list above... (↑/↓ for history)"
      className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white font-mono text-sm"
    />
    <button
      onClick={() => {
        if (consoleInput.trim()) {
          executeConsoleCommand(consoleInput);
          setConsoleInput('');
        }
      }}
      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-2"
    >
      <Play className="w-4 h-4" />
      Run
    </button>
  </div>
  <p className="text-xs text-gray-500 mt-2">
    Quick access to Luna CLI commands. Press Enter to execute, (↑/↓) for history.
  </p>
</div>

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
                  {lunaLoading ? 'Analyzing...' : 'ðŸ” Analyze Code'}
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
{/*  AI SETTINGS PANEL */}
{showSettings && (
  <div className="bg-gray-800 rounded-lg p-4 border border-purple-500/50">
    <h4 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
      <Settings className="w-5 h-5" />
      Luna AI Configuration
    </h4>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm text-gray-300 block mb-2">Model</label>
        <select
          value={aiConfig.model}
          onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
        >
          <option value="open-mistral-7b">Mistral 7B (Fast)</option>
          <option value="mistral-small-latest">Mistral Small (Balanced)</option>
          <option value="mistral-medium-latest">Mistral Medium (Smart)</option>
          <option value="mistral-large-latest">Mistral Large (Best)</option>
        </select>
      </div>
      <div>
        <label className="text-sm text-gray-300 block mb-2">
          Temperature: {aiConfig.temperature}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={aiConfig.temperature}
          onChange={(e) => setAiConfig({ ...aiConfig, temperature: parseFloat(e.target.value) })}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          {aiConfig.temperature < 0.3 ? 'Focused & Precise' : aiConfig.temperature < 0.7 ? 'Balanced' : 'Creative & Varied'}
        </p>
      </div>
      <div>
        <label className="text-sm text-gray-300 block mb-2">Max Tokens</label>
        <input
          type="number"
          value={aiConfig.maxTokens}
          onChange={(e) => setAiConfig({ ...aiConfig, maxTokens: parseInt(e.target.value) })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          min="500"
          max="8000"
          step="100"
        />
        <p className="text-xs text-gray-500 mt-1">Response length limit</p>
      </div>
      <div className="flex items-end">
        <button
          onClick={resetAIConfig}
          className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
    <div className="mt-4">
      <label className="text-sm text-gray-300 block mb-2">System Prompt</label>
      <textarea
        value={aiConfig.systemPrompt}
        onChange={(e) => setAiConfig({ ...aiConfig, systemPrompt: e.target.value })}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
        rows={8}
        placeholder="Define Luna's personality and behavior..."
      />
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
              alert('âœ… Cache cleared! Reload page to reset.');
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
              alert('âœ… State dumped to console!');
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
