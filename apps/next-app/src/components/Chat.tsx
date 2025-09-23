'use client';

import { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId] = useState(() => `room-${Date.now()}`); // Room única por conversa
  const [hasStartedConversation, setHasStartedConversation] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

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

    newSocket.on('receive-message', (data: { text: string; sender: string; messageId?: string }) => {
      const newMessage: Message = {
        id: data.messageId || Date.now().toString(),
        text: data.text,
        sender: data.sender === 'lawyer' ? 'ai' : (data.sender as 'user' | 'ai'), // Mostrar mensagens do advogado como IA para o cliente
      };
      setMessages((prev) => {
        const newMsgs = [...prev, newMessage];
        localStorage.setItem(`chat-${roomId}`, JSON.stringify(newMsgs));
        return newMsgs;
      });
      setIsLoading(false);
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

  const sendMessage = async () => {
    if (!input.trim() || !socket) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
    };

    setMessages((prev) => {
      const newMsgs = [...prev, userMessage];
      localStorage.setItem(`chat-${roomId}`, JSON.stringify(newMsgs));
      return newMsgs;
    });
    setInput('');
    setIsLoading(true);

    // Marcar que a conversa começou após o primeiro envio
    if (!hasStartedConversation) {
      setHasStartedConversation(true);
    }

    socket.emit('send-message', { roomId, message: input });
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
                    : 'bg-white text-slate-800 shadow-md border border-slate-200'
                }`}
              >
                {message.text}
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

        {/* Input Container */}
        <div className="p-4 bg-white border-t border-slate-200">
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
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}