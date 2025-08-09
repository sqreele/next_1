"use client";

import React, { useState } from 'react';
import { usePreventiveMaintenanceJobs } from '@/app/lib/hooks/usePreventiveMaintenanceJobs';
import { Job } from '@/app/lib/types';
import Link from 'next/link';

interface PreventiveMaintenanceListProps {
  propertyId: string;
  limit?: number;
}

export default function PreventiveMaintenanceList({ 
  propertyId,
  limit = 10
}: PreventiveMaintenanceListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { 
    jobs, 
    isLoading, 
    error, 
    loadJobs, 
    getStats 
  } = usePreventiveMaintenanceJobs({
    propertyId,
    limit,
    autoLoad: true,
    isPM: true // Explicitly set to filter preventive maintenance jobs
  });

  const stats = getStats();

  // Filter jobs by status if a filter is selected
  const filteredJobs = statusFilter === 'all' 
    ? jobs 
    : jobs.filter(job => job.status === statusFilter);

  // Get unique statuses from jobs for filter options
  const uniqueStatuses = Array.from(new Set(jobs.map(job => job.status)));

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mr-2"></div>
        <span>Loading preventive maintenance jobs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 mb-3">{error}</p>
        <button 
          onClick={() => loadJobs(true)} // Force refresh
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-700 mb-2 font-medium">No preventive maintenance jobs found</p>
        <p className="text-blue-600 text-sm mb-4">
          No preventive maintenance jobs found for this property.
        </p>
        <Link 
          href="/dashboard/createJob"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors inline-block"
        >
          Create New Job
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
          <h2 className="text-xl font-bold">Preventive Maintenance Summary</h2>
          <div className="mt-2 sm:mt-0 flex items-center">
            <select 
              className="mr-2 px-2 py-1 border rounded text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </select>
            <button 
              onClick={() => loadJobs(true)}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
          <div className="p-3 bg-gray-100 rounded">
            <div className="text-sm text-gray-500">Total Jobs</div>
            <div className="text-xl font-bold">{stats.total}</div>
          </div>
          <div className="p-3 bg-blue-100 rounded">
            <div className="text-sm text-blue-500">Active</div>
            <div className="text-xl font-bold">{stats.active}</div>
          </div>
          <div className="p-3 bg-green-100 rounded">
            <div className="text-sm text-green-500">Completed</div>
            <div className="text-xl font-bold">{stats.completed}</div>
          </div>
          <div className="p-3 bg-purple-100 rounded">
            <div className="text-sm text-purple-500">Completion Rate</div>
            <div className="text-xl font-bold">{stats.completionRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold">Preventive Maintenance Jobs</h2>
        <span className="text-sm text-gray-500">
          {statusFilter !== 'all' ? `Showing ${filteredJobs.length} of ${jobs.length} jobs` : `${jobs.length} jobs`}
        </span>
      </div>
      
      <div className="space-y-3">
        {filteredJobs.map((job: Job) => (
          <Link 
            href={`/dashboard/jobs/${job.job_id}`}
            key={job.job_id} 
            className="block border p-4 rounded shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between">
              <h3 className="font-medium">{job.job_id.substring(0, 10)}...</h3>
              <span className={`px-2 py-1 rounded text-xs ${
                job.status === 'completed' ? 'bg-green-100 text-green-800' :
                job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                job.status === 'waiting_sparepart' ? 'bg-purple-100 text-purple-800' :
                job.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {job.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{job.description || "No description"}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>Created: {formatDate(job.created_at)}</span>
              {job.completed_at && (
                <span>Completed: {formatDate(job.completed_at)}</span>
              )}
              {job.priority && (
                <span className={`${
                  job.priority === 'high' ? 'text-red-600' :
                  job.priority === 'medium' ? 'text-amber-600' :
                  'text-green-600'
                }`}>
                  Priority: {job.priority}
                </span>
              )}
              {job.rooms && job.rooms.length > 0 && (
                <span>Room: {job.rooms[0].name}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
      
      {filteredJobs.length === 0 && (
        <div className="p-8 text-center bg-gray-50 rounded-lg border">
          <p className="text-gray-500 mb-2">No jobs found with status: {statusFilter}</p>
          <button
            onClick={() => setStatusFilter('all')}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            Show All Jobs
          </button>
        </div>
      )}
    </div>
  );
}

// Helper function to format dates
function formatDate(dateString: string): string {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  return date.toLocaleDateString();
}