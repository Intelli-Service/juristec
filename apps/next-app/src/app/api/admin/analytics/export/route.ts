import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'super_admin' && session.user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extrair parâmetros de query
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') || 'month';
    const segment = searchParams.get('segment') || 'all';

    // Fazer chamada para o backend NestJS
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const queryParams = new URLSearchParams();
    queryParams.append('format', format);

    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (period) queryParams.append('period', period);
    if (segment && segment !== 'all') queryParams.append('segment', segment);

    const response = await fetch(`${backendUrl}/analytics/export?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.text();

    // Retornar como arquivo para download
    const headers = new Headers();
    if (format === 'csv') {
      headers.set('Content-Type', 'text/csv');
      headers.set('Content-Disposition', 'attachment; filename="analytics-report.csv"');
    } else {
      headers.set('Content-Type', 'application/json');
      headers.set('Content-Disposition', 'attachment; filename="analytics-report.json"');
    }

    return new NextResponse(data, { headers });

  } catch (error) {
    console.error('Erro na API de export analytics:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}