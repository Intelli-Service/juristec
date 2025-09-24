import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['super_admin', 'moderator'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar relatórios.' },
        { status: 403 }
      );
    }

    // Chamar API do backend NestJS
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${backendUrl}/billing/admin-reports`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authentication header if needed
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const reports = await response.json();
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Erro ao buscar relatórios de cobrança:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}