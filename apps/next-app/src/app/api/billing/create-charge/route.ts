import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Criar cobrança (apenas advogados)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['lawyer', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { conversationId, amount, type, title, description, reason, metadata, splitConfig } = body;

    if (!conversationId || !amount || !type || !title || !description || !reason) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: conversationId, amount, type, title, description, reason' },
        { status: 400 }
      );
    }

    // Chamar API do backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${backendUrl}/billing/create-charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Adicionar autenticação JWT se necessário
      },
      body: JSON.stringify({
        conversationId,
        lawyerId: session.user.id,
        clientId: conversationId, // TODO: Obter clientId da conversa
        amount,
        type,
        title,
        description,
        reason,
        metadata,
        splitConfig,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Erro ao criar cobrança' },
        { status: response.status }
      );
    }

    const charge = await response.json();
    return NextResponse.json(charge);

  } catch (error) {
    console.error('Erro ao criar cobrança:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}