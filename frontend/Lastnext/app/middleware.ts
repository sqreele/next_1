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
  
  // Preserve the original URL for post-login redirect
  signInUrl.searchParams.set('callbackUrl', encodeURIComponent(req.url));
  
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
      // More robust authorization check
      authorized: ({ token, req }) => {
        // Allow access if token exists and is not expired
        if (!token) {
          console.log('No token found, denying access');
          return false;
        }
        
        // Check for token errors
        if (token.error) {
          console.log('Token error detected:', token.error);
          return false;
        }
        
        // Check if access token is expired
        if (token.accessTokenExpires && Date.now() >= token.accessTokenExpires) {
          console.log('Access token expired');
          return false;
        }
        
        return true;
      },
    },
    pages: {
      signIn: ROUTES.signIn,
      error: ROUTES.error, // Custom error page
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    // Add other protected routes as needed
    "/api/protected/:path*",
  ]
};