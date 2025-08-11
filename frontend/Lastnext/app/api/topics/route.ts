// app/api/topics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { API_CONFIG, DEBUG_CONFIG } from '@/app/lib/config';
import { getErrorMessage } from '@/app/lib/utils/error-utils';

export async function GET(request: NextRequest) {
  try {
    if (DEBUG_CONFIG.logApiCalls) {
      console.log('🔍 Topics API - Request started');
      console.log('🔍 Request URL:', request.url);
      console.log('🔍 API_CONFIG.baseUrl:', API_CONFIG.baseUrl);
    }

    const session = await getServerSession(authOptions);

    if (DEBUG_CONFIG.logSessions) {
      console.log('🔍 Topics API Session Debug:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasAccessToken: !!session?.user?.accessToken,
        userId: session?.user?.id,
        username: session?.user?.username,
        accessTokenLength: session?.user?.accessToken?.length,
        sessionError: session?.error,
      });
    }

    if (!session?.user?.accessToken) {
      console.log('❌ No access token in topics API session');
      return NextResponse.json(
        {
          error: 'Unauthorized',
          debug: DEBUG_CONFIG.logSessions
            ? {
                hasSession: !!session,
                hasUser: !!session?.user,
                sessionKeys: session ? Object.keys(session) : [],
                userKeys: session?.user ? Object.keys(session.user) : [],
                sessionError: session?.error,
              }
            : undefined,
        },
        { status: 401 }
      );
    }

    const { search } = new URL(request.url);

    // Build target API URL, preserving query string if present
    const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.topics}${search ?? ''}`;

    if (DEBUG_CONFIG.logApiCalls) {
      console.log('🔍 Calling Django API (topics):', apiUrl);
      console.log('🔍 With token length:', session.user.accessToken.length);
    }

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${session.user.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'NextJS-Server/1.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (DEBUG_CONFIG.logApiCalls) {
      console.log('🔍 Django API response (topics):', response.status, response.statusText);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch topics:', response.status, response.statusText, errorText);
      return NextResponse.json(
        {
          error: 'Failed to fetch topics',
          details: errorText,
          status: response.status,
          apiUrl: DEBUG_CONFIG.logApiCalls ? apiUrl : undefined,
        },
        { status: response.status }
      );
    }

    const topics = await response.json();

    if (DEBUG_CONFIG.logApiCalls) {
      console.log('✅ Topics fetched successfully:', Array.isArray(topics) ? topics.length : 'Not an array');
    }

    return NextResponse.json(topics);
  } catch (error) {
    console.error('❌ Error in topics API:', error);

    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: DEBUG_CONFIG.logApiCalls ? error.stack : undefined,
      });
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: getErrorMessage(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}