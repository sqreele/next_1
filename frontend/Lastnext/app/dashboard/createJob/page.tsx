// /app/dashboard/createJob/page.tsx
import { Suspense } from 'react';
import { Metadata } from 'next';
import CreateJobForm from '@/app/components/jobs/CreateJobForm';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth'; // Correct path to your authOptions

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Create Job - Maintenance & Job Management Dashboard',
  description: 'Create a new maintenance job effortlessly. Assign tasks, set priorities, and upload images with our intuitive form.',
  keywords: ['create job', 'maintenance task', 'job management', 'property maintenance', 'dashboard'],
  openGraph: {
    title: 'Create Job - Maintenance & Job Management Dashboard',
    description: 'Add new maintenance tasks with ease using our Next.js-powered form.',
    url: 'https://pmcs.site/dashboard/createJob',
    type: 'website',
    images: [
      {
        url: 'https://pmcs.site/og-create-job.jpg',
        width: 1200,
        height: 630,
        alt: 'Create Job Page Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Create Job - Maintenance & Job Management Dashboard',
    description: 'Effortlessly create maintenance jobs with our intuitive tool.',
    images: ['https://pmcs.site/twitter-create-job.jpg'],
  },
};

export default async function CreateJobPage() {
  // Server-side session check
  const session = await getServerSession(authOptions);
  console.log('Server session:', session); // Debug log

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="space-y-4 p-4 sm:p-8 w-full max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        Create New Maintenance Job
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground">
        Fill out the form below to add a new job.
      </p>
      <Suspense fallback={<div className="flex items-center justify-center p-4 text-sm sm:text-base text-gray-500">Loading form...</div>}>
        <CreateJobForm />
      </Suspense>
    </div>
  );
}
