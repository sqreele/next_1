// app/api/rooms/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { API_CONFIG, DEBUG_CONFIG } from '@/app/lib/config';
import { getErrorMessage } from '@/app/lib/utils/error-utils';

export async function GET(request: NextRequest) {
  try {
    if (DEBUG_CONFIG.logApiCalls) {
      console.log('🔍 Rooms API - Request started');
      console.log('🔍 Request URL:', request.url);
      console.log('🔍 API_CONFIG.baseUrl:', API_CONFIG.baseUrl);
    }

    // ✅ Get session with proper error handling
    const session = await getServerSession(authOptions);
    
    if (DEBUG_CONFIG.logSessions) {
      console.log('🔍 Rooms API Session Debug:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasAccessToken: !!session?.user?.accessToken,
        userId: session?.user?.id,
        username: session?.user?.username,
        accessTokenLength: session?.user?.accessToken?.length,
        sessionError: session?.error,
      });
    }

    // Prefer incoming Authorization header (set by client with refreshed token), fallback to session token
    const incomingAuthHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const effectiveAuthHeader = incomingAuthHeader && incomingAuthHeader.toLowerCase().startsWith('bearer ')
      ? incomingAuthHeader
      : (session?.user?.accessToken ? `Bearer ${session.user.accessToken}` : null);

    if (!effectiveAuthHeader) {
      console.log('❌ No access token available for rooms API (no header and no session token)');
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: DEBUG_CONFIG.logSessions ? {
          hasSession: !!session,
          hasUser: !!session?.user,
          sessionKeys: session ? Object.keys(session) : [],
          userKeys: session?.user ? Object.keys(session.user) : [],
          sessionError: session?.error
        } : undefined
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('property');
    
    // ✅ Use the config for API URL construction
    const apiUrl = propertyId
      ? `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.rooms}?property=${encodeURIComponent(propertyId)}`
      : `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.rooms}`;
    
    if (DEBUG_CONFIG.logApiCalls) {
      console.log('🔍 Calling Django API:', apiUrl, propertyId ? `(filtered by property ${propertyId})` : '(no property filter)');
      console.log('🔍 Using auth header from:', incomingAuthHeader ? 'incoming request' : 'server session');
    }

    // Fetch rooms from the external API
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': effectiveAuthHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'NextJS-Server/1.0',
      },
      // Add timeout
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (DEBUG_CONFIG.logApiCalls) {
      console.log('🔍 Django API response:', response.status, response.statusText);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch rooms:', response.status, response.statusText, errorText);
      return NextResponse.json(
        { 
          error: 'Failed to fetch rooms', 
          details: errorText, 
          status: response.status,
          apiUrl: DEBUG_CONFIG.logApiCalls ? apiUrl : undefined
        }, 
        { status: response.status }
      );
    }

    const rooms = await response.json();
    
    if (DEBUG_CONFIG.logApiCalls) {
      console.log('✅ Rooms fetched successfully:', Array.isArray(rooms) ? rooms.length : 'Not an array');
    }
    
    return NextResponse.json(rooms);

  } catch (error) {
    console.error('❌ Error in rooms API:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: DEBUG_CONFIG.logApiCalls ? error.stack : undefined
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: getErrorMessage(error),
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}
