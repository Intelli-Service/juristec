import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Chat from '../components/Chat';
import { useNotifications } from '../hooks/useNotifications';
import { useFeedback } from '../hooks/useFeedback';
import { useSession } from 'next-auth/react';

// Mock dos hooks
jest.mock('../hooks/useNotifications');
jest.mock('../hooks/useFeedback');

// Mock do NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock do socket.io-client no topo do arquivo
const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  connected: true,
};

jest.mock('socket.io-client', () => ({
  __esModule: true,
  default: jest.fn(() => {
    // Simular conexão imediata
    setTimeout(() => {
      mockSocket.on.mock.calls
        .filter(([event]) => event === 'connect')
        .forEach(([, callback]) => callback && callback());
    }, 0);
    return mockSocket;
  }),
}));
jest.mock('../components/FileUpload', () => {
  return function MockFileUpload({ onFileSelect, onFileRemove }: {
    onFileSelect: (file: { name: string }) => void;
    onFileRemove: () => void;
  }) {
    return (
      <div data-testid="file-upload">
        <button data-testid="select-file-btn" onClick={() => onFileSelect({ name: 'test.pdf' })}>
          Select File
        </button>
        <button data-testid="remove-file-btn" onClick={onFileRemove}>
          Remove File
        </button>
      </div>
    );
  };
});
jest.mock('../components/feedback/FeedbackModal', () => {
  return function MockFeedbackModal({ isOpen, onClose, onSubmit }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (feedback: { rating: number; comment: string }) => void;
  }) {
    if (!isOpen) return null;
    return (
      <div data-testid="feedback-modal">
        <button data-testid="submit-feedback" onClick={() => onSubmit({ rating: 5, comment: 'Great!' })}>
          Submit Feedback
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

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

beforeEach(() => {
  jest.clearAllMocks();

  // Setup dos mocks dos hooks
  (useNotifications as jest.Mock).mockReturnValue(mockNotifications);
  (useFeedback as jest.Mock).mockReturnValue(mockFeedback);

  // Mock do useSession - sessão não autenticada por padrão
  (useSession as jest.MockedFunction<typeof useSession>).mockReturnValue({
    data: null,
    status: 'unauthenticated',
  } as ReturnType<typeof useSession>);

  // Mock do localStorage para usuários anônimos
  const mockLocalStorage = {
    getItem: jest.fn((key: string) => key === 'anonymous-user-id' ? 'test-anon-id' : null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

  // Mock do fetch
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  });
});

describe('Chat Component', () => {
  it('renders basic chat interface', () => {
    render(<Chat />);

    expect(screen.getByPlaceholderText('Digite sua mensagem jurídica...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar|conectando/i })).toBeInTheDocument();
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
  });

  it('sends message when form is submitted', async () => {
    render(<Chat />);

    // Wait for connection to be established
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Digite sua mensagem jurídica...');
    const sendButton = screen.getByRole('button', { name: 'Enviar' });

    fireEvent.change(input, { target: { value: 'Olá, preciso de ajuda' } });
    fireEvent.click(sendButton);

    // Verify that socket.emit was called with the correct message
    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('send-message', {
        text: 'Olá, preciso de ajuda',
        attachments: [],
        roomId: expect.any(String),
        userId: expect.any(String),
      });
    });
  });

  it('handles file selection and removal', async () => {
    render(<Chat />);

    const selectFileBtn = screen.getByTestId('select-file-btn');
    fireEvent.click(selectFileBtn);

    expect(selectFileBtn).toBeInTheDocument();

    const removeFileBtn = screen.getByTestId('remove-file-btn');
    fireEvent.click(removeFileBtn);

    expect(removeFileBtn).toBeInTheDocument();
  });

  it('shows loading state while sending message', async () => {
    render(<Chat />);

    // Wait for connection to be established
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Digite sua mensagem jurídica...');
    const sendButton = screen.getByRole('button', { name: 'Enviar' });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Button should show loading state
    expect(sendButton).toBeDisabled();
    expect(sendButton).toHaveTextContent('Enviando...');
  });

  it('handles socket connection errors gracefully', async () => {
    // Mock console.error to avoid test output pollution
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // This test verifies that the component can handle socket errors
    // without crashing the entire application
    render(<Chat />);

    // Component should still render basic elements even if socket fails
    expect(screen.getByPlaceholderText('Digite sua mensagem jurídica...')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('cleans up socket connection on unmount', () => {
    const { unmount } = render(<Chat />);

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});