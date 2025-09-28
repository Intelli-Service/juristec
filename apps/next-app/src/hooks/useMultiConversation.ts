/**
 * Hook para gerenciar múltiplas conversas com notificações em tempo real
 * 
 * Funcionalidades:
 * - Conecta a todas as conversas ativas do usuário simultaneamente
 * - Gerencia troca entre conversas preservando estado
 * - Notificações cross-conversation com badges não lidas
 * - Criação de novas conversas
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';

export interface Conversation {
  id: string;
  roomId: string;
  title: string;
  status: string;
  unreadCount: number;
  lastMessageAt: Date;
  conversationNumber: number;
  messages: Message[];
  classification?: {
    category: string;
    complexity: 'simples' | 'medio' | 'complexo';
    legalArea: string;
  };
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system' | 'lawyer';
  timestamp?: Date;
  attachments?: any[];
}

interface UseMultiConversationOptions {
  userId?: string;
  onNotification?: (notification: CrossConversationNotification) => void;
}

interface CrossConversationNotification {
  type: 'new_message_other_conversation';
  sourceRoomId: string;
  sourceConversationId: string;
  conversationTitle: string;
  message: string;
  timestamp: Date;
}

export const useMultiConversation = (options: UseMultiConversationOptions = {}) => {
  const { userId, onNotification } = options;

  // Estado das conversas
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Refs para evitar problemas de closure
  const socketRef = useRef<Socket | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const activeConversationIdRef = useRef<string>('');

  // Manter refs atualizadas
  useEffect(() => {
    conversationsRef.current = conversations;
    activeConversationIdRef.current = activeConversationId;
  }, [conversations, activeConversationId]);

  // Configurar socket
  const setSocket = useCallback((socket: Socket | null) => {
    if (socketRef.current) {
      // Limpar listeners antigos
      socketRef.current.off('conversations-loaded');
      socketRef.current.off('new-conversation-created');
      socketRef.current.off('new-message');
      socketRef.current.off('cross-room-notification');
      socketRef.current.off('connect');
      socketRef.current.off('disconnect');
    }

    socketRef.current = socket;

    if (socket) {
      // Status de conexão
      socket.on('connect', () => {
        console.log('🔗 Socket conectado - iniciando multi-conversas');
        setIsConnected(true);
        // Conectar a todas as conversas do usuário
        socket.emit('join-all-conversations');
      });

      socket.on('disconnect', () => {
        console.log('❌ Socket desconectado');
        setIsConnected(false);
      });

      // 🚀 NOVO: Listener para lista de conversas carregadas
      socket.on('conversations-loaded', (data: {
        conversations: any[];
        activeRooms: string[];
      }) => {
        console.log('📋 Conversas carregadas:', data.conversations.length);
        
        const loadedConversations: Conversation[] = data.conversations.map(conv => ({
          id: conv.id,
          roomId: conv.roomId,
          title: conv.title,
          status: conv.status,
          unreadCount: conv.unreadCount,
          lastMessageAt: new Date(conv.lastMessageAt),
          conversationNumber: conv.conversationNumber,
          messages: [], // Será carregado quando conversa for ativa
          classification: conv.classification,
        }));

        setConversations(loadedConversations);
        
        // Se não há conversa ativa, selecionar a primeira
        if (!activeConversationIdRef.current && loadedConversations.length > 0) {
          setActiveConversationId(loadedConversations[0].id);
        }
      });

      // 🚀 NOVO: Listener para nova conversa criada
      socket.on('new-conversation-created', (conversationData: any) => {
        console.log('🆕 Nova conversa criada:', conversationData.title);
        
        const newConversation: Conversation = {
          id: conversationData.id,
          roomId: conversationData.roomId,
          title: conversationData.title,
          status: conversationData.status,
          unreadCount: 0,
          lastMessageAt: new Date(conversationData.lastMessageAt),
          conversationNumber: conversationData.conversationNumber,
          messages: [],
        };

        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(conversationData.id);
      });

      // 🚀 NOVO: Listener para mensagens em qualquer conversa
      socket.on('new-message', (messageData: any) => {
        console.log('💬 Nova mensagem recebida:', messageData);
        
        setConversations(prev => prev.map(conv => {
          if (conv.roomId === messageData.roomId) {
            const newMessage: Message = {
              id: messageData.id || Date.now().toString(),
              text: messageData.text,
              sender: messageData.sender,
              timestamp: messageData.timestamp ? new Date(messageData.timestamp) : new Date(),
              attachments: messageData.attachments || [],
            };

            return {
              ...conv,
              messages: [...conv.messages, newMessage],
              lastMessageAt: new Date(),
              unreadCount: conv.id !== activeConversationIdRef.current ? conv.unreadCount + 1 : conv.unreadCount,
            };
          }
          return conv;
        }));
      });

      // 🚀 CRÍTICO: Notificações cross-conversation
      socket.on('cross-room-notification', (notification: CrossConversationNotification) => {
        console.log('🔔 Notificação cross-conversation:', notification);
        
        // Atualizar badge de não lidas
        setConversations(prev => prev.map(conv => {
          if (conv.roomId === notification.sourceRoomId) {
            return { ...conv, unreadCount: conv.unreadCount + 1 };
          }
          return conv;
        }));

        // Callback para notificação toast
        if (onNotification) {
          onNotification(notification);
        }
      });
    }
  }, [onNotification]);

  // Criar nova conversa
  const createNewConversation = useCallback(() => {
    if (socketRef.current && isConnected) {
      console.log('🆕 Criando nova conversa...');
      setIsLoading(true);
      socketRef.current.emit('create-new-conversation');
      
      // Reset loading após timeout
      setTimeout(() => setIsLoading(false), 3000);
    } else {
      console.warn('❌ Socket não conectado - não é possível criar conversa');
    }
  }, [isConnected]);

  // Trocar para conversa específica
  const switchToConversation = useCallback((conversationId: string) => {
    console.log('🔄 Trocando para conversa:', conversationId);
    
    // Marcar conversa como lida (zerar unreadCount)
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, unreadCount: 0 }
        : conv
    ));

    setActiveConversationId(conversationId);
    
    // TODO: Carregar histórico da conversa se necessário
    if (socketRef.current) {
      // Pode implementar carregamento lazy do histórico aqui
    }
  }, []);

  // Enviar mensagem na conversa ativa
  const sendMessage = useCallback((text: string, attachments: any[] = []) => {
    if (socketRef.current && activeConversationIdRef.current) {
      const activeConversation = conversationsRef.current.find(c => c.id === activeConversationIdRef.current);
      
      if (activeConversation) {
        console.log('📤 Enviando mensagem:', text, 'Sala:', activeConversation.roomId);
        
        socketRef.current.emit('send-message', {
          text,
          attachments,
          roomId: activeConversation.roomId, // Especificar sala
        });

        // Adicionar mensagem do usuário otimisticamente
        const userMessage: Message = {
          id: Date.now().toString(),
          text,
          sender: 'user',
          timestamp: new Date(),
          attachments,
        };

        setConversations(prev => prev.map(conv => 
          conv.id === activeConversationIdRef.current
            ? { 
                ...conv, 
                messages: [...conv.messages, userMessage],
                lastMessageAt: new Date()
              }
            : conv
        ));
      }
    }
  }, []);

  // Obter conversa ativa
  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  // Total de mensagens não lidas
  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  return {
    // Estado
    conversations,
    activeConversation,
    activeConversationId,
    isLoading,
    isConnected,
    totalUnreadCount,

    // Ações
    setSocket,
    createNewConversation,
    switchToConversation,
    sendMessage,

    // Utilitários
    hasConversations: conversations.length > 0,
    conversationCount: conversations.length,
  };
};

export default useMultiConversation;