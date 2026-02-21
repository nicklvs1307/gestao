import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Send, 
  User, 
  Bot, 
  UserCheck, 
  Loader2, 
  MoreVertical,
  Phone,
  Clock,
  CheckCheck,
  Power,
  MessageSquare
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SOCKET_URL = API_URL.replace('/api', '');

interface Conversation {
  id: string;
  customerPhone: string;
  customerName: string | null;
  profilePictureUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  isAgentEnabled: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

const WhatsAppChat: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
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

    const socket = io(SOCKET_URL, { query: { restaurantId } });

    socket.on('whatsapp_message', (data) => {
      console.log('Nova mensagem via socket:', data);
      
      // Atualiza lista de conversas em tempo real
      fetchConversations(false);
      
      // Se o chat aberto for o mesmo da mensagem recebida/enviada, adiciona a mensagem
      if (selectedChat && data.key.remoteJid === selectedChat.customerPhone) {
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
          
          // Evita duplicidade se já salvamos localmente ao enviar pelo painel
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      }
    });

    return () => { socket.disconnect(); };
  }, [selectedChat, restaurantId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchConversations = async (showLoading = true) => {
    try {
      if (showLoading) setLoadingChats(true);
      const res = await axios.get(`${API_URL}/whatsapp/conversations`, getHeaders());
      setConversations(res.data);
      
      // Atualiza o selectedChat se ele estiver na lista para pegar dados novos (como foto ou status da IA)
      if (selectedChat) {
        const updated = res.data.find((c: Conversation) => c.customerPhone === selectedChat.customerPhone);
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
    fetchMessages(chat.customerPhone);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const content = newMessage;
    setNewMessage('');

    try {
      const res = await axios.post(`${API_URL}/whatsapp/send-message`, {
        phone: selectedChat.customerPhone,
        message: content
      }, getHeaders());

      // Adiciona localmente para feedback imediato (o socket também mandará, mas o ID evita duplicidade)
      setMessages(prev => [...prev, res.data]);
      fetchConversations(false);
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
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

  const filteredConversations = conversations.filter(c => 
    c.customerPhone.includes(searchQuery) || 
    (c.customerName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-80 md:w-96 border-r border-gray-100 flex flex-col bg-gray-50/30">
        <div className="p-4 bg-white border-b border-gray-50">
          <h2 className="text-xl font-black italic uppercase text-slate-800 mb-4 tracking-tighter">Atendimentos</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar contato..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm italic">Nenhuma conversa encontrada</div>
          ) : (
            filteredConversations.map(chat => (
              <button
                key={chat.id}
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
                    chat.isAgentEnabled ? "bg-primary text-white" : "bg-orange-500 text-white"
                  )}>
                    {chat.isAgentEnabled ? <Bot size={10} /> : <UserCheck size={10} />}
                  </div>
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-bold text-slate-800 truncate text-sm">
                      {chat.customerName || chat.customerPhone.split('@')[0]}
                    </h4>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {format(new Date(chat.lastMessageAt), 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{chat.lastMessage || 'Sem mensagens'}</p>
                </div>
                {chat.unreadCount > 0 && (
                  <div className="bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                    {chat.unreadCount}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área do Chat */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChat ? (
          <>
            {/* Header do Chat */}
            <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white">
              <div className="flex items-center space-x-3">
                {selectedChat.profilePictureUrl ? (
                   <img 
                    src={selectedChat.profilePictureUrl} 
                    alt={selectedChat.customerName || 'User'} 
                    className="w-10 h-10 rounded-full object-cover border border-gray-100"
                  />
                ) : (
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold">
                    {selectedChat.customerName?.charAt(0) || <User size={20} />}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{selectedChat.customerName || selectedChat.customerPhone}</h3>
                  <div className="flex items-center space-x-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", selectedChat.isAgentEnabled ? "bg-green-500" : "bg-orange-500")}></div>
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
                      ? "bg-orange-50 text-orange-600 hover:bg-orange-100" 
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {selectedChat.isAgentEnabled ? (
                    <><Power size={14} /> <span>Pausar IA</span></>
                  ) : (
                    <><Bot size={14} /> <span>Ativar IA</span></>
                  )}
                </button>
                <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition"><MoreVertical size={20} /></button>
              </div>
            </div>

            {/* Mensagens */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#e5ddd5] bg-[url('https://web.whatsapp.com/img/bg-chat-tile-light_04fc0d130c5d6e648594d4f85edf8a8a.png')] bg-repeat"
            >
              {loadingMessages ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary opacity-20" /></div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.role === 'assistant' || msg.role === 'system';
                  return (
                    <div key={msg.id || idx} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[80%] rounded-xl px-3 py-1.5 shadow-sm relative group min-w-[60px]",
                        isMe ? "bg-[#d9fdd3] text-slate-800 rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none"
                      )}>
                        {/* Indicador de quem respondeu (IA ou Humano) */}
                        {isMe && (
                          <div className="flex items-center space-x-1 mb-0.5">
                             <span className="text-[8px] font-bold text-gray-400 uppercase italic">Enviado pelo Sistema</span>
                          </div>
                        )}
                        
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-end space-x-1 mt-0.5">
                          <span className="text-[9px] text-gray-400">{format(new Date(msg.timestamp), 'HH:mm')}</span>
                          {isMe && <CheckCheck size={12} className="text-blue-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input de Mensagem */}
            <div className="p-4 bg-gray-100 border-t border-gray-200">
              {selectedChat.isAgentEnabled && (
                <div className="mb-3 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl flex items-center space-x-3">
                  <Bot size={16} className="text-blue-500" />
                  <p className="text-[10px] font-bold text-blue-600 uppercase">O agente está respondendo automaticamente. Pause o agente para intervir sem interferência.</p>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-primary text-white rounded-xl hover:shadow-lg hover:shadow-primary/20 transition disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
            <div className="p-6 bg-gray-50 rounded-full"><MessageSquare size={64} className="opacity-20" /></div>
            <div className="text-center">
              <h3 className="font-bold text-slate-800">Selecione uma conversa</h3>
              <p className="text-sm">Visualize as mensagens e assuma o controle quando necessário.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
                )}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold">
                    {chat.customerName?.charAt(0) || <User size={24} />}
                  </div>
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center",
                    chat.isAgentEnabled ? "bg-primary text-white" : "bg-orange-500 text-white"
                  )}>
                    {chat.isAgentEnabled ? <Bot size={10} /> : <UserCheck size={10} />}
                  </div>
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-bold text-slate-800 truncate text-sm">
                      {chat.customerName || chat.customerPhone.split('@')[0]}
                    </h4>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {format(new Date(chat.lastMessageAt), 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{chat.lastMessage || 'Sem mensagens'}</p>
                </div>
                {chat.unreadCount > 0 && (
                  <div className="bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                    {chat.unreadCount}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área do Chat */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChat ? (
          <>
            {/* Header do Chat */}
            <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold">
                  {selectedChat.customerName?.charAt(0) || <User size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{selectedChat.customerName || selectedChat.customerPhone}</h3>
                  <div className="flex items-center space-x-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", selectedChat.isAgentEnabled ? "bg-green-500" : "bg-orange-500")}></div>
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
                      ? "bg-orange-50 text-orange-600 hover:bg-orange-100" 
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {selectedChat.isAgentEnabled ? (
                    <><Power size={14} /> <span>Pausar IA</span></>
                  ) : (
                    <><Bot size={14} /> <span>Ativar IA</span></>
                  )}
                </button>
                <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition"><MoreVertical size={20} /></button>
              </div>
            </div>

            {/* Mensagens */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://web.whatsapp.com/img/bg-chat-tile-light_04fc0d130c5d6e648594d4f85edf8a8a.png')] bg-repeat"
            >
              {loadingMessages ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary opacity-20" /></div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.role === 'assistant';
                  return (
                    <div key={msg.id || idx} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2 shadow-sm relative group",
                        isMe ? "bg-[#d9fdd3] text-slate-800 rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none"
                      )}>
                        {/* Indicador de quem respondeu (IA ou Humano) */}
                        {isMe && (
                          <div className="absolute -top-5 right-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <span className="text-[8px] font-bold text-gray-400 uppercase">Enviado pelo Sistema</span>
                          </div>
                        )}
                        
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-end space-x-1 mt-1">
                          <span className="text-[9px] text-gray-400">{format(new Date(msg.timestamp), 'HH:mm')}</span>
                          {isMe && <CheckCheck size={12} className="text-blue-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input de Mensagem */}
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              {selectedChat.isAgentEnabled && (
                <div className="mb-3 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl flex items-center space-x-3">
                  <Bot size={16} className="text-blue-500" />
                  <p className="text-[10px] font-bold text-blue-600 uppercase">O agente está respondendo automaticamente. Pause o agente para intervir sem interferência.</p>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-primary text-white rounded-xl hover:shadow-lg hover:shadow-primary/20 transition disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
            <div className="p-6 bg-gray-50 rounded-full"><MessageSquare size={64} className="opacity-20" /></div>
            <div className="text-center">
              <h3 className="font-bold text-slate-800">Selecione uma conversa</h3>
              <p className="text-sm">Visualize as mensagens e assuma o controle quando necessário.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppChat;
