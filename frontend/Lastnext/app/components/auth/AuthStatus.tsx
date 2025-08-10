// app/components/auth/AuthStatus.tsx
'use client';

import { useAuth } from '@/app/lib/hooks/useAuth';
import { signOut } from 'next-auth/react';
import { ROUTES } from '@/app/lib/config';

interface AuthStatusProps {
  showUserInfo?: boolean;
  showLogoutButton?: boolean;
  className?: string;
}

export default function AuthStatus({ 
  showUserInfo = true, 
  showLogoutButton = true,
  className = '' 
}: AuthStatusProps) {
  const { user, isAuthenticated, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
        <span className="text-sm text-gray-500">Checking authentication...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="text-red-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <span className="text-sm text-red-600">Authentication error</span>
        <button
          onClick={() => signOut({ callbackUrl: ROUTES.signIn })}
          className="text-xs text-indigo-600 hover:text-indigo-500 underline"
        >
          Sign in again
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="text-gray-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <span className="text-sm text-gray-500">Not signed in</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {showUserInfo && user && (
        <div className="flex items-center space-x-2">
          {user.profile_image ? (
            <img
              src={user.profile_image}
              alt={user.username}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-xs font-medium text-indigo-600">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{user.username}</span>
            <span className="text-xs text-gray-500">{user.positions}</span>
          </div>
        </div>
      )}
      
      {showLogoutButton && (
        <button
          onClick={() => signOut({ callbackUrl: ROUTES.signIn })}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Sign out
        </button>
      )}
    </div>
  );
} 