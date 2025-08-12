import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { API_CONFIG } from '@/app/lib/config';

export async function POST(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;
    const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.jobs}${jobId}/images/`;

    const contentType = request.headers.get('content-type') || '';
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${session.user.accessToken}`,
      'Content-Type': contentType,
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: request.body as unknown as BodyInit,
      duplex: 'half',
    } as any);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return NextResponse.json({ error: 'Failed to upload images', details: errorText || undefined }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}