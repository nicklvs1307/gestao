import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  Send, 
  User, 
  Bot, 
  UserCheck, 
  Loader2, 
  Phone,
  Clock,
  CheckCheck,
  Power,
  MessageSquare,
  Tag,
  Info,
  MapPin,
  Calendar,
  ChevronDown,
  Smile,
  ArrowDown,
  Sparkles,
  Users,
  MessageCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import { cn } from '../lib/utils';
import { formatSP } from '@/lib/timezone';
import { ptBR } from 'date-fns/locale';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useSocket } from '../hooks/useSocket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Conversation {
  id: string;
  customerPhone: string;
  customerName: string | null;
  profilePictureUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  isAgentEnabled: boolean;
  labels: string[];
  customer?: {
    id: string;
    name: string;
    phone: string;
    address?: string;
    loyaltyPoints: number;
    createdAt: string;
    neighborhood?: string;
    city?: string;
    street?: string;
    number?: string;
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface MessageGroup {
  date: string;
  label: string;
  messages: Message[];
}

const WhatsAppChat: React.FC = () => {
  const { on, off } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [agentFilter, setAgentFilter] = useState<'all' | 'agent' | 'human'>('all');
  const [isAITyping, setIsAITyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedChatRef = useRef<Conversation | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker && emojiButtonRef.current && !emojiButtonRef.current.contains(event.target as Node)) {
        const picker = document.querySelector('[data-emoji-picker]');
        if (picker && !picker.contains(event.target as Node)) {
          setShowEmojiPicker(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const restaurantId = user?.restaurantId;

  const getHeaders = () => ({
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'x-restaurant-id': restaurantId
    }
  });

  useEffect(() => {
    fetchConversations();

    on('whatsapp_message', (data: any) => {
      console.log('Nova mensagem via socket:', data);
      
      fetchConversations(false);
      
      const currentSelected = selectedChatRef.current;
      
      if (currentSelected && data.key.remoteJid === currentSelected.customerPhone) {
        const msgContent = data.message?.conversation || 
                           data.message?.extendedTextMessage?.text || 
                           data.message?.imageMessage?.caption || 
                           "";
        
        if (msgContent) {
          const newMsg: Message = {
            id: data.key.id,
            role: data.key.fromMe ? 'assistant' : 'user',
            content: msgContent,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          if (!data.key.fromMe && currentSelected.isAgentEnabled) {
            setIsAITyping(true);
            setTimeout(() => setIsAITyping(false), 15000);
          }

          if (data.key.fromMe) {
            setIsAITyping(false);
          }
        }
      }
    });

    return () => { off('whatsapp_message'); };
  }, [on, off]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      setShowScrollButton(!isNearBottom);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  const fetchConversations = async (showLoading = true) => {
    try {
      if (showLoading) setLoadingChats(true);
      const res = await axios.get(`${API_URL}/whatsapp/conversations`, getHeaders());
      setConversations(res.data);
      
      if (selectedChatRef.current) {
        const updated = res.data.find((c: Conversation) => c.customerPhone === selectedChatRef.current?.customerPhone);
        if (updated) setSelectedChat(updated);
      }
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
    } finally {
      if (showLoading) setLoadingChats(false);
    }
  };

  const fetchMessages = async (phone: string) => {
    try {
      setLoadingMessages(true);
      const res = await axios.get(`${API_URL}/whatsapp/conversations/${phone}/messages`, getHeaders());
      setMessages(res.data);
    } catch (error) {
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectChat = (chat: Conversation) => {
    setSelectedChat(chat);
    setShowDetails(false);
    fetchMessages(chat.customerPhone);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const content = newMessage;
    setNewMessage('');
    setShowEmojiPicker(false);

    try {
      const res = await axios.post(`${API_URL}/whatsapp/send-message`, {
        phone: selectedChat.customerPhone,
        message: content
      }, getHeaders());

      setMessages(prev => [...prev, res.data]);
      fetchConversations(false);
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const toggleAgent = async () => {
    if (!selectedChat) return;
    const newState = !selectedChat.isAgentEnabled;

    try {
      await axios.post(`${API_URL}/whatsapp/conversations/${selectedChat.customerPhone}/toggle-agent`, {
        enabled: newState
      }, getHeaders());

      setSelectedChat({ ...selectedChat, isAgentEnabled: newState });
      setConversations(prev => prev.map(c => 
        c.customerPhone === selectedChat.customerPhone ? { ...c, isAgentEnabled: newState } : c
      ));

      toast.success(newState ? 'Agente IA ativado para este contato' : 'Agente IA pausado. Você assume agora!');
    } catch (error) {
      toast.error('Erro ao alterar status do agente');
    }
  };

  const handleAddLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !selectedChat) return;

    const labels = [...selectedChat.labels, newLabel.trim()];
    try {
      await axios.put(`${API_URL}/whatsapp/conversations/${selectedChat.customerPhone}/labels`, { labels }, getHeaders());
      setSelectedChat({ ...selectedChat, labels });
      setConversations(prev => prev.map(c => 
        c.customerPhone === selectedChat.customerPhone ? { ...c, labels } : c
      ));
      setNewLabel('');
    } catch (error) {
      toast.error('Erro ao adicionar etiqueta');
    }
  };

  const removeLabel = async (labelToRemove: string) => {
    if (!selectedChat) return;
    const labels = selectedChat.labels.filter(l => l !== labelToRemove);
    try {
      await axios.put(`${API_URL}/whatsapp/conversations/${selectedChat.customerPhone}/labels`, { labels }, getHeaders());
      setSelectedChat({ ...selectedChat, labels });
      setConversations(prev => prev.map(c => 
        c.customerPhone === selectedChat.customerPhone ? { ...c, labels } : c
      ));
    } catch (error) {
      toast.error('Erro ao remover etiqueta');
    }
  };

  const groupMessagesByDate = (msgs: Message[]): MessageGroup[] => {
    const groups: MessageGroup[] = [];
    const sorted = [...msgs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    sorted.forEach(msg => {
      const date = new Date(msg.timestamp);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      let label: string;
      if (isToday(date)) {
        label = 'Hoje';
      } else if (isYesterday(date)) {
        label = 'Ontem';
      } else {
        const daysAgo = differenceInDays(new Date(), date);
        if (daysAgo <= 7) {
          label = format(date, "EEEE 'às' HH:mm", { locale: ptBR });
        } else {
          label = format(date, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
        }
      }
      
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === dateKey) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({
          date: dateKey,
          label: isToday(date) || isYesterday(date) ? label : label,
          messages: [msg]
        });
      }
    });
    
    return groups;
  };

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = 
      c.customerPhone.includes(searchQuery) || 
      (c.customerName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      c.labels.some(l => l.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesAgentFilter = 
      agentFilter === 'all' ||
      (agentFilter === 'agent' && c.isAgentEnabled) ||
      (agentFilter === 'human' && !c.isAgentEnabled);

    return matchesSearch && matchesAgentFilter;
  });

  const messageGroups = groupMessagesByDate(messages);

  const ConversationSkeleton = () => (
    <div className="p-4 flex items-start space-x-3 border-b border-gray-50/50">
      <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
          <div className="w-10 h-3 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="w-32 h-3 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );

  const MessageSkeleton = () => (
    <div className="space-y-4 p-6">
      <div className="flex justify-start">
        <div className="w-64 h-16 bg-gray-200 rounded-xl rounded-tl-none animate-pulse" />
      </div>
      <div className="flex justify-end">
        <div className="w-48 h-12 bg-gray-200 rounded-xl rounded-tr-none animate-pulse" />
      </div>
      <div className="flex justify-start">
        <div className="w-56 h-20 bg-gray-200 rounded-xl rounded-tl-none animate-pulse" />
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-80 md:w-96 border-r border-gray-100 flex flex-col bg-gray-50/30">
        <div className="p-4 bg-white border-b border-gray-50">
          <h2 className="text-xl font-black italic uppercase text-foreground mb-4 tracking-tighter">Atendimentos</h2>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar contato ou etiqueta..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setAgentFilter('all')}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition ${agentFilter === 'all' ? 'bg-white shadow-sm text-foreground' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setAgentFilter('agent')}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition ${agentFilter === 'agent' ? 'bg-green-100 shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              🤖 Agente
            </button>
            <button
              onClick={() => setAgentFilter('human')}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition ${agentFilter === 'human' ? 'bg-primary/10 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            >
              👤 Humano
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div>
              {[1, 2, 3, 4, 5].map(i => <ConversationSkeleton key={i} />)}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm italic">Nenhuma conversa encontrada</div>
          ) : (
            <AnimatePresence>
              {filteredConversations.map(chat => (
                <motion.button
                  key={chat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleSelectChat(chat)}
                  className={cn(
                    "w-full p-4 flex items-start space-x-3 transition hover:bg-white border-b border-gray-50/50",
                    selectedChat?.id === chat.id ? "bg-white shadow-sm ring-1 ring-black/5 z-10" : ""
                  )}
                >
                  <div className="relative">
                    {chat.profilePictureUrl ? (
                      <img 
                        src={chat.profilePictureUrl} 
                        alt={chat.customerName || 'User'} 
                        className="w-12 h-12 rounded-full object-cover border border-gray-100"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold">
                        {chat.customerName?.charAt(0) || <User size={24} />}
                      </div>
                    )}
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center",
                      chat.isAgentEnabled ? "bg-green-500 text-white" : "bg-blue-500 text-white"
                    )}>
                      {chat.isAgentEnabled ? <Bot size={10} /> : <UserCheck size={10} />}
                    </div>
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <div className="flex justify-between items-baseline">
                      <h4 className="font-bold text-foreground truncate text-sm">
                        {chat.customerName || chat.customerPhone.split('@')[0]}
                      </h4>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {formatSP(chat.lastMessageAt, 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{chat.lastMessage || 'Sem mensagens'}</p>
                    
                    {chat.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {chat.labels.map(label => (
                          <span key={label} className="px-1.5 py-0.5 bg-muted text-foreground/60 rounded text-[9px] font-bold uppercase tracking-tighter">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                      {chat.unreadCount}
                    </div>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Área do Chat */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {selectedChat ? (
          <>
            {/* Header do Chat */}
            <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white z-20">
              <div className="flex items-center space-x-3">
                {selectedChat.profilePictureUrl ? (
                   <img 
                    src={selectedChat.profilePictureUrl} 
                    alt={selectedChat.customerName || 'User'} 
                    className="w-10 h-10 rounded-full object-cover border border-gray-100 cursor-pointer"
                    onClick={() => setShowDetails(!showDetails)}
                  />
                ) : (
                  <div 
                    className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-muted-foreground font-bold cursor-pointer"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {selectedChat.customerName?.charAt(0) || <User size={20} />}
                  </div>
                )}
                <div className="cursor-pointer" onClick={() => setShowDetails(!showDetails)}>
                  <h3 className="font-bold text-foreground text-sm">{selectedChat.customerName || selectedChat.customerPhone}</h3>
                  <div className="flex items-center space-x-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", selectedChat.isAgentEnabled ? "bg-green-500" : "bg-blue-500")}></div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {selectedChat.isAgentEnabled ? 'Agente IA Ativo' : 'Atendimento Humano'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button 
                  onClick={toggleAgent}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black uppercase italic transition tracking-tighter",
                    selectedChat.isAgentEnabled 
                      ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200" 
                      : "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
                  )}
                >
                  {selectedChat.isAgentEnabled ? (
                    <><Power size={14} /> <span>Pausar IA</span></>
                  ) : (
                    <><Bot size={14} /> <span>Ativar IA</span></>
                  )}
                </button>
                <button 
                  onClick={() => setShowDetails(!showDetails)}
                  className={cn("p-2 rounded-lg transition", showDetails ? "bg-primary text-white" : "text-gray-400 hover:bg-gray-50")}
                >
                  <Info size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Mensagens */}
              <div className="flex-1 flex flex-col relative">
                <div 
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-6 space-y-4 relative"
                  style={{
                    backgroundColor: '#f0f2f5',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1d5db' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                  }}
                >
                  {loadingMessages ? (
                    <MessageSkeleton />
                  ) : messageGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <MessageCircle size={48} className="opacity-20 mb-3" />
                      <p className="text-sm italic">Nenhuma mensagem ainda</p>
                    </div>
                  ) : (
                    messageGroups.map((group, groupIdx) => (
                      <div key={group.date} className="space-y-3">
                        <div className="flex justify-center">
                          <span className="bg-white/90 backdrop-blur-sm text-gray-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                            {group.label}
                          </span>
                        </div>
                        {group.messages.map((msg, idx) => {
                          const isMe = msg.role === 'assistant' || msg.role === 'system';
                          return (
                            <motion.div 
                              key={msg.id || idx} 
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.2 }}
                              className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}
                            >
                              <div className={cn(
                                "max-w-[80%] rounded-xl px-3 py-1.5 shadow-sm relative group min-w-[60px]",
                                isMe ? "bg-[#d9fdd3] text-foreground rounded-tr-none" : "bg-white text-foreground rounded-tl-none"
                              )}>
                                {isMe && (
                                  <div className="flex items-center space-x-1 mb-0.5">
                                    <span className="text-[8px] font-bold text-gray-400 uppercase italic">Enviado pelo Sistema</span>
                                  </div>
                                )}
                                
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                <div className="flex items-center justify-end space-x-1 mt-0.5">
                                  <span className="text-[9px] text-gray-400">{formatSP(msg.timestamp, 'HH:mm')}</span>
                                  {isMe && <CheckCheck size={12} className="text-blue-500" />}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ))
                  )}
                  
                  {isAITyping && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white rounded-xl rounded-tl-none px-4 py-3 shadow-sm">
                        <div className="flex space-x-1.5">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {showScrollButton && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={scrollToBottom}
                    className="absolute bottom-24 right-6 p-2 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition z-10"
                  >
                    <ArrowDown size={18} className="text-gray-600" />
                  </motion.button>
                )}

                {/* Input de Mensagem */}
                <div className="p-4 bg-gray-100 border-t border-gray-200 relative">
                  {selectedChat.isAgentEnabled && (
                    <div className="mb-3 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl flex items-center space-x-3">
                      <Bot size={16} className="text-blue-500" />
                      <p className="text-[10px] font-bold text-blue-600 uppercase">O agente está respondendo automaticamente. Pause o agente para intervir sem interferência.</p>
                    </div>
                  )}
                  
                  <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
                    <div className="flex-1 relative">
                      <input 
                        type="text" 
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition"
                      />
                      <button
                        type="button"
                        ref={emojiButtonRef}
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                      >
                        <Smile size={20} />
                      </button>
                      
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full right-0 mb-2 z-50 shadow-xl rounded-xl overflow-hidden"
                          >
                            <EmojiPicker 
                              onEmojiClick={handleEmojiClick}
                              theme={Theme.LIGHT}
                              width={320}
                              height={400}
                              searchDisabled={false}
                              skinTonesDisabled={true}
                              previewConfig={{
                                showPreview: false
                              }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="p-3 bg-primary text-white rounded-xl hover:shadow-lg hover:shadow-primary/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              </div>

              {/* Sidebar de Detalhes do Cliente */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 320, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-l border-gray-100 bg-gray-50/50 flex flex-col overflow-hidden"
                  >
                    <div className="p-6 overflow-y-auto flex-1">
                      <div className="flex flex-col items-center text-center mb-8">
                         {selectedChat.profilePictureUrl ? (
                          <img 
                            src={selectedChat.profilePictureUrl} 
                            alt={selectedChat.customerName || 'User'} 
                            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm mb-4"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 text-3xl font-bold mb-4 shadow-sm border-4 border-white">
                            {selectedChat.customerName?.charAt(0) || <User size={48} />}
                          </div>
                        )}
                        <h3 className="font-black text-foreground italic uppercase text-lg leading-tight tracking-tighter">{selectedChat.customerName || 'Desconhecido'}</h3>
                        <p className="text-gray-500 font-medium text-sm">{selectedChat.customerPhone}</p>
                      </div>

                      {/* Etiquetas */}
                      <div className="mb-8">
                        <div className="flex items-center space-x-2 text-foreground font-black italic uppercase text-xs mb-3 tracking-tighter">
                          <Tag size={14} className="text-primary" />
                          <span>Etiquetas</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {selectedChat.labels.map(label => (
                            <div key={label} className="group relative">
                              <span className="px-2 py-1 bg-white border border-gray-200 text-foreground/60 rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center shadow-sm">
                                {label}
                                <button 
                                  onClick={() => removeLabel(label)}
                                  className="ml-1.5 text-gray-400 hover:text-red-500 transition"
                                >
                                  ×
                                </button>
                              </span>
                            </div>
                          ))}
                        </div>
                        <form onSubmit={handleAddLabel} className="flex space-x-2">
                          <input 
                            type="text" 
                            placeholder="Nova etiqueta..."
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-[10px] outline-none focus:ring-1 focus:ring-primary/20"
                          />
                          <button className="px-3 py-2 bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-black transition">Add</button>
                        </form>
                      </div>

                      {/* Dados do Cadastro */}
                      <div>
                        <div className="flex items-center space-x-2 text-foreground font-black italic uppercase text-xs mb-3 tracking-tighter">
                          <User size={14} className="text-primary" />
                          <span>Dados do Cadastro</span>
                        </div>
                        
                        {selectedChat.customer ? (
                          <div className="space-y-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Telefone</p>
                              <div className="flex items-center space-x-2 text-foreground text-xs font-bold">
                                <Phone size={12} className="text-gray-400" />
                                <span>{selectedChat.customer.phone}</span>
                              </div>
                            </div>
                            
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Endereço</p>
                              <div className="flex items-start space-x-2 text-foreground text-xs font-bold leading-relaxed">
                                <MapPin size={12} className="text-gray-400 mt-0.5" />
                                <span>
                                  {selectedChat.customer.street ? (
                                    `${selectedChat.customer.street}, ${selectedChat.customer.number || 'S/N'}${selectedChat.customer.neighborhood ? ` - ${selectedChat.customer.neighborhood}` : ''}`
                                  ) : (
                                    selectedChat.customer.address || 'Não informado'
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Desde</p>
                              <div className="flex items-center space-x-2 text-foreground text-xs font-bold">
                                <Calendar size={12} className="text-gray-400" />
                                <span>{formatSP(selectedChat.customer.createdAt, "dd 'de' MMMM, yyyy")}</span>
                              </div>
                            </div>

                            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                              <p className="text-[10px] text-primary font-bold uppercase mb-1">Pontos Fidelidade</p>
                              <div className="text-primary text-xl font-black italic tracking-tighter">
                                {selectedChat.customer.loyaltyPoints} pts
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-center">
                            <p className="text-[10px] text-primary font-bold uppercase">Cliente não cadastrado no PDV</p>
                            <p className="text-[9px] text-orange-400 mt-1 uppercase italic leading-tight">Cadastre o número para visualizar detalhes de pedidos e fidelidade.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-full blur-xl"
              />
              <div className="relative p-8 bg-white rounded-3xl shadow-lg border border-gray-100">
                <MessageSquare size={64} className="text-primary/30" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-black text-foreground italic uppercase text-xl tracking-tighter">Central de Atendimento</h3>
              <p className="text-sm text-gray-500 max-w-xs">Gerencie conversas do WhatsApp, ative o agente IA e assuma o controle quando necessário.</p>
            </div>
            <div className="flex items-center space-x-6 text-xs text-gray-400">
              <div className="flex items-center space-x-2">
                <Bot size={14} className="text-green-500" />
                <span>Agente IA</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users size={14} className="text-blue-500" />
                <span>Atendimento Humano</span>
              </div>
              <div className="flex items-center space-x-2">
                <Sparkles size={14} className="text-yellow-500" />
                <span>Base de Conhecimento</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppChat;
