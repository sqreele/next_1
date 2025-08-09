
'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';

// Create a client component that safely uses useSearchParams
function LoginForm() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  // Check for error query parameters
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const registeredParam = searchParams.get('registered');
    
    if (errorParam) {
      switch (errorParam) {
        case 'session_expired':
          setError('Your session has expired. Please log in again to continue.');
          break;
        case 'CredentialsSignin':
          setError('Invalid username or password.');
          break;
        case 'RefreshAccessTokenError':
          setError('Your session could not be renewed. Please log in again.');
          break;
        default:
          setError(`Authentication error: ${errorParam}`);
          break;
      }
    } else if (registeredParam === 'success') {
      setError('Registration successful! Please log in with your new credentials.');
    }
  }, [searchParams]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (res?.error) {
        // Handle specific error types
        switch (res.error) {
          case 'session_expired':
            setError('Your session has expired. Please log in again to continue.');
            break;
          case 'CredentialsSignin':
            setError('Invalid username or password.');
            break;
          case 'RefreshAccessTokenError':
            setError('Your session could not be renewed. Please log in again.');
            break;
          default:
            setError(`Authentication error: ${res.error}`);
            break;
        }
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Login failed:', error);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  // If checking session status, show loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-lg font-medium text-gray-500">
          Checking authentication...
        </div>
      </div>
    );
  }

  // Only render the login form if not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Log In</h2>
            <p className="mt-2 text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign up
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className={`${error.includes('Registration successful') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} p-3 rounded-md text-sm`}>
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={loading}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 sm:text-sm"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  loading
                    ? 'bg-indigo-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8h-8z"
                      />
                    </svg>
                    Logging in...
                  </span>
                ) : (
                  'Log In'
                )}
              </button>
            </div>

            <div className="text-center mt-4">
              <Link href="/auth/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-500">
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // This will only render if user is being redirected
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse text-lg font-medium text-gray-500">
        You are already logged in. Redirecting...
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-lg font-medium text-gray-500">
          Loading...
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}