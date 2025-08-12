import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { API_CONFIG } from '@/app/lib/config';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Jobs API - Starting request...');
    
    // Get session to verify authentication
    const session = await getServerSession(authOptions);
    
    console.log('🔍 Jobs API Debug:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasAccessToken: !!session?.user?.accessToken,
      userId: session?.user?.id,
      username: session?.user?.username,
      accessTokenLength: session?.user?.accessToken?.length,
      sessionKeys: session ? Object.keys(session) : [],
      userKeys: session?.user ? Object.keys(session.user) : []
    });
    
    if (!session?.user?.accessToken) {
      console.log('❌ No access token in session');
      console.log('❌ Session structure:', JSON.stringify(session, null, 2));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.jobs}${queryString ? `?${queryString}` : ''}`;
    console.log('🔍 Jobs API calling:', apiUrl);
    console.log('🔍 Jobs API headers:', {
      hasAuth: !!session.user.accessToken,
      authLength: session.user.accessToken?.length,
      contentType: 'application/json'
    });

    // Fetch jobs from the external API
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${session.user.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch jobs:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch jobs' }, 
        { status: response.status }
      );
    }

    const jobs = await response.json();
    return NextResponse.json(jobs);

  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session to verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.jobs}`;

    // Detect content type to support both JSON and multipart form-data
    const incomingContentType = request.headers.get('content-type') || '';

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${session.user.accessToken}`,
    };

    let body: BodyInit | null = null;

    if (incomingContentType.toLowerCase().includes('multipart/form-data')) {
      // Forward the raw stream and preserve the original boundary
      headers['Content-Type'] = incomingContentType;
      body = request.body as unknown as BodyInit;
    } else {
      // Default to JSON handling
      const jsonBody = await request.json();
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(jsonBody);
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Failed to create job:', response.status, response.statusText, errorText);
      return NextResponse.json(
        { error: 'Failed to create job', details: errorText || undefined }, 
        { status: response.status }
      );
    }

    const job = await response.json();
    return NextResponse.json(job);

  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 