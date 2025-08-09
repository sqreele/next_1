// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from 'next/server';

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req) {
    const token = req.nextauth.token;
    
    // If token has an error (like RefreshAccessTokenError), redirect to login with error param
    if (token?.error === 'RefreshAccessTokenError') {
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('error', 'session_expired');
      signInUrl.searchParams.set('callbackUrl', encodeURIComponent(req.url));
      return NextResponse.redirect(signInUrl);
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Return true to allow, false to deny
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
  ]
};
