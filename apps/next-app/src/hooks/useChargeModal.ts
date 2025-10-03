import { useState, useCallback } from 'react';
import { ChargeFormData } from '@/types/chat.types';
import { useNotifications } from './useNotifications';

interface UseChargeModalProps {
  userId: string | undefined;
}

export const useChargeModal = ({ userId }: UseChargeModalProps) => {
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [isCreatingCharge, setIsCreatingCharge] = useState(false);
  const [chargeForm, setChargeForm] = useState<ChargeFormData>({
    type: '',
    amount: '',
    title: '',
    description: '',
    reason: ''
  });

  const notifications = useNotifications();

  const handleCreateCharge = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    setIsCreatingCharge(true);
    try {
      const response = await fetch('/api/billing/create-charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: userId,
          ...chargeForm,
          amount: parseFloat(chargeForm.amount)
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar cobrança');
      }

      await response.json();

      setChargeForm({
        type: '',
        amount: '',
        title: '',
        description: '',
        reason: ''
      });
      setShowChargeModal(false);

      notifications.success('Cobrança criada com sucesso!', 'O cliente foi notificado.');
    } catch (error) {
      console.error('Erro ao criar cobrança:', error);
      notifications.error('Erro ao criar cobrança', 'Tente novamente.');
    } finally {
      setIsCreatingCharge(false);
    }
  }, [userId, chargeForm, notifications]);

  return {
    showChargeModal,
    setShowChargeModal,
    isCreatingCharge,
    chargeForm,
    setChargeForm,
    handleCreateCharge,
  };
};
