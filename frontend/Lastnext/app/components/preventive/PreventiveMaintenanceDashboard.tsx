'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePreventiveMaintenance } from '@/app/lib/PreventiveContext'; // Fixed import path
import { PreventiveMaintenance } from '@/app/lib/preventiveMaintenanceModels';

// Define interface for frequency distribution item
interface FrequencyDistributionItem {
  name: string;
  value: number;
}

// Helper function to get image URL
const getImageUrl = (image: any): string | null => {
  if (!image) return null;
  
  // First try to get direct URL property
  if (typeof image === 'object' && 'image_url' in image && image.image_url) {
    return image.image_url;
  }
  
  // If no direct URL but we have an ID, construct URL
  if (typeof image === 'object' && 'id' in image && image.id) {
    return `/api/images/${image.id}`;
  }
  
  // If image is just a string URL
  if (typeof image === 'string') {
    return image;
  }
  
  return null;
};

// Helper function to determine PM status
const determinePMStatus = (item: PreventiveMaintenance): string => {
  // If status is already set, return it
  if (item.status) {
    return item.status;
  }
  
  // Get current date
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Check if completed
  if (item.completed_date) {
    return 'completed';
  }
  
  // Check if scheduled date is in the past
  if (item.scheduled_date) {
    const scheduledDate = new Date(item.scheduled_date);
    if (scheduledDate < today) {
      return 'overdue';
    }
  }
  
  // Default to pending
  return 'pending';
};

export default function PreventiveMaintenanceDashboard() {
  // Use our context hook to access all maintenance data and actions
  const { 
    statistics, 
    isLoading, 
    error,
    fetchStatistics 
  } = usePreventiveMaintenance();

  // Fetch stats on component mount
  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // Format date
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get completion rate percentage
  const getCompletionRate = (): number => {
    if (!statistics?.counts?.total) return 0;
    return Math.round((statistics.counts.completed / statistics.counts.total) * 100);
  };

  // Status badge styling
  const getStatusBadge = (status: string): string => {
    switch (status) {
      case 'completed':
        return "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium";
      case 'overdue':
        return "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium";
      default:
        return "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium";
    }
  };

  // Get maintenance title with fallback
  const getMaintenanceTitle = (item: PreventiveMaintenance): string => {
    return item.pmtitle || `Maintenance #${item.pm_id}`;
  };
  
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link 
          href="/preventive-maintenance" 
          className="bg-gray-100 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-200"
        >
          View All Maintenance Tasks
        </Link>
      </div>
    );
  }

  // If statistics is null, show a no data message
  if (!statistics || !statistics.counts) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-10">
          <p className="text-lg text-gray-500">No maintenance data available.</p>
          <Link 
            href="/dashboard/preventive-maintenance/create" 
            className="mt-4 inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Create Your First Maintenance Task
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Preventive Maintenance Dashboard</h1>
        <div className="flex space-x-3">
          <Link 
            href="/preventive-maintenance" 
            className="bg-gray-100 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-200"
          >
            View All Tasks
          </Link>
          <Link 
            href="/preventive-maintenance/create" 
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Create New
          </Link>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900">{statistics.counts.total}</p>
            </div>
          </div>
        </div>
        
        {/* Pending */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-3xl font-bold text-gray-900">{statistics.counts.pending}</p>
            </div>
          </div>
        </div>
        
        {/* Overdue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-3xl font-bold text-red-600">{statistics.counts.overdue}</p>
            </div>
          </div>
        </div>
        
        {/* Completed */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-3xl font-bold text-green-600">{statistics.counts.completed}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Completion Progress */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Completion Rate</h2>
        <div className="flex items-center mb-2">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-green-600 h-4 rounded-full" 
              style={{ width: `${getCompletionRate()}%` }}
            ></div>
          </div>
          <span className="ml-4 text-xl font-bold">{getCompletionRate()}%</span>
        </div>
        <p className="text-sm text-gray-500">
          {statistics.counts.completed} of {statistics.counts.total} maintenance tasks completed
        </p>
      </div>
      
      {/* Frequency Distribution - Updated to match the data structure */}
      {statistics.frequency_distribution && statistics.frequency_distribution.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Maintenance Frequency Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statistics.frequency_distribution.map((item: FrequencyDistributionItem) => (
              <div key={item.name} className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-gray-900">{item.value}</p>
                <p className="text-sm font-medium text-gray-500 capitalize">
                  {item.name.replace('_', ' ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Upcoming Maintenance */}
      {statistics.upcoming && statistics.upcoming.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-700">Upcoming Maintenance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scheduled Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Due Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Images
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statistics.upcoming.map((item: PreventiveMaintenance) => {
                  // Determine PM status
                  const status = item.status || determinePMStatus(item);
                  
                  // Get maintenance title
                  const title = getMaintenanceTitle(item);
                  
                  // Get image URLs
                  const beforeImageUrl = item.before_image_url || (item.before_image ? getImageUrl(item.before_image) : null);
                  const afterImageUrl = item.after_image_url || (item.after_image ? getImageUrl(item.after_image) : null);
                  
                  return (
                    <tr key={item.pm_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-blue-600">{item.pm_id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm truncate max-w-[200px]">
                          {title}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatDate(item.scheduled_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatDate(item.next_due_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(status)}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          {beforeImageUrl && (
                            <div className="h-10 w-10 rounded overflow-hidden border">
                              <img 
                                src={beforeImageUrl} 
                                alt="Before" 
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          {afterImageUrl && (
                            <div className="h-10 w-10 rounded overflow-hidden border">
                              <img 
                                src={afterImageUrl} 
                                alt="After" 
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          {!beforeImageUrl && !afterImageUrl && (
                            <span className="text-xs text-gray-500">No images</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link 
                            href={`/preventive-maintenance/${item.pm_id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </Link>
                          {status !== 'completed' && (
                            <Link 
                              href={`/preventive-maintenance/${item.pm_id}/edit?complete=true`}
                              className="text-green-600 hover:text-green-900"
                            >
                              Complete
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Quick Access */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            href="/preventive-maintenance/create"
            className="flex items-center p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300"
          >
            <div className="p-2 rounded-full bg-blue-100 text-blue-600 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <span>Create New Task</span>
          </Link>
          
          <Link 
            href="/preventive-maintenance?status=overdue"
            className="flex items-center p-4 border rounded-lg hover:bg-red-50 hover:border-red-300"
          >
            <div className="p-2 rounded-full bg-red-100 text-red-600 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span>View Overdue Tasks</span>
          </Link>
          
          <Link 
            href="/preventive-maintenance?status=pending"
            className="flex items-center p-4 border rounded-lg hover:bg-yellow-50 hover:border-yellow-300"
          >
            <div className="p-2 rounded-full bg-yellow-100 text-yellow-600 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span>View Pending Tasks</span>
          </Link>
        </div>
      </div>
    </div>
  );
}