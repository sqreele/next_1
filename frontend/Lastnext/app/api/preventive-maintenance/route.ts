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

    const { search } = new URL(request.url);
    const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.preventiveMaintenance}${search ?? ''}`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${session.user.accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json({ error: 'Failed to fetch preventive maintenance', details: text || undefined }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.preventiveMaintenance}`;

    const incomingContentType = request.headers.get('content-type') || '';

    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.user.accessToken}`,
    };

    let body: BodyInit | null = null;

    if (incomingContentType.toLowerCase().includes('multipart/form-data')) {
      headers['Content-Type'] = incomingContentType;
      body = request.body as unknown as BodyInit;
    } else {
      const jsonBody = await request.json();
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(jsonBody);
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body,
      duplex: 'half',
    } as any);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json({ error: 'Failed to create preventive maintenance', details: text || undefined }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}