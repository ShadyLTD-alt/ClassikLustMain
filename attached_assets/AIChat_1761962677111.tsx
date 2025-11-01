/**
 * AIChat.tsx - Enhanced AI Chat Interface
 * Last Edited: 2025-08-19 by Assistant
 * 
 * Integrated enhanced chat functionality with AI custom functions and enhanced chat modal features
 */

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Heart, Settings, Sparkles, MessageCircle, Bot, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// Removed useAuth dependency to prevent context errors
import { apiRequest } from "@/lib/queryClient";

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

interface Character {
  id: string;
  name: string;
  personality: string;
  backstory?: string;
  mood: string;
  level: number;
  isNsfw: boolean;
  isVip: boolean;
  isEvent: boolean;
  levelRequirement: number;
  customTriggers: unknown;
  createdAt: Date;
}

interface AIChatProps {
  userId?: string;
  selectedCharacterid?: string;
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

export default function AIChat({ userId: propUserId, selectedCharacterid }: AIChatProps) {
  const userId = propUserId;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentMood, setCurrentMood] = useState("normal");
  const [characterMood, setCharacterMood] = useState("normal");
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch selected character
  const { data: selectedCharacter } = useQuery({
    queryKey: ["/api/character/selected", userId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/character/selected/${userId}`);
      return response.json();
    },
    enabled: !selectedCharacterid,
  });

  // Fetch specific character if provided
  const { data: specificCharacter } = useQuery({
    queryKey: ["/api/character", selectedCharacterid],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/character/${selectedCharacterid}`);
      return response.json();
    },
    enabled: !!selectedCharacterid,
  });

  const character = specificCharacter || selectedCharacter;

  // Fetch chat messages from JSON files
  const { data: chatHistory = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/chat-history", userId, character?.id],
    queryFn: async () => {
      if (!character?.id) return [];
      const response = await fetch(`/api/chat-history/${userId}/${character.id}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data;
    },
    enabled: !!character?.id,
    refetchOnWindowFocus: false,
  });

  // Load chat history on character change ONLY
  useEffect(() => {
    if (!character?.id) {
      setMessages([]);
      return;
    }

    // Only update messages when we actually have chat history data AND character changes
    if (chatHistory && Array.isArray(chatHistory) && !messagesLoading) {
      if (chatHistory.length > 0) {
        const formattedMessages = chatHistory.map((msg: any) => ({
          id: msg.id || `msg-${Date.now()}-${Math.random()}`,
          content: msg.content || '',
          sender: (msg.sender === 'user' ? 'user' : 'character') as 'user' | 'character',
          timestamp: new Date(msg.timestamp || Date.now()),
          type: msg.type || 'text',
          mood: msg.mood || 'normal',
          reactionScore: msg.reactionScore,
        }));
        setMessages(formattedMessages);
        console.log(`Loaded ${formattedMessages.length} messages from chat history for ${character.name}`);
      } else {
        // Only show greeting if we're sure there are no messages and loading is complete
        const greeting = getCharacterGreeting();
        const greetingMessage = {
          id: 'initial-greeting',
          content: greeting,
          sender: 'character' as const,
          timestamp: new Date(),
          type: 'text' as const,
          mood: 'happy',
        };
        setMessages([greetingMessage]);
        console.log(`Showing initial greeting for ${character.name}`);
      }
    }
  }, [character?.id, messagesLoading])  // Removed chatHistory?.length dependency

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getCharacterGreeting = () => {
    if (!character) return "Hello! Nice to meet you!";
    
    const greetings = [
      `Hi there! I'm ${character.name}, it's so nice to meet you! 💕`,
      `Hello! ${character.name} here. How has your day been? ✨`,
      `*waves excitedly* I've been waiting to chat with you! 😊`,
      `Hey! Ready for some fun conversation? I'm ${character.name}! 🌟`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  const generateSmartResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    // Greeting responses
    if (input.includes('hi') || input.includes('hello') || input.includes('hey')) {
      return `Hey! *smiles warmly* I'm so happy to see you! How's your day going? ✨`;
    }

    // Compliment responses
    if (input.includes('beautiful') || input.includes('pretty') || input.includes('cute')) {
      return "*blushes* Aww, thank you so much! You're so sweet! That really made my day! 😊💕";
    }

    // How are you responses
    if (input.includes('how are you') || input.includes('how do you feel')) {
      return `I'm doing amazing now that I'm talking to you! *giggles* You always know how to brighten my mood! 😄`;
    }

    // Question about character
    if (input.includes('tell me about') || input.includes('what do you like')) {
      return `Oh, I love so many things! I enjoy cozy conversations like this, and discovering new things about people I care about... like you! What about you? What makes you happy? 🌟`;
    }

    // Flirty responses
    if (input.includes('love') || input.includes('like you') || input.includes('special')) {
      return "*heart flutters* You're making me feel all warm and fuzzy inside! I really enjoy our time together too... you're quite special yourself! 💖";
    }

    // Default responses based on mood
    const responses = {
      normal: [
        "That's really interesting! Tell me more about that! 😊",
        "I love hearing your thoughts! You always have such unique perspectives! ✨",
        "Hmm, that's fascinating! I never thought about it that way before! 🤔",
      ],
      happy: [
        "That sounds absolutely wonderful! *bounces excitedly* I'm so happy for you! 😄✨",
        "Yay! That's amazing! Your enthusiasm is totally contagious! 🌟",
        "Oh my gosh, that's so cool! I love how excited you get about things! 😊💕",
      ],
      flirty: [
        "*gives you a playful wink* You're quite the charmer, aren't you? 😘",
        "Mmm, I like the way you think... *leans closer* tell me more! 💋",
        "You're being so sweet today... it's making my heart race! 💕😏",
      ],
      playful: [
        "Hehe, you're so silly! *playfully nudges you* I love that about you! 😜",
        "Ooh, are we being mischievous today? *grins* I like where this is going! 😈",
        "You crack me up! *giggles* Want to play a game or something fun? 🎮",
      ],
      mysterious: [
        "*smirks mysteriously* There's more to that story than meets the eye... 😏",
        "Interesting... *studies you intently* I sense there's something deeper here... 🔮",
        "Hmm... *tilts head thoughtfully* you're full of surprises, aren't you? ✨",
      ],
      shy: [
        "*looks down bashfully* That's... that's really sweet of you to say... 😳",
        "Um... *fidgets nervously* I'm not sure what to say to that... you're so kind! 🥺",
        "*hides face behind hands* You're making me all flustered! 😊💕",
      ],
    };

    const moodResponses = responses[characterMood as keyof typeof responses] || responses.normal;
    return moodResponses[Math.floor(Math.random() * moodResponses.length)];
  };

  const getRandomMood = (): string => {
    const moods = ['normal', 'happy', 'flirty', 'playful', 'mysterious', 'shy'];
    return moods[Math.floor(Math.random() * moods.length)];
  };

  // Save message to database
  const saveMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string; isFromUser: boolean; mood?: string }) => {
      if (!character?.id) {
         Error("No character selected");
      }
      try {
        const response = await apiRequest("POST", `/api/chat/${userId}/${character.id}`, {
          message: messageData.content,
          isFromUser: messageData.isFromUser,
          mood: messageData.mood || 'normal',
          type: 'text'
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        return response.json();
      } catch (error) {
        console.error("Failed to save message:", error);
        throw error;
      }
    },
    onError: (error) => {
      console.error("Message save failed:", error);
    }
  });

  // Send message with Mistral AI
  const [pendingImage, setPendingImage] = useState<{url: string, id: string} | null>(null);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      // Add user message immediately to UI
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        content: message,
        sender: 'user',
        timestamp: new Date(),
        type: 'text',
        mood: currentMood,
      };
      setMessages(prev => [...prev, userMessage]);
      setNewMessage("");

      // Show typing indicator
      setTypingIndicator(true);
      
      // Add 3-5 second delay before sending request
      const delay = Math.random() * 2000 + 3000; // 3-5 seconds
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        // Generate AI response using Mistral
        const allMessages = [...messages, userMessage];
        const conversationHistory = allMessages.slice(-10).map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content
        }));

        const response = await apiRequest("POST", "/api/mistral/chat", {
          message,
          characterName: character?.name || "Unknown Character",
          characterDescription: character?.description || character?.personality || "A mysterious character",
          currentMood: characterMood,
          conversationHistory,
          userId: userId,
          characterid: character?.id || "unknown"
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Mistral API error:", response.status, errorData);
          throw new Error(`Mistral API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const result = await response.json();
        console.log('[AIChat] Raw Mistral response:', result);
        return { result, originalMessage: message };
      } catch (error) {
        console.error("Mistral API failed, using fallback:", error);
        return { 
          result: { 
            response: `*Luna looks a bit confused* Sorry, I'm having trouble thinking clearly right now... Can you try asking me again? 💕`,
            mood: getRandomMood()
          }, 
          originalMessage: message 
        };
      }
    },
    onSuccess: async (data) => {
      const { result } = data;
      
      // Hide typing indicator
      setTypingIndicator(false);
      
      console.log('[AIChat] Full response object:', result);
      
      let aiResponse;
      if (result.success && result.data && result.data.response) {
        aiResponse = result.data.response;
      } else if (result.response) {
        aiResponse = result.response;
      } else {
        aiResponse = "I'm having a wonderful time chatting with you! How are you feeling today? ✨";
        console.log('[AIChat] Using fallback response, received:', result);
      }
      
      const aiMood = result.data?.mood || result.mood || getRandomMood();
      const randomImage = result.data?.image || result.image;
      
      // If AI is sending a picture, show notification with thumbnail
      if (randomImage) {
        console.log('📸 AI sent a random image:', randomImage.url);
        
        // Add notification message
        const notificationMessage: ChatMessage = {
          id: `notification-${Date.now()}`,
          content: `${character.name} has sent you a picture 📷`,
          sender: 'character',
          timestamp: new Date(),
          type: 'text',
          mood: aiMood,
        };
        
        setMessages(prev => [...prev, notificationMessage]);
        setPendingImage({ url: randomImage.url, id: randomImage.id });
      }
      
      // Add AI response to UI
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: aiResponse,
        sender: 'character',
        timestamp: new Date(),
        type: randomImage ? 'image' : 'text',
        mood: aiMood,
        reactionScore: Math.floor(Math.random() * 10) + 1,
        imageUrl: randomImage?.url,
      };

      setMessages(prev => [...prev, aiMessage]);
      setCharacterMood(aiMessage.mood || 'normal');
    },
    onError: (error: any) => {
      console.error("AI Chat error:", error);
      setTypingIndicator(false);
      // Fallback to local response generation
      handleLocalMessage();
    },
  });

  const handleLocalMessage = async () => {
    const originalMessage = newMessage;
    
    const userMessage: ChatMessage = {
      id: `local-user-${Date.now()}`,
      content: originalMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
      mood: currentMood,
    };

    setTypingIndicator(true);
    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");

    // Skip saving to reduce database calls

    // Add 3-5 second delay for typing
    const delay = Math.random() * 2000 + 3000; // 3-5 seconds
    setTimeout(() => {
      const response = generateSmartResponse(originalMessage);
      const aiMood = getRandomMood();
      
      const characterMessage: ChatMessage = {
        id: `local-ai-${Date.now()}`,
        content: response,
        sender: 'character',
        timestamp: new Date(),
        type: 'text',
        mood: aiMood,
        reactionScore: Math.floor(Math.random() * 10) + 1,
      };

      setMessages(prev => [...prev, characterMessage]);
      setCharacterMood(characterMessage.mood || 'normal');
      setTypingIndicator(false);
      
      // Save AI response to database (don't wait for it)
      if (character?.id) {
        saveMessageMutation.mutate({
          content: response,
          isFromUser: false,
          mood: aiMood
        });
      }
    }, delay);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    if (character?.id) {
      sendMessageMutation.mutate(newMessage.trim());
    } else {
      handleLocalMessage();
    }
  };

  const handleQuickResponse = (response: string) => {
    setNewMessage(response);
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
      {/* Chat Header */}
      <div className="p-3 bg-black/30 border-b border-purple-500/30">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
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
          
          {/* Mood and Gift buttons moved to the right */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-yellow-500 text-yellow-400 text-xs px-3 py-1 rounded-full">
              😊
            </Button>
            <Button variant="outline" size="sm" className="border-red-500 text-red-400 text-xs px-3 py-1 rounded-full">
              🎁
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Messages */}
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
                      {message.type === 'image' && message.imageUrl && (
                        <div className="mb-2">
                          {pendingImage?.url === message.imageUrl ? (
                            <button
                              onClick={() => {
                                setPendingImage(null);
                                // Image will display after clicking
                              }}
                              className="relative w-full"
                            >
                              <img 
                                src={message.imageUrl} 
                                alt="Thumbnail" 
                                className="rounded-lg max-w-full h-24 object-cover blur-sm"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="bg-black/70 px-3 py-1 rounded-full text-xs">
                                  Tap to view 👁️
                                </span>
                              </div>
                            </button>
                          ) : (
                            <img 
                              src={message.imageUrl} 
                              alt="Shared image" 
                              className="rounded-lg max-w-full max-h-48 object-cover"
                              onError={(e) => {
                                console.error('Failed to load image:', message.imageUrl);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                      )}
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
                        <AvatarImage src={character.avatarUrl || character.imageUrl || character.avatarPath} alt={character.name} />
                        <AvatarFallback className="bg-gray-600 text-xs">{character.name[0]}</AvatarFallback>
                      </>
                    )}
                  </Avatar>
                </div>
              ))}
              {typingIndicator && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={character.avatarUrl || character.imageUrl || character.avatarPath} alt={character.name} />
                    <AvatarFallback className="bg-gray-600">{character.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-700 text-white rounded-lg p-3 max-w-[80%]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">{character.name}</span>
                    </div>
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

          {/* Quick Responses */}
          <div className="p-4 bg-black/20 border-t border-purple-500/30">
            <p className="text-sm text-gray-400 mb-2">Quick responses:</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_RESPONSES.map((response, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickResponse(response)}
                  className="text-xs border-gray-600 text-gray-300 hover:bg-purple-600/20 rounded-full"
                >
                  {response}
                </Button>
              ))}
            </div>

            {/* Message Input */}
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
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
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