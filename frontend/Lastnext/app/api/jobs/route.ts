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

    const apiUrl = `${API_CONFIG.baseUrl}/api/jobs/${queryString ? `?${queryString}` : ''}`;
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

    const body = await request.json();

    // Create job in the external API
    const response = await fetch(
      `${API_CONFIG.baseUrl}/api/jobs/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      console.error('Failed to create job:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to create job' }, 
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