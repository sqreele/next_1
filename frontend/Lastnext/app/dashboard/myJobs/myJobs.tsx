// MyJobs.js - Updated with Status Update functionality
"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, Home, Pencil, Trash2, Loader, RefreshCcw,
} from "lucide-react";
// --- UI Imports ---
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/app/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/app/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { useToast } from "@/app/components/ui/use-toast";
// --- Lib/Hook Imports ---
import { useUser } from "@/app/lib/user-context";
import { updateJob as apiUpdateJob, deleteJob as apiDeleteJob } from "@/app/lib/data";
import { useJobsData } from "@/app/lib/hooks/useJobsData";
import { Job, JobStatus, JobPriority } from "@/app/lib/types";
// --- Component Imports ---
import CreateJobButton from "@/app/components/jobs/CreateJobButton";
import JobFilters, { FilterState } from "@/app/components/jobs/JobFilters";
import Pagination from "@/app/components/jobs/Pagination";
import UpdateStatusButton from "@/app/components/jobs/UpdateStatusButton"; // Import the new component

// Constants
const ITEMS_PER_PAGE = 5;

// Tailwind-based styles (Keep as they are)
const PRIORITY_STYLES: Record<JobPriority | 'default', string> = {
  high: "bg-red-100 text-red-800 border border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  low: "bg-green-100 text-green-800 border border-green-200",
  default: "bg-gray-100 text-gray-800 border border-gray-200",
};
const STATUS_STYLES: Record<JobStatus | "default", string> = {
  completed: "bg-green-100 text-green-800 border border-green-200",
  in_progress: "bg-blue-100 text-blue-800 border border-blue-200",
  pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  cancelled: "bg-red-100 text-red-800 border border-red-200",
  waiting_sparepart: "bg-gray-100 text-gray-800 border border-gray-200",
  default: "bg-gray-100 text-gray-800 border border-gray-200",
};

// Updated Types
interface JobTableRowProps {
  job: Job;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
  onStatusUpdated: (updatedJob: Job) => void; // Add this prop
}

interface EditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitting: boolean;
}

interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
}

