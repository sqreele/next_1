'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePreventiveMaintenanceJobs } from '@/app/lib/hooks/usePreventiveMaintenanceJobs';
import { Job } from '@/app/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart4,
  Wrench,
  FileText,
  ArrowUpRight,
  Filter,
  RefreshCw,
  ChevronDown,
  Bell
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/app/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/app/components/ui/pagination";

interface PreventiveMaintenanceDashboardProps {
  propertyId: string;
  limit?: number;
}

export default function PreventiveMaintenanceDashboard({
  propertyId,
  limit = 10
}: PreventiveMaintenanceDashboardProps) {
  // State for the active tab and filters
  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Get jobs using the hook
  const {
    jobs,
    isLoading,
    error,
    loadJobs,
    getStats,
    lastLoadTime
  } = usePreventiveMaintenanceJobs({
    propertyId,
    limit,
    autoLoad: true,
    isPM: true // Filter for preventive maintenance jobs
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, timeRangeFilter, activeTab]);

  const stats = getStats();

  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  // Apply filters to the jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Filter by status
      if (statusFilter !== 'all' && job.status !== statusFilter) {
        return false;
      }

      // Filter by priority
      if (priorityFilter !== 'all' && job.priority !== priorityFilter) {
        return false;
      }
      
      // Filter by time range
      if (timeRangeFilter !== 'all') {
        const jobDate = new Date(job.created_at);
        const now = new Date();
        
        switch (timeRangeFilter) {
          case 'today':
            return jobDate.toDateString() === now.toDateString();
          case 'week':
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(now.getDate() - 7);
            return jobDate >= oneWeekAgo;
          case 'month':
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(now.getMonth() - 1);
            return jobDate >= oneMonthAgo;
          default:
            return true;
        }
      }
      
      return true;
    });
  }, [jobs, statusFilter, priorityFilter, timeRangeFilter]);

  // Group jobs by status for tab filtering
  const jobsByStatus = useMemo(() => ({
    pending: filteredJobs.filter(job => job.status === 'pending'),
    in_progress: filteredJobs.filter(job => job.status === 'in_progress'),
    completed: filteredJobs.filter(job => job.status === 'completed'),
    waiting_sparepart: filteredJobs.filter(job => job.status === 'waiting_sparepart'),
    cancelled: filteredJobs.filter(job => job.status === 'cancelled'),
    is_PM: filteredJobs.filter(job => job.is_preventivemaintenance === true)
  }), [filteredJobs]);

  // Calculate upcoming maintenance in the next 30 days
  const upcomingMaintenance = useMemo(() => {
    // Filter jobs in pending state - these are considered "upcoming"
    return jobs.filter(job => job.status === 'pending');
  }, [jobs]);

  // Reset filters function
  const resetFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setTimeRangeFilter('all');
  };

  // Get available statuses and priorities from jobs
  const availableStatuses = useMemo(() =>
    Array.from(new Set(jobs.map(job => job.status))),
    [jobs]
  );

  const availablePriorities = useMemo(() =>
    Array.from(new Set(jobs.filter(job => job.priority).map(job => job.priority))),
    [jobs]
  );

  // Get jobs to display based on active tab
  const displayJobs = activeTab === 'overview'
    ? filteredJobs
    : jobsByStatus[activeTab as keyof typeof jobsByStatus] || [];

  // Pagination logic
  const totalPages = Math.ceil(displayJobs.length / itemsPerPage);
  const paginatedJobs = displayJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
            <p className="text-gray-500">Loading preventive maintenance data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Error Loading Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => loadJobs(true)} // Force refresh
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Empty state
  if (jobs.length === 0) {
    return (
      <Card className="w-full border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-700">No Preventive Maintenance Jobs</CardTitle>
          <CardDescription className="text-blue-600">
            No preventive maintenance jobs found for this property.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Wrench className="h-16 w-16 text-blue-300" />
          </div>
          <p className="text-center text-blue-600">
            Preventive maintenance helps keep your property in good condition and prevents costly repairs.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link href="/dashboard/createJob">
              Create Preventive Maintenance Job
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-xl md:text-2xl">Preventive Maintenance Dashboard</CardTitle>
              <CardDescription>
                Maintenance overview for {currentMonth} {currentYear}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadJobs(true)}
                      className="flex items-center gap-1"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span className="hidden md:inline">Refresh</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Last refreshed: {lastLoadTime ? formatTime(lastLoadTime) : 'Never'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button 
                size="sm" 
                variant={showFilters ? "secondary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden md:inline">Filters</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
              
              <Button asChild size="sm">
                <Link href="/dashboard/createJob">
                  Create Job
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Filters panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <Select 
                  value={statusFilter} 
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {availableStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block">Priority</label>
                <Select 
                  value={priorityFilter} 
                  onValueChange={setPriorityFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {availablePriorities.map(priority => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block">Time Range</label>
                <Select 
                  value={timeRangeFilter} 
                  onValueChange={setTimeRangeFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-3 flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetFilters}
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gray-50 border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Jobs</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Wrench className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-500">Active</p>
                    <p className="text-2xl font-bold text-blue-700">{stats.active}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-500">Completed</p>
                    <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-500">Completion Rate</p>
                    <p className="text-2xl font-bold text-purple-700">{stats.completionRate.toFixed(1)}%</p>
                  </div>
                  <BarChart4 className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Upcoming maintenance alert - show only if there are pending tasks */}
          {upcomingMaintenance.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start">
              <Bell className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-amber-700">Pending Preventive Maintenance</h3>
                <p className="text-sm text-amber-600 mb-2">
                  You have {upcomingMaintenance.length} pending maintenance {upcomingMaintenance.length === 1 ? 'task' : 'tasks'} that require attention.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200"
                  onClick={() => {
                    setStatusFilter('pending');
                    setActiveTab('pending');
                  }}
                >
                  View Pending Tasks
                </Button>
              </div>
            </div>
          )}
          
          {/* Tabs section */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 md:grid-cols-6 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="is_PM">{`PM (${jobsByStatus.is_PM.length})`}</TabsTrigger>
              <TabsTrigger value="pending">{`Pending (${jobsByStatus.pending.length})`}</TabsTrigger>
              <TabsTrigger value="in_progress">{`In Progress (${jobsByStatus.in_progress.length})`}</TabsTrigger>
              <TabsTrigger value="completed">{`Completed (${jobsByStatus.completed.length})`}</TabsTrigger>
              <TabsTrigger value="waiting_sparepart" className="hidden md:block">{`Waiting Parts (${jobsByStatus.waiting_sparepart.length})`}</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                  {activeTab === 'overview' 
                    ? 'All Preventive Maintenance Jobs' 
                    : activeTab === 'is_PM'
                      ? 'Preventive Maintenance Tasks'
                      : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('_', ' ')} Maintenance Tasks`}
                </h3>
                {filteredJobs.length !== jobs.length && (
                  <div className="text-sm text-gray-500">
                    Showing {filteredJobs.length} of {jobs.length} jobs
                  </div>
                )}
              </div>
              
              {/* Job cards or empty state */}
              {paginatedJobs.length > 0 ? (
                <div className="space-y-4">
                  {paginatedJobs.map((job) => (
                    <JobCard key={job.job_id} job={job} />
                  ))}
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Pagination className="mt-6">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNumber;
                          
                          // Logic to show appropriate page numbers
                          if (totalPages <= 5) {
                            pageNumber = i + 1;
                          } else if (currentPage <= 3) {
                            pageNumber = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNumber = totalPages - 4 + i;
                          } else {
                            pageNumber = currentPage - 2 + i;
                          }
                          
                          if (pageNumber > 0 && pageNumber <= totalPages) {
                            return (
                              <PaginationItem key={pageNumber}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(pageNumber)}
                                  isActive={currentPage === pageNumber}
                                >
                                  {pageNumber}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                          return null;
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border">
                  <AlertTriangle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 mb-2">No jobs match the current filters</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={resetFilters}
                  >
                    Reset Filters
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="border-t pt-6 flex justify-between flex-wrap gap-2">
          <div className="text-sm text-gray-500">
            {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found
          </div>
          <div>
            <Button variant="outline" className="mr-2" onClick={() => loadJobs(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            <Button asChild>
              <Link href="/dashboard/createJob">
                Create Maintenance Job
              </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

// Enhanced Job Card Component
function JobCard({ job }: { job: Job }) {
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'waiting_sparepart': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-amber-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  // Format room names if available
  const roomNames = job.rooms && job.rooms.length > 0
    ? job.rooms.map(room => room.name).join(', ')
    : 'No room specified';

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden">
      {/* Status indicator bar */}
      <div className={cn("h-1",
        job.status === 'completed' ? 'bg-green-500' :
        job.status === 'in_progress' ? 'bg-blue-500' :
        job.status === 'pending' ? 'bg-yellow-500' :
        job.status === 'waiting_sparepart' ? 'bg-purple-500' :
        job.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
      )} />

      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h4 className="font-medium">
                Job #{job.job_id.substring(0, 8)}...
              </h4>
              <Badge className={cn("capitalize", getStatusColor(job.status))}>
                {job.status.replace('_', ' ')}
              </Badge>
              {job.priority && (
                <Badge variant="outline" className={cn(getPriorityColor(job.priority))}>
                  {job.priority}
                </Badge>
              )}
              {job.is_preventivemaintenance && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  PM
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-gray-700 line-clamp-2">
              {job.description || "No description provided"}
            </p>
            
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span className="flex items-center">
                <Calendar className="mr-1 h-3.5 w-3.5" />
                Created: {formatDate(job.created_at)}
              </span>
              
              {job.completed_at && (
                <span className="flex items-center">
                  <CheckCircle className="mr-1 h-3.5 w-3.5 text-green-500" />
                  Completed: {formatDate(job.completed_at)}
                </span>
              )}
              
              <span className="flex items-center truncate max-w-[180px]" title={roomNames}>
                <Wrench className="mr-1 h-3.5 w-3.5" />
                {roomNames}
              </span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="sm:self-start mt-2 sm:mt-0 shrink-0">
                <FileText className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Actions</span>
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/jobs/${job.job_id}`} className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/jobs/${job.job_id}/edit`} className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  Edit Job
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link 
                  href={`/dashboard/jobs/new?duplicate=${job.job_id}`}
                  className="flex items-center"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Duplicate Job
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to format dates
function formatDate(dateString: string): string {
  if (!dateString) return 'Unknown';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Helper function to format times
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}