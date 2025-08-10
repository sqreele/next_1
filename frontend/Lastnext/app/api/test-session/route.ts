import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing session retrieval...');
    
    const session = await getServerSession(authOptions);
    
    return NextResponse.json({
      success: true,
      hasSession: !!session,
      hasUser: !!session?.user,
      hasAccessToken: !!session?.user?.accessToken,
      userId: session?.user?.id,
      username: session?.user?.username,
      sessionKeys: session ? Object.keys(session) : [],
      userKeys: session?.user ? Object.keys(session.user) : [],
      error: session?.error,
      // Only include token length for security
      tokenLength: session?.user?.accessToken?.length
    });
  } catch (error) {
    console.error('Session test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
