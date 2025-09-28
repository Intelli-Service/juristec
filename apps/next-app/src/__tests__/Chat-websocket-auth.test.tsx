/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useSession } from 'next-auth/react';

// Mock dos hooks
jest.mock('../hooks/useNotifications');
jest.mock('../hooks/useFeedback');

// Mock do NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
}));

// Mock do socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    emit: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  };
  return jest.fn(() => mockSocket);
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Chat from '../components/Chat';
import { useNotifications } from '../hooks/useNotifications';
import { useFeedback } from '../hooks/useFeedback';
import io from 'socket.io-client';

// Mock do fetch global
global.fetch = jest.fn();

const mockNotifications = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
};

const mockFeedback = {
  submitFeedback: jest.fn(),
};

describe('Chat Component - WebSocket Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup dos mocks dos hooks
    (useNotifications as jest.Mock).mockReturnValue(mockNotifications);
    (useFeedback as jest.Mock).mockReturnValue(mockFeedback);

    // Mock do fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  describe('WebSocket Connection with NextAuth', () => {
    it('should connect to WebSocket with NextAuth session cookies', async () => {
      // Mock de sessão autenticada
      (useSession as jest.MockedFunction<typeof useSession>).mockReturnValue({
        data: {
          user: {
            id: 'user123',
            email: 'test@example.com',
            name: 'Test User',
          } as any,
          accessToken: 'mock-jwt-token',
        } as any,
        status: 'authenticated',
      } as any);

      // Mock do document.cookie para simular cookies NextAuth
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'next-auth.session-token=mock-jwt-token; next-auth.csrf-token=mock-csrf-token; next-auth.callback-url=http%3A%2F%2Flocalhost%3A3000%2Fchat',
      });

      render(<Chat />);

      // Aguardar a inicialização do componente
      await waitFor(() => {
        expect(jest.mocked(io)).toHaveBeenCalledWith('http://localhost:8080');
      });

      // Verificar se join-room foi emitido com roomId dinâmico
      await waitFor(() => {
        const mockSocket = jest.mocked(io).mock.results[0].value;
        expect(mockSocket.emit).toHaveBeenCalledWith('join-room', expect.objectContaining({ roomId: expect.stringContaining('room-') }));
      });

      // Verificar se os event listeners foram configurados
      const mockSocket = jest.mocked(io).mock.results[0].value;
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('load-history', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('receive-message', expect.any(Function));
    });

    it('should handle anonymous user connection', async () => {
      // Mock de sessão anônima
      (useSession as jest.MockedFunction<typeof useSession>).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any);

      // Mock de cookies para usuário anônimo
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'next-auth.session-token=anon-jwt-token; next-auth.csrf-token=anon-csrf-token',
      });

      render(<Chat />);

      await waitFor(() => {
        expect(jest.mocked(io)).toHaveBeenCalledWith('http://localhost:8080');
      });

      // Verificar se join-room foi emitido com roomId dinâmico
      await waitFor(() => {
        const mockSocket = jest.mocked(io).mock.results[0].value;
        expect(mockSocket.emit).toHaveBeenCalledWith('join-room', expect.objectContaining({ roomId: expect.stringContaining('room-') }));
      });

      // Verificar se os event listeners foram configurados
      const mockSocket = jest.mocked(io).mock.results[0].value;
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('load-history', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('receive-message', expect.any(Function));
    });

    it('should handle WebSocket connection success', async () => {
      (useSession as jest.MockedFunction<typeof useSession>).mockReturnValue({
        data: {
          user: { id: 'user123', email: 'test@example.com' } as any,
          accessToken: 'mock-jwt-token',
        } as any,
        status: 'authenticated',
      } as any);

      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'next-auth.session-token=mock-jwt-token',
      });

      render(<Chat />);

      // Simular evento de conexão bem-sucedida
      const mockSocket = jest.mocked(io).mock.results[0].value;
      const connectCallback = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect')[1];
      act(() => {
        connectCallback();
      });

      // Verificar se join-room foi emitido com roomId dinâmico
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('join-room', expect.objectContaining({ roomId: expect.stringContaining('room-') }));
      });
    });

    it('should send messages through WebSocket', async () => {
      (useSession as jest.MockedFunction<typeof useSession>).mockReturnValue({
        data: {
          user: { id: 'user123', email: 'test@example.com' } as any,
          accessToken: 'mock-jwt-token',
        } as any,
        status: 'authenticated',
      } as any);

      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'next-auth.session-token=mock-jwt-token',
      });

      render(<Chat />);

      // Simular conexão bem-sucedida primeiro
      const mockSocket = jest.mocked(io).mock.results[0].value;
      const connectCallback = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect')[1];
      act(() => {
        connectCallback();
      });

      // Aguardar join-room
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('join-room', expect.objectContaining({ roomId: expect.stringContaining('room-') }));
      });

      // Digitar e enviar mensagem
      const input = screen.getByPlaceholderText('Digite sua mensagem jurídica...');
      const sendButton = screen.getByRole('button', { name: /enviar/i });

      fireEvent.change(input, { target: { value: 'Olá, preciso de ajuda jurídica' } });
      fireEvent.click(sendButton);

      // Verificar se a mensagem foi enviada via WebSocket
      await waitFor(() => {
        const mockSocket = jest.mocked(io).mock.results[0].value;
        expect(mockSocket.emit).toHaveBeenCalledWith('send-message', {
          text: 'Olá, preciso de ajuda jurídica',
          attachments: [],
          roomId: expect.stringContaining('room-'),
          userId: expect.stringContaining('user-room-'),
        });
      });

      // Verificar se o input foi limpo
      expect(input).toHaveValue('');
    });

    it('should receive and display messages from WebSocket', async () => {
      (useSession as jest.MockedFunction<typeof useSession>).mockReturnValue({
        data: {
          user: { id: 'user123', email: 'test@example.com' } as any,
          accessToken: 'mock-jwt-token',
        } as any,
        status: 'authenticated',
      } as any);

      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'next-auth.session-token=mock-jwt-token',
      });

      render(<Chat />);

      // Simular recebimento de mensagem
      const mockSocket = jest.mocked(io).mock.results[0].value;
      const messageCallback = mockSocket.on.mock.calls.find((call: any) => call[0] === 'receive-message')[1];
      act(() => {
        messageCallback({
          text: 'Olá! Como posso te ajudar com questões jurídicas?',
          sender: 'ai',
          messageId: 'msg-123',
        });
      });

      // Verificar se a mensagem foi adicionada à lista
      await waitFor(() => {
        expect(screen.getByText('Olá! Como posso te ajudar com questões jurídicas?')).toBeInTheDocument();
      });
    });
  });
});