import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { lawyerId: string; date: string } }
) {
  try {
    // Fazer requisição para o backend NestJS
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await fetch(
      `${backendUrl}/appointments/availability/${params.lawyerId}/${params.date}`,
      {
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro ao buscar disponibilidade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
