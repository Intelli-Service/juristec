import { useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { Conversation, Message } from '@/types/chat.types';

interface UseConversationsProps {
  socket: Socket | null;
  activeConversationId: string | null;
  setActiveConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setHasStartedConversation: React.Dispatch<React.SetStateAction<boolean>>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
}

export const useConversations = ({
  socket,
  activeConversationId,
  setActiveConversationId,
  setMessages,
  setHasStartedConversation,
  setConversations,
}: UseConversationsProps) => {
  
  const createNewConversation = useCallback(() => {
    console.log('🆕 createNewConversation called!', { socket, connected: socket?.connected });
    if (socket) {
      console.log('✅ Emitting create-new-conversation event...');
      socket.emit('create-new-conversation');
    } else {
      console.log('❌ Socket not available!');
    }
  }, [socket]);

  const switchToConversation = useCallback((conversationId: string) => {
    if (conversationId !== activeConversationId) {
      console.log(`🔄 Switching to conversation ${conversationId} (immediate)`);
      
      setActiveConversationId(conversationId);
      setMessages([]);
      setHasStartedConversation(false);
      
      if (socket) {
        socket.emit('switch-conversation', { conversationId });
      }
    }
  }, [activeConversationId, socket, setActiveConversationId, setMessages, setHasStartedConversation]);

  const markAsRead = useCallback((conversationId: string) => {
    setConversations(prev => prev.map(conv =>
      conv.id === conversationId
        ? { ...conv, unreadCount: 0 }
        : conv
    ));
  }, [setConversations]);

  return {
    createNewConversation,
    switchToConversation,
    markAsRead,
  };
};
