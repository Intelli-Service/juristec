'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMultiConversation } from '../hooks/useMultiConversation';
import { useNotifications } from '../hooks/useNotifications';
import FileUpload from './FileUpload';

export default function MultiConversationChat() {
  const {
    conversations,
    activeConversationId,
    activeConversationMessages,
    isLoading,
    createNewConversation,
    switchToConversation,
    sendMessage,
    markAsRead,
    getActiveConversation,
    getTotalUnreadCount
  } = useMultiConversation();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { info } = useNotifications();

  const activeConversation = getActiveConversation();
  const totalUnreadCount = getTotalUnreadCount();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversationMessages]);

  // Listen for cross-conversation notifications
  useEffect(() => {
    const handleCrossNotification = (event: CustomEvent) => {
      const notification = event.detail;
      info('Nova mensagem', notification.message);
    };

    window.addEventListener('cross-conversation-notification', handleCrossNotification as EventListener);
    return () => {
      window.removeEventListener('cross-conversation-notification', handleCrossNotification as EventListener);
    };
  }, [info]);

  const handleSendMessage = () => {
    if (input.trim() && activeConversation) {
      sendMessage(input.trim(), activeConversation.roomId);
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConversationClick = (conversationId: string) => {
    switchToConversation(conversationId);
    markAsRead(conversationId);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Conversas</h2>
            {totalUnreadCount > 0 && (
              <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                {totalUnreadCount}
              </span>
            )}
          </div>

          <button
            onClick={createNewConversation}
            disabled={isLoading}
            className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Criando...' : '+ Nova Conversa'}
          </button>
        </div>

        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              <p>Nenhuma conversa ainda</p>
              <p className="text-sm">Clique em &quot;Nova Conversa&quot; para começar</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleConversationClick(conversation.id)}
                className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                  conversation.id === activeConversationId
                    ? 'bg-emerald-50 border-l-4 border-l-emerald-600'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">
                      {conversation.title}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {conversation.classification?.category || 'Não classificado'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(conversation.lastMessageAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {/* Status Badge */}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      conversation.status === 'open'
                        ? 'bg-green-100 text-green-800'
                        : conversation.status === 'assigned'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {conversation.status}
                    </span>

                    {/* Unread Count */}
                    {conversation.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">
                    {activeConversation.title}
                  </h1>
                  <p className="text-sm text-slate-600">
                    {activeConversation.classification?.legalArea || 'Área não definida'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-sm rounded-full ${
                    activeConversation.status === 'open'
                      ? 'bg-green-100 text-green-800'
                      : activeConversation.status === 'assigned'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {activeConversation.status === 'open' ? 'Em aberto' :
                     activeConversation.status === 'assigned' ? 'Com advogado' : 'Fechado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeConversationMessages.length === 0 ? (
                <div className="text-center text-slate-500 mt-8">
                  <p>Nenhuma mensagem ainda.</p>
                  <p className="text-sm">Envie uma mensagem para começar a conversa.</p>
                </div>
              ) : (
                activeConversationMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-emerald-600 text-white'
                          : message.sender === 'ai'
                          ? 'bg-slate-200 text-slate-900'
                          : message.sender === 'lawyer'
                          ? 'bg-blue-600 text-white'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {format(new Date(message.timestamp), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-slate-200 p-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    className="w-full p-3 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    rows={1}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                </div>

                <FileUpload
                  onFileSelect={() => {}}
                />

                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Selecione uma conversa
              </h3>
              <p className="text-slate-600">
                Escolha uma conversa da lista lateral ou crie uma nova para começar.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}