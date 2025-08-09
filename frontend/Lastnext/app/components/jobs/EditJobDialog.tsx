// ./components/jobs/EditJobDialog.tsx
"use client";

import React, { FC, useEffect } from "react";
import { Loader } from "lucide-react";
import { Job } from "@/app/lib/types"; // Adjusted path
import { Button } from "@/app/components/ui/button"; // Adjusted path
import { Checkbox } from "@/app/components/ui/checkbox"; // Adjusted path
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter, // Import Footer
} from "@/app/components/ui/dialog"; // Adjusted path
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select"; // Adjusted path
import { Textarea } from "@/app/components/ui/textarea"; // Adjusted path
import { Label } from "@/app/components/ui/label"; // Import Label for better accessibility

// Define priority constants to use as values
const JOB_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
};

// Define status constants to use as values
const JOB_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  WAITING_SPAREPART: "waiting_sparepart",
  COMPLETED: "completed"
};

// Props interface (keep as is)
interface EditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitting: boolean;
}

const EditJobDialog: FC<EditDialogProps> = ({
  isOpen,
  onClose,
  job,
  onSubmit,
  isSubmitting,
}) => {
  // For debugging
  useEffect(() => {
    if (job) {
      console.log('Edit dialog job:', job);
      console.log('Job status:', job.status);
    }
  }, [job]);

  if (!isOpen || !job) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Edit Maintenance Job #{job.job_id}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Make changes to the maintenance job here. Click save when done.
          </DialogDescription>
        </DialogHeader>
        {/* Form handles submission via the onSubmit prop */}
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
               Description
            </Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={job.description}
              className="min-h-[100px] text-sm"
              required
              aria-required="true"
              disabled={isSubmitting} // Disable when submitting
            />
          </div>

          {/* Status Field */}
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium">
              Status
            </Label>
            <Select
              name="status"
              defaultValue={job.status || JOB_STATUS.PENDING}
              required
              aria-required="true"
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
              </SelectContent>
            </Select>
          </div>

          {/* Priority Field */}
          <div className="space-y-2">
             <Label htmlFor="priority" className="text-sm font-medium">
                 Priority
             </Label>
             <Select
                 name="priority"
                 defaultValue={job.priority}
                 required
                 aria-required="true"
                 disabled={isSubmitting} // Disable when submitting
             >
                <SelectTrigger id="priority" className="text-sm">
                    <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                    {/* Use the constant values instead of enum */}
                    <SelectItem value={JOB_PRIORITY.LOW} className="text-sm">Low</SelectItem>
                    <SelectItem value={JOB_PRIORITY.MEDIUM} className="text-sm">Medium</SelectItem>
                    <SelectItem value={JOB_PRIORITY.HIGH} className="text-sm">High</SelectItem>
                </SelectContent>
            </Select>
          </div>

          {/* Remarks Field */}
          <div className="space-y-2">
             <Label htmlFor="remarks" className="text-sm font-medium">
                Remarks (Optional)
             </Label>
            <Textarea
              id="remarks"
              name="remarks"
              defaultValue={job.remarks || ""}
              className="min-h-[60px] text-sm"
               disabled={isSubmitting} // Disable when submitting
            />
          </div>

          {/* Defective Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_defective"
              name="is_defective"
              defaultChecked={job.is_defective}
               disabled={isSubmitting} // Disable when submitting
            />
             <Label
                htmlFor="is_defective"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
             >
                Mark as defective
             </Label>
          </div>

          {/* Preventive Maintenance Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_preventivemaintenance"
              name="is_preventivemaintenance"
              defaultChecked={job.is_preventivemaintenance}
              disabled={isSubmitting}
            />
            <Label
              htmlFor="is_preventivemaintenance"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Preventive maintenance
            </Label>
          </div>

          {/* Form Actions */}
           <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4"> {/* Use DialogFooter */}
               <Button
                   type="button"
                   variant="outline"
                   onClick={onClose}
                   disabled={isSubmitting}
                   className="w-full sm:w-auto"
               >
                   Cancel
               </Button>
               <Button
                   type="submit"
                   disabled={isSubmitting}
                   className="w-full sm:w-auto"
               >
                   {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                   Save Changes
               </Button>
           </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

EditJobDialog.displayName = "EditJobDialog";
export default EditJobDialog;