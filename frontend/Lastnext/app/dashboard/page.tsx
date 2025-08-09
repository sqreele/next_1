// ./app/dashboard/page.tsx
import { Suspense } from 'react';
import { fetchJobsForProperty, fetchProperties } from '@/app/lib/data.server';
import JobsContent from '@/app/dashboard/JobsContent';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic'; // Ensure dynamic rendering

export default async function DashboardPage() {
  // Fetch session on the server
  const session = await getServerSession(authOptions);
  
  // Check if session exists and has a valid token
  if (!session || !session.user || !session.user.accessToken) {
    // Redirect to login if no valid session
    redirect('/auth/signin');
  }
  
  const accessToken = session.user.accessToken;
  
  try {
    // Fetch data using server-side functions
    const properties = await fetchProperties(accessToken);
    
    // Check if properties were successfully fetched (validates token)
    if (!properties || !Array.isArray(properties)) {
      console.error('Invalid properties data or unauthorized access');
      redirect('/auth/signin?error=session_expired');
    }
    
    const firstPropertyId = properties[0]?.property_id;
    const jobs = firstPropertyId 
      ? await fetchJobsForProperty(firstPropertyId, accessToken) 
      : [];
    
    return (
      <div className="space-y-8 p-4 sm:p-8 w-full">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-4 text-sm sm:text-base text-gray-500">
              Loading jobs and properties...
            </div>
          }
        >
          <JobsContent jobs={jobs} properties={properties} />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    
    // Determine if it's an auth error
    const isAuthError = 
      error instanceof Error && 
      (error.message.includes('unauthorized') || 
       error.message.includes('401') || 
       error.message.includes('token'));
    
    if (isAuthError) {
      redirect('/auth/signin?error=session_expired');
    }
    
    // For other errors, render an error state
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <h1 className="text-xl font-bold text-red-600">Error Loading Dashboard</h1>
        <p className="text-gray-600">There was a problem loading your dashboard data.</p>
        <a 
          href="/dashboard" 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Try Again
        </a>
      </div>
    );
  }
}
