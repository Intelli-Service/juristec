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

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.emit('join-room', roomId);

    newSocket.on('load-history', (history: Message[]) => {
      if (history.length > 0) {
        setMessages(history);
      } else {
        // Mensagem inicial se não houver histórico
        const initialMessage: Message = {
          id: '1',
          text: 'Olá! Sou seu assistente jurídico. Como posso ajudar com sua questão jurídica hoje?',
          sender: 'ai',
        };
        setMessages([initialMessage]);
        localStorage.setItem(`chat-${roomId}`, JSON.stringify([initialMessage]));
      }
    });

    newSocket.on('receive-message', (data: { text: string; sender: string }) => {
      const aiMessage: Message = {
        id: Date.now().toString(),
        text: data.text,
        sender: 'ai',
      };
      setMessages((prev) => {
        const newMsgs = [...prev, aiMessage];
        localStorage.setItem(`chat-${roomId}`, JSON.stringify(newMsgs));
        return newMsgs;
      });
      setIsLoading(false);
    });

    // Carregar do localStorage se existir
    const cached = localStorage.getItem(`chat-${roomId}`);
    if (cached) {
      setMessages(JSON.parse(cached));
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

    socket.emit('send-message', { roomId, message: input });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 shadow-lg border-b border-slate-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <a href="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-white">Jurídico<span className="text-emerald-400">IA</span></div>
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
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Digite sua mensagem jurídica..."
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
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