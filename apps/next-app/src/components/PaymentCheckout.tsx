'use client';

import { useState } from 'react';
import { CreditCard, Smartphone, FileText, Loader2 } from 'lucide-react';

interface PaymentCheckoutProps {
  conversationId: string;
  amount: number;
  caseCategory?: string;
  caseComplexity?: string;
  lawyerName?: string;
  onPaymentSuccess?: (payment: { id: string; status: string; paymentUrl?: string }) => void;
  onPaymentError?: (error: { message: string }) => void;
}

type PaymentMethod = 'credit_card' | 'debit_card' | 'pix' | 'boleto';

interface PaymentFormData {
  paymentMethod: PaymentMethod;
  cardNumber: string;
  cardHolderName: string;
  cardExpirationDate: string;
  cardCvv: string;
  installments: number;
}

export function PaymentCheckout({
  conversationId,
  amount,
  caseCategory,
  caseComplexity,
  lawyerName,
  onPaymentSuccess,
  onPaymentError
}: PaymentCheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [formData, setFormData] = useState<PaymentFormData>({
    paymentMethod: 'pix',
    cardNumber: '',
    cardHolderName: '',
    cardExpirationDate: '',
    cardCvv: '',
    installments: 1,
  });

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  const getComplexityLabel = (complexity?: string) => {
    switch (complexity) {
      case 'simples': return 'Simples';
      case 'medio': return 'Médio';
      case 'complexo': return 'Complexo';
      default: return 'Não definido';
    }
  };

  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'simples': return 'bg-green-100 text-green-800';
      case 'medio': return 'bg-yellow-100 text-yellow-800';
      case 'complexo': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleInputChange = (field: keyof PaymentFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setFormData(prev => ({
      ...prev,
      paymentMethod: method,
    }));
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpirationDate = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const paymentData: {
        conversationId: string;
        amount: number;
        paymentMethod: PaymentMethod;
        metadata: {
          caseCategory?: string;
          caseComplexity?: string;
          lawyerSpecialization?: string;
        };
        cardData?: {
          cardNumber: string;
          cardHolderName: string;
          cardExpirationDate: string;
          cardCvv: string;
        };
        installments?: number;
        pixData?: {
          expiresIn: number;
        };
        boletoData?: {
          expiresIn: number;
        };
      } = {
        conversationId,
        amount,
        paymentMethod,
        metadata: {
          caseCategory,
          caseComplexity,
          lawyerSpecialization: lawyerName,
        },
      };

      // Adicionar dados específicos do método de pagamento
      if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
        paymentData.cardData = {
          cardNumber: formData.cardNumber.replace(/\s/g, ''),
          cardHolderName: formData.cardHolderName,
          cardExpirationDate: formData.cardExpirationDate.replace(/\D/g, ''),
          cardCvv: formData.cardCvv,
        };
        paymentData.installments = formData.installments;
      } else if (paymentMethod === 'pix') {
        paymentData.pixData = {
          expiresIn: 3600, // 1 hora
        };
      } else if (paymentMethod === 'boleto') {
        paymentData.boletoData = {
          expiresIn: 86400, // 24 horas
        };
      }

      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error('Erro ao processar pagamento');
      }

      const result = await response.json();

      alert('Pagamento processado com sucesso!');
      onPaymentSuccess?.(result);
    } catch (error) {
      console.error('Erro no pagamento:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
      onPaymentError?.({ message: error instanceof Error ? error.message : 'Erro desconhecido' });
    } finally {
      setIsProcessing(false);
    }
  };

  const isCardPayment = paymentMethod === 'credit_card' || paymentMethod === 'debit_card';

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
      <div className="bg-slate-900 text-white px-6 py-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pagamento da Consulta
        </h1>
        <p className="text-slate-300 text-sm mt-1">
          Complete o pagamento para conectar com o advogado especialista
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Resumo do caso */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Resumo da Consulta</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Categoria:</span>
              <span>{caseCategory || 'Não informado'}</span>
            </div>
            <div className="flex justify-between">
              <span>Complexidade:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getComplexityColor(caseComplexity)}`}>
                {getComplexityLabel(caseComplexity)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Advogado:</span>
              <span>{lawyerName || 'Será definido após pagamento'}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-2">
              <span>Total:</span>
              <span>{formatAmount(amount)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Método de pagamento */}
          <div>
            <label className="block text-base font-semibold mb-3">Método de Pagamento</label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="pix"
                  checked={paymentMethod === 'pix'}
                  onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethod)}
                  className="text-emerald-600"
                />
                <Smartphone className="h-4 w-4" />
                <span>PIX</span>
              </label>
              <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="credit_card"
                  checked={paymentMethod === 'credit_card'}
                  onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethod)}
                  className="text-emerald-600"
                />
                <CreditCard className="h-4 w-4" />
                <span>Cartão de Crédito</span>
              </label>
              <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="debit_card"
                  checked={paymentMethod === 'debit_card'}
                  onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethod)}
                  className="text-emerald-600"
                />
                <CreditCard className="h-4 w-4" />
                <span>Cartão de Débito</span>
              </label>
              <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="boleto"
                  checked={paymentMethod === 'boleto'}
                  onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethod)}
                  className="text-emerald-600"
                />
                <FileText className="h-4 w-4" />
                <span>Boleto</span>
              </label>
            </div>
          </div>

          {/* Campos específicos do cartão */}
          {isCardPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Número do Cartão</label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={formData.cardNumber}
                    onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                    maxLength={19}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Nome no Cartão</label>
                  <input
                    type="text"
                    placeholder="JOÃO DA SILVA"
                    value={formData.cardHolderName}
                    onChange={(e) => handleInputChange('cardHolderName', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Validade</label>
                  <input
                    type="text"
                    placeholder="MM/AA"
                    value={formData.cardExpirationDate}
                    onChange={(e) => handleInputChange('cardExpirationDate', formatExpirationDate(e.target.value))}
                    maxLength={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={formData.cardCvv}
                    onChange={(e) => handleInputChange('cardCvv', e.target.value.replace(/\D/g, ''))}
                    maxLength={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Parcelas</label>
                  <select
                    value={formData.installments.toString()}
                    onChange={(e) => handleInputChange('installments', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="1">1x {formatAmount(amount)}</option>
                    <option value="2">2x {formatAmount(amount / 2)}</option>
                    <option value="3">3x {formatAmount(amount / 3)}</option>
                    <option value="4">4x {formatAmount(amount / 4)}</option>
                    <option value="5">5x {formatAmount(amount / 5)}</option>
                    <option value="6">6x {formatAmount(amount / 6)}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Informações PIX */}
          {paymentMethod === 'pix' && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                Após confirmar, você receberá um QR Code PIX para pagamento imediato.
                O código expira em 1 hora.
              </p>
            </div>
          )}

          {/* Informações Boleto */}
          {paymentMethod === 'boleto' && (
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-orange-800">
                Após confirmar, você receberá o boleto por email.
                O boleto vence em 24 horas.
              </p>
            </div>
          )}

          {/* Botão de pagamento */}
          <button
            type="submit"
            className="w-full bg-emerald-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              `Pagar ${formatAmount(amount)}`
            )}
          </button>
        </form>

        {/* Informações de segurança */}
        <div className="text-xs text-gray-500 text-center">
          <p>Seus dados estão protegidos com criptografia SSL.</p>
          <p>Pagamento processado de forma segura pela Pagar.me.</p>
        </div>
      </div>
    </div>
  );
}