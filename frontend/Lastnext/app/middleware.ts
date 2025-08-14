// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse, NextRequest } from 'next/server';
import { ERROR_TYPES, ROUTES } from '@/app/lib/config';

// Helper function to create redirect URL with proper error handling
function createSignInRedirect(req: NextRequest, error?: string): NextResponse {
  const signInUrl = new URL(ROUTES.signIn, req.url);
  
  if (error) {
    signInUrl.searchParams.set('error', error);
  }
  
  // Preserve the original URL for post-login redirect (do not double-encode)
  const originalUrl = req.nextUrl.pathname + (req.nextUrl.search || "");
  signInUrl.searchParams.set('callbackUrl', originalUrl);
  
  return NextResponse.redirect(signInUrl);
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    
    // Handle various token error states
    if (token?.error) {
      switch (token.error) {
        case ERROR_TYPES.REFRESH_TOKEN_ERROR:
          console.log('Token refresh error detected, redirecting to sign in');
          return createSignInRedirect(req, ERROR_TYPES.SESSION_EXPIRED);
        
        case 'OAuthAccountNotLinked':
        case 'AccessDenied':
          return createSignInRedirect(req, ERROR_TYPES.ACCESS_DENIED);
        
        default:
          // Log unknown errors for debugging
          console.warn('Unknown token error:', token.error);
          return createSignInRedirect(req, ERROR_TYPES.SESSION_EXPIRED);
      }
    }
    
    // Optional: Add session expiry check
    if (token?.accessTokenExpires && Date.now() >= token.accessTokenExpires) {
      console.log('Access token expired, redirecting to sign in');
      return createSignInRedirect(req, ERROR_TYPES.SESSION_EXPIRED);
    }
    
    // Add security headers
    const response = NextResponse.next();
    
    // Prevent embedding in frames (clickjacking protection)
    response.headers.set('X-Frame-Options', 'DENY');
    
    // XSS protection
    response.headers.set('X-Content-Type-Options', 'nosniff');
    
    // Add user info to headers for easier access in components (optional)
    if (token?.id) {
      response.headers.set('X-User-ID', token.id);
    }
    
    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Never protect auth pages to avoid loops
        const pathname = req.nextUrl.pathname;
        if (pathname.startsWith('/auth')) {
          return true;
        }

        if (!token) return false;
        if (token.error) return false;
        if (token.accessTokenExpires && Date.now() >= token.accessTokenExpires) return false;
        return true;
      },
    },
    pages: {
      signIn: ROUTES.signIn,
      error: ROUTES.error,
    },
  }
);

export const config = {
  matcher: [
    // Exclude Next.js internals, all API routes (incl. NextAuth), and public auth pages
    '/((?!api|_next/static|_next/image|favicon.ico|auth/(signin|error|register|forgot-password|reset-password)).*)',
  ],
};