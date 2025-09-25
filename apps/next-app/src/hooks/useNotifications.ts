'use client';

import { useToast } from '../components/ToastProvider';
import { ToastType } from '../components/Toast';

export function useNotifications() {
  const { showToast } = useToast();

  const success = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
    showToast({
      type: 'success',
      title,
      message,
      action,
      duration: action ? 0 : 4000, // Keep longer if has action
    });
  };

  const error = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
    showToast({
      type: 'error',
      title,
      message,
      action,
      duration: action ? 0 : 6000, // Keep longer for errors
    });
  };

  const warning = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
    showToast({
      type: 'warning',
      title,
      message,
      action,
      duration: action ? 0 : 5000,
    });
  };

  const info = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
    showToast({
      type: 'info',
      title,
      message,
      action,
      duration: action ? 0 : 4000,
    });
  };

  return {
    success,
    error,
    warning,
    info,
  };
}