import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Code, Bug, Sparkles, Copy, RefreshCw, AlertTriangle, MessageSquare, Send, Bot, User, Zap, Moon, Key, Eye, Scan, Activity, FileSearch, Database, Globe } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';

interface LunaBugEnhancedProps {
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
  autoFixAvailable?: boolean;
}

interface ChatMessage {
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  type?: 'debug' | 'chat' | 'system' | 'auto-analysis';
}

interface GameStateAnalysis {
  issues: string[];
  warnings: string[];
  optimizations: string[];
  performance: {
    score: number;
    issues: string[];
  };
}

export default function LunaBugEnhanced({ isOpen, onClose }: LunaBugEnhancedProps) {
  const { state, upgrades, characters, images } = useGame();
  
  // Enhanced state management
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [context, setContext] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [debugType, setDebugType] = useState('error');
  const [assistance, setAssistance] = useState<DebugResponse | null>(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('mistral_api_key') || '');
  const [apiKeySet, setApiKeySet] = useState(() => !!localStorage.getItem('mistral_api_key'));
  
  // Real-time debugging features
  const [autoAnalysisEnabled, setAutoAnalysisEnabled] = useState(false);
  const [realTimeMonitoring, setRealTimeMonitoring] = useState(false);
  const [gameStateAnalysis, setGameStateAnalysis] = useState<GameStateAnalysis | null>(null);

  // Chat state with enhanced system messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      text: "🌙 Welcome! I'm Luna, your enhanced AI debugging assistant. I can now:\n\n✨ Auto-analyze your game state\n🔍 Monitor for issues in real-time\n🛠️ Suggest optimizations automatically\n📊 Check database consistency\n🎮 Analyze game balance\n\nSet your Mistral API key to get started!",
      sender: 'bot',
      timestamp: new Date().toISOString(),
      type: 'system'
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

  // REAL-TIME GAME STATE MONITORING
  useEffect(() => {
    if (!realTimeMonitoring || !apiKeySet) return;

    const interval = setInterval(async () => {
      await performGameStateAnalysis();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [realTimeMonitoring, apiKeySet, state]);

  // AUTO-ANALYSIS OF GAME STATE
  const performGameStateAnalysis = useCallback(async () => {
    if (!state || !apiKeySet) return;

    const gameData = {
      player: {
        points: state.points,
        lustPoints: state.lustPoints,
        energy: state.energy,
        maxEnergy: state.maxEnergy,
        level: state.level,
        boostActive: state.boostActive
      },
      upgrades: Object.keys(state.upgrades).length,
      characters: characters.length,
      images: images.length,
      issues: []
    };

    // Detect common issues automatically
    const detectedIssues = [];
    const warnings = [];
    const optimizations = [];

    // Energy issues
    if (state.energy === 0) {
      detectedIssues.push("Player has no energy - gameplay blocked");
    } else if (state.energy < state.maxEnergy * 0.2) {
      warnings.push("Low energy - consider energy regen upgrades");
    }

    // Balance issues
    if (state.points > 1000000) {
      warnings.push("Very high point values - potential inflation");
    }

    // Performance optimizations
    if (Object.keys(state.upgrades).length > 50) {
      optimizations.push("Consider upgrade batching for performance");
    }

    if (characters.length > 20) {
      optimizations.push("Large character array - consider pagination");
    }

    const analysis: GameStateAnalysis = {
      issues: detectedIssues,
      warnings,
      optimizations,
      performance: {
        score: Math.max(0, 100 - (detectedIssues.length * 30) - (warnings.length * 10)),
        issues: [...detectedIssues, ...warnings]
      }
    };

    setGameStateAnalysis(analysis);

    // Auto-send analysis if issues found
    if (autoAnalysisEnabled && (detectedIssues.length > 0 || warnings.length > 0)) {
      const analysisMessage: ChatMessage = {
        text: `🔍 Auto-Analysis Alert!\n\n${detectedIssues.length > 0 ? `❌ Issues Found:\n${detectedIssues.map(i => `• ${i}`).join('\n')}\n` : ''}${warnings.length > 0 ? `⚠️ Warnings:\n${warnings.map(w => `• ${w}`).join('\n')}\n` : ''}${optimizations.length > 0 ? `💡 Optimizations:\n${optimizations.map(o => `• ${o}`).join('\n')}` : ''}`,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        type: 'auto-analysis'
      };
      setMessages(prev => [...prev, analysisMessage]);
    }
  }, [state, characters, images, autoAnalysisEnabled, apiKeySet]);

  // Enhanced API call with function calling capabilities
  const debugMutation = useMutation({
    mutationFn: async (data: { code: string; error: string; context?: string; language: string; debugType: string; includeGameState?: boolean }) => {
      if (!apiKeySet || !apiKey) {
        throw new Error('Please set your Mistral AI API key first');
      }

      const prompt = createEnhancedDebugPrompt(data);
      
      console.log('🌙 LunaBug enhanced analysis...');
      
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'mistral-medium', // Use more powerful model for complex analysis
          messages: [
            {
              role: 'system',
              content: `You are Luna, an expert debugging assistant for the ClassikLust TypeScript/React game with real-time analysis capabilities. 

You have access to live game state data and can:
- Analyze performance issues
- Detect logic problems  
- Suggest optimizations
- Check data consistency
- Provide automated fixes

Current Game State Summary:
- Player Level: ${state?.level || 1}
- Points: ${state?.points || 0}
- Energy: ${state?.energy || 0}/${state?.maxEnergy || 1000}
- Upgrades Owned: ${Object.keys(state?.upgrades || {}).length}
- Characters: ${characters.length}
- Boost Active: ${state?.boostActive ? 'Yes' : 'No'}

Provide precise, actionable debugging advice with automatic fixes when possible.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
          top_p: 0.9
        }),
        signal: AbortSignal.timeout(30000)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your Mistral AI API key.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        throw new Error(`Mistral AI API error (${response.status}): ${errorData.message || response.statusText}`);
      }
      
      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || 'No response received';
      return parseEnhancedDebugResponse(content);
    },
    onSuccess: (data) => {
      setAssistance(data);
      const debugMessage: ChatMessage = {
        text: `🌙 Enhanced Analysis Complete!\n\n${data.analysis}\n\n${data.autoFixAvailable ? '🔧 Auto-fix available!\n\n' : ''}Solutions:\n${data.solutions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        type: 'debug'
      };
      setMessages(prev => [...prev, debugMessage]);
      toast({ 
        title: '🌙 Luna analysis complete!', 
        description: `Found ${data.solutions.length} solutions${data.autoFixAvailable ? ' with auto-fix' : ''}` 
      });
    },
    onError: (error: any) => {
      console.error('🌙 LunaBug enhanced debug error:', error);
      const errorMessage: ChatMessage = {
        text: `❌ Error: ${error.message}\n\n🔧 Troubleshooting:\n1. Check your Mistral AI API key\n2. Verify account has sufficient credits\n3. Check internet connection\n4. Try again in a few moments`,
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

  // Enhanced chat with function calling
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!apiKeySet || !apiKey) {
        throw new Error('Please set your Mistral AI API key first');
      }

      const enhancedPrompt = createEnhancedChatPrompt(message, messages);
      
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'mistral-medium',
          messages: [
            { 
              role: 'system', 
              content: `You are Luna, an intelligent debugging assistant for ClassikLust game with real-time capabilities.

Current Game State:
- Player Level: ${state?.level || 1} 
- Points: ${(state?.points || 0).toLocaleString()}
- Energy: ${state?.energy || 0}/${state?.maxEnergy || 1000}
- Boost: ${state?.boostActive ? `${state.boostMultiplier}x active` : 'inactive'}
- Upgrades: ${Object.keys(state?.upgrades || {}).length} owned
- Characters: ${characters.length} available
- Current Character: ${characters.find(c => c.id === state?.selectedCharacterId)?.name || 'Unknown'}

You can:
🔍 Analyze code and suggest fixes
📊 Review game balance and performance  
🛠️ Provide automated solutions
⚡ Monitor real-time state changes
🎮 Optimize gameplay mechanics

Be conversational but precise. Offer to analyze specific aspects when relevant.`
            },
            { role: 'user', content: enhancedPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1000
        }),
        signal: AbortSignal.timeout(20000)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error (${response.status}): ${errorData.message || response.statusText}`);
      }
      
      const result = await response.json();
      return result.choices?.[0]?.message?.content || 'No response received';
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
      const errorMessage: ChatMessage = {
        text: `❌ ${error.message}\n\nTip: Make sure your Mistral AI API key is valid and has sufficient credits.`,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        type: 'chat'
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsChatLoading(false);
    }
  });

  // ENHANCED PROMPT WITH GAME STATE CONTEXT
  const createEnhancedDebugPrompt = (data: { code: string; error: string; context?: string; language: string; debugType: string; includeGameState?: boolean }) => {
    const { code, error, context, language, debugType, includeGameState } = data;
    
    const gameStateContext = includeGameState ? `

CURRENT GAME STATE:
- Player Points: ${(state?.points || 0).toLocaleString()}
- Player Level: ${state?.level || 1}
- Energy: ${state?.energy || 0}/${state?.maxEnergy || 1000}
- Active Upgrades: ${Object.entries(state?.upgrades || {}).map(([id, level]) => `${id}: ${level}`).join(', ')}
- Boost Active: ${state?.boostActive ? `${state?.boostMultiplier}x` : 'No'}
- Characters Unlocked: ${state?.unlockedCharacters?.join(', ') || 'aria'}
` : '';

    return [
      `Please analyze this ${language} issue in the ClassikLust game and provide enhanced debugging assistance.`,
      ``,
      `Debug Type: ${debugType}`,
      `Programming Language: ${language}`,
      gameStateContext,
      `Code:`,
      '```' + language,
      code,
      '```',
      ``,
      `Error/Issue: ${error}`,
      context ? `Additional Context: ${context}` : '',
      ``,
      `Please provide:`,
      `1. Root cause analysis`,
      `2. Possible causes with game context`,
      `3. Step-by-step solutions`,
      `4. Code fixes with explanations`,
      `5. Prevention strategies`,
      `6. Performance impact assessment`,
      ``,
      `If this is a common game development pattern, suggest automated fixes or optimizations.`
    ].join('\n');
  };

  const createEnhancedChatPrompt = (message: string, chatHistory: ChatMessage[]) => {
    const recentHistory = chatHistory.slice(-8).map(msg => `${msg.sender === 'user' ? 'User:' : 'Luna:'} ${msg.text}`).join('\n');
    
    return [
      `You are Luna, an intelligent debugging assistant for ClassikLust game development.`,
      ``,
      `Game Context - Current Session:`,
      `- Points: ${(state?.points || 0).toLocaleString()}`,
      `- Level: ${state?.level || 1}`,  
      `- Energy: ${state?.energy}/${state?.maxEnergy}`,
      `- Active Character: ${characters.find(c => c.id === state?.selectedCharacterId)?.name || 'Unknown'}`,
      `- Upgrades: ${Object.keys(state?.upgrades || {}).length} owned`,
      ``,
      `Recent conversation:`,
      recentHistory,
      ``,
      `User: ${message}`,
      ``,
      `Provide helpful analysis. If the user asks about issues, offer to analyze their game state or specific code. Be proactive in suggesting debugging approaches.`
    ].join('\n');
  };

  const parseEnhancedDebugResponse = (response: string): DebugResponse => {
    // Enhanced parsing with auto-fix detection
    const analysisMatch = response.match(/(?:Analysis|Root cause)[:\s]*([^\n]+)/i);
    const causesSection = response.match(/(?:causes?|reasons?)[:.]*([^]*?)(?:solutions?|fixes?|steps?)/i);
    const solutionsSection = response.match(/(?:solutions?|fixes?)[:.]*([^]*?)(?:code|example|prevention|$)/i);
    const codeMatch = response.match(/```[\s\S]*?```/);
    const autoFixMatch = response.match(/(?:auto[\-\s]?fix|automated?\s+(?:fix|solution))/i);
    
    return {
      analysis: analysisMatch?.[1]?.trim() || response.substring(0, 300) + '...',
      possibleCauses: extractListItems(causesSection?.[1]),
      solutions: extractListItems(solutionsSection?.[1]),
      codeExample: codeMatch?.[0]?.replace(/```[a-z]*\n?|```/g, '')?.trim(),
      confidence: autoFixMatch ? 95 : 85,
      debugSteps: ['Review analysis', 'Check causes', 'Apply solutions', 'Test fixes'],
      autoFixAvailable: !!autoFixMatch
    };
  };

  const extractListItems = (text?: string): string[] => {
    if (!text) return [];
    const items = text.split(/\d+\.|[-•*]/).filter(item => item.trim()).map(item => item.trim());
    return items.length > 0 ? items.slice(0, 6) : [text.trim()];
  };

  // QUICK ACTIONS FOR LUNA
  const quickActions = [
    {
      id: 'analyze-state',
      label: '🔍 Analyze Game State',
      action: () => {
        const prompt = `Hey Luna, can you analyze my current game state and see if there are any issues or optimizations you'd recommend?`;
        sendQuickMessage(prompt);
      }
    },
    {
      id: 'check-performance',
      label: '⚡ Performance Check',
      action: () => {
        const prompt = `Luna, please check my game's performance. Are there any bottlenecks or optimization opportunities?`;
        sendQuickMessage(prompt);
      }
    },
    {
      id: 'balance-review',
      label: '⚖️ Balance Review',
      action: () => {
        const prompt = `Can you review my game balance? Check if upgrade costs, point gains, and progression feel right.`;
        sendQuickMessage(prompt);
      }
    },
    {
      id: 'code-scan',
      label: '🔬 Full Code Scan',
      action: () => {
        const prompt = `Luna, I'd like you to scan my entire codebase for potential issues. What tools or approaches would you recommend?`;
        sendQuickMessage(prompt);
      }
    }
  ];

  const sendQuickMessage = (message: string) => {
    const userMessage: ChatMessage = {
      text: message,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'chat'
    };
    setMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);
    chatMutation.mutate(message);
  };

  // Save API key
  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your Mistral AI API key',
        variant: 'destructive'
      });
      return;
    }
    
    localStorage.setItem('mistral_api_key', apiKey);
    setApiKeySet(true);
    toast({
      title: '🌙 Enhanced LunaBug Connected!',
      description: 'Mistral AI API key saved - Real-time debugging enabled'
    });
    
    setMessages([{
      text: "🌙 Perfect! I'm now connected to Mistral AI with enhanced capabilities!\n\n✨ I can now:\n• Auto-analyze your game state\n• Monitor for issues in real-time\n• Provide contextual debugging\n• Suggest performance optimizations\n• Help with code reviews\n\nTry asking me: 'Hey Luna, see anything that might cause issues?' 😄",
      sender: 'bot',
      timestamp: new Date().toISOString(),
      type: 'system'
    }]);
  };

  // Enhanced debug handler with game state
  const handleEnhancedDebug = () => {
    if (!apiKeySet) {
      toast({
        title: 'API Key Required',
        description: 'Please set your Mistral AI API key first',
        variant: 'destructive'
      });
      return;
    }

    if (!code.trim() && !error.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide either code or error details',
        variant: 'destructive'
      });
      return;
    }

    const debugRequestMessage: ChatMessage = {
      text: `🔍 Enhanced Debug Request: ${language} (${debugType})\n${error.substring(0, 100)}...\n\n📊 Including game state context for better analysis`,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'debug'
    };
    setMessages(prev => [...prev, debugRequestMessage]);
    debugMutation.mutate({ code, error, context, language, debugType, includeGameState: true });
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    if (!apiKeySet) {
      toast({
        title: 'API Key Required',
        description: 'Please set your Mistral AI API key first',
        variant: 'destructive'
      });
      return;
    }

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] bg-gradient-to-br from-slate-900 to-purple-900 text-white border-0 flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Moon className="w-8 h-8 text-purple-400" />
              <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
            </div>
            🌙 LunaBug Enhanced AI Assistant
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Powered by Mistral AI • Real-time debugging, auto-analysis, and intelligent code assistance
          </DialogDescription>
        </DialogHeader>

        {/* API KEY SETUP */}
        {!apiKeySet && (
          <Card className="bg-yellow-900/40 border-yellow-500/50 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-yellow-400" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-300 mb-2">Mistral AI API Key Required</h4>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your Mistral AI API key..."
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                    <Button onClick={handleSaveApiKey} className="bg-yellow-600 hover:bg-yellow-700">
                      Save Key
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ENHANCED CONTROLS */}
        {apiKeySet && (
          <Card className="bg-slate-800/40 border-slate-600/30 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-400" />
                    <Label className="text-sm text-slate-300">Real-time Monitoring</Label>
                    <Switch 
                      checked={realTimeMonitoring} 
                      onCheckedChange={setRealTimeMonitoring}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Scan className="w-4 h-4 text-blue-400" />
                    <Label className="text-sm text-slate-300">Auto-Analysis</Label>
                    <Switch 
                      checked={autoAnalysisEnabled} 
                      onCheckedChange={setAutoAnalysisEnabled}
                    />
                  </div>
                </div>
                
                {gameStateAnalysis && (
                  <Badge className={`${
                    gameStateAnalysis.performance.score > 80 ? 'bg-green-600' :
                    gameStateAnalysis.performance.score > 60 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}>
                    Performance: {gameStateAnalysis.performance.score}%
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="chat" className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 bg-slate-700/50 mb-4">
            <TabsTrigger value="chat" className="data-[state=active]:bg-purple-600 text-slate-300">
              <MessageSquare className="w-4 h-4 mr-2" />AI Chat
            </TabsTrigger>
            <TabsTrigger value="debug" className="data-[state=active]:bg-purple-600 text-slate-300">
              <Bug className="w-4 h-4 mr-2" />Enhanced Debug
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-purple-600 text-slate-300">
              <Eye className="w-4 h-4 mr-2" />Live Monitor
            </TabsTrigger>
          </TabsList>

          {/* ENHANCED CHAT TAB */}
          <TabsContent value="chat" className="flex-grow flex flex-col overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-grow overflow-hidden">
              
              {/* QUICK ACTIONS SIDEBAR */}
              <div className="lg:col-span-1">
                <Card className="bg-slate-800/40 border-slate-600/30 h-full">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {quickActions.map(action => (
                      <Button
                        key={action.id}
                        onClick={action.action}
                        size="sm"
                        variant="outline"
                        className="w-full justify-start text-xs border-slate-600 hover:bg-purple-600/20"
                        disabled={isChatLoading || chatMutation.isPending}
                      >
                        {action.label}
                      </Button>
                    ))}
                    
                    <div className="pt-2 border-t border-slate-600/50">
                      <Button
                        onClick={() => performGameStateAnalysis()}
                        size="sm"
                        className="w-full bg-purple-600/80 hover:bg-purple-700 text-xs"
                        disabled={!apiKeySet}
                      >
                        <Scan className="w-3 h-3 mr-2" />
                        Scan Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* MAIN CHAT AREA */}
              <Card className="bg-slate-800/40 border-slate-600/30 flex flex-col lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-green-400" />
                      🌙 Enhanced Luna Chat
                    </div>
                    <div className="flex items-center gap-2">
                      {(isChatLoading || chatMutation.isPending) && (
                        <div className="flex items-center text-sm text-gray-400">
                          <div className="flex space-x-1 mr-2">
                            <div className="w-2 h-2 rounded-full bg-purple-300 animate-bounce"></div>
                            <div className="w-2 h-2 rounded-full bg-purple-300 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-2 h-2 rounded-full bg-purple-300 animate-bounce" style={{animationDelay: '0.4s'}}></div>
                          </div>
                          <span>Luna is analyzing...</span>
                        </div>
                      )}
                      <Button 
                        onClick={() => setMessages([{
                          text: "🌙 Chat cleared! How can I help you with ClassikLust development?",
                          sender: 'bot',
                          timestamp: new Date().toISOString(),
                          type: 'chat'
                        }])} 
                        variant="outline" 
                        size="sm" 
                        className="border-slate-600"
                      >
                        Clear
                      </Button>
                    </div>
                  </CardTitle>
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
                                : msg.type === 'auto-analysis'
                                  ? 'bg-orange-600/80 text-white border border-orange-400/50'
                                  : msg.type === 'system'
                                    ? 'bg-green-600/80 text-white border border-green-400/50'
                                    : 'bg-slate-700 text-slate-200'
                          }`}>
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                            <div className={`text-xs mt-2 text-right ${
                              msg.sender === 'user' ? 'text-blue-200' : 'text-slate-300'
                            }`}>
                              {new Date(msg.timestamp).toLocaleTimeString({ hour: '2-digit', minute: '2-digit' })}
                              {msg.type === 'debug' && <span className="ml-2">🔍</span>}
                              {msg.type === 'auto-analysis' && <span className="ml-2">🔍</span>}
                              {msg.type === 'system' && <span className="ml-2">⚙️</span>}
                            </div>
                          </div>
                          {msg.sender === 'user' ? (
                            <User className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                          ) : (
                            <Moon className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask Luna anything: 'Hey Luna, see any issues?' or 'Analyze my game state'"
                      onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                      className="flex-1 bg-slate-700 border-slate-600 text-white"
                      disabled={isChatLoading || chatMutation.isPending || !apiKeySet}
                    />
                    <Button
                      onClick={handleChatSend}
                      className="bg-purple-600 hover:bg-purple-700"
                      disabled={isChatLoading || chatMutation.isPending || !chatInput.trim() || !apiKeySet}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ENHANCED DEBUG TAB (Original functionality) */}
          <TabsContent value="debug" className="flex-grow flex flex-col overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow overflow-hidden">
              {/* Debug Input */}
              <Card className="bg-slate-800/40 border-slate-600/30 flex flex-col">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Enhanced Debug Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="bg-slate-700/30 border-slate-600/50 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="react">React</SelectItem>
                        <SelectItem value="nodejs">Node.js</SelectItem>
                        <SelectItem value="sql">SQL</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={debugType} onValueChange={setDebugType}>
                      <SelectTrigger className="bg-slate-700/30 border-slate-600/50 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error">Runtime Error</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="logic">Logic Issue</SelectItem>
                        <SelectItem value="optimization">Optimization</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Paste problematic code here..."
                    className="bg-slate-700/30 border-slate-600/50 text-white min-h-[120px] font-mono text-sm"
                  />

                  <Textarea
                    value={error}
                    onChange={(e) => setError(e.target.value)}
                    placeholder="Describe the error or issue..."
                    className="bg-slate-700/30 border-slate-600/50 text-white min-h-[80px]"
                  />

                  <Button
                    onClick={handleEnhancedDebug}
                    disabled={debugMutation.isPending || (!code.trim() && !error.trim()) || !apiKeySet}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                  >
                    <Bug className="w-4 h-4 mr-2" />
                    {debugMutation.isPending ? '🌙 Analyzing...' : '🌙 Enhanced Analysis'}
                  </Button>
                </CardContent>
              </Card>

              {/* Debug Results */}
              <Card className="bg-slate-800/40 border-slate-600/30 flex flex-col">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    🌙 Luna's Enhanced Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  {assistance ? (
                    <ScrollArea className="h-full">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-600/80">Analysis Complete</Badge>
                          <Badge variant="outline" className="border-blue-500/50">
                            {assistance.confidence}% Confidence
                          </Badge>
                          {assistance.autoFixAvailable && (
                            <Badge className="bg-purple-600/80">Auto-Fix Ready</Badge>
                          )}
                        </div>

                        <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-600/30">
                          <h4 className="font-semibold text-white mb-2">Analysis</h4>
                          <p className="text-slate-200">{assistance.analysis}</p>
                        </div>

                        {assistance.solutions.length > 0 && (
                          <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/30">
                            <h4 className="font-semibold text-green-300 mb-2">🌙 Recommendations</h4>
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

                        {assistance.codeExample && (
                          <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-blue-300">Fixed Code</h4>
                              <Button 
                                onClick={() => copyToClipboard(assistance.codeExample!)}
                                variant="outline" 
                                size="sm"
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
                    <div className="flex items-center justify-center h-full text-slate-400">
                      <div className="text-center">
                        <Bug className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>🌙 Enhanced debugging ready</p>
                        <p className="text-xs mt-2">Includes game state context and auto-fix suggestions</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* LIVE MONITORING TAB */}
          <TabsContent value="monitoring" className="flex-grow flex flex-col overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-grow overflow-hidden">
              
              {/* Game State Monitor */}
              <Card className="bg-slate-800/40 border-slate-600/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-400" />
                    Live Game State
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/40 p-3 rounded-lg">
                      <div className="text-xs text-slate-400">Points</div>
                      <div className="text-lg font-bold text-green-400">
                        {(state?.points || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-900/40 p-3 rounded-lg">
                      <div className="text-xs text-slate-400">Energy</div>
                      <div className="text-lg font-bold text-blue-400">
                        {state?.energy || 0}/{state?.maxEnergy || 1000}
                      </div>
                    </div>
                    <div className="bg-slate-900/40 p-3 rounded-lg">
                      <div className="text-xs text-slate-400">Level</div>
                      <div className="text-lg font-bold text-purple-400">
                        {state?.level || 1}
                      </div>
                    </div>
                    <div className="bg-slate-900/40 p-3 rounded-lg">
                      <div className="text-xs text-slate-400">Upgrades</div>
                      <div className="text-lg font-bold text-cyan-400">
                        {Object.keys(state?.upgrades || {}).length}
                      </div>
                    </div>
                  </div>
                  
                  {gameStateAnalysis && (
                    <div className="space-y-2">
                      {gameStateAnalysis.issues.length > 0 && (
                        <div className="bg-red-900/20 p-2 rounded border border-red-500/30">
                          <div className="text-red-300 text-sm font-semibold">Issues:</div>
                          {gameStateAnalysis.issues.map((issue, i) => (
                            <div key={i} className="text-red-200 text-xs">• {issue}</div>
                          ))}
                        </div>
                      )}
                      {gameStateAnalysis.warnings.length > 0 && (
                        <div className="bg-yellow-900/20 p-2 rounded border border-yellow-500/30">
                          <div className="text-yellow-300 text-sm font-semibold">Warnings:</div>
                          {gameStateAnalysis.warnings.map((warning, i) => (
                            <div key={i} className="text-yellow-200 text-xs">• {warning}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Analysis Results */}
              <Card className="bg-slate-800/40 border-slate-600/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Scan className="w-5 h-5 text-purple-400" />
                    Auto-Analysis Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {gameStateAnalysis ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className={`${
                          gameStateAnalysis.performance.score > 80 ? 'bg-green-600' :
                          gameStateAnalysis.performance.score > 60 ? 'bg-yellow-600' : 'bg-red-600'
                        }`}>
                          Performance: {gameStateAnalysis.performance.score}%
                        </Badge>
                      </div>
                      
                      {gameStateAnalysis.optimizations.length > 0 && (
                        <div className="bg-blue-900/20 p-3 rounded border border-blue-500/30">
                          <div className="text-blue-300 text-sm font-semibold mb-2">💡 Optimizations:</div>
                          {gameStateAnalysis.optimizations.map((opt, i) => (
                            <div key={i} className="text-blue-200 text-xs mb-1">• {opt}</div>
                          ))}
                        </div>
                      )}
                      
                      <Button
                        onClick={() => {
                          const prompt = `Luna, I ran auto-analysis and got these results. Can you provide detailed recommendations?\n\nIssues: ${gameStateAnalysis.issues.join(', ')}\nWarnings: ${gameStateAnalysis.warnings.join(', ')}\nOptimizations: ${gameStateAnalysis.optimizations.join(', ')}`;
                          sendQuickMessage(prompt);
                        }}
                        size="sm"
                        className="w-full bg-purple-600/80 hover:bg-purple-700"
                        disabled={!apiKeySet}
                      >
                        <Moon className="w-4 h-4 mr-2" />
                        Ask Luna About Results
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 py-8">
                      <Scan className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Enable monitoring to see auto-analysis results</p>
                      <p className="text-xs mt-2">Luna will continuously check your game state</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}