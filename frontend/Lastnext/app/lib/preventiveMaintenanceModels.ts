// Type definitions for Preventive Maintenance module

// Topic definition
export interface Topic {
    id: number;
    title: string;
    description: string;
  }
  
  // Image definition
  export interface MaintenanceImage {
    id?: number;
    image_url?: string;
  }
  
  // Frequency options
  export const FREQUENCY_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'biannually', label: 'Bi-Annually' },
    { value: 'annually', label: 'Annually' },
    { value: 'custom', label: 'Custom Days' },
  ];
  
  // Valid frequency values
  export type FrequencyType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannually' | 'annually' | 'custom';
  
  // Frequency validation helper
  export function validateFrequency(frequency: string): FrequencyType {
    return FREQUENCY_OPTIONS.find(option => option.value === frequency)
      ? (frequency as FrequencyType)
      : 'monthly';
  }
  
  // Property details interface
  export interface PropertyDetails {
    id?: string;
    property_id?: string;
    name?: string;
    [key: string]: any; // Allow any other properties
  }
  
  // Machine details interface
  export interface MachineDetails {
    machine_id: string;
    name: string;
    id?: number; // Optional
  }
  // Preventive Maintenance main interface
  export interface PreventiveMaintenance {
    pm_id: string;
    pmtitle?: string;
    machine_id?: string; // Optional, may be missing
    name?: string; // Optional, machine name for display
    machines?: Array<MachineDetails | string> | null; // Uses MachineDetails
    topics?: Topic[] | number[] | null;
    scheduled_date: string;
    completed_date?: string | null;
    frequency: FrequencyType;
    custom_days?: number | null;
    next_due_date?: string | null;
    before_image?: MaintenanceImage | string | null; // Allow string for URLs
    after_image?: MaintenanceImage | string | null; // Allow string for URLs
    before_image_url?: string | null;
    after_image_url?: string | null;
    notes?: string | null;
    status?: string;
    property_id?: string | null; // Simplified to string | null
    is_overdue?: boolean; // Added from backend response
  }
  // Request structure for creating/updating maintenance
  export interface PreventiveMaintenanceRequest {
    pmtitle?: string;
    property_id?: string | PropertyDetails | null; 
   
    // Added machine relationship fields
    machine_id?: string;  // Added to associate maintenance with a specific machine
    machine_ids?: string[];
    scheduled_date: string;
    frequency: FrequencyType;
    custom_days?: number | null;
    notes?: string;
    topic_ids?: number[];
    completed_date?: string; // Add this if you use it
    before_image?: File;     // Add this if you use it
    after_image?: File;
  }
  
  // Form errors interface
  export interface PMFormErrors {
    [key: string]: string | undefined;
    pmtitle?: string;
    
    // Added machine-related error fields
    machine_id?: string;  // Validation error for machine selection
    
    scheduled_date?: string;
    frequency?: string;
    custom_days?: string;
    notes?: string;
    job_selection?: string;
  }
  
  // API response wrapper
  export interface ServiceResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
  }
  
  // Maintenance statistics
  export interface PMStatistics {
    counts: {
      total: number;
      completed: number;
      pending: number;
      overdue: number;
    };
  }
  
  // Frequency distribution for statistics
  export interface FrequencyDistribution {
    frequency: string;
    count: number;
  }
  
  // Paginated API response
  export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
  }
  
  // Helper to determine PM status
  export function determinePMStatus(item: PreventiveMaintenance): string {
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
  }
  
  // Enhanced helper to get image URL from various formats
  export function getImageUrl(image: MaintenanceImage | any | null | undefined): string | null {
    if (!image) return null;
    
    // First try to get direct URL property from various possible fields
    if (typeof image === 'object') {
      // Check various possible URL fields
      if ('image_url' in image && image.image_url) {
        return image.image_url;
      }
      if ('url' in image && image.url) {
        return image.url;
      }
      if ('path' in image && image.path) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pmcs.site';
        return `${apiUrl}${image.path}`;
      }
      
      // If no direct URL but we have an ID, construct URL
      if ('id' in image && image.id) {
        return `/api/images/${image.id}`;
      }
    }
    
    // If image is just a string URL
    if (typeof image === 'string') {
      return image;
    }
    
    return null;
  }
  
  // Helper to safely get machine details regardless of format
  export function getMachineDetails(machine: any): { id: string, name: string | null } {
    if (!machine) return { id: 'Unknown', name: null };
    
    // If machine is just a string ID
    if (typeof machine === 'string') {
      return { id: machine, name: null };
    }
    
    // If machine is an object, extract ID and name
    if (typeof machine === 'object') {
      // Try different potential property names for machine ID
      const id = machine.machine_id || machine.id || machine.machineId || 'Unknown';
      
      // Try different potential property names for machine name
      const name = machine.name || machine.machine_name || machine.machineName || null;
      
      return { id, name };
    }
    
    return { id: 'Unknown', name: null };
  }
  
  // Helper to safely get property details regardless of format
  export function getPropertyDetails(property: any): { id: string | null, name: string | null } {
    if (!property) return { id: null, name: null };
    
    // If property is just a string ID
    if (typeof property === 'string') {
      return { id: property, name: null };
    }
    
    // If property is an object, extract ID and name
    if (typeof property === 'object') {
      // Try different potential property names for property ID
      const id = property.property_id || property.id || property.propertyId || null;
      
      // Try different potential property names for property name
      const name = property.name || property.property_name || property.propertyName || null;
      
      return { id, name };
    }
    
    return { id: null, name: null };
  }
  
  // Response format for PM list with included topics
  export interface PMResponse {
    results: PreventiveMaintenance[];
    topics: Topic[];
    count: number;
    next: string | null;
    previous: string | null;
    filters?: {
      pm_id: string;
      
      // Added machine-related filters
      machine_id?: string;  // Filter by specific machine
      
      status: string;
      topic_id: string;
      date_from: string;
      date_to: string;
    };
  }
  
  // Helper to get machine display name
  export function getMachineDisplayName(item: PreventiveMaintenance): string {
    if (item.name && item.machine_id) {
      return `${item.name} (${item.machine_id})`;
    } else if (item.name) {
      return item.name;
    } else if (item.machine_id) {
      return item.machine_id;
    }
    return 'Unknown Machine';
  }