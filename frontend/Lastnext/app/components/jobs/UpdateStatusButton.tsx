// UpdateStatusButton.tsx
"use client";

import React, { useState } from 'react';
import { Button } from "@/app/components/ui/button";
import { ClipboardEdit, Loader } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Label } from "@/app/components/ui/label";
import { Job, JobStatus } from "@/app/lib/types";
import { updateJob as apiUpdateJob } from "@/app/lib/data";
import { useToast } from "@/app/components/ui/use-toast";

// Define status constants
const JOB_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  WAITING_SPAREPART: "waiting_sparepart",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
};

interface UpdateStatusButtonProps {
  job: Job;
  onStatusUpdated: (updatedJob: Job) => void;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  buttonText?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const UpdateStatusButton: React.FC<UpdateStatusButtonProps> = ({
  job,
  onStatusUpdated,
  variant = "outline",
  size = "sm",
  className = "",
  buttonText = "Update Status",
  onClick
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>(job.status as JobStatus);
  const { toast } = useToast();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Reset the selected status to the current job status when opening
      setSelectedStatus(job.status as JobStatus);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedStatus === job.status) {
      setIsOpen(false);
      return; // No change needed
    }

    setIsSubmitting(true);
    try {
      // Create a minimal update payload that preserves all required fields
      const updateData = {
        status: selectedStatus,
        // Include other fields from the original job that the API requires
        // NOTE: This is the key fix - including required fields
        room_id: job.rooms?.[0]?.room_id,
        topic_data: job.topics?.[0] ? JSON.stringify({
          title: job.topics[0].title,
          description: job.topics[0].description || ""
        }) : JSON.stringify({ title: "Unknown", description: "" }),
        // Include other fields for completeness
        description: job.description,
        priority: job.priority,
        remarks: job.remarks || "",
        is_defective: job.is_defective || false,
        is_preventivemaintenance: job.is_preventivemaintenance || false,
      };

      // Call API
      const updatedJob = await apiUpdateJob(String(job.job_id), updateData);
      
      // Update local state
      onStatusUpdated(updatedJob);
      
      // Show success message
      toast({
        title: "Status Updated",
        description: `Job #${job.job_id} status changed to ${selectedStatus.replace('_', ' ')}`,
      });
      
      // Close dialog
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update job status",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button 
        onClick={(e) => {
          // If onClick handler is provided, call it
          if (onClick) {
            onClick(e);
          }
          // Always stop propagation to prevent parent click events
          e.stopPropagation();
          setIsOpen(true);
        }}
        variant={variant}
        size={size}
        className={className}
      >
        <ClipboardEdit className="h-4 w-4 mr-2" />
        {buttonText}
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Job Status</DialogTitle>
            <DialogDescription>
              Change the status for job #{job.job_id}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium">
                Status
              </Label>
              <Select
                value={selectedStatus}
                onValueChange={(value: JobStatus) => setSelectedStatus(value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="status" className="text-sm">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={JOB_STATUS.PENDING} className="text-sm">Pending</SelectItem>
                  <SelectItem value={JOB_STATUS.IN_PROGRESS} className="text-sm">In Progress</SelectItem>
                  <SelectItem value={JOB_STATUS.WAITING_SPAREPART} className="text-sm">Waiting Sparepart</SelectItem>
                  <SelectItem value={JOB_STATUS.COMPLETED} className="text-sm">Completed</SelectItem>
                  <SelectItem value={JOB_STATUS.CANCELLED} className="text-sm">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || selectedStatus === job.status}
              >
                {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UpdateStatusButton;
