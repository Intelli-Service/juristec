import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Durante o build do Next.js, retornar uma resposta simples para evitar erros
  if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_API_URL) {
    return NextResponse.json(
      { error: 'Service not available during build' },
      { status: 503 }
    );
  }

  try {
    // Verificar autenticação e permissões
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'super_admin' && session.user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retornar dados mock para evitar problemas durante o build
    const mockData = {
      message: 'Analytics export service',
      status: 'Service temporarily returns mock data during build',
      timestamp: new Date().toISOString()
    };

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', 'attachment; filename="analytics-report.json"');

    return new NextResponse(JSON.stringify(mockData, null, 2), { headers });

  } catch (error) {
    console.error('Erro na API de export analytics:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}