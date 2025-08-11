import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { API_CONFIG } from '@/app/lib/config';
import { getErrorMessage } from '@/app/lib/utils/error-utils';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Rooms API - Request started');
    console.log('🔍 Request URL:', request.url);
    console.log('🔍 Request headers:', {
      cookie: request.headers.get('cookie')?.substring(0, 100) + '...',
      authorization: request.headers.get('authorization'),
      userAgent: request.headers.get('user-agent'),
    });

    // ✅ CRITICAL: Pass both request and response objects for App Router
    const session = await getServerSession(authOptions);
    
    console.log('🔍 Rooms API Debug:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasAccessToken: !!session?.user?.accessToken,
      userId: session?.user?.id,
      username: session?.user?.username,
      accessTokenLength: session?.user?.accessToken?.length,
      sessionError: session?.error,
      fullSessionKeys: session ? Object.keys(session) : [],
      userKeys: session?.user ? Object.keys(session.user) : []
    });

    // If no session, try to debug why
    if (!session) {
      console.log('❌ No session found in rooms API');
      console.log('🔍 Cookies received:', request.headers.get('cookie'));
      
      return NextResponse.json({ 
        error: 'Unauthorized - No session found',
        debug: {
          hasCookies: !!request.headers.get('cookie'),
          requestUrl: request.url,
          timestamp: new Date().toISOString()
        }
      }, { status: 401 });
    }
    
    if (!session?.user?.accessToken) {
      console.log('❌ No access token in session');
      
      return NextResponse.json({ 
        error: 'Unauthorized - No access token',
        debug: {
          hasSession: !!session,
          hasUser: !!session?.user,
          sessionKeys: session ? Object.keys(session) : [],
          userKeys: session?.user ? Object.keys(session.user) : [],
          sessionError: session?.error
        }
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('property');
    
    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }

    // ✅ Use internal HTTP endpoint to avoid SSL issues
    const apiUrl = `http://django-backend:8000/api/rooms/?property=${propertyId}`;
    console.log('🔍 Calling Django API:', apiUrl);
    console.log('🔍 With token length:', session.user.accessToken.length);

    // Fetch rooms from the external API
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${session.user.accessToken}`,
        'Content-Type': 'application/json',
      },
      // ✅ Add timeout and error handling
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    console.log('🔍 Django API response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch rooms:', response.status, response.statusText, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch rooms', details: errorText, status: response.status }, 
        { status: response.status }
      );
    }

    const rooms = await response.json();
    console.log('🔍 Rooms fetched successfully:', Array.isArray(rooms) ? rooms.length : 'Not an array');
    return NextResponse.json(rooms);

  } catch (error) {
    console.error('❌ Error fetching rooms:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
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
