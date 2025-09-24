'use client';

import { useState } from 'react';
import { DollarSign, Check, X, Clock } from 'lucide-react';
import { BillingNotification as BillingNotificationType } from '@/types/billing';

interface BillingNotificationProps {
  notification: BillingNotificationType;
  onAccept?: (chargeId: string) => void;
  onReject?: (chargeId: string, reason?: string) => void;
  onDismiss?: () => void;
  isLawyer?: boolean;
}

export function BillingNotificationComponent({
  notification,
  onAccept,
  onReject,
  onDismiss,
  isLawyer = false
}: BillingNotificationProps) {
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleAccept = () => {
    if (notification.charge && onAccept) {
      onAccept(notification.charge._id);
    }
  };

  const handleReject = () => {
    if (showRejectReason) {
      if (notification.charge && onReject) {
        onReject(notification.charge._id, rejectReason || undefined);
      }
    } else {
      setShowRejectReason(true);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <Check className="h-4 w-4" />;
      case 'paid': return <Check className="h-4 w-4" />;
      case 'rejected': return <X className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 my-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <DollarSign className="h-5 w-5 text-emerald-600" />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-emerald-900">
              Notificação de Cobrança
            </h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-emerald-400 hover:text-emerald-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <p className="text-sm text-emerald-800 mb-3">
            {notification.message}
          </p>

          {notification.charge && (
            <div className="bg-white rounded-md p-3 border border-emerald-200 mb-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">
                  {notification.charge.title}
                </h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(notification.charge.status)}`}>
                  {getStatusIcon(notification.charge.status)}
                  {notification.charge.status === 'pending' ? 'Pendente' :
                   notification.charge.status === 'accepted' ? 'Aceita' :
                   notification.charge.status === 'paid' ? 'Paga' :
                   notification.charge.status === 'rejected' ? 'Rejeitada' :
                   notification.charge.status === 'cancelled' ? 'Cancelada' : 'Expirada'}
                </span>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Valor:</span>
                  <span className="font-semibold text-emerald-600">
                    {formatAmount(notification.charge.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tipo:</span>
                  <span>{notification.charge.type === 'consultation' ? 'Consulta Jurídica' :
                          notification.charge.type === 'document_analysis' ? 'Análise de Documentos' :
                          notification.charge.type === 'legal_opinion' ? 'Parecer Jurídico' :
                          notification.charge.type === 'process_followup' ? 'Acompanhamento Processual' :
                          notification.charge.type === 'mediation' ? 'Mediação/Negociação' : 'Outros'}</span>
                </div>
              </div>

              {notification.charge.description && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-700">
                    {notification.charge.description}
                  </p>
                </div>
              )}

              {notification.charge.reason && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    <strong>Justificativa:</strong> {notification.charge.reason}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Ações para cliente */}
          {!isLawyer && notification.charge?.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={handleAccept}
                className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Aceitar e Pagar
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                {showRejectReason ? 'Confirmar Rejeição' : 'Rejeitar'}
              </button>
            </div>
          )}

          {/* Campo de motivo para rejeição */}
          {showRejectReason && (
            <div className="mt-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Motivo da rejeição (opcional)"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                maxLength={500}
              />
            </div>
          )}

          {/* Status para advogado */}
          {isLawyer && notification.type === 'charge_accepted' && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-800">
                ✅ Cliente aceitou a cobrança. Aguardando confirmação do pagamento.
              </p>
            </div>
          )}

          {isLawyer && notification.type === 'charge_rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                ❌ Cliente rejeitou a cobrança.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}