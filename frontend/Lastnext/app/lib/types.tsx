import { DateRange } from "react-day-picker";
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string | null;
      profile_image: string | null;
      positions: string;
      properties: Property[];
      accessToken: string;
      refreshToken: string;
      accessTokenExpires?: number;
      sessionToken?: string;
      created_at: string;
      error?: string;
    };
    expires: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    email: string | null;
    profile_image: string | null;
    positions: string;
    properties: Property[];
    accessToken: string;
    refreshToken: string;
    accessTokenExpires?: number;
    created_at?: string;
    error?: string;
    iat?: number;
    exp?: number;
    jti?: string;
  }
}

export interface User {
  id: string;
  username: string;
  email: string | null;
  profile_image: string | null;
  positions: string;
  properties: Property[];
  accessToken: string;
  refreshToken: string;
  accessTokenExpires?: number;
  sessionToken?: string;
  users?: number[];
  created_at: string;
}

export interface ProfileImage {
  profile_image: string | null;
  properties: Property[];
}

export interface UserProfile {
  id: string;
  user?: string;
  username: string;
  email: string | null;
  profile_image: string | null;
  positions: string;
  properties: Property[];
  created_at: string;

}

export interface UserContextType {
  userProfile: UserProfile | null;
  selectedProperty: string | null;
  setSelectedProperty: (propertyId: string | null) => void;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<UserProfile | null>;
}

export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'waiting_sparepart';
export type JobPriority = 'low' | 'medium' | 'high';

export interface JobImage {
  id: number;
  image_url: string;
  uploaded_by?: number | string | User | null;
  uploaded_at: string;
}

export interface Topic {
  id: number;
  title: string;
  description: string | null;
}

export interface TopicFromAPI {
  id: number;
  title: string;
  description: string | null;
}

export interface Room {
  room_id: number;
  name: string;
  room_type: string;
  is_active: boolean;
  created_at: string;
  properties?: (number | string | Property)[];
  property_id?: string | number | null;
}

export interface Job {
  id: number;
  job_id: string;
  description: string;
  status: JobStatus;
  priority: JobPriority;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  user: number | string | User;
  updated_by?: number | string | User | null;
  profile_image?: ProfileImage | null;
  images?: JobImage[];
  topics?: Topic[];
  rooms?: Room[];
  property_id?: string | number;
  properties?: Array<string | number | { property_id?: string | number; id?: string | number }>; // Added
  remarks?: string | undefined | null;
  is_defective?: boolean;
  image_urls?: string[];
  is_preventivemaintenance?: boolean;
}

export interface Property {
  property_id: string;
  name: string;
  description: string | null;
  created_at: string;
  rooms?: Room[];
  id: string;
  
}

export interface JobCardProps {
  job: Job;
}

export interface JobListProps {
  jobs: Job[];
}

export interface PaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export interface UserFilterProps {
  users: (string | { id: string; username: string })[];
  selectedUser: string | null;
  onSelectUser: (user: string | null) => void;
}

export type TabValue = 'all' | 'waiting_sparepart' | 'pending' | 'completed' | 'cancelled' | 'defect' | 'preventive_maintenance';
export type SortOrder = 'Newest first' | 'Oldest first';

export interface FilterState {
  search: string;
  status: JobStatus | "all";
  priority: JobPriority | "all";
  dateRange?: DateRange;
  is_preventivemaintenance?: boolean | null;
  is_defective?: boolean | null;
  user?: string | null;
  topic?: string | number | null;
  room?: string | number | null;
  property?: string | number | null;
}

export interface SortState {
  field: 'created_at' | 'updated_at' | 'completed_at' | 'priority' | 'status';
  direction: 'asc' | 'desc';
}

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface JobsPDFProps {
  jobs: Job[];
  filter: TabValue;
}

export const STATUS_COLORS: Record<JobStatus, string> = {
  pending: '#FFA500',
  waiting_sparepart: '#87CEEB',
  completed: '#008000',
  cancelled: '#FF0000',
  in_progress: '#9B59B6',
};

export const FILTER_TITLES: Record<TabValue, string> = {
  all: 'All Jobs Report',
  waiting_sparepart: 'Waiting Parts Report',
  pending: 'Pending Jobs Report',
  completed: 'Completed Jobs Report',
  cancelled: 'Cancelled Jobs Report',
  defect: 'Defective Jobs Report',
  preventive_maintenance: 'Preventive Maintenance Report',
};

export const PRIORITY_COLORS: Record<JobPriority, string> = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
};

export const PRIORITY_VARIANTS = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
  default: 'default',
} as const;

export const STATUS_VARIANTS = {
  completed: 'outline',
  in_progress: 'secondary',
  pending: 'default',
  cancelled: 'destructive',
  waiting_sparepart: 'default',
  default: 'default',
} as const;

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
}

export interface ErrorState {
  message: string;
  field?: string;
}

export const ITEMS_PER_PAGE = 10;
export const MAX_VISIBLE_PAGES = 5;

export interface SearchCriteria {
  query?: string;
  category?: 'Jobs' | 'Properties' | 'All';
  status?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  page?: number;
  pageSize?: number;
}

export interface SearchResponse {
  jobs: Job[];
  properties: Property[];
  totalCount: number;
  error?: string;
}

export interface DRFValidationError {
  [key: string]: string[];
}

export interface DRFErrorResponse {
  detail?: string;
  [key: string]: string | string[] | undefined;
}

export type PageProps<TParams = { jobId: string }, TSearchParams = { [key: string]: string | string[] | undefined }> = {
  params: TParams;
  searchParams: TSearchParams;
};
export interface PaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}