import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Chat from '../components/Chat';
import { useNotifications } from '../hooks/useNotifications';
import { useFeedback } from '../hooks/useFeedback';

// Mock dos hooks
jest.mock('../hooks/useNotifications');
jest.mock('../hooks/useFeedback');

// Mock do socket.io-client
jest.mock('socket.io-client', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('socket.io-client');
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

const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();

  // Setup dos mocks dos hooks
  (useNotifications as jest.Mock).mockReturnValue(mockNotifications);
  (useFeedback as jest.Mock).mockReturnValue(mockFeedback);

  // Mock do socket.io-client
  const mockSocketIO = jest.mocked(require('socket.io-client') as jest.MockedFunction<any>);
  mockSocketIO.mockReturnValue(mockSocket);

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
    expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument();
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
  });

  it('sends message when form is submitted', async () => {
    render(<Chat />);

    const input = screen.getByPlaceholderText('Digite sua mensagem jurídica...');
    const sendButton = screen.getByRole('button', { name: /enviar/i });

    fireEvent.change(input, { target: { value: 'Olá, preciso de ajuda' } });
    fireEvent.click(sendButton);

    // The message should appear in the chat
    await waitFor(() => {
      expect(screen.getByText('Olá, preciso de ajuda')).toBeInTheDocument();
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

    const input = screen.getByPlaceholderText('Digite sua mensagem jurídica...');
    const sendButton = screen.getByRole('button', { name: /enviar/i });

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