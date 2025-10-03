import React from 'react';
import { ChargeFormData } from '@/types/chat.types';

interface ChargeModalProps {
  showChargeModal: boolean;
  setShowChargeModal: (show: boolean) => void;
  chargeForm: ChargeFormData;
  setChargeForm: (form: ChargeFormData) => void;
  handleCreateCharge: (e: React.FormEvent) => void;
  isCreatingCharge: boolean;
}

export const ChargeModal: React.FC<ChargeModalProps> = ({
  showChargeModal,
  setShowChargeModal,
  chargeForm,
  setChargeForm,
  handleCreateCharge,
  isCreatingCharge,
}) => {
  if (!showChargeModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Cobrar Cliente</h3>

        <form onSubmit={handleCreateCharge} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo de Serviço
            </label>
            <select
              value={chargeForm.type}
              onChange={(e) => setChargeForm({...chargeForm, type: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione...</option>
              <option value="consultation">Consulta Jurídica</option>
              <option value="document_analysis">Análise de Documentos</option>
              <option value="legal_opinion">Parecer Jurídico</option>
              <option value="process_followup">Acompanhamento Processual</option>
              <option value="mediation">Mediação/Negociação</option>
              <option value="other">Outros</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Valor (R$)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={chargeForm.amount}
              onChange={(e) => setChargeForm({...chargeForm, amount: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0,00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Título da Cobrança
            </label>
            <input
              type="text"
              value={chargeForm.title}
              onChange={(e) => setChargeForm({...chargeForm, title: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Análise de Contrato de Trabalho"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descrição
            </label>
            <textarea
              value={chargeForm.description}
              onChange={(e) => setChargeForm({...chargeForm, description: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Descreva o serviço prestado..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Justificativa
            </label>
            <textarea
              value={chargeForm.reason}
              onChange={(e) => setChargeForm({...chargeForm, reason: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Por que está cobrando este valor?"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowChargeModal(false)}
              className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreatingCharge}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isCreatingCharge ? 'Criando...' : 'Criar Cobrança'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
