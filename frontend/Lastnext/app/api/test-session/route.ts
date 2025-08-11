import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';

export async function GET(request: NextRequest) {
  console.log('🧪 Simple debug starting...');
  
  try {
    const session = await getServerSession(authOptions);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      hasSession: !!session,
      hasUser: !!session?.user,
      hasAccessToken: !!session?.user?.accessToken,
      userId: session?.user?.id,
      username: session?.user?.username,
      tokenLength: session?.user?.accessToken?.length,
      sessionError: session?.error,
      environment: {
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
