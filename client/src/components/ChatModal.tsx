import React, { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOpen, messages]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // Try SSE first, fallback to JSON
    try {
      setIsStreaming(true);
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      });

      if (res.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let assistant: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: "", timestamp: Date.now() };
        setMessages(prev => [...prev, assistant]);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          assistant = { ...assistant, content: assistant.content + chunk };
          setMessages(prev => prev.map(m => m.id === assistant.id ? assistant : m));
        }
      } else {
        const data = await res.json();
        const assistant: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: data.reply || '...', timestamp: Date.now() };
        setMessages(prev => [...prev, assistant]);
      }
    } catch (e) {
      const err: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: 'Sorry, there was an error. Please try again.', timestamp: Date.now() };
      setMessages(prev => [...prev, err]);
    } finally {
      setIsStreaming(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-3xl mx-4 rounded-lg border border-purple-500/40 bg-gray-900/95 backdrop-blur">
        <div className="p-3 border-b border-purple-500/30 flex items-center justify-between">
          <div className="text-sm font-semibold text-purple-300">AI Chat</div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <div ref={scrollRef} className="h-[50vh] overflow-y-auto p-4 space-y-3">
          {messages.map(m => (
            <div key={m.id} className={`max-w-[80%] ${m.role === 'user' ? 'ml-auto text-right' : ''}`}>
              <div className={`inline-block px-3 py-2 rounded-lg text-sm ${m.role === 'user' ? 'bg-purple-600 text-white' : 'bg-black/40 text-gray-200 border border-purple-500/20'}`}>{m.content}</div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm">Say hi to your waifu! ✨</div>
          )}
        </div>
        <div className="p-3 border-t border-purple-500/30 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-black/40 border border-purple-500/30 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-400" />
          <button onClick={sendMessage} disabled={isStreaming} className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm disabled:opacity-50">Send</button>
        </div>
      </div>
    </div>
  );
}
