/**
 * LunaBug/interface/MistralDebugger.tsx
 * Last Edited: 2025-11-02 by Steven
 *
 * LunaBug: STANDALONE AI-powered debugging interface
 * - Uses AIModule for Mistral integration
 * - Supports MISTRAL_API_KEY and MISTRAL_DEBUG_API_KEY
 * - Dynamic system prompt selection
 * - Instructions editor with persistence
 */

import { useState, useRef, useEffect } from "react";
import { LUNABUG_PROMPTS } from '../config/system-prompts.js';

interface MistralDebuggerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MistralDebugger({ isOpen, onClose }: MistralDebuggerProps) {
  const [messages, setMessages] = useState<Array<{ type: 'user' | 'assistant'; content: string; timestamp: Date }>>([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [debugType, setDebugType] = useState('general');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [context, setContext] = useState('');
  const [assistance, setAssistance] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('debug');
  const [instructions, setInstructions] = useState<string[]>([]);
  const [newInstruction, setNewInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load instructions from LunaBug AI module
  useEffect(() => {
    if (isOpen) {
      const lunaBugInstructions = (window as any).LunaBug?.instructions?.get() || [];
      setInstructions(lunaBugInstructions);
    }
  }, [isOpen]);

  const handleDebugSubmit = async () => {
    if (!code.trim()) return;
    
    setIsProcessing(true);
    
    try {
      // Use LunaBug's AI module directly
      const response = await (window as any).LunaBug?.debug(code, error, {
        language,
        debugType,
        context,
        debugMode: true // Use debug API key
      });
      
      setAssistance(response);
      
      // Add to chat history
      setMessages(prev => [
        ...prev,
        { type: 'user', content: `Debug request: ${debugType} | ${language}`, timestamp: new Date() },
        { type: 'assistant', content: response?.analysis || 'Analysis completed', timestamp: new Date() }
      ]);
      
    } catch (error) {
      console.error('🌙 Debug request failed:', error);
      setMessages(prev => [
        ...prev,
        { type: 'user', content: `Debug request failed`, timestamp: new Date() },
        { type: 'assistant', content: `Error: ${error.message}`, timestamp: new Date() }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, 
      { type: 'user', content: input, timestamp: new Date() }
    ]);
    
    setIsProcessing(true);
    
    try {
      const response = await (window as any).LunaBug?.chat(input, {
        language,
        debugMode: false // Use primary API key
      });
      
      setMessages(prev => [...prev, 
        { type: 'assistant', content: response?.response || 'No response', timestamp: new Date() }
      ]);
      
    } catch (error) {
      setMessages(prev => [...prev, 
        { type: 'assistant', content: `Error: ${error.message}`, timestamp: new Date() }
      ]);
    } finally {
      setIsProcessing(false);
    }
    
    setInput('');
  };

  const handleSaveInstructions = () => {
    (window as any).LunaBug?.instructions?.set(instructions);
    console.log('🌙 Instructions saved to LunaBug AI module');
  };

  const handleAddInstruction = () => {
    if (newInstruction.trim()) {
      const updated = [...instructions, newInstruction.trim()];
      setInstructions(updated);
      (window as any).LunaBug?.instructions?.add(newInstruction.trim());
      setNewInstruction('');
    }
  };

  const handleRemoveInstruction = (index: number) => {
    const updated = instructions.filter((_, i) => i !== index);
    setInstructions(updated);
    (window as any).LunaBug?.instructions?.remove(index);
  };

  if (!isOpen) return null;

  const aiMetrics = (window as any).LunaBug?.metrics() || { requestCount: 0, successRate: 0, averageResponseTime: 0 };

  return (
    <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-7xl max-h-[95vh] bg-gray-900/95 backdrop-blur-lg text-white border border-purple-500/50 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                🌙 LunaBug AI Debugger
              </h2>
              <p className="text-gray-400 text-sm">
                Standalone AI debugging • Mistral API • {aiMetrics.requestCount} requests • {aiMetrics.successRate}% success
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setActiveTab('debug')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'debug' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-black/40 text-gray-400 hover:text-white'
              }`}
            >
              🔧 Debug
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'chat' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-black/40 text-gray-400 hover:text-white'
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveTab('instructions')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'instructions' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-black/40 text-gray-400 hover:text-white'
              }`}
            >
              📚 Instructions
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(95vh-180px)]">
          {/* Debug Tab */}
          {activeTab === 'debug' && (
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
                  disabled={isProcessing || !code.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {isProcessing ? (
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
                        {assistance.severity || 'medium'} | {Math.round((assistance.confidence || 0.8) * 100)}%
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="text-purple-300 text-sm font-medium mb-1">Analysis</div>
                        <div className="bg-black/60 p-3 rounded border border-gray-600 text-gray-200 text-sm max-h-40 overflow-auto">
                          {assistance.analysis}
                        </div>
                      </div>
                      
                      {assistance.suggestions?.length > 0 && (
                        <div>
                          <div className="text-purple-300 text-sm font-medium mb-1">Suggestions</div>
                          <div className="space-y-2 max-h-32 overflow-auto">
                            {assistance.suggestions.map((suggestion: string, index: number) => (
                              <div key={index} className="bg-black/60 p-2 rounded border border-gray-600 text-gray-200 text-xs">
                                • {suggestion}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {assistance.codeExample && (
                        <div>
                          <div className="text-purple-300 text-sm font-medium mb-1">Code Solution</div>
                          <pre className="bg-black/80 p-3 rounded border border-gray-600 text-green-400 text-xs font-mono overflow-auto max-h-32">
                            <code>{assistance.codeExample}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-black/40 border border-purple-500/30 rounded-lg p-4 h-64 overflow-auto">
                  {messages.map((msg, index) => (
                    <div key={index} className={`mb-3 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block p-2 rounded max-w-xs ${
                        msg.type === 'user' 
                          ? 'bg-purple-600/20 text-purple-200'
                          : 'bg-gray-700/50 text-gray-200'
                      }`}>
                        <div className="text-sm">{msg.content}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSubmit()}
                    placeholder="Ask LunaBug anything..."
                    className="flex-1 bg-black/40 border border-gray-600 rounded p-2 text-white"
                    disabled={isProcessing}
                  />
                  <button
                    onClick={handleChatSubmit}
                    disabled={isProcessing || !input.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded transition-colors"
                  >
                    {isProcessing ? '🌙...' : 'Send'}
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-black/40 border border-purple-500/30 rounded-lg p-4">
                  <h3 className="text-purple-300 font-semibold mb-3">🌙 AI Status</h3>
                  <div className="space-y-2 text-sm">
                    <div>Requests: {aiMetrics.requestCount}</div>
                    <div>Success Rate: {aiMetrics.successRate}%</div>
                    <div>Avg Response: {aiMetrics.averageResponseTime}ms</div>
                    <div>Instructions: {instructions.length}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instructions Tab */}
          {activeTab === 'instructions' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Instructions */}
                <div>
                  <h3 className="text-purple-300 font-semibold mb-3">📚 Current Instructions ({instructions.length})</h3>
                  <div className="bg-black/40 border border-purple-500/30 rounded-lg p-4 max-h-64 overflow-auto">
                    {instructions.map((instruction, index) => (
                      <div key={index} className="flex items-start gap-2 mb-2 p-2 bg-gray-800/30 rounded">
                        <span className="text-purple-400 text-xs font-mono">{index + 1}</span>
                        <span className="flex-1 text-sm text-gray-200">{instruction}</span>
                        <button
                          onClick={() => handleRemoveInstruction(index)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {instructions.length === 0 && (
                      <div className="text-gray-400 text-sm">No custom instructions loaded</div>
                    )}
                  </div>
                </div>
                
                {/* Add New Instructions */}
                <div>
                  <h3 className="text-purple-300 font-semibold mb-3">➕ Add New Instruction</h3>
                  <div className="space-y-4">
                    <textarea
                      value={newInstruction}
                      onChange={(e) => setNewInstruction(e.target.value)}
                      placeholder="Enter a new instruction for LunaBug..."
                      className="w-full h-24 bg-black/40 border border-gray-600 rounded p-3 text-white text-sm resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddInstruction}
                        disabled={!newInstruction.trim()}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded transition-colors"
                      >
                        Add Instruction
                      </button>
                      <button
                        onClick={handleSaveInstructions}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors"
                      >
                        Save All
                      </button>
                    </div>
                    
                    {/* Quick Templates */}
                    <div className="space-y-2">
                      <div className="text-sm text-gray-400">Quick Templates:</div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setNewInstruction('Always provide complete working code examples.')}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded"
                        >
                          Code Examples
                        </button>
                        <button
                          onClick={() => setNewInstruction('Explain the root cause before suggesting solutions.')}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded"
                        >
                          Root Cause
                        </button>
                        <button
                          onClick={() => setNewInstruction('Consider mobile performance in all recommendations.')}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded"
                        >
                          Mobile Focus
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Instruction Source Info */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-300 font-semibold mb-2">📊 Instruction Sources</h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <div>• <strong>Environment:</strong> LUNABUG_SYSTEM_PROMPT (highest priority)</div>
                  <div>• <strong>Local Storage:</strong> lunabug_system_prompt (user edits)</div>
                  <div>• <strong>Config File:</strong> LunaBug/config/lunabug.json (defaults)</div>
                  <div className="text-xs text-blue-400 mt-2">
                    Instructions are merged and deduplicated. Use "Save All" to persist changes.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Only export the main component
export default MistralDebugger;