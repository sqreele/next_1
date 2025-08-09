// ./app/dashboard/error.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard error:', error);
    
    // Automatically redirect to login for auth errors
    const isAuthError = 
      error.message.includes('unauthorized') || 
      error.message.includes('401') || 
      error.message.includes('token') || 
      error.message.includes('session');
      
    if (isAuthError) {
      router.push('/auth/signin?error=session_expired');
    }
  }, [error, router]);

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <h1 className="text-xl font-bold text-red-600">Something went wrong</h1>
      <p className="text-gray-600">
        {error.message || 'There was a problem loading your dashboard'}
      </p>
      <div className="flex space-x-4">
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
