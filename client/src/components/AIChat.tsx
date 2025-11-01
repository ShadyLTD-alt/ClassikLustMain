
/**
 * AIChat.tsx - Enhanced AI Chat Interface
 * Last Edited: 2025-08-19 by Assistant
 * 
 * Integrated enhanced chat functionality with AI custom functions and enhanced chat modal features
 */

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useGame } from "@/contexts/GameContext";

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'character';
  timestamp: Date;
  type: 'text' | 'image' | 'gift';
  mood?: string;
  reactionScore?: number;
  imageUrl?: string;
}

const MOODS = [
  { name: 'normal', emoji: '😊', color: 'bg-blue-500' },
  { name: 'happy', emoji: '😄', color: 'bg-yellow-500' },
  { name: 'flirty', emoji: '😘', color: 'bg-pink-500' },
  { name: 'playful', emoji: '😜', color: 'bg-green-500' },
  { name: 'mysterious', emoji: '😏', color: 'bg-purple-500' },
  { name: 'shy', emoji: '😳', color: 'bg-red-500' },
];

const QUICK_RESPONSES = [
  "Hi there! 👋",
  "How are you feeling today?",
  "Tell me about yourself",
  "What do you like to do?",
  "You look amazing! ✨",
  "Want to play a game?",
];

export default function AIChat() {
  const { state, characters } = useGame();
  const character = characters.find(c => c.id === state.selectedCharacterId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentMood, setCurrentMood] = useState("normal");
  const [characterMood, setCharacterMood] = useState("normal");
  const [typingIndicator, setTypingIndicator] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [pendingImage, setPendingImage] = useState<{url: string, id: string} | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load initial greeting
  useEffect(() => {
    if (character && messages.length === 0) {
      const greetings = [
        `Hi there! I'm ${character.name}, it's so nice to meet you! 💕`,
        `Hello! ${character.name} here. How has your day been? ✨`,
        `*waves excitedly* I've been waiting to chat with you! 😊`,
        `Hey! Ready for some fun conversation? I'm ${character.name}! 🌟`,
      ];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      setMessages([{
        id: 'initial-greeting',
        content: greeting,
        sender: 'character',
        timestamp: new Date(),
        type: 'text',
        mood: 'happy',
      }]);
    }
  }, [character]);

  const generateSmartResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    if (input.includes('hi') || input.includes('hello') || input.includes('hey')) {
      return `Hey! *smiles warmly* I'm so happy to see you! How's your day going? ✨`;
    }

    if (input.includes('beautiful') || input.includes('pretty') || input.includes('cute')) {
      return "*blushes* Aww, thank you so much! You're so sweet! That really made my day! 😊💕";
    }

    if (input.includes('how are you') || input.includes('how do you feel')) {
      return `I'm doing amazing now that I'm talking to you! *giggles* You always know how to brighten my mood! 😄`;
    }

    const responses = {
      normal: [
        "That's really interesting! Tell me more about that! 😊",
        "I love hearing your thoughts! You always have such unique perspectives! ✨",
      ],
      happy: [
        "That sounds absolutely wonderful! *bounces excitedly* I'm so happy for you! 😄✨",
        "Yay! That's amazing! Your enthusiasm is totally contagious! 🌟",
      ],
      flirty: [
        "*gives you a playful wink* You're quite the charmer, aren't you? 😘",
        "Mmm, I like the way you think... *leans closer* tell me more! 💋",
      ],
    };

    const moodResponses = responses[characterMood as keyof typeof responses] || responses.normal;
    return moodResponses[Math.floor(Math.random() * moodResponses.length)];
  };

  const getRandomMood = (): string => {
    const moods = ['normal', 'happy', 'flirty', 'playful', 'mysterious', 'shy'];
    return moods[Math.floor(Math.random() * moods.length)];
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !character) return;
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: newMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
      mood: currentMood,
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setTypingIndicator(true);

    // Simulate AI response
    const delay = Math.random() * 2000 + 2000;
    setTimeout(() => {
      const response = generateSmartResponse(userMessage.content);
      const aiMood = getRandomMood();
      
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: response,
        sender: 'character',
        timestamp: new Date(),
        type: 'text',
        mood: aiMood,
        reactionScore: Math.floor(Math.random() * 10) + 1,
      };

      setMessages(prev => [...prev, aiMessage]);
      setCharacterMood(aiMood);
      setTypingIndicator(false);
    }, delay);
  };

  const getMoodInfo = (mood: string) => {
    return MOODS.find(m => m.name === mood) || MOODS[0];
  };

  const formatTime = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!character) {
    return (
      <Card className="bg-black/20 border-purple-500/30">
        <CardContent className="py-12 text-center">
          <div className="space-y-4">
            <div className="text-white">
              <Heart className="h-12 w-12 mx-auto mb-4 text-purple-400" />
              <h3 className="text-lg font-semibold">No Character Selected</h3>
              <p className="text-gray-400">Select a character to start chatting!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 bg-black/30 border-b border-purple-500/30">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={character.avatarImage} alt={character.name} />
              <AvatarFallback className="bg-purple-600 text-white text-sm">
                {character.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">{character.name}</h3>
                <Badge variant="secondary" className={`capitalize ${getMoodInfo(characterMood).color} text-white text-xs`}>
                  {getMoodInfo(characterMood).emoji}
                </Badge>
              </div>
              <p className="text-xs text-gray-400">Online • Loves to chat</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`rounded-lg p-2 ${
                      message.sender === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs opacity-75">
                        {formatTime(message.timestamp)}
                      </span>
                      {message.mood && (
                        <Badge className={`text-xs ${getMoodInfo(message.mood).color} text-white`}>
                          {getMoodInfo(message.mood).emoji}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Avatar className={`w-8 h-8 ${message.sender === 'user' ? 'order-1' : 'order-2'}`}>
                  {message.sender === 'user' ? (
                    <AvatarFallback className="bg-purple-600 text-xs">U</AvatarFallback>
                  ) : (
                    <>
                      <AvatarImage src={character.avatarImage} alt={character.name} />
                      <AvatarFallback className="bg-gray-600 text-xs">{character.name[0]}</AvatarFallback>
                    </>
                  )}
                </Avatar>
              </div>
            ))}
            {typingIndicator && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={character.avatarImage} alt={character.name} />
                  <AvatarFallback className="bg-gray-600">{character.name[0]}</AvatarFallback>
                </Avatar>
                <div className="bg-gray-700 text-white rounded-lg p-3 max-w-[80%]">
                  <div className="flex items-center space-x-1">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-400 ml-2">{character.name} is typing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-black/20 border-t border-purple-500/30">
            <p className="text-sm text-gray-400 mb-2">Quick responses:</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_RESPONSES.map((response, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setNewMessage(response)}
                  className="text-xs border-gray-600 text-gray-300 hover:bg-purple-600/20 rounded-full"
                >
                  {response}
                </Button>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message ${character.name}...`}
                className="bg-black/50 border-gray-600 text-white rounded-full"
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-purple-600 hover:bg-purple-700 rounded-full"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
