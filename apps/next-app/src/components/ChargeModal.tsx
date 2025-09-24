'use client';

import { useState } from 'react';
import { DollarSign, X } from 'lucide-react';
import { ChargeType } from '@/types/billing';

interface ChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCharge: (chargeData: {
    amount: number;
    type: ChargeType;
    title: string;
    description: string;
    reason: string;
  }) => void;
  isLoading?: boolean;
}

export function ChargeModal({ isOpen, onClose, onCreateCharge, isLoading }: ChargeModalProps) {
  const [formData, setFormData] = useState({
    amount: '',
    type: 'consultation' as ChargeType,
    title: '',
    description: '',
    reason: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount) * 100; // Converter para centavos

    if (amount < 100) {
      alert('Valor mínimo é R$ 1,00');
      return;
    }

    onCreateCharge({
      amount,
      type: formData.type,
      title: formData.title,
      description: formData.description,
      reason: formData.reason
    });

    // Reset form
    setFormData({
      amount: '',
      type: 'consultation',
      title: '',
      description: '',
      reason: ''
    });
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const formatted = (parseFloat(numericValue) / 100).toFixed(2);
    return formatted === '0.00' ? '' : formatted;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Criar Cobrança
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor (R$)
            </label>
            <input
              type="text"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                amount: formatCurrency(e.target.value)
              }))}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Serviço
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                type: e.target.value as ChargeType
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              <option value="consultation">Consulta Jurídica</option>
              <option value="document_analysis">Análise de Documentos</option>
              <option value="legal_opinion">Parecer Jurídico</option>
              <option value="process_followup">Acompanhamento Processual</option>
              <option value="mediation">Mediação/Negociação</option>
              <option value="other">Outros</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                title: e.target.value
              }))}
              placeholder="Ex: Análise de Contrato de Trabalho"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                description: e.target.value
              }))}
              placeholder="Descreva detalhadamente o serviço prestado"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Justificativa
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                reason: e.target.value
              }))}
              placeholder="Explique por que está cobrando este valor"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              maxLength={1000}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Criando...' : 'Criar Cobrança'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}