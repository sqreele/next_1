import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { getErrorMessage } from '@/app/lib/utils/error-utils';

interface DjangoTestResult {
  status: number;
  ok: boolean;
  statusText: string;
  dataLength?: number;
  dataType?: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Full auth debug starting...');
    
    // Check cookies from request headers
    const cookieHeader = request.headers.get('cookie') || '';
    const nextAuthCookies = cookieHeader
      .split(';')
      .map(cookie => cookie.trim())
      .filter(cookie => cookie.includes('next-auth') || cookie.includes('__Secure-next-auth'))
      .map(cookie => {
        const [name, ...valueParts] = cookie.split('=');
        const value = valueParts.join('=');
        return { 
          name: name.trim(), 
          hasValue: !!value, 
          valueLength: value.length 
        };
      });
    
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
    let djangoTestResult: DjangoTestResult | null = null;
    if (session?.user?.accessToken) {
      try {
        console.log('🧪 Testing Django API with token...');
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
          djangoTestResult.dataLength = Array.isArray(data) ? data.length : 0;
          djangoTestResult.dataType = typeof data;
        } else {
          djangoTestResult.error = await djangoResponse.text();
        }
        
        console.log('🧪 Django API test result:', djangoTestResult);
      } catch (error) {
        console.error('🧪 Django API test error:', error);
        djangoTestResult = { 
          status: 0, 
          ok: false, 
          statusText: 'Error',
          error: getErrorMessage(error) 
        };
      }
    } else {
      console.log('🧪 No access token available for Django API test');
    }

    const result = {
      timestamp: new Date().toISOString(),
      cookies: {
        total: nextAuthCookies.length,
        cookies: nextAuthCookies
      },
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
        nextAuthSecretLength: process.env.NEXTAUTH_SECRET?.length,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        apiUrl: process.env.NEXT_PUBLIC_API_URL
      }
    };

    console.log('🧪 Debug result summary:', {
      hasSession: result.session.exists,
      hasAccessToken: result.session.hasAccessToken,
      cookiesFound: result.cookies.total,
      djangoApiStatus: djangoTestResult?.status
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('🧪 Auth debug error:', error);
    return NextResponse.json({
      error: getErrorMessage(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
