'use client';

import { useToast } from '../components/ToastProvider';
import { ToastType } from '../components/Toast';

// Duration constants for better maintainability
const DEFAULT_SUCCESS_DURATION = 4000;
const DEFAULT_ERROR_DURATION = 6000;
const DEFAULT_WARNING_DURATION = 5000;
const DEFAULT_INFO_DURATION = 4000;

export function useNotifications() {
  const { showToast } = useToast();

  const success = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
    showToast({
      type: 'success',
      title,
      message,
      action,
      duration: action ? 0 : DEFAULT_SUCCESS_DURATION, // Keep longer if has action
    });
  };

  const error = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
    showToast({
      type: 'error',
      title,
      message,
      action,
      duration: action ? 0 : DEFAULT_ERROR_DURATION, // Keep longer for errors
    });
  };

  const warning = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
    showToast({
      type: 'warning',
      title,
      message,
      action,
      duration: action ? 0 : DEFAULT_WARNING_DURATION,
    });
  };

  const info = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
    showToast({
      type: 'info',
      title,
      message,
      action,
      duration: action ? 0 : DEFAULT_INFO_DURATION,
    });
  };

  return {
    success,
    error,
    warning,
    info,
  };
}