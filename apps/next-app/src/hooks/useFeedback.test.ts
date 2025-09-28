import { renderHook, act, waitFor } from '@testing-library/react';
import { useFeedback } from './useFeedback';
import { FeedbackData } from '../components/feedback/FeedbackModal';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console methods
const mockConsoleError = jest.fn();
console.error = mockConsoleError;

describe('useFeedback', () => {
  const mockOptions = {
    userId: 'user123',
    conversationId: 'conv123',
    lawyerId: 'lawyer456',
    onSuccess: jest.fn(),
    onError: jest.fn(),
  };

  const mockFeedbackData: FeedbackData = {
    rating: 5,
    responses: {
      satisfaction: 5,
      responseTime: 5,
      professionalism: 5,
      understanding: 5,
      recommendation: 5,
    },
    comment: 'Excelente atendimento!',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useFeedback(mockOptions));

      expect(result.current).toBeDefined();
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.lastFeedback).toBeNull();
      expect(typeof result.current.submitFeedback).toBe('function');
      expect(typeof result.current.checkPendingFeedback).toBe('function');
    });
  });

  describe('submitFeedback', () => {
    it('should successfully submit feedback with complete flow', async () => {
      // Mock successful API responses
      const mockCreateResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ _id: 'feedback123' }),
      };
      const mockSubmitResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      };

      mockFetch
        .mockResolvedValueOnce(mockCreateResponse)
        .mockResolvedValueOnce(mockSubmitResponse);

      const { result } = renderHook(() => useFeedback(mockOptions));

      await act(async () => {
        await result.current.submitFeedback(mockFeedbackData);
      });

      // Check that fetch was called correctly for creation
      const firstCall = mockFetch.mock.calls[0];
      expect(firstCall[0]).toBe('/api/feedback');
      expect(firstCall[1]).toEqual({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"lawyerId":"lawyer456"'),
      });

      // Parse the body to check specific fields
      const body = JSON.parse(firstCall[1].body);
      expect(body).toEqual({
        userId: 'user123',
        conversationId: 'conv123',
        lawyerId: 'lawyer456',
        type: 'post_chat',
        metadata: {
          sessionDuration: expect.any(Number),
          messageCount: 0,
        },
      });

      // Check that fetch was called correctly for submission
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/feedback/feedback123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockFeedbackData),
      });

      // Check state updates
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.lastFeedback).toEqual(mockFeedbackData);

      // Check callbacks
      expect(mockOptions.onSuccess).toHaveBeenCalled();
      expect(mockOptions.onError).not.toHaveBeenCalled();
    });

    it('should handle feedback creation failure', async () => {
      // Mock failed creation response
      const mockCreateResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };

      mockFetch.mockResolvedValueOnce(mockCreateResponse);

      const { result } = renderHook(() => useFeedback(mockOptions));

      await act(async () => {
        await result.current.submitFeedback(mockFeedbackData);
      });

      // Check error handling
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.lastFeedback).toBeNull();
      expect(mockOptions.onError).toHaveBeenCalledWith('Failed to create feedback request');
      expect(mockOptions.onSuccess).not.toHaveBeenCalled();
    });

    it('should handle feedback submission failure', async () => {
      // Mock successful creation but failed submission
      const mockCreateResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ _id: 'feedback123' }),
      };
      const mockSubmitResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      };

      mockFetch
        .mockResolvedValueOnce(mockCreateResponse)
        .mockResolvedValueOnce(mockSubmitResponse);

      const { result } = renderHook(() => useFeedback(mockOptions));

      await act(async () => {
        await result.current.submitFeedback(mockFeedbackData);
      });

      // Check error handling
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.lastFeedback).toBeNull();
      expect(mockOptions.onError).toHaveBeenCalledWith('Failed to submit feedback');
      expect(mockOptions.onSuccess).not.toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useFeedback(mockOptions));

      await act(async () => {
        await result.current.submitFeedback(mockFeedbackData);
      });

      // Check error handling
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.lastFeedback).toBeNull();
      expect(mockOptions.onError).toHaveBeenCalledWith('Network error');
      expect(mockOptions.onSuccess).not.toHaveBeenCalled();
    });

    it('should handle unknown errors gracefully', async () => {
      // Mock unknown error type
      mockFetch.mockRejectedValueOnce('Unknown error');

      const { result } = renderHook(() => useFeedback(mockOptions));

      await act(async () => {
        await result.current.submitFeedback(mockFeedbackData);
      });

      // Check error handling
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.lastFeedback).toBeNull();
      expect(mockOptions.onError).toHaveBeenCalledWith('Erro desconhecido');
      expect(mockOptions.onSuccess).not.toHaveBeenCalled();
    });

    it('should set submitting state correctly during submission', async () => {
      // Mock delayed response
      const mockCreateResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ _id: 'feedback123' }),
      };
      const mockSubmitResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      };

      mockFetch
        .mockResolvedValueOnce(mockCreateResponse)
        .mockResolvedValueOnce(mockSubmitResponse);

      const { result } = renderHook(() => useFeedback(mockOptions));

      // Start submission and check submitting state
      act(() => {
        result.current.submitFeedback(mockFeedbackData);
      });

      // Check submitting state is set immediately
      expect(result.current.isSubmitting).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });

      // Check final state
      expect(result.current.lastFeedback).toEqual(mockFeedbackData);
    });

    it('should work without optional lawyerId', async () => {
      const optionsWithoutLawyer = {
        userId: 'user123',
        conversationId: 'conv123',
        onSuccess: jest.fn(),
        onError: jest.fn(),
      };

      const mockCreateResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ _id: 'feedback123' }),
      };
      const mockSubmitResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      };

      mockFetch
        .mockResolvedValueOnce(mockCreateResponse)
        .mockResolvedValueOnce(mockSubmitResponse);

      const { result } = renderHook(() => useFeedback(optionsWithoutLawyer));

      await act(async () => {
        await result.current.submitFeedback(mockFeedbackData);
      });

      // Check that lawyerId is not included in request when undefined
      const firstCall = mockFetch.mock.calls[0];
      expect(firstCall[0]).toBe('/api/feedback');
      expect(firstCall[1]).toEqual({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"userId":"user123"'),
      });

      // Parse the body to check specific fields
      const body = JSON.parse(firstCall[1].body);
      expect(body).toEqual({
        userId: 'user123',
        conversationId: 'conv123',
        type: 'post_chat',
        metadata: {
          sessionDuration: expect.any(Number),
          messageCount: 0,
        },
      });
      expect(body.lawyerId).toBeUndefined();

      expect(result.current.lastFeedback).toEqual(mockFeedbackData);
      expect(optionsWithoutLawyer.onSuccess).toHaveBeenCalled();
    });

    it('should work without optional callbacks', async () => {
      const optionsWithoutCallbacks = {
        userId: 'user123',
        conversationId: 'conv123',
      };

      const mockCreateResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ _id: 'feedback123' }),
      };
      const mockSubmitResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      };

      mockFetch
        .mockResolvedValueOnce(mockCreateResponse)
        .mockResolvedValueOnce(mockSubmitResponse);

      const { result } = renderHook(() => useFeedback(optionsWithoutCallbacks));

      await act(async () => {
        await result.current.submitFeedback(mockFeedbackData);
      });

      // Should not throw error when callbacks are not provided
      expect(result.current.lastFeedback).toEqual(mockFeedbackData);
    });
  });

  describe('checkPendingFeedback', () => {
    it('should successfully fetch pending feedback', async () => {
      const mockPendingFeedbacks = [
        {
          _id: 'feedback1',
          conversationId: 'conv123',
          status: 'pending',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          _id: 'feedback2',
          conversationId: 'otherConv',
          status: 'pending',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockPendingFeedbacks),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useFeedback(mockOptions));

      let pendingFeedbacks;
      await act(async () => {
        pendingFeedbacks = await result.current.checkPendingFeedback();
      });

      // Check API call
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/feedback/user/pending?userId=user123'
      );

      // Check filtering by conversationId
      expect(pendingFeedbacks).toEqual([
        {
          _id: 'feedback1',
          conversationId: 'conv123',
          status: 'pending',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]);
    });

    it('should return empty array when no pending feedback exists', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useFeedback(mockOptions));

      let pendingFeedbacks;
      await act(async () => {
        pendingFeedbacks = await result.current.checkPendingFeedback();
      });

      expect(pendingFeedbacks).toEqual([]);
    });

    it('should return empty array when API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useFeedback(mockOptions));

      let pendingFeedbacks;
      await act(async () => {
        pendingFeedbacks = await result.current.checkPendingFeedback();
      });

      // Should return empty array and log error
      expect(pendingFeedbacks).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error checking pending feedback:',
        expect.any(Error)
      );
    });

    it('should return empty array when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useFeedback(mockOptions));

      let pendingFeedbacks;
      await act(async () => {
        pendingFeedbacks = await result.current.checkPendingFeedback();
      });

      expect(pendingFeedbacks).toEqual([]);
    });

    it('should filter feedback by current conversation only', async () => {
      const mockPendingFeedbacks = [
        {
          _id: 'feedback1',
          conversationId: 'conv123', // Current conversation
          status: 'pending',
        },
        {
          _id: 'feedback2',
          conversationId: 'conv456', // Different conversation
          status: 'pending',
        },
        {
          _id: 'feedback3',
          conversationId: 'conv123', // Current conversation
          status: 'pending',
        },
      ];

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockPendingFeedbacks),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useFeedback(mockOptions));

      let pendingFeedbacks;
      await act(async () => {
        pendingFeedbacks = await result.current.checkPendingFeedback();
      });

      // Should only return feedback for current conversation
      expect(pendingFeedbacks).toEqual([
        {
          _id: 'feedback1',
          conversationId: 'conv123',
          status: 'pending',
        },
        {
          _id: 'feedback3',
          conversationId: 'conv123',
          status: 'pending',
        },
      ]);
    });
  });

});