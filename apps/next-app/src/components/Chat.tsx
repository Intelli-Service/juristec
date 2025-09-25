'use client';

import { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';
import FileUpload from './FileUpload';
import { useNotifications } from '../hooks/useNotifications';
import FeedbackModal, { FeedbackData } from './feedback/FeedbackModal';
import { useFeedback } from '../hooks/useFeedback';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system' | 'lawyer';
  attachments?: FileAttachment[];
}

interface FileAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId] = useState(() => `room-${Date.now()}`); // Room única por conversa
  const [hasStartedConversation, setHasStartedConversation] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caseAssigned, setCaseAssigned] = useState<{
    assigned: boolean;
    lawyerName?: string;
    lawyerId?: string;
  }>({ assigned: false });
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [isCreatingCharge, setIsCreatingCharge] = useState(false);
  const [chargeForm, setChargeForm] = useState({
    type: '',
    amount: '',
    title: '',
    description: '',
    reason: ''
  });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const notifications = useNotifications();

  // Hook para feedback
  const feedbackHook = useFeedback({
    userId: 'user-' + roomId, // Usar ID consistente
    conversationId: roomId,
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

  // Lógica para mostrar feedback baseada em decisão inteligente da IA
  // O feedback agora é controlado pelo evento WebSocket 'show-feedback-modal'
  // que é emitido quando a IA detecta que uma conversa deve mostrar feedback

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsCreatingCharge(true);
    try {
      const response = await fetch('/api/billing/create-charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: roomId,
          ...chargeForm,
          amount: parseFloat(chargeForm.amount)
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar cobrança');
      }

      const result = await response.json();
      console.log('Cobrança criada:', result);

      // Reset form and close modal
      setChargeForm({
        type: '',
        amount: '',
        title: '',
        description: '',
        reason: ''
      });
      setShowChargeModal(false);

      // Show success message
      notifications.success('Cobrança criada com sucesso!', 'O cliente foi notificado.');
    } catch (error) {
      console.error('Erro ao criar cobrança:', error);
      notifications.error('Erro ao criar cobrança', 'Tente novamente.');
    } finally {
      setIsCreatingCharge(false);
    }
  };

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.emit('join-room', roomId);

    newSocket.on('load-history', (history: Message[]) => {
      if (history.length > 0) {
        setMessages(history);
        setHasStartedConversation(true);
      }
      // Marcar como inicializado após carregar histórico
      setIsInitialized(true);
    });

    newSocket.on('receive-message', (data: { text: string; sender: string; messageId?: string; isError?: boolean; shouldRetry?: boolean; createdAt?: string }) => {
      const newMessage: Message = {
        id: data.messageId || Date.now().toString(),
        text: data.text,
        sender: data.sender as 'user' | 'ai' | 'system', // Manter sender original para o cliente
      };
      setMessages((prev) => {
        const newMsgs = [...prev, newMessage];
        localStorage.setItem(`chat-${roomId}`, JSON.stringify(newMsgs));
        return newMsgs;
      });
      setIsLoading(false);

      // Se a mensagem é de um advogado, atualizar o estado para mostrar que o caso foi atribuído
      if (data.sender === 'lawyer') {
        setCaseAssigned({
          assigned: true,
          lawyerName: 'Advogado',
          lawyerId: 'lawyer'
        });
      }
    });

    // Listener para atualizações de status do caso
    newSocket.on('case-updated', (data: { status: string; assignedTo?: string; lawyerName?: string }) => {
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

    // Listener para mostrar modal de feedback baseado em decisão da IA
    newSocket.on('show-feedback-modal', (data: { reason: string; context: string }) => {
      console.log('🎯 IA detectou que deve mostrar feedback:', data);
      if (!feedbackSubmitted && !showFeedbackModal) {
        // Pequeno delay para não interromper a conversa
        setTimeout(() => {
          setShowFeedbackModal(true);
        }, 2000);
      }
    });

    // Carregar do localStorage se existir
    const cached = localStorage.getItem(`chat-${roomId}`);
    if (cached) {
      const parsedMessages = JSON.parse(cached);
      setMessages(parsedMessages);
      setHasStartedConversation(true);
    }

    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

  const getRespondentInfo = (sender: string) => {
    if (sender === 'user') {
      return { name: 'Você', role: '', color: 'text-slate-600' };
    }

    if (sender === 'lawyer' || (caseAssigned.assigned && sender === 'ai')) {
      // Quando o caso está atribuído ou mensagem é de advogado, mostrar informações do advogado
      return {
        name: caseAssigned.lawyerName || 'Advogado Responsável',
        role: 'Advogado Especialista',
        color: 'text-purple-600',
        icon: '👨‍⚖️'
      };
    }

    // Caso padrão - IA
    return {
      name: 'Assistente Jurídico',
      role: 'IA Inteligente',
      color: 'text-emerald-600',
      icon: '🤖'
    };
  };

  const uploadFile = async (file: File): Promise<FileAttachment | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', roomId);
      formData.append('userId', 'user-' + roomId); // Usar um ID de usuário temporário

      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao fazer upload do arquivo');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Erro no upload:', error);
      return null;
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedFile) || !socket) return;

    let attachments: FileAttachment[] = [];

    // Upload file if selected
    if (selectedFile) {
      const uploadedFile = await uploadFile(selectedFile);
      if (uploadedFile) {
        attachments = [uploadedFile];
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      attachments,
    };

    setMessages((prev) => {
      const newMsgs = [...prev, userMessage];
      localStorage.setItem(`chat-${roomId}`, JSON.stringify(newMsgs));
      return newMsgs;
    });
    setInput('');
    setSelectedFile(null);
    setIsLoading(true);

    // Marcar que a conversa começou após o primeiro envio
    if (!hasStartedConversation) {
      setHasStartedConversation(true);
    }
  };

  const handleFeedbackSubmit = async (feedbackData: FeedbackData) => {
    await feedbackHook.submitFeedback(feedbackData);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden flex flex-col" style={{height: '80vh'}}>
        {/* Header */}
        <header className="bg-slate-900 shadow-lg border-b border-slate-800 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <a href="/" className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-white">Juristec<span className="text-emerald-400">.com.br</span></div>
              </a>
              <div className="hidden sm:block text-slate-400 text-sm">
                Assistente Jurídico Inteligente
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-slate-400 text-sm">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span>Online</span>
              </div>
              <a
                href="/"
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
              >
                ← Voltar ao Início
              </a>
            </div>
          </div>
        </header>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
          {messages.map((message) => (
            <div key={message.id} className="space-y-1">
              {message.sender !== 'user' && message.sender !== 'system' && (
                <div className="flex justify-start">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">{getRespondentInfo(message.sender).icon}</span>
                    <div className="text-xs text-slate-500">
                      <span className="font-medium">{getRespondentInfo(message.sender).name}</span>
                      <span className="mx-1">•</span>
                      <span>{getRespondentInfo(message.sender).role}</span>
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
                >
                  {message.text}
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
        </div>

        {/* Billing Button - Only for assigned lawyers */}
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

        {/* Input Container */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-3">
          {/* File Upload */}
          <FileUpload
            onFileSelect={setSelectedFile}
            disabled={isLoading}
          />

          {/* Text Input and Send Button */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Digite sua mensagem jurídica..."
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-slate-800 placeholder-slate-500"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || (!input.trim() && !selectedFile)}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>

      {/* Charge Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Cobrar Cliente</h3>

            <form onSubmit={handleCreateCharge} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Serviço
                </label>
                <select
                  value={chargeForm.type}
                  onChange={(e) => setChargeForm({...chargeForm, type: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="consultation">Consulta Jurídica</option>
                  <option value="document_analysis">Análise de Documentos</option>
                  <option value="legal_opinion">Parecer Jurídico</option>
                  <option value="process_followup">Acompanhamento Processual</option>
                  <option value="mediation">Mediação/Negociação</option>
                  <option value="other">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={chargeForm.amount}
                  onChange={(e) => setChargeForm({...chargeForm, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0,00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Título da Cobrança
                </label>
                <input
                  type="text"
                  value={chargeForm.title}
                  onChange={(e) => setChargeForm({...chargeForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Análise de Contrato de Trabalho"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({...chargeForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Descreva o serviço prestado..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Justificativa
                </label>
                <textarea
                  value={chargeForm.reason}
                  onChange={(e) => setChargeForm({...chargeForm, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Por que está cobrando este valor?"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowChargeModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCharge}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isCreatingCharge ? 'Criando...' : 'Criar Cobrança'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
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