import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { API_CONFIG } from '@/app/lib/config';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Rooms API - Request started');
    console.log('🔍 Request headers:', {
      cookie: request.headers.get('cookie')?.substring(0, 100) + '...',
      authorization: request.headers.get('authorization'),
      userAgent: request.headers.get('user-agent'),
    });

    // Get session to verify authentication
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

    // Log the full session structure (be careful in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Full session object:', JSON.stringify(session, null, 2));
    }
    
    if (!session?.user?.accessToken) {
      console.log('❌ No access token in session');
      
      // Try to get session with different approach
      const alternativeSession = await getServerSession(request as any, {} as any, authOptions);
      console.log('🔍 Alternative session attempt:', {
        hasAlternative: !!alternativeSession,
        hasUser: !!alternativeSession?.user,
        hasToken: !!alternativeSession?.user?.accessToken
      });
      
      return NextResponse.json({ 
        error: 'Unauthorized',
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

    const apiUrl = `${API_CONFIG.baseUrl}/api/rooms/?property=${propertyId}`;
    console.log('🔍 Calling Django API:', apiUrl);
    console.log('🔍 With token length:', session.user.accessToken.length);

    // Fetch rooms from the external API
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${session.user.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('🔍 Django API response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch rooms:', response.status, response.statusText, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch rooms', details: errorText }, 
        { status: response.status }
      );
    }

    const rooms = await response.json();
    console.log('🔍 Rooms fetched successfully:', rooms.length || 0);
    return NextResponse.json(rooms);

  } catch (error) {
    console.error('Error fetching rooms:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage }, 
      { status: 500 }
    );
  }
}
