'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import io, { Socket } from 'socket.io-client';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'lawyer';
  createdAt: string;
}

interface Conversation {
  _id: string;
  roomId: string;
  status: string;
  classification: {
    category: string;
    complexity: string;
    legalArea: string;
  };
  summary: {
    text: string;
    lastUpdated: string;
  };
  assignedTo?: string;
  clientInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export default function LawyerChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/lawyer');
      return;
    }

    if (session && !['lawyer', 'super_admin'].includes(session.user.role)) {
      router.push('/auth/signin?error=AccessDenied');
      return;
    }

    if (session && roomId) {
      loadConversation();
      initializeSocket();
    }
  }, [session, status, router, roomId]);

  const loadConversation = async () => {
    try {
      const response = await fetch(`/api/lawyer/cases/${roomId}/messages`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const messagesData = await response.json();
      setMessages(messagesData.map((msg: any) => ({
        id: msg._id,
        text: msg.text,
        sender: msg.sender,
        createdAt: msg.createdAt,
      })));

      // Carregar dados da conversa
      const convResponse = await fetch('/api/lawyer/cases', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (convResponse.ok) {
        const cases = await convResponse.json();
        const currentCase = cases.find((c: Conversation) => c.roomId === roomId);
        if (currentCase) {
          setConversation(currentCase);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conversa:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  const initializeSocket = async () => {
    // Obter token JWT da API
    let token = '';
    try {
      const tokenResponse = await fetch('/api/auth/token', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        token = tokenData.token;
      }
    } catch (error) {
      console.error('Erro ao obter token:', error);
    }

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
    const newSocket = io(socketUrl, {
      auth: {
        token: token,
      },
    });

    setSocket(newSocket);

    newSocket.emit('join-lawyer-room', roomId);

    newSocket.on('lawyer-history-loaded', (history: Message[]) => {
      console.log('Histórico carregado via WebSocket:', history);
      setMessages(history);
    });

    newSocket.on('receive-lawyer-message', (data: { text: string; sender: string; messageId: string }) => {
      const newMessage: Message = {
        id: data.messageId,
        text: data.text,
        sender: data.sender as 'user' | 'ai' | 'lawyer',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMessage]);
      setIsLoading(false); // Reset loading state when message is received
    });

    newSocket.on('error', (error: { message: string }) => {
      console.error('Erro do WebSocket:', error);
      alert(`Erro: ${error.message}`);
    });

    return () => {
      newSocket.disconnect();
    };
  };

  const sendMessage = async () => {
    if (!input.trim() || !socket) return;

    const messageText = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      socket.emit('send-lawyer-message', {
        roomId,
        message: messageText,
        lawyerId: session?.user?.id,
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem');
      setIsLoading(false);
    }
  };

  const getSenderName = (sender: string) => {
    switch (sender) {
      case 'user': return 'Cliente';
      case 'ai': return 'Assistente IA';
      case 'lawyer': return 'Advogado';
      default: return 'Sistema';
    }
  };

  const getSenderColor = (sender: string) => {
    switch (sender) {
      case 'user': return 'bg-blue-100 text-blue-800';
      case 'ai': return 'bg-emerald-100 text-emerald-800';
      case 'lawyer': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (status === 'loading' || !session || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Carregando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 shadow-lg border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/lawyer" className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-white">Juristec<span className="text-emerald-400">.com.br</span></div>
            </Link>
            <span className="text-slate-400">•</span>
            <span className="text-slate-400">Chat do Caso</span>
            {conversation && (
              <>
                <span className="text-slate-400">•</span>
                <span className="text-slate-300">#{conversation.roomId.slice(-6)}</span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-emerald-400 font-medium">Advogado</span>
            <Link
              href="/lawyer"
              className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
            >
              ← Voltar aos Casos
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Case Info */}
        {conversation && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Caso #{conversation.roomId.slice(-6)}
                </h2>
                <div className="flex items-center space-x-4 mt-2 text-sm text-slate-600">
                  <span><strong>Categoria:</strong> {conversation.classification.category}</span>
                  <span><strong>Complexidade:</strong> {conversation.classification.complexity}</span>
                  <span><strong>Área:</strong> {conversation.classification.legalArea}</span>
                </div>
                {conversation.clientInfo && (
                  <div className="flex items-center space-x-4 mt-2 text-sm text-slate-600">
                    {conversation.clientInfo.name && <span><strong>Cliente:</strong> {conversation.clientInfo.name}</span>}
                    {conversation.clientInfo.email && <span><strong>Email:</strong> {conversation.clientInfo.email}</span>}
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  conversation.status === 'open' ? 'bg-blue-100 text-blue-800' :
                  conversation.status === 'assigned' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {conversation.status === 'open' ? 'Aberto' :
                   conversation.status === 'assigned' ? 'Atribuído' : 'Fechado'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Chat Container */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden flex flex-col" style={{height: '70vh'}}>
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-600">Nenhuma mensagem ainda</h3>
                <p className="text-slate-500">Este é o início da conversa com o cliente.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === 'lawyer' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div className="max-w-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSenderColor(message.sender)}`}>
                        {getSenderName(message.sender)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div
                      className={`px-4 py-3 rounded-lg shadow-sm ${
                        message.sender === 'lawyer'
                          ? 'bg-purple-600 text-white'
                          : message.sender === 'user'
                          ? 'bg-blue-50 text-slate-800 border border-blue-200'
                          : 'bg-emerald-50 text-slate-800 border border-emerald-200'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-end">
                <div className="bg-purple-600 text-white px-4 py-3 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span>Digitando...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Container */}
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Digite sua mensagem para o cliente..."
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-slate-800 placeholder-slate-500"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}