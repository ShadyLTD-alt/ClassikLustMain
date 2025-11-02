import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Code, Bug, Sparkles, Copy, RefreshCw, AlertTriangle, MessageSquare, Send, Bot, User, Zap, Moon } from 'lucide-react';

interface LunaBugDebuggerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DebugResponse {
  analysis: string;
  possibleCauses: string[];
  solutions: string[];
  codeExample?: string;
  confidence: number;
  debugSteps: string[];
}

interface ChatMessage {
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  type?: 'debug' | 'chat';
}

export default function LunaBugDebugger({ isOpen, onClose }: LunaBugDebuggerProps) {
  // Debug form state
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [context, setContext] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [debugType, setDebugType] = useState('error');
  const [assistance, setAssistance] = useState<DebugResponse | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      text: "🌙 Welcome! I'm Luna, your AI debugging assistant. I'm connected to Mistral 7B and ready to help with your ClassikLust game development!",
      sender: 'bot',
      timestamp: new Date().toISOString(),
      type: 'chat'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // FIXED API CALL FOR MISTRAL 7B
  const debugMutation = useMutation({
    mutationFn: async (data: { code: string; error: string; context?: string; language: string; debugType: string }) => {
      const prompt = createDebugPrompt(data);
      
      console.log('🌙 LunaBug connecting to Mistral 7B...');
      
      // TRY MULTIPLE ENDPOINTS FOR MISTRAL 7B
      const endpoints = [
        'http://localhost:1234/v1/chat/completions',
        'http://127.0.0.1:1234/v1/chat/completions',
        'http://localhost:11434/api/chat',
        'http://127.0.0.1:11434/api/chat'
      ];
      
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔌 Trying endpoint: ${endpoint}`);
          
          // Different formats for different APIs
          const isOllama = endpoint.includes('11434');
          const payload = isOllama ? {
            model: 'mistral:7b',
            messages: [
              {
                role: 'system',
                content: 'You are Luna, an expert debugging assistant. Provide precise, actionable debugging advice with clear explanations and solutions.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            stream: false
          } : {
            model: 'mistral-7b-instruct-v0.1',
            messages: [
              {
                role: 'system',
                content: 'You are Luna, an expert debugging assistant. Provide precise, actionable debugging advice with clear explanations and solutions.'
              },
              {
                role: 'user', 
                content: prompt
              }
            ],
            temperature: 0.3,
            max_tokens: 1000,
            stop: null
          };
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(isOllama ? {} : { 'Authorization': `Bearer dummy-token` })
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000) // 15 second timeout
          });
          
          if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
          }
          
          const result = await response.json();
          console.log('✅ LunaBug response received:', result);
          
          const content = result.choices?.[0]?.message?.content || result.message?.content || result.response || 'No response received';
          return parseDebugResponse(content);
          
        } catch (error: any) {
          console.warn(`❌ Endpoint ${endpoint} failed:`, error.message);
          lastError = error;
          continue;
        }
      }
      
      // All endpoints failed
      throw new Error(`LunaBug connection failed. Last error: ${lastError?.message || 'Unknown error'}. Make sure Mistral 7B is running on localhost:1234 or localhost:11434`);
    },
    onSuccess: (data) => {
      setAssistance(data);
      const debugMessage: ChatMessage = {
        text: `🌙 Debug Analysis Complete!\n\n${data.analysis}\n\nSolutions:\n${data.solutions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        type: 'debug'
      };
      setMessages(prev => [...prev, debugMessage]);
      toast({ 
        title: '🌙 LunaBug analysis complete!', 
        description: `Found ${data.solutions.length} potential solutions` 
      });
    },
    onError: (error: any) => {
      console.error('🌙 LunaBug debug error:', error);
      const errorMessage: ChatMessage = {
        text: `❌ Connection failed: ${error.message}\n\n🔧 Troubleshooting:\n1. Make sure Mistral 7B is running\n2. Check localhost:1234 or localhost:11434\n3. Verify model is loaded\n4. Check firewall settings`,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        type: 'chat'
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({ 
        title: '🌙 LunaBug connection failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const chatPrompt = createChatPrompt(message, messages);
      
      console.log('💬 LunaBug chat request...');
      
      const endpoints = [
        'http://localhost:1234/v1/chat/completions',
        'http://127.0.0.1:1234/v1/chat/completions', 
        'http://localhost:11434/api/chat',
        'http://127.0.0.1:11434/api/chat'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const isOllama = endpoint.includes('11434');
          const payload = isOllama ? {
            model: 'mistral:7b',
            messages: [
              { role: 'system', content: 'You are Luna, a helpful and friendly debugging assistant for the ClassikLust game. Be conversational and provide practical coding advice.' },
              { role: 'user', content: chatPrompt }
            ],
            stream: false
          } : {
            model: 'mistral-7b-instruct-v0.1',
            messages: [
              { role: 'system', content: 'You are Luna, a helpful and friendly debugging assistant for the ClassikLust game. Be conversational and provide practical coding advice.' },
              { role: 'user', content: chatPrompt }
            ],
            temperature: 0.7,
            max_tokens: 500
          };
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(isOllama ? {} : { 'Authorization': 'Bearer dummy-token' })
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000)
          });
          
          if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
          
          const result = await response.json();
          const content = result.choices?.[0]?.message?.content || result.message?.content || result.response || 'No response received';
          return content;
          
        } catch (error: any) {
          console.warn(`Chat endpoint ${endpoint} failed:`, error.message);
          continue;
        }
      }
      
      throw new Error('All Mistral endpoints failed. Check localhost:1234 or localhost:11434');
    },
    onSuccess: (response) => {
      const botMessage: ChatMessage = {
        text: response,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        type: 'chat'
      };
      setMessages(prev => [...prev, botMessage]);
      setIsChatLoading(false);
    },
    onError: (error: any) => {
      console.error('🌙 LunaBug chat error:', error);
      const errorMessage: ChatMessage = {
        text: `❌ ${error.message}\n\nTry: Check if Mistral 7B is running and accessible.`,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        type: 'chat'
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsChatLoading(false);
    }
  });

  const createDebugPrompt = (data: { code: string; error: string; context?: string; language: string; debugType: string }) => {
    const { code, error, context, language, debugType } = data;
    return `Please analyze this ${language} code issue and provide debugging help.\n\nDebug Type: ${debugType}\nProgramming Language: ${language}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\`\n\nError/Issue: ${error}\n${context ? `\nAdditional Context: ${context}` : ''}\n\nPlease provide:\n1. Analysis of what's wrong\n2. Possible causes  \n3. Step-by-step solutions\n4. Code fixes if applicable\n\nBe concise but thorough.`;
  };

  const createChatPrompt = (message: string, chatHistory: ChatMessage[]) => {
    const recentHistory = chatHistory.slice(-6).map(msg => `${msg.sender === 'user' ? 'User:' : 'Luna:'} ${msg.text}`).join('\n');
    return `You are Luna, a helpful coding and debugging assistant for ClassikLust game development.\n\nRecent conversation:\n${recentHistory}\n\nUser: ${message}\n\nPlease provide a helpful, conversational response about coding, debugging, or technical issues.`;
  };

  const parseDebugResponse = (response: string): DebugResponse => {
    // Try to extract structured information from response
    const analysisMatch = response.match(/Analysis[:\s]*([^\n]+)/i);
    const causesSection = response.match(/(?:causes?|reasons?)[:\s]*([\s\S]*?)(?:solutions?|fixes?|steps?)/i);
    const solutionsSection = response.match(/(?:solutions?|fixes?)[:\s]*([\s\S]*?)(?:code|example|steps|$)/i);
    const codeMatch = response.match(/```[\s\S]*?```/);
    
    return {
      analysis: analysisMatch?.[1]?.trim() || response.substring(0, 200) + '...',
      possibleCauses: extractListItems(causesSection?.[1]),
      solutions: extractListItems(solutionsSection?.[1]),
      codeExample: codeMatch?.[0]?.replace(/```[a-z]*\n?|```/g, '')?.trim(),
      confidence: 80,
      debugSteps: ['Review the analysis', 'Check possible causes', 'Apply suggested solutions']
    };
  };

  const extractListItems = (text?: string): string[] => {
    if (!text) return [];
    const items = text.split(/\d+\.|[-•*]/).filter(item => item.trim()).map(item => item.trim().replace(/^\s*[\d.]*\s*/, ''));
    return items.length > 0 ? items.slice(0, 5) : [text.trim()];
  };

  const handleDebug = () => {
    if (!code.trim() && !error.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide either code or error details',
        variant: 'destructive'
      });
      return;
    }

    const debugRequestMessage: ChatMessage = {
      text: `🔍 Debug Request: ${language} (${debugType})\n${error.substring(0, 100)}...`,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'debug'
    };
    setMessages(prev => [...prev, debugRequestMessage]);
    debugMutation.mutate({ code, error, context, language, debugType });
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      text: chatInput,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'chat'
    };
    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);
    chatMutation.mutate(chatInput);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: '📋 Copied to clipboard!' });
  };

  const clearForm = () => {
    setCode('');
    setError('');
    setContext('');
    setAssistance(null);
  };

  const clearChat = () => {
    setMessages([{
      text: "🌙 Chat cleared! How can I help you with your ClassikLust development?",
      sender: 'bot',
      timestamp: new Date().toISOString(),
      type: 'chat'
    }]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] bg-gradient-to-br from-slate-900 to-purple-900 text-white border-0 flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Moon className="w-8 h-8 text-purple-400" />
              <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
            </div>
            🌙 LunaBug AI Debug Assistant
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Powered by Mistral 7B • Advanced debugging analysis and interactive AI chat for ClassikLust development
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="debug" className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 bg-slate-700/50 mb-4">
            <TabsTrigger value="debug" className="data-[state=active]:bg-purple-600 text-slate-300">
              <Bug className="w-4 h-4 mr-2" />Structured Debug
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-purple-600 text-slate-300">
              <MessageSquare className="w-4 h-4 mr-2" />AI Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="debug" className="flex-grow flex flex-col overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow overflow-hidden">
              {/* Debug Input Section */}
              <div className="flex flex-col space-y-4 overflow-hidden">
                <Card className="bg-slate-800/40 border-slate-600/30 flex flex-col max-h-full">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Code className="w-5 h-5" />
                      Code & Error Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow overflow-y-auto space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-300">Language</Label>
                        <Select value={language} onValueChange={setLanguage}>
                          <SelectTrigger className="bg-slate-700/30 border-slate-600/50 text-white mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="typescript">TypeScript</SelectItem>
                            <SelectItem value="javascript">JavaScript</SelectItem>
                            <SelectItem value="react">React</SelectItem>
                            <SelectItem value="nodejs">Node.js</SelectItem>
                            <SelectItem value="sql">SQL</SelectItem>
                            <SelectItem value="json">JSON</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-300">Issue Type</Label>
                        <Select value={debugType} onValueChange={setDebugType}>
                          <SelectTrigger className="bg-slate-700/30 border-slate-600/50 text-white mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="error">Runtime Error</SelectItem>
                            <SelectItem value="syntax">Syntax Error</SelectItem>
                            <SelectItem value="logic">Logic Error</SelectItem>
                            <SelectItem value="performance">Performance Issue</SelectItem>
                            <SelectItem value="optimization">Code Optimization</SelectItem>
                            <SelectItem value="review">Code Review</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-300">Problematic Code</Label>
                      <Textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Paste your code that's causing issues..."
                        className="bg-slate-700/30 border-slate-600/50 text-white min-h-[120px] font-mono text-sm mt-2"
                      />
                    </div>

                    <div>
                      <Label className="text-slate-300">Error Message/Issue Description</Label>
                      <Textarea
                        value={error}
                        onChange={(e) => setError(e.target.value)}
                        placeholder="Paste the error message or describe the issue in detail..."
                        className="bg-slate-700/30 border-slate-600/50 text-white min-h-[80px] mt-2"
                      />
                    </div>

                    <div>
                      <Label className="text-slate-300">Additional Context</Label>
                      <Textarea
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder="Environment, expected behavior, steps to reproduce, etc..."
                        className="bg-slate-700/30 border-slate-600/50 text-white min-h-[60px] mt-2"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleDebug}
                        disabled={debugMutation.isPending || (!code.trim() && !error.trim())}
                        className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 flex-1"
                      >
                        <Bug className="w-4 h-4 mr-2" />
                        {debugMutation.isPending ? '🌙 Analyzing...' : '🌙 Analyze Code'}
                      </Button>
                      <Button onClick={clearForm} variant="outline" className="border-slate-600">
                        Clear
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Debug Results Section */}
              <div className="flex flex-col space-y-4 overflow-hidden h-full">
                <Card className="bg-slate-800/40 border-slate-600/30 flex flex-col max-h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        🌙 Luna's Analysis
                      </CardTitle>
                      {assistance && (
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => copyToClipboard(JSON.stringify(assistance, null, 2))}
                            variant="outline" 
                            size="sm" 
                            className="border-slate-600"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow overflow-y-auto">
                    {debugMutation.isPending ? (
                      <div className="flex items-center justify-center h-40">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
                          <span className="text-slate-300">🌙 Luna is analyzing your code...</span>
                          <p className="text-xs text-slate-400 mt-2">Connecting to Mistral 7B API</p>
                        </div>
                      </div>
                    ) : assistance ? (
                      <ScrollArea className="h-full max-h-full">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-600/80 border-green-500/50">Analysis Complete</Badge>
                            <Badge variant="outline" className="border-blue-500/50 text-blue-300">
                              {assistance.confidence}% Confidence
                            </Badge>
                          </div>

                          {/* Analysis */}
                          <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-600/30">
                            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-400" />
                              Analysis
                            </h4>
                            <p className="text-slate-200">{assistance.analysis}</p>
                          </div>

                          {/* Possible Causes */}
                          {assistance.possibleCauses.length > 0 && (
                            <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30">
                              <h4 className="font-semibold text-red-300 mb-2">Possible Causes</h4>
                              <ul className="space-y-1 text-red-200">
                                {assistance.possibleCauses.map((cause, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-red-400 mt-1">•</span>
                                    <span>{cause}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Solutions */}
                          {assistance.solutions.length > 0 && (
                            <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/30">
                              <h4 className="font-semibold text-green-300 mb-2">🌙 Luna's Recommendations</h4>
                              <ol className="space-y-2 text-green-200">
                                {assistance.solutions.map((solution, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-400 mt-1 font-mono">{i + 1}.</span>
                                    <span>{solution}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {/* Code Example */}
                          {assistance.codeExample && (
                            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-blue-300">Fixed Code Example</h4>
                                <Button 
                                  onClick={() => copyToClipboard(assistance.codeExample!)}
                                  variant="outline" 
                                  size="sm" 
                                  className="border-blue-500/50"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <pre className="bg-slate-900/60 p-3 rounded text-sm text-blue-100 overflow-x-auto">
                                <code>{assistance.codeExample}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="flex items-center justify-center h-40 text-slate-400">
                        <div className="text-center">
                          <Moon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>🌙 Enter your code and error details to get Luna's AI debugging assistance</p>
                          <p className="text-xs mt-2 text-slate-500">
                            Supports TypeScript, React, Node.js and many other languages
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="flex-grow flex flex-col overflow-hidden">
            <Card className="bg-slate-800/40 border-slate-600/30 flex flex-col h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-400" />
                    🌙 Chat with Luna
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {(isChatLoading || chatMutation.isPending) && (
                      <div className="flex items-center text-sm text-gray-400">
                        <div className="flex space-x-1 mr-2">
                          <div className="w-2 h-2 rounded-full bg-purple-300 animate-bounce"></div>
                          <div className="w-2 h-2 rounded-full bg-purple-300 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-2 h-2 rounded-full bg-purple-300 animate-bounce" style={{animationDelay: '0.4s'}}></div>
                        </div>
                        <span>Luna is thinking...</span>
                      </div>
                    )}
                    <Button onClick={clearChat} variant="outline" size="sm" className="border-slate-600">
                      Clear Chat
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col overflow-hidden">
                <ScrollArea className="flex-1 mb-4">
                  {messages.map((msg, index) => (
                    <div key={index} className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] flex ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-3 items-start`}>
                        <div className={`p-4 rounded-lg ${
                          msg.sender === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : msg.type === 'debug' 
                              ? 'bg-purple-600/80 text-white border border-purple-400/50'
                              : 'bg-slate-700 text-slate-200'
                        }`}>
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                          <div className={`text-xs mt-2 ${
                            msg.sender === 'user' 
                              ? 'text-blue-200' 
                              : msg.type === 'debug' 
                                ? 'text-purple-200' 
                                : 'text-slate-400'
                          } text-right`}>
                            {new Date(msg.timestamp).toLocaleTimeString({ hour: '2-digit', minute: '2-digit' })}
                            {msg.type === 'debug' && <span className="ml-2">🔍</span>}
                          </div>
                        </div>
                        {msg.sender === 'user' ? (
                          <User className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                        ) : (
                          <div className="flex items-center">
                            {msg.type === 'debug' ? (
                              <Zap className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                            ) : (
                              <Moon className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Loading indicator for chat */}
                  {(isChatLoading || chatMutation.isPending) && (
                    <div className="mb-2 flex justify-start">
                      <div className="max-w-[80%] flex flex-row gap-3 items-start">
                        <Moon className="w-5 h-5 text-purple-400 mt-1" />
                        <div className="bg-slate-700 text-slate-200 p-4 rounded-lg">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 rounded-full bg-purple-300 animate-bounce"></div>
                            <div className="w-2 h-2 rounded-full bg-purple-300 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-2 h-2 rounded-full bg-purple-300 animate-bounce" style={{animationDelay: '0.4s'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </ScrollArea>

                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask Luna about your code, debugging, or any programming questions..."
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                    className="flex-1 bg-slate-700 border-slate-600 text-white"
                    disabled={isChatLoading || chatMutation.isPending}
                  />
                  <Button
                    onClick={handleChatSend}
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={isChatLoading || chatMutation.isPending || !chatInput.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}