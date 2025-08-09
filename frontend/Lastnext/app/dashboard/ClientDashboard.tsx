'use client';

import { useSession, signOut } from 'next-auth/react';
import { User as UserIcon } from 'lucide-react'; // Explicitly import User icon

export default function ClientDashboard() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="flex items-center justify-center p-4 text-sm sm:text-base text-gray-500">Loading user data...</div>;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center text-center p-4 space-y-2">
        <p className="text-sm sm:text-base text-gray-700">Please log in</p>
        <a href="/auth/signin" className="text-indigo-600 hover:underline text-sm sm:text-base">here</a>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-0">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">Welcome, {session.user.username}</h1>
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Positions: {session.user.positions}</p>
      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full mx-auto sm:mx-0 border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
        {session.user.profile_image ? (
          <img 
            src={session.user.profile_image} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-700">
            <UserIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 dark:text-gray-500" />
          </div>
        )}
      </div>
      <button
        onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm sm:text-base transition-colors"
      >
        Log Out
      </button>
    </div>
  );
}