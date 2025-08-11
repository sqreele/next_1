import { Job, Property, JobStatus, Room } from "./types";
import { API_CONFIG } from "./config";
import { fixJobsImageUrls, fixJobImageUrls, sanitizeJobsData, sanitizeJobData } from "./utils/image-utils";

export class ApiError extends Error {
  status: number;
  errorData: any;

  constructor(status: number, message: string, errorData?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorData = errorData;
  }
}

export async function fetchWithToken<T>(
  url: string,
  token?: string,
  method: string = "GET",
  body?: any
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (method !== "GET" && body) {
    options.body = JSON.stringify(body);
  }

  // Handle relative URLs by making them absolute for server-side requests
  let absoluteUrl = url;
  if (url.startsWith('/')) {
    // For server-side requests, we need to use the Django backend directly
    absoluteUrl = `${API_CONFIG.baseUrl}${url}`;
  }

  console.log(`${method} ${absoluteUrl}`, options);

  try {
    const response = await fetch(absoluteUrl, options);
    const responseText = await response.text();

    console.log(
      "Response Status:",
      response.status,
      "Preview:",
      responseText.length > 200 ? responseText.substring(0, 200) + "..." : responseText
    );

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      let errorMessage = `Request failed with status ${response.status}`;
      let errorData = null;
      
      if (contentType?.includes("application/json") && responseText) {
        try {
          errorData = JSON.parse(responseText);
          errorMessage = errorData.detail || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error JSON:", parseError);
        }
      }
      
      throw new ApiError(response.status, errorMessage, errorData);
    }

    if (!responseText.trim()) {
      if (method === "GET" && absoluteUrl.includes("/api/jobs") && !absoluteUrl.includes("/my-jobs/")) {
        return [] as unknown as T;
      }
      throw new ApiError(204, "Received empty response from server");
    }

    try {
      return JSON.parse(responseText) as T;
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      throw new ApiError(
        500, 
        `Failed to parse response as JSON: ${responseText.substring(0, 200)}...`
      );
    }
  } catch (error) {
    console.error(`Error during ${method} request to ${absoluteUrl}:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, (error as Error).message || "Network error");
  }
}

export async function fetchProperties(accessToken?: string): Promise<Property[]> {
  return fetchWithToken<Property[]>(API_CONFIG.endpoints.properties, accessToken);
}

export async function fetchJobsForProperty(
  propertyId: string,
  accessToken?: string
): Promise<Job[]> {
  try {
    const jobs = await fetchWithToken<Job[]>(`${API_CONFIG.endpoints.jobs}?property=${propertyId}`, accessToken);
    console.log(`📋 Jobs fetched: { count: ${jobs.length} }`);
    const sanitizedJobs = sanitizeJobsData(jobs);
    return fixJobsImageUrls(sanitizedJobs);
  } catch (error) {
    console.error('Error in fetchJobsForProperty:', error);
    throw error;
  }
}

export async function fetchJobs(accessToken?: string): Promise<Job[]> {
  const jobs = await fetchWithToken<Job[]>( API_CONFIG.endpoints.jobs, accessToken);
  const sanitizedJobs = sanitizeJobsData(jobs);
  return fixJobsImageUrls(sanitizedJobs);
}

export async function fetchJob(jobId: string, accessToken?: string): Promise<Job | null> {
  try {
    const job = await fetchWithToken<Job>(`${API_CONFIG.endpoints.jobs}${jobId}/`, accessToken);
    const sanitizedJob = sanitizeJobData(job);
    return fixJobImageUrls(sanitizedJob);
  } catch (error) {
    console.error(`Error fetching job ${jobId}:`, error);
    return null;
  }
}

export async function updateJob(
  jobId: string,
  jobData: Partial<Job>,
  accessToken?: string
): Promise<Job> {
  return fetchWithToken<Job>(`${API_CONFIG.endpoints.jobs}${jobId}/`, accessToken, "PATCH", jobData);
}

export async function deleteJob(jobId: string, accessToken?: string): Promise<void> {
  await fetchWithToken<void>(`${API_CONFIG.endpoints.jobs}${jobId}/`, accessToken, "DELETE");
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  accessToken?: string
): Promise<Job> {
  return fetchWithToken<Job>(`${API_CONFIG.endpoints.jobs}${jobId}/`, accessToken, "PATCH", { status });
}

export async function fetchMyJobs(accessToken?: string): Promise<Job[]> {
  const jobs = await fetchWithToken<Job[]>(`${API_CONFIG.endpoints.jobs}my-jobs/`, accessToken);
  const sanitizedJobs = sanitizeJobsData(jobs);
  return fixJobsImageUrls(sanitizedJobs);
}

export async function fetchRoom(roomId: string, accessToken?: string): Promise<Room | null> {
  try {
    return await fetchWithToken<Room>(`${API_CONFIG.endpoints.rooms}${roomId}/`, accessToken);
  } catch (error) {
    console.error(`Error fetching room ${roomId}:`, error);
    return null;
  }
}

export async function fetchJobsForRoom(roomId: string, accessToken?: string): Promise<Job[]> {
  const jobs = await fetchWithToken<Job[]>(`${API_CONFIG.endpoints.jobs}?room=${roomId}`, accessToken);
  const sanitizedJobs = sanitizeJobsData(jobs);
  return fixJobsImageUrls(sanitizedJobs);
}