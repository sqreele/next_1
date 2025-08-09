// ./app/lib/data.ts
"use client"; // Keep if needed, but data fetching logic often doesn't need it directly

import axios, { AxiosError } from 'axios';
// Assuming apiClient handles auth headers automatically
import apiClient, { fetchData, postData, updateData, deleteData, patchData } from '@/app/lib/api-client';
import {
  Job,
  JobStatus,
  Property,
  Topic,
  Room,
  FilterState,
  TabValue,
  SearchCriteria,
  SearchResponse,
  DRFErrorResponse
} from './types'; // Ensure types path is correct

// Interface for structured API errors
interface ApiError extends Error {
  status?: number;
  details?: Record<string, string | string[]>; // Matches handleApiError output
}

// --- Job Functions ---

export const fetchJobsForProperty = async (propertyId: string): Promise<Job[]> => {
  try {
    if (!propertyId) throw new Error('Property ID is required');
    // Use the generic fetchData from api-client
    const response = await fetchData<Job[]>(`/api/jobs/?property=${propertyId}`);
    return response ?? []; // Return empty array if response is null/undefined
  } catch (error) {
    // Log the error but return empty array for graceful handling in UI
    console.error(`Error fetching jobs for property ${propertyId}:`, error);
    // Or re-throw using handleApiError if you want the hook to catch it
    // throw handleApiError(error);
    return [];
  }
};

export const createJob = async (jobData: Partial<Job>): Promise<Job> => {
  try {
    if (!jobData) throw new Error('Job data is required');
    // Pass data type and expected return type to postData
    return await postData<Job, Partial<Job>>('/api/jobs/', jobData);
  } catch (error) {
    throw handleApiError(error); // Propagate structured error
  }
};

export const updateJob = async (jobId: string, jobData: Partial<Job>): Promise<Job> => {
  try {
    if (!jobId) throw new Error('Job ID is required');
    // Pass data type and expected return type to updateData
    return await updateData<Job, Partial<Job>>(`/api/jobs/${jobId}/`, jobData);
  } catch (error) {
    throw handleApiError(error);
  }
};

