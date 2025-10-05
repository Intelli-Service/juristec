import { useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { Conversation, Message } from '@/types/chat.types';

interface UseWebSocketEventsProps {
  socket: Socket | null;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setActiveConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setHasStartedConversation: React.Dispatch<React.SetStateAction<boolean>>;
  setIsLoading: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setCaseAssigned: React.Dispatch<React.SetStateAction<{ assigned: boolean; lawyerName?: string; lawyerId?: string }>>;
  setShowFeedbackModal: React.Dispatch<React.SetStateAction<boolean>>;
  feedbackSubmittedRef: React.RefObject<boolean>;
  showFeedbackModalRef: React.RefObject<boolean>;
  activeConversationId: string | null;
}

export const useWebSocketEvents = ({
  socket,
  setConversations,
  setActiveConversationId,
  setMessages,
  setHasStartedConversation,
  setIsLoading,
  setCaseAssigned,
  setShowFeedbackModal,
  feedbackSubmittedRef,
  showFeedbackModalRef,
  activeConversationId,
}: UseWebSocketEventsProps) => {
  
  const setupEventListeners = useCallback(() => {
    if (!socket) return;

    // Multi-conversation listeners
    socket.on('conversations-loaded', (data: {
      conversations: Conversation[],
      activeRooms: string[]
    }) => {
      setConversations(data.conversations);
      if (data.conversations.length > 0 && !activeConversationId) {
        const firstConversation = data.conversations[0];
        setActiveConversationId(firstConversation.id);
        socket.emit('switch-conversation', { conversationId: firstConversation.id });
      }
      console.log(`Conectado a ${data.activeRooms.length} conversas`);
    });

    socket.on('new-conversation-created', (newConversation: Conversation) => {
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(newConversation.id);
      setMessages([]);
      setHasStartedConversation(false);
    });

    socket.on('conversation-switched', (data: {
      conversationId: string,
      roomId: string,
      messages: Message[]
    }) => {
      console.log(`📜 Carregando histórico para conversa ${data.conversationId}: ${data.messages.length} mensagens`);
      setMessages(data.messages);
      setHasStartedConversation(data.messages.length > 0);
    });

    socket.on('receive-message', (data: { 
      text: string; 
      sender: string; 
      messageId?: string; 
      isError?: boolean; 
      shouldRetry?: boolean; 
      createdAt?: string; 
      conversationId?: string;
      lawyerName?: string;
      lawyerId?: string;
      lawyerLicenseNumber?: string;
    }) => {
      console.log(`📨 Mensagem recebida:`, data);
      
      const newMessage: Message = {
        id: data.messageId || Date.now().toString(),
        text: data.text,
        sender: data.sender as 'user' | 'ai' | 'system',
        conversationId: data.conversationId,
        lawyerName: data.lawyerName,
        lawyerId: data.lawyerId,
        lawyerLicenseNumber: data.lawyerLicenseNumber,
      };
      
      setMessages((prev) => [...prev, newMessage]);
      
      if (data.conversationId) {
        setIsLoading(prev => ({ ...prev, [data.conversationId as string]: false }));
      }

      if (data.sender === 'lawyer') {
        setCaseAssigned({
          assigned: true,
          lawyerName: 'Advogado',
          lawyerId: 'lawyer'
        });
      }
    });

    socket.on('case-updated', (data: { status: string; assignedTo?: string; lawyerName?: string }) => {
      if (data.status === 'assigned' && data.assignedTo) {
        setCaseAssigned({
          assigned: true,
          lawyerName: data.lawyerName || 'Advogado',
          lawyerId: data.assignedTo,
        });
      } else if (data.status === 'open') {
        setCaseAssigned({ assigned: false });
      }
    });

    socket.on('show-feedback-modal', (data: { reason: string; context: string }) => {
      console.log('🎯 FEEDBACK MODAL TRIGGER recebido:', data);
      console.log('📊 Estado atual:', {
        feedbackSubmitted: feedbackSubmittedRef.current,
        showFeedbackModal: showFeedbackModalRef.current,
      });
      
      if (!feedbackSubmittedRef.current && !showFeedbackModalRef.current) {
        console.log('✅ Agendando exibição do modal de feedback em 2s');
        setTimeout(() => {
          console.log('🎯 Exibindo modal de feedback');
          setShowFeedbackModal(true);
        }, 2000);
      } else {
        console.log('⏭️ Modal de feedback cancelado (já submetido ou já exibindo)');
      }
    });
  }, [
    socket,
    setConversations,
    setActiveConversationId,
    setMessages,
    setHasStartedConversation,
    setIsLoading,
    setCaseAssigned,
    setShowFeedbackModal,
    feedbackSubmittedRef,
    showFeedbackModalRef,
    activeConversationId,
  ]);

  return { setupEventListeners };
};