// Include the updated JobTableRow component
// Updated JobTableRow component
const JobTableRow: React.FC<JobTableRowProps> = React.memo(
  ({ job, onEdit, onDelete, onStatusUpdated }) => (
    <>
      {/* Desktop View */}
      <TableRow className="hidden md:table-row hover:bg-gray-50 cursor-pointer" onClick={() => onEdit(job)}>
        <TableCell className="py-3">
          <div className="font-medium text-gray-900">#{job.job_id}</div>
          <Badge
            className={`${PRIORITY_STYLES[job.priority as JobPriority] || PRIORITY_STYLES.default
              } text-xs`}
          >
            {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
          </Badge>
        </TableCell>
        <TableCell className="py-3 max-w-sm">
          <p className="text-sm text-gray-700 truncate mb-1">{job.description}</p>
          <div className="flex flex-wrap gap-1">
            {job.topics?.map((topic) => (
              <Badge
                key={topic.id ?? topic.title} // Use unique key
                variant="outline"
                className="text-xs"
              >
                {topic.title}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell className="py-3">
          <div className="flex flex-col gap-1">
            {job.rooms?.map((room) => (
              <div key={room.room_id} className="flex items-center gap-1.5 text-sm text-gray-600">
                <Home className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{room.name}</span>
              </div>
            ))}
          </div>
        </TableCell>
        <TableCell className="py-3">
          <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <Badge
              className={`${STATUS_STYLES[job.status] || STATUS_STYLES.default
                } text-xs px-2 py-1`}
            >
              {/* Replace underscores and capitalize */}
              {job.status.replace("_", " ").charAt(0).toUpperCase() + job.status.replace("_", " ").slice(1)}
            </Badge>
            {/* Add the Update Status button with stopPropagation */}
            <UpdateStatusButton 
              job={job} 
              onStatusUpdated={onStatusUpdated} 
              size="sm" 
              variant="outline" 
              className="text-xs h-7" 
              buttonText="Change Status"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            />
          </div>
        </TableCell>
        <TableCell className="py-3 text-sm text-gray-600">
          {new Date(job.created_at).toLocaleDateString()}
        </TableCell>
        <TableCell className="py-3">
          <div className="flex items-center gap-1 justify-end pr-4"> {/* Align Actions Right */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click
                onEdit(job);
              }}
              aria-label="Edit Job"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click
                onDelete(job);
              }}
              aria-label="Delete Job"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Mobile View */}
      <div className="md:hidden border rounded-lg p-4 mb-4 bg-white shadow-sm">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-900">#{job.job_id}</div>
              <Badge
                className={`${PRIORITY_STYLES[job.priority as JobPriority] || PRIORITY_STYLES.default
                  } text-xs`}
              >
                {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
              </Badge>
            </div>
            <Badge
              className={`${STATUS_STYLES[job.status] || STATUS_STYLES.default
                } text-xs px-2 py-1`}
            >
              {job.status.replace("_", " ").charAt(0).toUpperCase() + job.status.replace("_", " ").slice(1)}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">Description:</p>
            <p className="text-sm text-gray-600 break-words">{job.description}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {job.topics?.map((topic) => (
                <Badge
                  key={topic.id ?? topic.title}
                  variant="outline"
                  className="text-xs"
                >
                  {topic.title}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">Location:</p>
            <div className="flex flex-col gap-1">
              {job.rooms?.map((room) => (
                <div key={room.room_id} className="flex items-center gap-2 text-sm text-gray-600">
                  <Home className="h-4 w-4 flex-shrink-0" />
                  <span>{room.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">Created:</p>
            <p className="text-sm text-gray-600">{new Date(job.created_at).toLocaleDateString()}</p>
          </div>
          <div className="pt-2" onClick={(e) => e.stopPropagation()}>
            {/* Add the Update Status button for mobile */}
            <UpdateStatusButton 
              job={job} 
              onStatusUpdated={onStatusUpdated} 
              size="sm" 
              variant="outline" 
              className="w-full mb-2"
              buttonText="Update Status"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            />
          </div>
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={() => onEdit(job)}
            >
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 h-9"
              onClick={() => onDelete(job)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </>
  ),
  (prevProps, nextProps) =>
    prevProps.job.job_id === nextProps.job.job_id &&
    prevProps.job.status === nextProps.job.status &&
    prevProps.job.priority === nextProps.job.priority &&
    prevProps.job.description === nextProps.job.description
);
JobTableRow.displayName = 'JobTableRow';

// EditDialog component (Keep as is)
const EditDialog: React.FC<EditDialogProps> = ({ isOpen, onClose, job, onSubmit, isSubmitting }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[425px]">
      <form onSubmit={onSubmit}>
        <DialogHeader>
          <DialogTitle>Edit Job #{job?.job_id}</DialogTitle>
          <DialogDescription>
            Update the details for this maintenance job. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="description" className="text-right col-span-1 text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              defaultValue={job?.description}
              className="col-span-3"
              rows={3}
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="priority" className="text-right col-span-1 text-sm font-medium">
              Priority
            </label>
            <Select name="priority" defaultValue={job?.priority}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="remarks" className="text-right col-span-1 text-sm font-medium">
              Remarks
            </label>
            <Textarea
              id="remarks"
              name="remarks"
              defaultValue={job?.remarks || ''}
              className="col-span-3"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="is_defective" className="text-right col-span-1 text-sm font-medium">
              Defective?
            </label>
            <Checkbox
              id="is_defective"
              name="is_defective"
              defaultChecked={job?.is_defective}
              className="col-span-3 justify-self-start"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="is_preventivemaintenance" className="text-right col-span-1 text-sm font-medium">
              Preventive?
            </label>
            <Checkbox
              id="is_preventivemaintenance"
              name="is_preventivemaintenance"
              defaultChecked={job?.is_preventivemaintenance}
              className="col-span-3 justify-self-start"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);
EditDialog.displayName = 'EditDialog';

// DeleteDialog component (Keep as is)
const DeleteDialog: React.FC<DeleteDialogProps> = ({ isOpen, onClose, onConfirm, isSubmitting }) => (
  <AlertDialog open={isOpen} onOpenChange={onClose}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete the maintenance job.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onClose} disabled={isSubmitting}>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700">
          {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
DeleteDialog.displayName = 'DeleteDialog';

// --- Main MyJobs component ---
const MyJobs: React.FC<{ activePropertyId?: string }> = ({ activePropertyId }) => {
  const { toast } = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const { userProfile, loading: userLoading } = useUser();
  const router = useRouter();

  // Use the hook for data fetching
  const {
    jobs,
    isLoading,
    error,
    refreshJobs,
    updateJob, // Hook's function to update local state
    removeJob, // Hook's function to remove from local state
  } = useJobsData({ propertyId: activePropertyId });

  // Local state for UI
  const [filters, setFilters] = React.useState<FilterState>({
    search: "", status: "all", priority: "all"
  });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedJob, setSelectedJob] = React.useState<Job | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Filter jobs based on local state
  const filteredJobs = React.useMemo(() => {
    if (!Array.isArray(jobs)) return [];
    return jobs.filter((job) => {
      const searchLower = filters.search.toLowerCase();
      const descMatch = job.description?.toLowerCase().includes(searchLower);
      const idMatch = job.job_id?.toString().includes(searchLower);
      const roomMatch = job.rooms?.some(room => room.name?.toLowerCase().includes(searchLower));
      const topicMatch = job.topics?.some(topic => topic.title?.toLowerCase().includes(searchLower));

      const matchesSearch = filters.search === "" || descMatch || idMatch || roomMatch || topicMatch;
      const matchesStatus = filters.status === "all" || job.status === filters.status;
      const matchesPriority = filters.priority === "all" || job.priority === filters.priority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [jobs, filters]);

  // Calculate pagination details
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredJobs.length);
  const currentJobs = filteredJobs.slice(startIndex, endIndex);

  // Reset page number when filters or property change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, activePropertyId]);

  // Effect to handle redirection if unauthenticated
  React.useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [sessionStatus, router]);

  // --- Event Handlers ---
  const handleFilterChange = (newFilters: FilterState) => setFilters(newFilters);
  const handleClearFilters = () => setFilters({ search: "", status: "all", priority: "all" });
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo(0, 0);
    }
  };
  const handleEdit = (job: Job) => { setSelectedJob(job); setIsEditDialogOpen(true); };
  const handleDelete = (job: Job) => { setSelectedJob(job); setIsDeleteDialogOpen(true); };

  // New handler for status updates
  const handleStatusUpdated = (updatedJob: Job) => {
    updateJob(updatedJob);
  };

  // Submit handler for edit dialog
  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedJob) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData(event.currentTarget);
      
      // Create update data that includes the required fields from the original job
      const updatedJobData: Partial<Job> = {
        description: formData.get("description") as string,
        priority: formData.get("priority") as JobPriority,
        remarks: (formData.get("remarks") as string) || undefined,
        is_defective: formData.get("is_defective") === "on",
        is_preventivemaintenance: formData.get("is_preventivemaintenance") === "on",
        
        // Preserve original topics
        topics: selectedJob.topics || [],
      };
      
      // For the API request
      const apiRequestData = {
        ...updatedJobData,
        topic_data: selectedJob.topics || [],
        room_id: selectedJob.rooms?.[0]?.room_id,
      };

      // Call API function with the data formatted for the API
      const updatedJobResult = await apiUpdateJob(String(selectedJob.job_id), apiRequestData);

      // Update local state using the hook's function
      updateJob(updatedJobResult);

      toast({ title: "Success", description: "Job updated successfully." });
      setIsEditDialogOpen(false);
      setSelectedJob(null);
    } catch (error) {
      console.error("Failed to update job:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedJob) return;

    setIsSubmitting(true);
    try {
      await apiDeleteJob(String(selectedJob.job_id));
      removeJob(selectedJob.job_id);

      toast({ title: "Success", description: "Job deleted successfully." });
      setIsDeleteDialogOpen(false);
      setSelectedJob(null);

      // Adjust pagination if needed
      if (currentJobs.length === 1 && currentPage > 1) {
          handlePageChange(currentPage - 1);
      }
    } catch (error) {
      console.error("Failed to delete job:", error);
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Job creation handler
  const handleJobCreated = async () => {
    const success = await refreshJobs(true);
    if (!success) {
      toast({ title: "Warning", description: "Job created, but failed to refresh list.", variant: "default" });
    }
  };

  const handleManualRefresh = async () => {
    await refreshJobs(true);
  };

  // --- Render Logic ---
  if (sessionStatus === "loading" || (isLoading && !error && jobs.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-3 text-gray-600">Loading Maintenance Jobs...</span>
      </div>
    );
  }
  
  if (sessionStatus === "unauthenticated") {
    return null; // Redirect handled by useEffect
  }

  // Main Render Output
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">My Maintenance Jobs</h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredJobs.length === jobs.length && !filtersApplied()
              ? `Viewing ${jobs.length} job${jobs.length !== 1 ? 's' : ''}`
              : `Viewing ${filteredJobs.length} of ${jobs.length} total job${jobs.length !== 1 ? 's' : ''}`
            }
            {userProfile?.username && ` for ${userProfile.username}`}
            {activePropertyId && ` on property ${activePropertyId}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleManualRefresh} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {activePropertyId && (
            <CreateJobButton
              propertyId={activePropertyId}
              onJobCreated={handleJobCreated}
            />
          )}
        </div>
      </div>

      {/* Filters */}
      <JobFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5"/>
          <div>
            <p className="font-medium">Error Loading Jobs</p>
            <p className="text-sm">{error}</p>
            <Button onClick={() => refreshJobs(true)} variant="link" size="sm" className="text-red-700 p-0 h-auto mt-1">
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Job List or Empty State */}
      {!error && (
        isLoading && jobs.length === 0 ? (
          <div className="text-center p-12 border rounded-lg bg-white shadow-sm">
            <Loader className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Loading jobs...</p>
          </div>
        ) : filteredJobs.length > 0 ? (
          <>
            {/* Table for Desktop */}
            <div className="border rounded-lg overflow-x-auto hidden md:block">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="w-[180px] py-3 text-gray-700 font-semibold">Job Details</TableHead>
                    <TableHead className="py-3 text-gray-700 font-semibold">Description</TableHead>
                    <TableHead className="py-3 text-gray-700 font-semibold">Location</TableHead>
                    <TableHead className="py-3 text-gray-700 font-semibold">Status</TableHead>
                    <TableHead className="py-3 text-gray-700 font-semibold">Created</TableHead>
                    <TableHead className="w-[100px] py-3 text-gray-700 font-semibold text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentJobs.map((job) => (
                    <JobTableRow 
                      key={job.job_id} 
                      job={job} 
                      onEdit={handleEdit} 
                      onDelete={handleDelete} 
                      onStatusUpdated={handleStatusUpdated} 
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Cards for Mobile */}
            <div className="md:hidden space-y-4">
              {currentJobs.map((job) => (
                <JobTableRow 
                  key={job.job_id} 
                  job={job} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
                  onStatusUpdated={handleStatusUpdated} 
                />
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6">
                <div className="text-sm text-gray-600 mb-2 text-center">
                  Showing {startIndex + 1} to {endIndex} of {filteredJobs.length} results
                </div>
                <Pagination 
                  totalPages={totalPages} 
                  currentPage={currentPage} 
                  onPageChange={handlePageChange} 
                />
              </div>
            )}
          </>
        ) : (
          // Empty State
          <div className="text-center p-12 border rounded-lg bg-white shadow-sm">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              {jobs.length > 0 ? "No jobs match filters" : "No maintenance jobs found"}
            </h3>
            <p className="text-gray-600 mt-2">
              {jobs.length > 0
                ? "Try adjusting your filters or search term."
                : activePropertyId
                  ? "There are no maintenance requests for this property yet."
                  : "You haven't created any maintenance requests."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-4 justify-center">
              {jobs.length > 0 && filtersApplied() && (
                <Button onClick={handleClearFilters} variant="outline" size="sm">
                  Clear Filters
                </Button>
              )}
              <Button onClick={() => refreshJobs(true)} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh List
              </Button>
            </div>
          </div>
        )
      )}

      {/* Dialogs */}
      <EditDialog 
        isOpen={isEditDialogOpen} 
        onClose={() => setIsEditDialogOpen(false)} 
        job={selectedJob} 
        onSubmit={handleEditSubmit} 
        isSubmitting={isSubmitting} 
      />
      <DeleteDialog 
        isOpen={isDeleteDialogOpen} 
        onClose={() => setIsDeleteDialogOpen(false)} 
        onConfirm={handleDeleteConfirm} 
        isSubmitting={isSubmitting} 
      />
    </div>
  );

  // Helper function to check if any filters are active
  function filtersApplied() {
    return filters.search !== "" || filters.status !== "all" || filters.priority !== "all";
  }
};

export default MyJobs;