'use client';

import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export interface Conversation {
  id: string;
  roomId: string;
  title: string;
  status: string;
  unreadCount: number;
  lastMessageAt: Date;
  classification?: {
    category: string;
    complexity: string;
    legalArea: string;
  };
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'lawyer' | 'system';
  timestamp: Date;
  attachments?: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
  }[];
}

export const useMultiConversation = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationMessages, setActiveConversationMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    import('socket.io-client').then(({ io }) => {
      const newSocket = io('http://localhost:4000', {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('✅ WebSocket conectado');
        // Request user conversations on connect
        newSocket.emit('join-all-conversations');
      });

      newSocket.on('disconnect', () => {
        console.log('❌ WebSocket desconectado');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    });
  }, []);

  // Conectar a todas as conversas do usuário
  useEffect(() => {
    if (socket) {
      socket.emit('join-all-conversations');

      // Listener para conversas carregadas
      socket.on('conversations-loaded', (data: {
        conversations: Conversation[],
        activeRooms: string[]
      }) => {
        setConversations(data.conversations);
        if (data.conversations.length > 0 && !activeConversationId) {
          setActiveConversationId(data.conversations[0].id);
        }
        console.log(`Conectado a ${data.activeRooms.length} conversas`);
      });

      // Listener para nova conversa criada
      socket.on('new-conversation-created', (newConversation: Conversation) => {
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newConversation.id);
        setActiveConversationMessages([]);
      });

      // Listener para troca de conversa
      socket.on('conversation-switched', (data: {
        conversationId: string,
        roomId: string,
        messages: Message[]
      }) => {
        setActiveConversationId(data.conversationId);
        setActiveConversationMessages(data.messages);
      });

      // Listener para novas mensagens
      socket.on('receive-message', (message: Message) => {
        // Adicionar à conversa ativa se for a sala atual
        setActiveConversationMessages(prev => [...prev, message]);

        // Atualizar contadores de mensagens não lidas para outras conversas
        setConversations(prev => prev.map(conv => {
          // Se não for a conversa ativa, incrementar unreadCount
          if (conv.id !== activeConversationId) {
            return { ...conv, unreadCount: conv.unreadCount + 1 };
          }
          return conv;
        }));
      });

      // Listener para notificações cross-conversation
      socket.on('cross-room-notification', (notification: {
        type: string,
        sourceRoomId: string,
        message: string,
        timestamp: Date
      }) => {
        console.log('Notificação cross-room:', notification);

        // Atualizar conversa específica
        setConversations(prev => prev.map(conv => {
          if (conv.roomId === notification.sourceRoomId) {
            return {
              ...conv,
              unreadCount: conv.id !== activeConversationId ? conv.unreadCount + 1 : conv.unreadCount
            };
          }
          return conv;
        }));

        // Emitir evento para UI mostrar notificação
        window.dispatchEvent(new CustomEvent('cross-conversation-notification', {
          detail: notification
        }));
      });

      // Listener para erros
      socket.on('error', (error: { message: string }) => {
        console.error('Erro do socket:', error.message);
      });
    }

    return () => {
      if (socket) {
        socket.off('conversations-loaded');
        socket.off('new-conversation-created');
        socket.off('conversation-switched');
        socket.off('receive-message');
        socket.off('cross-room-notification');
        socket.off('error');
      }
    };
  }, [socket, activeConversationId]);

  const createNewConversation = useCallback(() => {
    if (socket) {
      setIsLoading(true);
      socket.emit('create-new-conversation');
      setTimeout(() => setIsLoading(false), 5000); // Timeout de segurança
    }
  }, [socket]);

  const switchToConversation = useCallback((conversationId: string) => {
    if (socket && conversationId !== activeConversationId) {
      setIsLoading(true);
      socket.emit('switch-conversation', { conversationId });
      setTimeout(() => setIsLoading(false), 3000); // Timeout de segurança
    }
  }, [socket, activeConversationId]);

  const sendMessage = useCallback((text: string, roomId?: string) => {
    if (socket) {
      const targetRoomId = roomId || conversations.find(c => c.id === activeConversationId)?.roomId;
      if (targetRoomId) {
        socket.emit('send-message', { text, roomId: targetRoomId });
      }
    }
  }, [socket, conversations, activeConversationId]);

  const markAsRead = useCallback((conversationId: string) => {
    setConversations(prev => prev.map(conv =>
      conv.id === conversationId
        ? { ...conv, unreadCount: 0 }
        : conv
    ));
  }, []);

  const getActiveConversation = useCallback(() => {
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  const getTotalUnreadCount = useCallback(() => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  }, [conversations]);

  return {
    conversations,
    activeConversationId,
    activeConversationMessages,
    isLoading,
    createNewConversation,
    switchToConversation,
    sendMessage,
    markAsRead,
    getActiveConversation,
    getTotalUnreadCount,
    setSocket
  };
};