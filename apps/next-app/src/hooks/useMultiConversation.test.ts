/**
 * Testes para o hook useMultiConversation
 */

import { renderHook, act } from '@testing-library/react';
import useMultiConversation from './useMultiConversation';

// Mock do Socket.io
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
};

// Mock do io
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

describe('useMultiConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve inicializar com estado padrão', () => {
    const { result } = renderHook(() => useMultiConversation());

    expect(result.current.conversations).toEqual([]);
    expect(result.current.activeConversation).toBeNull();
    expect(result.current.activeConversationId).toBe('');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.totalUnreadCount).toBe(0);
    expect(result.current.hasConversations).toBe(false);
    expect(result.current.conversationCount).toBe(0);
  });

  test('deve configurar socket e listeners', () => {
    const { result } = renderHook(() => useMultiConversation());

    act(() => {
      result.current.setSocket(mockSocket as any);
    });

    // Verificar se listeners foram configurados
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('conversations-loaded', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('new-conversation-created', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('new-message', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('cross-room-notification', expect.any(Function));
  });

  test('deve criar nova conversa quando conectado', () => {
    const { result } = renderHook(() => useMultiConversation());

    act(() => {
      result.current.setSocket(mockSocket as any);
    });

    // Simular conexão
    act(() => {
      const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectCallback();
    });

    // Criar nova conversa
    act(() => {
      result.current.createNewConversation();
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('create-new-conversation');
    expect(result.current.isLoading).toBe(true);
  });

  test('deve processar lista de conversas carregadas', () => {
    const { result } = renderHook(() => useMultiConversation());

    act(() => {
      result.current.setSocket(mockSocket as any);
    });

    const mockConversations = [
      {
        id: '1',
        roomId: 'room1',
        title: 'Conversa #1',
        status: 'open',
        unreadCount: 2,
        lastMessageAt: new Date().toISOString(),
        conversationNumber: 1,
        classification: { category: 'Trabalhista', complexity: 'medio' as const, legalArea: 'Trabalhista' }
      }
    ];

    // Simular carregamento de conversas
    act(() => {
      const loadCallback = mockSocket.on.mock.calls.find(call => call[0] === 'conversations-loaded')[1];
      loadCallback({
        conversations: mockConversations,
        activeRooms: ['room1']
      });
    });

    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations[0].title).toBe('Conversa #1');
    expect(result.current.totalUnreadCount).toBe(2);
    expect(result.current.hasConversations).toBe(true);
    expect(result.current.conversationCount).toBe(1);
  });

  test('deve trocar para conversa específica e zerar unreadCount', () => {
    const { result } = renderHook(() => useMultiConversation());

    act(() => {
      result.current.setSocket(mockSocket as any);
    });

    // Adicionar conversas
    const mockConversations = [
      {
        id: '1',
        roomId: 'room1',
        title: 'Conversa #1',
        status: 'open',
        unreadCount: 3,
        lastMessageAt: new Date().toISOString(),
        conversationNumber: 1,
      },
      {
        id: '2',
        roomId: 'room2',
        title: 'Conversa #2',
        status: 'open',
        unreadCount: 1,
        lastMessageAt: new Date().toISOString(),
        conversationNumber: 2,
      }
    ];

    act(() => {
      const loadCallback = mockSocket.on.mock.calls.find(call => call[0] === 'conversations-loaded')[1];
      loadCallback({
        conversations: mockConversations,
        activeRooms: ['room1', 'room2']
      });
    });

    // Trocar para conversa 2
    act(() => {
      result.current.switchToConversation('2');
    });

    expect(result.current.activeConversationId).toBe('2');
    expect(result.current.activeConversation?.id).toBe('2');
    expect(result.current.conversations.find(c => c.id === '2')?.unreadCount).toBe(0);
    expect(result.current.totalUnreadCount).toBe(3); // Apenas da conversa 1
  });

  test('deve processar notificação cross-conversation', () => {
    const mockOnNotification = jest.fn();
    const { result } = renderHook(() => useMultiConversation({ onNotification: mockOnNotification }));

    act(() => {
      result.current.setSocket(mockSocket as any);
    });

    // Adicionar conversas
    const mockConversations = [
      {
        id: '1',
        roomId: 'room1',
        title: 'Conversa #1',
        status: 'open',
        unreadCount: 0,
        lastMessageAt: new Date().toISOString(),
        conversationNumber: 1,
      }
    ];

    act(() => {
      const loadCallback = mockSocket.on.mock.calls.find(call => call[0] === 'conversations-loaded')[1];
      loadCallback({
        conversations: mockConversations,
        activeRooms: ['room1']
      });
    });

    // Simular notificação cross-conversation
    const notification = {
      type: 'new_message_other_conversation' as const,
      sourceRoomId: 'room1',
      sourceConversationId: '1',
      conversationTitle: 'Conversa #1',
      message: 'Nova mensagem',
      timestamp: new Date()
    };

    act(() => {
      const notificationCallback = mockSocket.on.mock.calls.find(call => call[0] === 'cross-room-notification')[1];
      notificationCallback(notification);
    });

    expect(mockOnNotification).toHaveBeenCalledWith(notification);
    expect(result.current.conversations[0].unreadCount).toBe(1);
  });
});