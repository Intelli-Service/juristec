import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MultiConversationChat from '../components/MultiConversationChat';

// Mock do hook useMultiConversation
jest.mock('../hooks/useMultiConversation', () => ({
  useMultiConversation: () => ({
    conversations: [
      {
        id: 'conv-1',
        roomId: 'room-1',
        title: 'Consulta sobre contrato',
        status: 'active',
        unreadCount: 0,
        lastMessageAt: new Date(),
        classification: {
          category: 'Direito Civil',
          complexity: 'Média',
          legalArea: 'Contratos'
        }
      }
    ],
    activeConversationId: 'conv-1',
    activeConversationMessages: [
      {
        id: 'msg-1',
        text: 'Olá, preciso de ajuda com um contrato',
        sender: 'user' as const,
        timestamp: new Date(),
        attachments: []
      }
    ],
    isLoading: false,
    createNewConversation: jest.fn(),
    switchToConversation: jest.fn(),
    sendMessage: jest.fn(),
    markAsRead: jest.fn(),
    getActiveConversation: () => ({
      id: 'conv-1',
      roomId: 'room-1',
      title: 'Consulta sobre contrato',
      status: 'active',
      unreadCount: 0,
      lastMessageAt: new Date(),
      classification: {
        category: 'Direito Civil',
        complexity: 'Média',
        legalArea: 'Contratos'
      }
    }),
    getTotalUnreadCount: () => 0,
  }),
}));

// Mock do hook useNotifications
jest.mock('../hooks/useNotifications', () => ({
  useNotifications: () => ({
    info: jest.fn(),
  }),
}));

describe('MultiConversationChat Component', () => {
  it('renders with active conversation', () => {
    render(<MultiConversationChat />);

    // Verifica se a conversa aparece na lista lateral
    expect(screen.getAllByText('Consulta sobre contrato')).toHaveLength(2); // Aparece no sidebar e no header
    expect(screen.getByText('Direito Civil')).toBeInTheDocument();

    // Verifica se a mensagem aparece na área de chat
    expect(screen.getByText('Olá, preciso de ajuda com um contrato')).toBeInTheDocument();

    // Verifica se o campo de input está presente
    expect(screen.getByPlaceholderText('Digite sua mensagem...')).toBeInTheDocument();

    // Verifica se o botão de nova conversa está presente
    expect(screen.getByText('+ Nova Conversa')).toBeInTheDocument();
  });
});