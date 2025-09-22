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
    <div className="flex flex-col h-screen bg-gray-50">
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
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-800 shadow'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 shadow px-4 py-2 rounded-lg">
              Digitando...
            </div>
          </div>
        )}
      </div>
      <div className="p-4 bg-white border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}