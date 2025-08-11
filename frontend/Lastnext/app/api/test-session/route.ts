import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { getErrorMessage } from '@/app/lib/utils/error-utils';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing session retrieval...');
    
    const session = await getServerSession(authOptions);
    
    const result = {
      success: true,
      hasSession: !!session,
      hasUser: !!session?.user,
      hasAccessToken: !!session?.user?.accessToken,
      userId: session?.user?.id,
      username: session?.user?.username,
      sessionKeys: session ? Object.keys(session) : [],
      userKeys: session?.user ? Object.keys(session.user) : [],
      error: session?.error,
      tokenLength: session?.user?.accessToken?.length,
      timestamp: new Date().toISOString()
    };

    console.log('🧪 Session test result:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('🧪 Session test error:', error);
    return NextResponse.json({
      success: false,
      error: getErrorMessage(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
