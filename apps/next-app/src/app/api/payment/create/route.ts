import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      conversationId,
      amount,
      paymentMethod,
      installments,
      cardData,
      pixData,
      boletoData,
      metadata
    } = body;

    // Validações básicas
    if (!conversationId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Valor deve ser maior que zero' },
        { status: 400 }
      );
    }

    // Preparar dados para envio ao backend
    const paymentData = {
      conversationId,
      clientId: session.user.id,
      amount,
      paymentMethod,
      installments: installments || 1,
      cardData,
      pixData,
      boletoData,
      metadata: {
        ...metadata,
        lawyerId: metadata?.lawyerId,
      },
    };

    // Fazer chamada para o backend NestJS
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await fetch(`${backendUrl}/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Adicionar autenticação JWT se necessário
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Erro ao processar pagamento' },
        { status: response.status }
      );
    }

    const paymentResult = await response.json();

    return NextResponse.json(paymentResult);
  } catch (error) {
    console.error('Erro na API de pagamento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}