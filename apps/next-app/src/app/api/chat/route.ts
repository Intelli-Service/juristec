import { generateAIResponse } from '@/lib/gemini';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    const response = await generateAIResponse(message);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Erro na API do chat:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}