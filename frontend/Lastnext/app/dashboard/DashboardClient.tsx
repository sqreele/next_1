'use client';

import { useState } from 'react';
import JobsContent from './JobsContent';
import { Job, Property } from '@/app/lib/types';

interface DashboardClientProps {
  jobs: Job[];
  properties: Property[];
}

export default function DashboardClient({ jobs, properties }: DashboardClientProps) {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const handleRoomFilter = (roomId: string | null) => {
    setSelectedRoom(roomId);
  };

  return (
    <JobsContent 
      jobs={jobs} 
      properties={properties}
      selectedRoom={selectedRoom}
      onRoomFilter={handleRoomFilter}
    />
  );
} 