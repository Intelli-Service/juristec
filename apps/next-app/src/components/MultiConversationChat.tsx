/**
 * Interface de Múltiplas Conversas com Notificações em Tempo Real
 * 
 * Funcionalidades:
 * - Sidebar com lista de conversas ativas
 * - Badges de mensagens não lidas
 * - Criação de novas conversas
 * - Chat window dinâmica baseada na conversa ativa
 * - Notificações toast cross-conversation
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import io, { Socket } from 'socket.io-client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import useMultiConversation, { Conversation, Message } from '../hooks/useMultiConversation';
import { useNotifications } from '../hooks/useNotifications';
import FileUpload from './FileUpload';

interface FileAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export default function MultiConversationChat() {
  // Estados locais
  const [socket, setSocket] = useState<Socket | null>(null);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Hooks
  const { data: session } = useSession();
  const notifications = useNotifications();
  const userId = session?.user?.id;

  // Hook de múltiplas conversas
  const {
    conversations,
    activeConversation,
    activeConversationId,
    isLoading,
    isConnected,
    totalUnreadCount,
    setSocket: setMultiSocket,
    createNewConversation,
    switchToConversation,
    sendMessage,
    hasConversations,
    conversationCount,
  } = useMultiConversation({
    userId,
    onNotification: (notification) => {
      // 🔔 Toast notification para mensagens cross-conversation
      notifications.info(
        `Nova mensagem em: ${notification.conversationTitle}`,
        'Clique para visualizar',
        {
          action: {
            label: 'Visualizar',
            onClick: () => {
              const sourceConv = conversations.find(c => c.roomId === notification.sourceRoomId);
              if (sourceConv) {
                switchToConversation(sourceConv.id);
              }
            }
          }
        }
      );
    }
  });

  // Inicializar WebSocket
  useEffect(() => {
    if (!userId) return;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080';
    const newSocket = io(socketUrl);
    
    setSocket(newSocket);
    setMultiSocket(newSocket);
    setIsInitialized(true);

    return () => {
      newSocket.disconnect();
    };
  }, [userId, setMultiSocket]);

  // Upload de arquivo
  const uploadFile = async (file: File): Promise<FileAttachment | null> => {
    try {
      if (!activeConversation) {
        throw new Error('Nenhuma conversa ativa para upload');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', activeConversation.id);

      console.log('📎 Upload de arquivo:', {
        filename: file.name,
        conversationId: activeConversation.id,
        conversationTitle: activeConversation.title,
      });

      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao fazer upload do arquivo');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Erro no upload:', error);
      notifications.error('Erro no upload', error instanceof Error ? error.message : 'Erro desconhecido');
      return null;
    }
  };

  // Enviar mensagem com anexos
  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    let attachments: FileAttachment[] = [];

    // Upload de arquivo se selecionado
    if (selectedFile) {
      const uploadedFile = await uploadFile(selectedFile);
      if (uploadedFile) {
        attachments = [uploadedFile];
      }
    }

    // Enviar mensagem
    sendMessage(input, attachments);

    // Reset form
    setInput('');
    setSelectedFile(null);
  };

  // Render sidebar de conversas
  const renderConversationsSidebar = () => (
    <div className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
      {/* Header da sidebar */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Conversas {conversationCount > 0 && `(${conversationCount})`}
          </h2>
          {totalUnreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </div>
        
        <button
          onClick={createNewConversation}
          disabled={isLoading}
          className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Criando...
            </>
          ) : (
            <>
              <span className="text-lg">+</span>
              Nova Conversa
            </>
          )}
        </button>
      </div>

      {/* Lista de conversas */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            <div className="text-4xl mb-2">💬</div>
            <p>Nenhuma conversa ainda</p>
            <p className="text-sm">Crie sua primeira conversa!</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => switchToConversation(conversation.id)}
              className={`p-4 border-b cursor-pointer hover:bg-slate-100 transition-colors ${
                conversation.id === activeConversationId 
                  ? 'bg-emerald-50 border-l-4 border-l-emerald-600' 
                  : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 truncate">
                    {conversation.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {format(conversation.lastMessageAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                  
                  {/* Última mensagem preview */}
                  {conversation.messages.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {conversation.messages[conversation.messages.length - 1].text}
                    </p>
                  )}
                </div>
                
                {/* Badge de mensagens não lidas */}
                {conversation.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold ml-2 flex-shrink-0">
                    {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                  </span>
                )}
              </div>
              
              {/* Status e classificação */}
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  conversation.status === 'open' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {conversation.status === 'open' ? 'Aberto' : 'Fechado'}
                </span>
                
                {conversation.classification && (
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {conversation.classification.legalArea}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer com status de conexão */}
      <div className="p-3 border-t bg-white">
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-slate-600">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>
    </div>
  );

  // Render área de chat
  const renderChatArea = () => {
    if (!activeConversation) {
      return (
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center text-slate-500">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-medium mb-2">Selecione uma conversa</h3>
            <p>Escolha uma conversa da lista ou crie uma nova para começar</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col bg-white">
        {/* Header da conversa ativa */}
        <div className="p-4 border-b bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {activeConversation.title}
              </h2>
              <p className="text-sm text-slate-600">
                {activeConversation.messages.length} mensagens
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-sm rounded-full ${
                activeConversation.status === 'open' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {activeConversation.status === 'open' ? 'Aberto' : 'Fechado'}
              </span>
            </div>
          </div>
        </div>

        {/* Área de mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeConversation.messages.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <div className="text-4xl mb-2">💭</div>
              <p>Comece a conversa!</p>
              <p className="text-sm">Digite sua mensagem abaixo</p>
            </div>
          ) : (
            activeConversation.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-emerald-600 text-white'
                      : message.sender === 'ai'
                      ? 'bg-slate-100 text-slate-900'
                      : message.sender === 'lawyer'
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-yellow-100 text-yellow-900'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  {message.timestamp && (
                    <p className="text-xs mt-1 opacity-70">
                      {format(message.timestamp, 'HH:mm')}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input de mensagem */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Digite sua mensagem..."
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={!isConnected}
              />
            </div>
            
            <FileUpload
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
              disabled={!isConnected}
            />
            
            <button
              onClick={handleSendMessage}
              disabled={!isConnected || (!input.trim() && !selectedFile)}
              className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Conectando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100">
      {renderConversationsSidebar()}
      {renderChatArea()}
    </div>
  );
}