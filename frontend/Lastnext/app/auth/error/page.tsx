'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { ERROR_TYPES, ROUTES } from '@/app/lib/config';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (errorType: string | null) => {
    switch (errorType) {
      case ERROR_TYPES.SESSION_EXPIRED:
        return {
          title: 'Session Expired',
          message: 'Your session has expired. Please log in again to continue.',
          action: 'Sign In Again'
        };
      case ERROR_TYPES.ACCESS_DENIED:
        return {
          title: 'Access Denied',
          message: 'You do not have permission to access this resource.',
          action: 'Go to Dashboard'
        };
      case ERROR_TYPES.REFRESH_TOKEN_ERROR:
        return {
          title: 'Authentication Error',
          message: 'Your session could not be renewed. Please log in again.',
          action: 'Sign In Again'
        };
      case ERROR_TYPES.CREDENTIALS_SIGNIN:
        return {
          title: 'Invalid Credentials',
          message: 'The username or password you entered is incorrect.',
          action: 'Try Again'
        };
      case ERROR_TYPES.NETWORK_ERROR:
        return {
          title: 'Network Error',
          message: 'Unable to connect to the authentication service. Please check your connection and try again.',
          action: 'Retry'
        };
      default:
        return {
          title: 'Authentication Error',
          message: 'An unexpected error occurred during authentication.',
          action: 'Go to Sign In'
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-500">
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {errorInfo.title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {errorInfo.message}
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {error === ERROR_TYPES.SESSION_EXPIRED || 
           error === ERROR_TYPES.REFRESH_TOKEN_ERROR || 
           error === ERROR_TYPES.CREDENTIALS_SIGNIN ? (
            <Link
              href={ROUTES.signIn}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {errorInfo.action}
            </Link>
          ) : (
            <Link
              href={ROUTES.dashboard}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {errorInfo.action}
            </Link>
          )}

          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Return to Home
            </Link>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mt-8 p-4 bg-gray-100 rounded-md">
            <p className="text-xs text-gray-600">
              <strong>Debug Info:</strong> Error type: {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-lg font-medium text-gray-500">
          Loading error page...
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}