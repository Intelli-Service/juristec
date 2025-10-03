import React, { useCallback, useEffect, useRef } from 'react';
import MessageAttachments from '@/components/MessageAttachments';
import { Message, FileAttachment, CaseAssignment } from '@/types/chat.types';
import { getRespondentInfo } from '@/lib/chat.utils';

interface MessageListProps {
  messages: Message[];
  activeConversationId: string | null;
  isLoading: boolean;
  hasStartedConversation: boolean;
  isInitialized: boolean;
  caseAssigned: CaseAssignment;
  onAttachmentDownload: (attachment: FileAttachment) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  activeConversationId,
  isLoading,
  hasStartedConversation,
  isInitialized,
  caseAssigned,
  onAttachmentDownload,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousConversationRef = useRef<string | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior, block: 'end' });
    } else if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    const behavior = previousConversationRef.current === activeConversationId ? 'smooth' : 'auto';
    scrollToBottom(behavior);
    previousConversationRef.current = activeConversationId;
  }, [messages, activeConversationId, scrollToBottom]);

  useEffect(() => {
    if (isLoading) {
      scrollToBottom('smooth');
    }
  }, [isLoading, scrollToBottom]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 scroll-smooth">
      {!hasStartedConversation && messages.length === 0 && isInitialized && (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
          <div className="max-w-md">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo ao Juristec</h2>
            <p className="text-slate-600 mb-6">
              Seu assistente jurídico inteligente está pronto para ajudar.
              Digite sua pergunta jurídica abaixo para começar.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-slate-500">
              <span className="px-3 py-1 bg-slate-100 rounded-full">Direito Civil</span>
              <span className="px-3 py-1 bg-slate-100 rounded-full">Direito Trabalhista</span>
              <span className="px-3 py-1 bg-slate-100 rounded-full">Direito Penal</span>
              <span className="px-3 py-1 bg-slate-100 rounded-full">Consultoria Jurídica</span>
            </div>
          </div>
        </div>
      )}
      
      {messages
        .filter(message => !message.conversationId || message.conversationId === activeConversationId)
        .map((message) => (
          <div key={message.id} className="space-y-1" data-testid="message">
            {message.sender !== 'user' && message.sender !== 'system' && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">{getRespondentInfo(message.sender, caseAssigned).icon}</span>
                  <div className="text-xs text-slate-500">
                    <span className="font-medium">{getRespondentInfo(message.sender, caseAssigned).name}</span>
                    <span className="mx-1">•</span>
                    <span>{getRespondentInfo(message.sender, caseAssigned).role}</span>
                  </div>
                </div>
              </div>
            )}
            {message.sender === 'system' && (
              <div className="flex justify-center">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm">⚠️</span>
                  <div className="text-xs text-amber-600">
                    <span className="font-medium">Sistema</span>
                  </div>
                </div>
              </div>
            )}
            <div
              className={`flex ${
                message.sender === 'user' ? 'justify-end' : message.sender === 'system' ? 'justify-center' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-emerald-600 text-white'
                    : message.sender === 'system'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : message.sender === 'lawyer'
                    ? 'bg-purple-50 text-purple-900 shadow-md border border-purple-200'
                    : 'bg-white text-slate-800 shadow-md border border-slate-200'
                }`}
                data-testid={`message-${message.sender}`}
              >
                {message.text}
                {message.attachments && message.attachments.length > 0 && (
                  <MessageAttachments
                    key={`attachments-${message.id}`}
                    attachments={message.attachments}
                    onDownload={onAttachmentDownload}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-white text-slate-800 shadow-md border border-slate-200 px-4 py-2 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <span>Digitando...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
};
