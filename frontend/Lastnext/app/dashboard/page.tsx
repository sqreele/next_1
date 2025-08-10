// ./app/dashboard/page.tsx
import { Suspense } from 'react';
import { fetchProperties, fetchJobs } from '@/app/lib/data.server';
import DashboardClient from '@/app/dashboard/DashboardClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { debugConfig, debugApiUrl } from '@/app/lib/debug-config';
import { Job } from '@/app/lib/types';

export const dynamic = 'force-dynamic'; // Ensure dynamic rendering

export default async function DashboardPage() {
  // Debug configuration
  debugConfig();
  debugApiUrl();
  
  // Fetch session on the server
  const session = await getServerSession(authOptions);
  
  console.log('🔍 Dashboard Session Debug:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    hasAccessToken: !!session?.user?.accessToken,
    userId: session?.user?.id,
    username: session?.user?.username,
  });
  
  // Check if session exists and has a valid token
  if (!session || !session.user || !session.user.accessToken) {
    console.log('❌ No valid session, redirecting to signin');
    redirect('/auth/signin');
  }
  
  const accessToken = session.user.accessToken;
  
  try {
    console.log('🔄 Fetching properties...');
    // Fetch data using server-side functions
    const properties = await fetchProperties(accessToken);
    
    console.log('📊 Properties fetched:', {
      count: properties?.length,
      isArray: Array.isArray(properties),
      firstProperty: properties?.[0],
    });
    
    // Check if properties were successfully fetched (validates token)
    if (!properties || !Array.isArray(properties)) {
      console.error('❌ Invalid properties data or unauthorized access');
      redirect('/auth/signin?error=session_expired');
    }
    
    const firstPropertyId = properties[0]?.property_id;
    console.log('🏢 First property ID:', firstPropertyId);
    
    let jobs: Job[] = [];
    console.log('🔄 Fetching all jobs...');
    jobs = await fetchJobs(accessToken);
    console.log('📋 Jobs fetched:', { count: jobs?.length });
    
    return (
      <div className="space-y-8 p-4 sm:p-8 w-full">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-4 text-sm sm:text-base text-gray-500">
              Loading jobs and properties...
            </div>
          }
        >
          <DashboardClient jobs={jobs} properties={properties} />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error('❌ Error loading dashboard data:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    }
    
    // Determine if it's an auth error
    const isAuthError = 
      error instanceof Error && 
      (error.message.includes('unauthorized') || 
       error.message.includes('401') || 
       error.message.includes('token') ||
       error.message.includes('Forbidden'));
    
    if (isAuthError) {
      console.log('🔐 Auth error detected, redirecting to signin');
      redirect('/auth/signin?error=session_expired');
    }
    
    // For other errors, render an error state with more details
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <h1 className="text-xl font-bold text-red-600">Error Loading Dashboard</h1>
        <p className="text-gray-600">There was a problem loading your dashboard data.</p>
        {process.env.NODE_ENV === 'development' && error instanceof Error && (
          <div className="text-sm text-gray-500 max-w-md text-center">
            <p><strong>Error:</strong> {error.message}</p>
            <p><strong>Type:</strong> {error.name}</p>
          </div>
        )}
        <div className="flex space-x-4">
          <a 
            href="/dashboard" 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </a>
          <a 
            href="/auth/signin" 
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Sign In Again
          </a>
        </div>
      </div>
    );
  }
}
