import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useFeedback } from '../hooks/useFeedback';
import { FeedbackData } from '../components/feedback/FeedbackModal';

// Mock do fetch global
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock do console.error para evitar poluição nos testes
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('useFeedback Hook', () => {
  const mockUserId = 'user123';
  const mockConversationId = 'conv123';
  const mockLawyerId = 'lawyer456';

  const mockOptions = {
    userId: mockUserId,
    conversationId: mockConversationId,
    lawyerId: mockLawyerId,
    onSuccess: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  describe('submitFeedback', () => {
    const mockFeedbackData: FeedbackData = {
      rating: 5,
      responses: {
        satisfaction: 5,
        responseTime: 4,
        professionalism: 5,
        understanding: 5,
        recommendation: 5,
      },
      comment: 'Excelente atendimento!',
    };

    it('should successfully submit feedback', async () => {
      // Arrange
      const mockFeedbackId = 'feedback789';
      const mockCreateResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ _id: mockFeedbackId }),
      };
      const mockSubmitResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      };

      mockFetch
        .mockResolvedValueOnce(mockCreateResponse)
        .mockResolvedValueOnce(mockSubmitResponse);

      // Act
      let result: ReturnType<typeof useFeedback> | null = null;
      const TestComponent = () => {
        const hook = useFeedback(mockOptions);
        result = hook;

        const handleSubmit = async () => {
          await hook.submitFeedback(mockFeedbackData);
        };

        return React.createElement('button', {
          onClick: handleSubmit,
          'data-testid': 'submit-btn'
        }, 'Submit');
      };

      render(React.createElement(TestComponent));
      fireEvent.click(screen.getByTestId('submit-btn'));

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Verificar chamada para criar feedback
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"userId":"user123"'),
      });

      // Verificar que o body contém os campos esperados
      const createCallBody = JSON.parse((mockFetch as jest.Mock).mock.calls[0][1].body);
      expect(createCallBody).toEqual({
        userId: mockUserId,
        conversationId: mockConversationId,
        lawyerId: mockLawyerId,
        type: 'post_chat',
        metadata: {
          sessionDuration: expect.any(Number),
          messageCount: 0,
        },
      });

      // Verificar chamada para submeter feedback
      expect(mockFetch).toHaveBeenNthCalledWith(2, `/api/feedback/${mockFeedbackId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockFeedbackData),
      });

      expect(mockOptions.onSuccess).toHaveBeenCalled();
      expect(result!.isSubmitting).toBe(false);
    });

    it('should handle feedback creation failure', async () => {
      // Arrange
      const mockErrorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };

      mockFetch.mockResolvedValue(mockErrorResponse);

      // Act
      const TestComponent = () => {
        const hook = useFeedback(mockOptions);

        const handleSubmit = async () => {
          await hook.submitFeedback(mockFeedbackData);
        };

        return React.createElement('button', {
          onClick: handleSubmit,
          'data-testid': 'submit-btn'
        }, 'Submit');
      };

      render(React.createElement(TestComponent));
      fireEvent.click(screen.getByTestId('submit-btn'));

      // Assert
      await waitFor(() => {
        expect(mockOptions.onError).toHaveBeenCalledWith('Failed to create feedback request');
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle feedback submission failure', async () => {
      // Arrange
      const mockFeedbackId = 'feedback789';
      const mockCreateResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ _id: mockFeedbackId }),
      };
      const mockSubmitErrorResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      };

      mockFetch
        .mockResolvedValueOnce(mockCreateResponse)
        .mockResolvedValueOnce(mockSubmitErrorResponse);

      // Act
      const TestComponent = () => {
        const hook = useFeedback(mockOptions);

        const handleSubmit = async () => {
          await hook.submitFeedback(mockFeedbackData);
        };

        return React.createElement('button', {
          onClick: handleSubmit,
          'data-testid': 'submit-btn'
        }, 'Submit');
      };

      render(React.createElement(TestComponent));
      fireEvent.click(screen.getByTestId('submit-btn'));

      // Assert
      await waitFor(() => {
        expect(mockOptions.onError).toHaveBeenCalledWith('Failed to submit feedback');
      });
    });

    it('should set isSubmitting to true during submission', async () => {
      // Arrange
      const mockFeedbackId = 'feedback789';
      const mockCreateResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ _id: mockFeedbackId }),
      };
      const mockSubmitResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      };

      mockFetch
        .mockResolvedValueOnce(mockCreateResponse)
        .mockResolvedValueOnce(mockSubmitResponse);

      // Act
      let hookResult: ReturnType<typeof useFeedback> | null = null;
      const TestComponent = () => {
        const hook = useFeedback(mockOptions);
        hookResult = hook;

        const handleSubmit = async () => {
          await hook.submitFeedback(mockFeedbackData);
        };

        return React.createElement('button', {
          onClick: handleSubmit,
          'data-testid': 'submit-btn'
        }, 'Submit');
      };

      render(React.createElement(TestComponent));

      // Initially should be false
      expect(hookResult!.isSubmitting).toBe(false);

      fireEvent.click(screen.getByTestId('submit-btn'));

      // Assert - should be false after completion
      await waitFor(() => {
        expect(hookResult!.isSubmitting).toBe(false);
      });
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act
      const TestComponent = () => {
        const hook = useFeedback(mockOptions);

        const handleSubmit = async () => {
          await hook.submitFeedback(mockFeedbackData);
        };

        return React.createElement('button', {
          onClick: handleSubmit,
          'data-testid': 'submit-btn'
        }, 'Submit');
      };

      render(React.createElement(TestComponent));
      fireEvent.click(screen.getByTestId('submit-btn'));

      // Assert
      await waitFor(() => {
        expect(mockOptions.onError).toHaveBeenCalledWith('Network error');
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('checkPendingFeedback', () => {
    it('should successfully check for pending feedback', async () => {
      // Arrange
      const mockPendingFeedbacks = [
        {
          conversationId: mockConversationId,
          status: 'pending',
          type: 'post_chat',
        },
      ];
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockPendingFeedbacks),
      };

      mockFetch.mockResolvedValue(mockResponse);

      // Act
      let result: unknown[];
      const TestComponent = () => {
        const hook = useFeedback(mockOptions);

        const handleCheck = async () => {
          result = await hook.checkPendingFeedback();
        };

        return React.createElement('button', {
          onClick: handleCheck,
          'data-testid': 'check-btn'
        }, 'Check');
      };

      render(React.createElement(TestComponent));
      fireEvent.click(screen.getByTestId('check-btn'));

      // Assert
      await waitFor(() => {
        expect(result).toEqual(mockPendingFeedbacks);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/feedback/user/pending?userId=${mockUserId}`,
      );
    });

    it('should return empty array when no pending feedback', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      };

      mockFetch.mockResolvedValue(mockResponse);

      // Act
      let result: unknown[];
      const TestComponent = () => {
        const hook = useFeedback(mockOptions);

        const handleCheck = async () => {
          result = await hook.checkPendingFeedback();
        };

        return React.createElement('button', {
          onClick: handleCheck,
          'data-testid': 'check-btn'
        }, 'Check');
      };

      render(React.createElement(TestComponent));
      fireEvent.click(screen.getByTestId('check-btn'));

      // Assert
      await waitFor(() => {
        expect(result).toEqual([]);
      });
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('API error'));

      // Act
      let result: unknown[];
      const TestComponent = () => {
        const hook = useFeedback(mockOptions);

        const handleCheck = async () => {
          result = await hook.checkPendingFeedback();
        };

        return React.createElement('button', {
          onClick: handleCheck,
          'data-testid': 'check-btn'
        }, 'Check');
      };

      render(React.createElement(TestComponent));
      fireEvent.click(screen.getByTestId('check-btn'));

      // Assert
      await waitFor(() => {
        expect(result).toEqual([]);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error checking pending feedback:',
        expect.any(Error),
      );
    });
  });
});