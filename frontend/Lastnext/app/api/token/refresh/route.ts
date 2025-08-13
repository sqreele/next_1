import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/app/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const refresh = body?.refresh;

    if (!refresh) {
      return NextResponse.json({ detail: 'Missing refresh token' }, { status: 400 });
    }

    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.tokenRefresh}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh })
    });

    const text = await response.text().catch(() => '');
    if (!response.ok) {
      return NextResponse.json({ detail: text || 'Token refresh failed' }, { status: response.status });
    }

    return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}