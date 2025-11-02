import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useGame } from "@/contexts/GameContext";
import { User } from "lucide-react";

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
};

export default function ChatModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { state } = useGame();

  // Fetch current character for AI context
  const { data: currentCharacter } = useQuery({
    queryKey: ['/api/characters', state?.selectedCharacterId],
    queryFn: async () => {
      if (!state?.selectedCharacterId) return null;
      const response = await apiRequest('GET', `/api/characters/${state.selectedCharacterId}`);
      return await response.json();
    },
    enabled: !!state?.selectedCharacterId,
  });

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOpen, messages]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: ChatMessage = { 
      id: crypto.randomUUID(), 
      role: 'user', 
      content: input.trim(), 
      timestamp: Date.now() 
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // Try AI endpoint with character context
    try {
      setIsStreaming(true);
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        },
        body: JSON.stringify({ 
          message: userMsg.content,
          characterId: state?.selectedCharacterId,
          characterName: currentCharacter?.name || 'Assistant'
        }),
      });

      if (res.headers.get('content-type')?.includes('text/event-stream')) {
        // SSE streaming response
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let assistant: ChatMessage = { 
          id: crypto.randomUUID(), 
          role: 'assistant', 
          content: "", 
          timestamp: Date.now() 
        };
        setMessages(prev => [...prev, assistant]);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          assistant = { ...assistant, content: assistant.content + chunk };
          setMessages(prev => prev.map(m => m.id === assistant.id ? assistant : m));
        }
      } else if (res.ok) {
        // JSON response
        const data = await res.json();
        const assistant: ChatMessage = { 
          id: crypto.randomUUID(), 
          role: 'assistant', 
          content: data.reply || data.message || 'Hello there!', 
          timestamp: Date.now() 
        };
        setMessages(prev => [...prev, assistant]);
      } else {
        throw new Error(`Server responded with ${res.status}`);
      }
    } catch (e) {
      console.log('AI Chat endpoint not ready:', e);
      const err: ChatMessage = { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        content: `Hi ${state?.selectedCharacterId || 'there'}! AI chat is coming soon... 🤖✨`, 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, err]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl border border-purple-500/40 bg-gray-900/95 backdrop-blur-lg overflow-hidden">
        
        {/* Chat Header with Character Info */}
        <div className="p-4 border-b border-purple-500/30 bg-gradient-to-r from-purple-900/50 to-pink-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-purple-400/50">
                {currentCharacter?.defaultImage ? (
                  <img 
                    src={currentCharacter.defaultImage} 
                    alt={currentCharacter.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/uploads/placeholder-avatar.jpg';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <div className="font-semibold text-white">
                  {currentCharacter ? `Chat with ${currentCharacter.name}` : 'AI Chat'}
                </div>
                <div className="text-xs text-purple-300">
                  {currentCharacter ? 'Online • Ready to chat' : 'Select a character to start'}
                </div>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Messages Area */}
        <div ref={scrollRef} className="h-[50vh] overflow-y-auto p-4 space-y-3 bg-gray-900/20">
          {messages.map(m => (
            <div key={m.id} className={`max-w-[80%] ${m.role === 'user' ? 'ml-auto text-right' : ''}`}>
              <div className={`inline-block px-4 py-2 rounded-2xl text-sm ${
                m.role === 'user' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-black/40 text-gray-200 border border-purple-500/20'
              }`}>
                {m.content}
              </div>
              <div className="text-xs text-gray-500 mt-1 px-1">
                {new Date(m.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              <div className="text-4xl mb-2">💬</div>
              <div>Start a conversation with {currentCharacter?.name || 'your character'}!</div>
            </div>
          )}
          {isStreaming && (
            <div className="max-w-[80%]">
              <div className="inline-block px-4 py-2 rounded-2xl text-sm bg-black/40 text-gray-200 border border-purple-500/20">
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border border-purple-400 border-t-transparent rounded-full"></div>
                  Thinking...
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Input Area */}
        <div className="p-4 border-t border-purple-500/30 bg-black/20">
          <div className="flex gap-3">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${currentCharacter?.name || 'AI'}...`}
              className="flex-1 bg-black/40 border border-purple-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-400 outline-none focus:border-purple-400 transition-colors" 
              disabled={isStreaming}
            />
            <button 
              onClick={sendMessage} 
              disabled={isStreaming || !input.trim()}
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm font-medium transition-colors"
            >
              {isStreaming ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}