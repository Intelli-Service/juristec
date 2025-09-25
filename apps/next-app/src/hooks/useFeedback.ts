'use client';

import { useState, useCallback } from 'react';
import { FeedbackData } from '../components/feedback/FeedbackModal';

interface UseFeedbackOptions {
  userId: string;
  conversationId: string;
  lawyerId?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useFeedback({
  userId,
  conversationId,
  lawyerId,
  onSuccess,
  onError
}: UseFeedbackOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<FeedbackData | null>(null);

  const submitFeedback = useCallback(async (feedbackData: FeedbackData) => {
    setIsSubmitting(true);

    try {
      // Create feedback request
      const createResponse = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          conversationId,
          lawyerId,
          type: 'post_chat',
          metadata: {
            sessionDuration: Date.now(), // This should be calculated properly
            messageCount: 0, // This should be fetched from conversation
          }
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create feedback request');
      }

      const { _id: feedbackId } = await createResponse.json();

      // Submit feedback data
      const submitResponse = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (!submitResponse.ok) {
        throw new Error('Failed to submit feedback');
      }

      setLastFeedback(feedbackData);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, conversationId, lawyerId, onSuccess, onError]);

  const checkPendingFeedback = useCallback(async () => {
    try {
      const response = await fetch(`/api/feedback/user/pending?userId=${userId}`);
      if (response.ok) {
        const pendingFeedbacks = await response.json();
        return pendingFeedbacks.filter((f: any) => f.conversationId === conversationId);
      }
      return [];
    } catch (error) {
      console.error('Error checking pending feedback:', error);
      return [];
    }
  }, [userId, conversationId]);

  return {
    submitFeedback,
    checkPendingFeedback,
    isSubmitting,
    lastFeedback
  };
}