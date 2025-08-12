'use client';

import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { JobStatus } from '@/app/lib/types';
import { updateJobStatus } from '@/app/lib/data';

interface UpdateStatusModalProps {
  jobId: string;
  currentStatus: JobStatus;
  onStatusUpdated: () => void;
}

export default function UpdateStatusModal({ jobId, currentStatus, onStatusUpdated }: UpdateStatusModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<JobStatus>(currentStatus);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      await updateJobStatus(String(jobId), newStatus);
      onStatusUpdated();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Update Status</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Job Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as JobStatus)} className="w-full border p-2 rounded">
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_sparepart">Waiting Sparepart</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button onClick={handleUpdate} disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}