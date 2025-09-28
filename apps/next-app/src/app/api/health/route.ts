import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check - just return OK if the app is running
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'juristec-frontend',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'juristec-frontend',
        error: 'Health check failed'
      },
      { status: 500 }
    );
  }
}