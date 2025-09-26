import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ chargeId: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'client') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas clientes podem rejeitar cobranças.' },
        { status: 403 }
      );
    }

    const { chargeId } = await params;
    const body = await request.json();
    const { reason } = body;

    // Chamar API do backend NestJS
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${backendUrl}/billing/reject-charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authentication header if needed
      },
      body: JSON.stringify({
        chargeId,
        clientId: session.user.id,
        reason
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Backend error: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao rejeitar cobrança:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}