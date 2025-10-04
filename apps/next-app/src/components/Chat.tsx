'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAutoSession } from '@/hooks/useAutoSession';
import { useNotifications } from '@/hooks/useNotifications';
import { useFeedback } from '@/hooks/useFeedback';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useChargeModal } from '@/hooks/useChargeModal';
import { Message, Conversation, CaseAssignment } from '@/types/chat.types';
import { ChatHeader } from './chat/ChatHeader';
import { ChatSidebar } from './chat/ChatSidebar';
import { MobileSidebar } from './chat/MobileSidebar';
import { MessageList } from './chat/MessageList';
import { ChatInput } from './chat/ChatInput';
import { ChargeModal } from './chat/ChargeModal';
import FeedbackModal, { FeedbackData } from './feedback/FeedbackModal';

export default function Chat() {
  // Multi-conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  // Message state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  
  // WebSocket state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // UI state
  const [hasStartedConversation, setHasStartedConversation] = useState(false);
  const [isInitialized] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clearFileTrigger, setClearFileTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  
  // Case assignment state
  const [caseAssigned, setCaseAssigned] = useState<CaseAssignment>({ assigned: false });
  
  // Feedback state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  // Refs
  const feedbackSubmittedRef = useRef(feedbackSubmitted);
  const showFeedbackModalRef = useRef(showFeedbackModal);
  
  // Session & Notifications
  const { session, status: sessionStatus } = useAutoSession();
  const notifications = useNotifications();
  const userId = session?.user?.id;

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep refs updated
  useEffect(() => {
    feedbackSubmittedRef.current = feedbackSubmitted;
    showFeedbackModalRef.current = showFeedbackModal;
  }, [feedbackSubmitted, showFeedbackModal]);

  // Feedback hook
  const feedbackHook = useFeedback({
    userId: userId || '',
    conversationId: userId || '',
    lawyerId: caseAssigned.lawyerId,
    onSuccess: () => {
      setFeedbackSubmitted(true);
      setShowFeedbackModal(false);
      notifications.success('Avaliação enviada', 'Obrigado pelo seu feedback!');
    },
    onError: (error) => {
      notifications.error('Erro na avaliação', error);
    }
  });

  // Custom hooks for organized logic
  const { createNewConversation, switchToConversation, markAsRead } = useConversations({
    socket,
    activeConversationId,
    setActiveConversationId,
    setMessages,
    setHasStartedConversation,
    setConversations,
  });

  const { sendMessage, handleAttachmentDownload } = useMessages({
    socket,
    activeConversationId,
    isLoading,
    hasStartedConversation,
    input,
    selectedFile,
    setMessages,
    setInput,
    setSelectedFile,
    setClearFileTrigger,
    setIsLoading,
    setHasStartedConversation,
    setIsSendingMessage,
    setIsUploadingAttachment,
  });

  const {
    showChargeModal,
    setShowChargeModal,
    isCreatingCharge,
    chargeForm,
    setChargeForm,
    handleCreateCharge,
  } = useChargeModal({ userId });

  const handleClearSelectedFile = useCallback(() => {
    setSelectedFile(null);
    setClearFileTrigger((prev) => prev + 1);
  }, [setSelectedFile, setClearFileTrigger]);

  // WebSocket connection effect - MANTÉM A LÓGICA ORIGINAL
  useEffect(() => {
    console.log('🎯 Chat useEffect executado', { sessionStatus, userId: session?.user?.id, session });
    console.log('🔍 DEBUG: Session status check:', sessionStatus);
    console.log('🔍 DEBUG: Session object:', session);
    
    if (sessionStatus === 'loading') {
      console.log('⏳ Session ainda carregando...');
      return;
    }

    const userId = session?.user?.id;
    console.log('🔍 DEBUG: Extracted userId:', userId);

    if (!userId) {
      console.log('❌ Sem userId válido', { userId, session });
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080';
    console.log('🔌 Inicializando WebSocket...', { userId, sessionStatus, socketUrl });
    const newSocket = io(socketUrl);
    console.log('🔌 WebSocket created:', newSocket);
    setSocket(newSocket);
    console.log('🔌 setSocket called with:', newSocket);
    
    // For debugging
    if (typeof window !== 'undefined') {
      (window as unknown as { socket: Socket }).socket = newSocket;
    }

    newSocket.emit('join-room');

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Multi-conversation listeners
    newSocket.on('conversations-loaded', (data: {
      conversations: Conversation[],
      activeRooms: string[]
    }) => {
      setConversations(data.conversations);
      if (data.conversations.length > 0 && !activeConversationId) {
        const firstConversation = data.conversations[0];
        setActiveConversationId(firstConversation.id);
        newSocket.emit('switch-conversation', { conversationId: firstConversation.id });
      }
      console.log(`Conectado a ${data.activeRooms.length} conversas`);
    });

    console.log('🎧 Registrando listener typing-start...');
    newSocket.on('typing-start', (data: { conversationId: string }) => {
      console.log('✍️ Typing start received:', data);
      console.log('📊 Current isTyping state before:', isTyping);
      if (data.conversationId) {
        setIsTyping(prev => {
          const newState = { ...prev, [data.conversationId]: true };
          console.log('📊 New isTyping state:', newState);
          return newState;
        });
      }
    });

    console.log('🎧 Registrando listener typing-stop...');
    newSocket.on('typing-stop', (data: { conversationId: string }) => {
      console.log('🛑 Typing stop received:', data);
      console.log('📊 Current isTyping state before:', isTyping);
      if (data.conversationId) {
        setIsTyping(prev => {
          const newState = { ...prev, [data.conversationId]: false };
          console.log('📊 New isTyping state:', newState);
          return newState;
        });
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionStatus, session]);

  const handleFeedbackSubmit = async (feedbackData: FeedbackData) => {
    await feedbackHook.submitFeedback(feedbackData);
  };

  // Loading state
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Preparando seu chat...</p>
        </div>
      </div>
    );
  }

  const currentIsLoading = activeConversationId ? isLoading[activeConversationId] || false : false;
  
  // Mostrar "digitando" baseado nos eventos de WebSocket
  const currentIsTyping = activeConversationId ? isTyping[activeConversationId] || false : false;
  const shouldShowTyping = currentIsTyping;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        createNewConversation={createNewConversation}
        switchToConversation={switchToConversation}
        markAsRead={markAsRead}
        isLoading={currentIsLoading}
      />

      {/* Main Chat Area */}
  <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <ChatHeader
          isConnected={isConnected}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          mobileSidebarTrigger={
            <MobileSidebar
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              conversations={conversations}
              activeConversationId={activeConversationId}
              createNewConversation={createNewConversation}
              switchToConversation={switchToConversation}
              markAsRead={markAsRead}
              isLoading={currentIsLoading}
            />
          }
        />

        <MessageList
          messages={messages}
          activeConversationId={activeConversationId}
          isLoading={shouldShowTyping}
          hasStartedConversation={hasStartedConversation}
          isInitialized={isInitialized}
          caseAssigned={caseAssigned}
          onAttachmentDownload={handleAttachmentDownload}
        />

        {/* Billing Button */}
        {caseAssigned.assigned && caseAssigned.lawyerId && (
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <button
              onClick={() => setShowChargeModal(true)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <span>💰</span>
              <span>Cobrar Cliente</span>
            </button>
          </div>
        )}

        <ChatInput
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          setSelectedFile={setSelectedFile}
          isConnected={isConnected}
          selectedFile={selectedFile}
          clearFileTrigger={clearFileTrigger}
          isSendingMessage={isSendingMessage}
          isUploadingAttachment={isUploadingAttachment}
          onClearSelectedFile={handleClearSelectedFile}
        />
      </div>

      {/* Modals */}
      <ChargeModal
        showChargeModal={showChargeModal}
        setShowChargeModal={setShowChargeModal}
        chargeForm={chargeForm}
        setChargeForm={setChargeForm}
        handleCreateCharge={handleCreateCharge}
        isCreatingCharge={isCreatingCharge}
      />

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleFeedbackSubmit}
        conversationTitle="Conversa Jurídica"
        lawyerName={caseAssigned.lawyerName}
      />
    </div>
  );
}
