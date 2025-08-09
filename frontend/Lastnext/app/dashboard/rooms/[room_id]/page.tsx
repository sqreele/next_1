// app/dashboard/rooms/[room_id]/page.tsx
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fetchRoom, fetchProperties, fetchJobsForRoom } from '@/app/lib/data.server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import RoomDetailContent from './RoomDetailContent';

type Props = {
  params: Promise<{ room_id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Server Component
export default async function RoomDetailPage({ params }: Props) {
  const { room_id } = await params;
  const session = await getServerSession(authOptions);
  const accessToken = session?.user?.accessToken;

  const room = await fetchRoom(room_id, accessToken);
  if (!room) {
    notFound();
  }

  const properties = await fetchProperties(accessToken);
  const jobs = await fetchJobsForRoom(room_id, accessToken);

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <RoomDetailContent room={room} properties={properties} jobs={jobs} />
    </Suspense>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="animate-pulse">
        <div className="h-8 w-1/3 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 w-1/4 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 rounded"></div>
          <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
          <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}
