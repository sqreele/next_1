import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Full auth debug starting...');
    
    // Check cookies
    const cookieStore = cookies();
    const nextAuthCookies = Array.from(cookieStore.entries())
      .filter(([name]) => name.startsWith('next-auth') || name.startsWith('__Secure-next-auth'))
      .map(([name, value]) => ({ name, hasValue: !!value.value, valueLength: value.value.length }));
    
    console.log('🧪 NextAuth cookies:', nextAuthCookies);

    // Try to get session
    const session = await getServerSession(authOptions);
    
    console.log('🧪 Session result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasAccessToken: !!session?.user?.accessToken,
      sessionError: session?.error,
      sessionKeys: session ? Object.keys(session) : [],
      userKeys: session?.user ? Object.keys(session.user) : []
    });

    // Test Django API call if we have a token
    let djangoTestResult = null;
    if (session?.user?.accessToken) {
      try {
        const djangoResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/properties/`, {
          headers: {
            'Authorization': `Bearer ${session.user.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        djangoTestResult = {
          status: djangoResponse.status,
          ok: djangoResponse.ok,
          statusText: djangoResponse.statusText
        };
        
        if (djangoResponse.ok) {
          const data = await djangoResponse.json();
          djangoTestResult.dataLength = data.length;
        } else {
          djangoTestResult.error = await djangoResponse.text();
        }
      } catch (error) {
        djangoTestResult = { error: error.message };
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      cookies: nextAuthCookies,
      session: {
        exists: !!session,
        hasUser: !!session?.user,
        hasAccessToken: !!session?.user?.accessToken,
        error: session?.error,
        userId: session?.user?.id,
        username: session?.user?.username,
        tokenLength: session?.user?.accessToken?.length,
        propertiesCount: session?.user?.properties?.length
      },
      djangoApiTest: djangoTestResult,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        apiUrl: process.env.NEXT_PUBLIC_API_URL
      }
    });

  } catch (error) {
    console.error('🧪 Auth debug error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
