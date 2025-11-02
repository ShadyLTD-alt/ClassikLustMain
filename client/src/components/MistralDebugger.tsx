/**
 * MistralDebugger.tsx
 * Last Edited: 2025-11-02 by Steven
 *
 * LunaBug: AI-powered debugging interface with local memory cache
 */

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code, Send, Trash2, Download, Bug, Zap, X } from "lucide-react";

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

export function MistralDebugger({ isOpen, onClose }: MistralDebuggerProps) {
  const { toast } = useToast();
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

  // Load debug history from localStorage on mount
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem("mistralDebugHistory") || "[]");
      setHistoryEntries(history.slice(-10)); // Show last 10 entries
    } catch (err) {
      console.warn("Failed to load debug history:", err);
    }
  }, []);

  // LunaBug local memory cache function
  const saveToDebugCache = (data: DebugResponse) => {
    try {
      const history = JSON.parse(localStorage.getItem("mistralDebugHistory") || "[]");
      const newEntry: DebugHistoryEntry = {
        timestamp: new Date().toISOString(),
        language,
        debugType,
        code,
        error,
        context,
        result: data,
      };
      localStorage.setItem("mistralDebugHistory", JSON.stringify([...history.slice(-49), newEntry])); // Keep last 50 entries
      setHistoryEntries(prev => [...prev.slice(-9), newEntry]); // Update display
    } catch (err) {
      console.warn("Failed to cache debug data:", err);
    }
  };

  const debugMutation = useMutation({
    mutationFn: async (request: DebugRequest) => {
      const response = await apiRequest('POST', '/api/mistral/debug', request);
      return await response.json() as DebugResponse;
    },
    onSuccess: (data) => {
      setAssistance(data);
      saveToDebugCache(data); // LunaBug memory cache
      toast({
        title: "🌙 LunaBug Analysis Complete",
        description: `Confidence: ${Math.round(data.confidence * 100)}%`,
      });
    },
    onError: (error) => {
      toast({
        title: "LunaBug Error",
        description: "Failed to analyze. Check your connection.",
        variant: "destructive",
      });
    }
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/mistral/chat', { message });
      return await response.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, 
        { type: 'assistant', content: data.response, timestamp: new Date() }
      ]);
    },
    onError: (error) => {
      toast({
        title: "Chat Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    }
  });

  const handleDebugSubmit = () => {
    if (!code.trim()) {
      toast({
        title: "Missing Code",
        description: "Please provide code to debug.",
        variant: "destructive",
      });
      return;
    }

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
    
    chatMutation.mutate(input);
    setInput('');
  };

  const clearHistory = () => {
    localStorage.removeItem("mistralDebugHistory");
    setHistoryEntries([]);
    toast({
      title: "🗑️ History Cleared",
      description: "LunaBug's memory cache has been reset.",
    });
  };

  const exportHistory = () => {
    const history = JSON.parse(localStorage.getItem("mistralDebugHistory") || "[]");
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lunabug-debug-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-gray-900/95 backdrop-blur-lg text-white border-purple-500/50">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              🌙 LunaBug Debugger
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              AI-powered debugging assistant for ClassikLust
            </DialogDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={exportHistory} className="text-gray-400 hover:text-white">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={clearHistory} className="text-gray-400 hover:text-white">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="debug" className="flex-1">
          <TabsList className="grid w-full grid-cols-3 bg-black/40">
            <TabsTrigger value="debug" className="data-[state=active]:bg-purple-600 text-white">
              <Bug className="w-4 h-4 mr-2" /> Debug
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-purple-600 text-white">
              <Zap className="w-4 h-4 mr-2" /> Chat
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-600 text-white">
              <Code className="w-4 h-4 mr-2" /> History
            </TabsTrigger>
          </TabsList>

          {/* Debug Tab */}
          <TabsContent value="debug" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="bg-black/40 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="react">React</SelectItem>
                        <SelectItem value="sql">SQL</SelectItem>
                        <SelectItem value="css">CSS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="debugType">Debug Type</Label>
                    <Select value={debugType} onValueChange={setDebugType}>
                      <SelectTrigger className="bg-black/40 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="logic">Logic Error</SelectItem>
                        <SelectItem value="ui">UI/UX</SelectItem>
                        <SelectItem value="database">Database</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="code">Code to Debug</Label>
                  <Textarea
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Paste your code here..."
                    className="min-h-32 font-mono bg-black/40 border-gray-600 text-green-400"
                  />
                </div>

                <div>
                  <Label htmlFor="error">Error Message (Optional)</Label>
                  <Textarea
                    id="error"
                    value={error}
                    onChange={(e) => setError(e.target.value)}
                    placeholder="Paste error message here..."
                    className="min-h-20 font-mono bg-black/40 border-gray-600 text-red-400"
                  />
                </div>

                <div>
                  <Label htmlFor="context">Additional Context (Optional)</Label>
                  <Textarea
                    id="context"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="What were you trying to do? Any relevant context..."
                    className="min-h-20 bg-black/40 border-gray-600"
                  />
                </div>

                <Button 
                  onClick={handleDebugSubmit}
                  disabled={debugMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {debugMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      LunaBug Analyzing...
                    </div>
                  ) : (
                    <>🌙 Ask LunaBug</>
                  )}
                </Button>
              </div>

              {/* Results */}
              <div className="space-y-4">
                {assistance && (
                  <Card className="bg-black/40 border-purple-500/30">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-purple-300">🌙 LunaBug's Analysis</span>
                        <Badge variant={assistance.severity === 'high' ? 'destructive' : assistance.severity === 'medium' ? 'secondary' : 'default'}>
                          {assistance.severity} | {Math.round(assistance.confidence * 100)}%
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-purple-300">Analysis</Label>
                        <div className="bg-black/60 p-4 rounded border border-gray-600 text-gray-200">
                          {assistance.analysis}
                        </div>
                      </div>
                      
                      {assistance.suggestions.length > 0 && (
                        <div>
                          <Label className="text-purple-300">Suggestions</Label>
                          <div className="space-y-2">
                            {assistance.suggestions.map((suggestion, index) => (
                              <div key={index} className="bg-black/60 p-3 rounded border border-gray-600 text-gray-200 text-sm">
                                • {suggestion}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {assistance.codeSnippet && (
                        <div>
                          <Label className="text-purple-300">Code Solution</Label>
                          <pre className="bg-black/80 p-4 rounded border border-gray-600 text-green-400 text-sm font-mono overflow-auto max-h-40">
                            <code>{assistance.codeSnippet}</code>
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-4">
            <Card className="h-96 bg-black/40 border-purple-500/30">
              <CardContent className="h-full p-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.type === 'user' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-gray-700 text-gray-200'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {chatMutation.isPending && (
                      <div className="flex justify-start">
                        <div className="bg-gray-700 text-gray-200 px-4 py-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin w-3 h-3 border border-purple-400 border-t-transparent rounded-full" />
                            🌙 LunaBug is thinking...
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask LunaBug anything..."
                className="bg-black/40 border-gray-600"
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSubmit()}
              />
              <Button 
                onClick={handleChatSubmit}
                disabled={chatMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-purple-300">🌙 LunaBug's Memory</h3>
              <div className="text-sm text-gray-400">
                {historyEntries.length} entries cached
              </div>
            </div>
            
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {historyEntries.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <Bug className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No debug history yet.</p>
                    <p className="text-sm">LunaBug will remember your debugging sessions here.</p>
                  </div>
                ) : (
                  historyEntries.map((entry, index) => (
                    <Card key={index} className="bg-black/60 border-gray-600/50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="text-xs">
                            {entry.language} | {entry.debugType}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-300 mb-2">
                          <strong>Code:</strong> {entry.code.substring(0, 100)}{entry.code.length > 100 ? '...' : ''}
                        </div>
                        
                        {entry.error && (
                          <div className="text-sm text-red-400 mb-2">
                            <strong>Error:</strong> {entry.error.substring(0, 80)}{entry.error.length > 80 ? '...' : ''}
                          </div>
                        )}
                        
                        <div className="text-sm text-purple-300">
                          <strong>Analysis:</strong> {entry.result.analysis.substring(0, 120)}{entry.result.analysis.length > 120 ? '...' : ''}
                        </div>
                        
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant={entry.result.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                            {entry.result.severity}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            Confidence: {Math.round(entry.result.confidence * 100)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}