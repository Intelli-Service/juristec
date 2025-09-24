'use client';

import { useParams } from 'next/navigation';
import { PaymentCheckout } from '@/components/PaymentCheckout';

export default function PaymentPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;

  // Valores de exemplo - em produção, buscar do backend
  const paymentData = {
    amount: 15000, // R$ 150,00
    caseCategory: 'Direito Civil',
    caseComplexity: 'medio',
    lawyerName: 'Dra. Maria Silva',
  };

  const handlePaymentSuccess = (payment: { id: string; status: string; paymentUrl?: string }) => {
    console.log('Pagamento realizado com sucesso:', payment);
    // Redirecionar para página de sucesso ou chat
    window.location.href = `/chat?conversation=${conversationId}`;
  };

  const handlePaymentError = (error: { message: string }) => {
    console.error('Erro no pagamento:', error);
  };

  if (!conversationId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Erro</h1>
          <p className="text-gray-600">ID da conversa não fornecido.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4">
        <PaymentCheckout
          conversationId={conversationId}
          amount={paymentData.amount}
          caseCategory={paymentData.caseCategory}
          caseComplexity={paymentData.caseComplexity}
          lawyerName={paymentData.lawyerName}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      </div>
    </div>
  );
}