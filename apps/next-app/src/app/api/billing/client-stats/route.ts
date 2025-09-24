import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'client') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas clientes podem acessar esta rota.' },
        { status: 403 }
      );
    }

    // Chamar API do backend NestJS
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${backendUrl}/billing/stats?clientId=${session.user.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authentication header if needed
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const stats = await response.json();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do cliente:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}