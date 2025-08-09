// ./app/dashboard/chartdashboard/page.tsx
import { Suspense } from 'react';
import { fetchJobs } from '@/app/lib/data.server'; // Import from server file
import PropertyJobsDashboard from '@/app/components/jobs/PropertyJobsDashboard';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';

export default async function ChartdashboardPage() {
  // Fetch session on the server
  const session = await getServerSession(authOptions);
  const accessToken = session?.user?.accessToken;

  // Fetch data using server-side function
  const jobs = await fetchJobs(accessToken);

  return (
    <div className="space-y-4">
      <Suspense fallback={<div>Loading...</div>}>
        <PropertyJobsDashboard initialJobs={jobs || []} />
      </Suspense>
    </div>
  );
}