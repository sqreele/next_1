import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { API_CONFIG } from '@/app/lib/config';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.preventiveMaintenance}stats/`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${session.user.accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json({ error: 'Failed to fetch stats', details: text || undefined }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}