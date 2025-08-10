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

// ✅ Fixed Machine details interface with consistent optional properties
export interface MachineDetails {
  machine_id: string;
  name: string;
  status: string;
  location?: string;
  procedure?: string; // Changed to lowercase and made optional
  id?: number;
  property_name?: string;
  maintenance_count?: number;
  next_maintenance_date?: string | null;
  last_maintenance_date?: string | null;
}

// ✅ Fixed Preventive Maintenance main interface
export interface PreventiveMaintenance {
  id?: number;
  pm_id: string;
  pmtitle?: string;
  job_description?: string | null;
  machine_id?: string; // Legacy field (optional)
  machines?: MachineDetails[] | null; // Current field - can be null or array
  topics?: Topic[] | null;
  scheduled_date: string;
  completed_date?: string | null;
  frequency: FrequencyType;
  custom_days?: number | null;
  next_due_date?: string | null;
  status?: string;
  property_id?: string | null;
  notes?: string | null;
  before_image_url?: string | null;
  after_image_url?: string | null;
  created_by?: number;
  procedure?: string; // Added procedure field
}

// Request structure for creating/updating maintenance
export interface PreventiveMaintenanceRequest {
  pmtitle?: string;
  property_id?: string | PropertyDetails | null;
  job_description?: string;
  
  // Machine relationship fields
  machine_id?: string;  // Single machine association
  machine_ids?: string[]; // Multiple machine association
  scheduled_date: string;
  frequency: FrequencyType;
  custom_days?: number | null;
  notes?: string;
  topic_ids?: number[];
  completed_date?: string;
  before_image?: File;
  after_image?: File;
}

// Form errors interface
export interface PMFormErrors {
  [key: string]: string | undefined;
  pmtitle?: string;
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

// ✅ Fixed helper to safely get machine details
export function getMachineDetails(machine: MachineDetails | null | undefined): { id: string, name: string | null } {
  if (!machine) return { id: 'Unknown', name: null };
  
  return {
      id: machine.machine_id || 'Unknown',
      name: machine.name || null
  };
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
      machine_id?: string;  // Filter by specific machine
      status: string;
      topic_id: string;
      date_from: string;
      date_to: string;
  };
}

// ✅ Helper to get machine display name
export function getMachineDisplayName(item: PreventiveMaintenance): string {
  // If machines array exists and has items
  if (item.machines && item.machines.length > 0) {
      const firstMachine = item.machines[0];
      return `${firstMachine.name} (${firstMachine.machine_id})`;
  }
  
  // Fallback to machine_id if no machines array
  if (item.machine_id) {
      return item.machine_id;
  }
  
  return 'No Machine Assigned';
}

// ✅ Helper functions for consistent machine handling with proper null checks
export function getMachinesString(machines: MachineDetails[] | null | undefined): string {
  if (!machines || machines.length === 0) return 'No machines assigned';
  
  return machines.map(machine => {
      const name = machine.name || machine.machine_id;
      const location = machine.location ? ` (${machine.location})` : '';
      return `${name}${location}`;
  }).join(', ');
}

export function getLocationString(item: PreventiveMaintenance): string {
  if (item.machines && item.machines.length > 0) {
      const firstMachine = item.machines[0];
      return firstMachine.location || firstMachine.machine_id || 'Unknown';
  }
  
  return item.property_id || 'Unknown';
}

// ✅ Fixed machine filtering function with better debugging
// In preventiveMaintenanceModels.ts, update this function:
export function itemMatchesMachine(item: PreventiveMaintenance, machineFilter: string): boolean {
  if (!machineFilter || machineFilter === 'all') return true;
  
  // Normalize the filter for comparison
  const normalizedFilter = machineFilter.trim().toLowerCase();
  
  console.log(`🔍 Checking item ${item.pm_id} against filter "${machineFilter}"`);
  
  // Check if item has machines array
  if (!item.machines || !Array.isArray(item.machines) || item.machines.length === 0) {
    console.log(`❌ No machines array for item ${item.pm_id}`);
    return false;
  }
  
  // Check if any machine in the array matches the filter
  const hasMatch = item.machines.some(machine => {
    if (typeof machine === 'object' && machine !== null) {
      // Check machine_id (exact match)
      const machineIdMatch = machine.machine_id === machineFilter;
      
      // Check machine_id (case insensitive)
      const machineIdCaseInsensitive = machine.machine_id?.toLowerCase() === normalizedFilter;
      
      // Check name (exact match)
      const nameMatch = machine.name === machineFilter;
      
      // Check name (case insensitive)
      const nameCaseInsensitive = machine.name?.toLowerCase() === normalizedFilter;
      
      // Check name (partial match)
      const namePartialMatch = machine.name?.toLowerCase().includes(normalizedFilter);
      
      console.log(`🔍 Machine comparison for ${machine.machine_id}:`, {
        machine_id: machine.machine_id,
        name: machine.name,
        filter: machineFilter,
        machineIdMatch,
        machineIdCaseInsensitive,
        nameMatch,
        nameCaseInsensitive,
        namePartialMatch
      });
      
      return machineIdMatch || machineIdCaseInsensitive || nameMatch || nameCaseInsensitive;
    }
    
    console.log(`❌ Invalid machine object in item ${item.pm_id}:`, machine);
    return false;
  });
  
  if (hasMatch) {
    console.log(`✅ Item ${item.pm_id} matches filter "${machineFilter}"`);
  } else {
    console.log(`❌ Item ${item.pm_id} does NOT match filter "${machineFilter}"`);
  }
  
  return hasMatch;
}
export function getUniqueMachinesFromItems(items: PreventiveMaintenance[]): Array<{id: string, label: string}> {
  const machineMap = new Map<string, {id: string, label: string}>();
  
  items.forEach(item => {
    if (item.machines && Array.isArray(item.machines)) {
      item.machines.forEach(machine => {
        if (typeof machine === 'object' && machine !== null) {
          // Add machine_id as option
          if (machine.machine_id) {
            machineMap.set(machine.machine_id, {
              id: machine.machine_id,
              label: `${machine.name} (${machine.machine_id})`
            });
          }
          
          // Also add name as separate option if different
          if (machine.name && machine.name !== machine.machine_id) {
            machineMap.set(machine.name, {
              id: machine.name,
              label: machine.name
            });
          }
        }
      });
    }
  });
  
  return Array.from(machineMap.values()).sort((a, b) => a.label.localeCompare(b.label));
}