export const deleteJob = async (jobId: string): Promise<void> => {
  try {
    if (!jobId) throw new Error('Job ID is required');
    // No type parameters needed if deleteData doesn't return specific content
    await deleteData(`/api/jobs/${jobId}/`);
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateJobStatus = async (jobId: string, status: JobStatus): Promise<Job> => {
  try {
    if (!jobId) throw new Error('Job ID is required');
    // Pass data type and expected return type to patchData
    return await patchData<Job, { status: JobStatus }>(`/api/jobs/${jobId}/`, { status });
  } catch (error) {
    throw handleApiError(error);
  }
};

export const uploadJobImage = async (jobId: string, imageFile: File): Promise<{ image_url: string }> => {
  if (!jobId || !imageFile) throw new Error('Job ID and image file are required');

  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('job_id', jobId); // Does the backend need job_id in form data? Check API spec.

  try {
    // Assuming apiClient is an Axios instance configured for auth
    const response = await apiClient.post(`/api/jobs/${jobId}/images/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        // Auth header should be added by apiClient interceptor
      },
    });
    return response.data ?? { image_url: '' }; // Return empty string if no URL
  } catch (error) {
    throw handleApiError(error);
  }
};

export const searchJobs = async (
  filters: Partial<FilterState>,
  tab: TabValue = 'all',
  page = 1,
  limit = 10
): Promise<{
  jobs: Job[];
  totalPages: number;
  currentPage: number;
  totalJobs: number;
}> => {
  try {
    // Build query parameters based on filters
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (tab !== 'all') {
      if (tab === 'defect') params.is_defective = 'true';
      else params.status = tab; // Assumes tab values match JobStatus enum/type
    }

    // Add other filters if they exist
    if (filters.user) params.user = filters.user;
if (filters.priority) params.priority = filters.priority;
if (filters.topic) params.topic = filters.topic.toString(); // Assuming filter state has topic ID
if (filters.room) params.room = filters.room.toString();    // Assuming filter state has room ID
if (filters.dateRange?.from) params.date_from = filters.dateRange.from.toISOString().split('T')[0];
if (filters.dateRange?.to) params.date_to = filters.dateRange.to.toISOString().split('T')[0];
if (filters.search) params.search = filters.search;

    const queryString = new URLSearchParams(params).toString();
    // Define expected response structure for type safety
    type SearchJobsResponse = {
      results: Job[];
      count: number;
      // Add other potential pagination fields like 'next', 'previous' if needed
    };
    const response = await fetchData<SearchJobsResponse>(`/api/jobs/?${queryString}`);

    return {
      jobs: response?.results ?? [],
      totalJobs: response?.count ?? 0,
      totalPages: Math.ceil((response?.count ?? 0) / limit),
      currentPage: page
    };
  } catch (error) {
    console.error('Error searching jobs:', error);
    // Return default structure on error
    return { jobs: [], totalJobs: 0, totalPages: 0, currentPage: 1 };
  }
};

export const fetchJobs = async (): Promise<Job[]> => {
  try {
    const response = await fetchData<Job[]>("/api/jobs/");
    return response ?? [];
  } catch (error) {
    console.error("Error fetching all jobs:", error);
    // throw handleApiError(error); // Or re-throw
     return [];
  }
};

export const fetchJob = async (jobId: string): Promise<Job | null> => {
  try {
    if (!jobId) throw new Error('Job ID is required');
    const response = await fetchData<Job>(`/api/jobs/${jobId}/`);
    return response ?? null;
  } catch (error) {
    console.error(`Error fetching job ${jobId}:`, error);
     // throw handleApiError(error); // Or re-throw
    return null;
  }
};


// --- Property Functions ---

export const fetchProperties = async (): Promise<Property[]> => {
    try {
        const response = await fetchData<Property[]>('/api/properties/');
        return response ?? [];
    } catch (error) {
        console.error('Error fetching properties:', error);
        return [];
    }
};

export const fetchProperty = async (propertyId: string): Promise<Property | null> => {
    try {
        if (!propertyId) throw new Error('Property ID is required');
        return await fetchData<Property>(`/api/properties/${propertyId}/`);
    } catch (error) {
        console.error(`Error fetching property ${propertyId}:`, error);
        return null;
    }
};


// --- Topic & Room Functions ---

export const fetchTopics = async (): Promise<Topic[]> => {
  try {
    const response = await fetchData<Topic[]>('/api/topics/');
    return response ?? [];
  } catch (error) {
    console.error('Error fetching topics:', error);
    return [];
  }
};

export const fetchRooms = async (propertyId: string): Promise<Room[]> => {
  try {
    if (!propertyId) throw new Error('Property ID is required');
    const response = await fetchData<Room[]>(`/api/rooms/?property=${propertyId}`);
    return response ?? [];
  } catch (error) {
    console.error(`Error fetching rooms for property ${propertyId}:`, error);
    return [];
  }
};

export const fetchRoom = async (roomId: string): Promise<Room | null> => {
    try {
        if (!roomId) throw new Error('Room ID is required');
        return await fetchData<Room>(`/api/rooms/${roomId}/`);
    } catch (error) {
        console.error(`Error fetching room ${roomId}:`, error);
        return null;
    }
};


// --- Search All Function ---

export const searchAll = async (criteria: SearchCriteria): Promise<SearchResponse> => {
  try {
    const params = new URLSearchParams();
    // Build query parameters safely
    if (criteria.query) params.append('q', criteria.query);
    if (criteria.category && criteria.category !== 'All') params.append('category', criteria.category);
    if (criteria.status) params.append('status', criteria.status);
    if (criteria.dateRange?.start) params.append('date_from', criteria.dateRange.start); // Assuming YYYY-MM-DD format
    if (criteria.dateRange?.end) params.append('date_to', criteria.dateRange.end);       // Assuming YYYY-MM-DD format
    if (criteria.page) params.append('page', String(criteria.page));
    if (criteria.pageSize) params.append('limit', String(criteria.pageSize));

    const response = await fetchData<SearchResponse>(`/api/search/?${params.toString()}`);
    // Ensure response structure matches SearchResponse type
    return response ?? { jobs: [], properties: [], totalCount: 0 };
  } catch (error) {
    console.error('Error performing search:', error);
    return {
      jobs: [],
      properties: [],
      totalCount: 0,
      error: error instanceof Error ? error.message : 'Search failed' // Include error message
    };
  }
};

// ... (imports อื่นๆ ข้างบน)

export const fetchPreventiveMaintenanceJobs = async (options?: {
  propertyId?: string;
  status?: JobStatus;
  limit?: number;
}): Promise<Job[]> => {
  try {
    const params = new URLSearchParams();
    params.append('is_preventivemaintenance', 'true');
    if (options?.propertyId) params.append('property', options.propertyId);
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await fetchData<Job[]>(`/api/jobs/?${params.toString()}`);
    return response ?? [];
  } catch (error) {
    throw handleApiError(error);
  }
};

// --- Error Handling ---
const handleApiError = (error: unknown): never => {
  // Check if it's an Axios error
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<DRFErrorResponse>; // Type assertion for DRF structure
    const apiError: ApiError = new Error('API request failed'); // Base error message
    apiError.status = axiosError.response?.status; // Get HTTP status

    const errorData = axiosError.response?.data; // Get response data (potentially DRF error details)

    if (errorData) {
        // Try to extract DRF's 'detail' message first
        if (typeof errorData.detail === 'string') {
            apiError.message = errorData.detail;
        } else {
             // If no 'detail', combine other field errors (common in validation errors)
             const fieldErrors = Object.entries(errorData)
                // Filter out non-string/non-array values just in case
                .filter(([key, value]) => typeof value === 'string' || Array.isArray(value))
                .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                .join('; ');

            if (fieldErrors) {
                 apiError.message = `Validation Failed: ${fieldErrors}`;
            } else if (axiosError.message) {
                 // Fallback to Axios's own error message if no specific details found
                 apiError.message = axiosError.message;
            }
        }
        // Store the detailed error structure if needed for complex UI feedback
        // Clean the data structure slightly for easier use
         const cleanedDetails: Record<string, string | string[]> = {};
         Object.keys(errorData).forEach((key) => {
            const value = errorData[key];
            if (value !== undefined && value !== null) { // Check for null as well
                 cleanedDetails[key] = value;
            }
         });
        apiError.details = cleanedDetails;

    } else if (axiosError.request) {
         // The request was made but no response was received
         apiError.message = 'No response received from server. Check network connection or server status.';
    } else {
         // Something happened in setting up the request that triggered an Error
         apiError.message = axiosError.message || 'Error setting up API request.';
    }
    throw apiError; // Throw the structured ApiError
  }

  // If it's not an Axios error, re-throw it or wrap it
  if (error instanceof Error) {
    throw error; // Re-throw standard errors
  } else {
    throw new Error('An unknown error occurred'); // Wrap unknown errors
  }
};
