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

    // Durante o build, retornar uma resposta mock para evitar erros
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
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
    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Backend service not configured' },
        { status: 503 }
      );
    }

    const queryParams = new URLSearchParams();
    queryParams.append('format', format);

    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (period) queryParams.append('period', period);
    if (segment && segment !== 'all') queryParams.append('segment', segment);

    const apiUrl = `${backendUrl}/analytics/export?${queryParams}`;

    // Adicionar timeout para evitar travamentos durante o build
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Backend responded with status: ${response.status}`);
      }

      const data = await response.text();
      if (!data) {
        throw new Error('Empty response from backend');
      }

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

    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Se for erro de rede ou timeout, retornar resposta de serviço indisponível
      if (fetchError instanceof Error && (fetchError.name === 'AbortError' || fetchError.message.includes('fetch'))) {
        return NextResponse.json(
          { error: 'Analytics service temporarily unavailable' },
          { status: 503 }
        );
      }

      throw fetchError;
    }

  } catch (error) {
    console.error('Erro na API de export analytics:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}