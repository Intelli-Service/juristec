import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lawyerId = searchParams.get('lawyerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let url = `${API_BASE_URL}/feedback/stats/overview`;
    const params = new URLSearchParams();

    if (lawyerId) params.append('lawyerId', lawyerId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch feedback stats' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Feedback stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}