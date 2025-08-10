// app/lib/PreventiveMaintenanceService.ts

import apiClient from './api-client';
import { handleApiError, ApiError } from './api-client';
import {
  validateFrequency,
  type PreventiveMaintenance,
  type FrequencyType,
  type ServiceResponse,
} from './preventiveMaintenanceModels';
import { getSession } from "next-auth/react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

export type CreatePreventiveMaintenanceData = {
  pmtitle: string;
  property_id: string;
  machine_ids: string[];
  scheduled_date: string;
  frequency: string;
  custom_days?: number;
  notes?: string;
  topic_ids: number[];
  before_image?: File;
  after_image?: File;
  procedure?: string;
  completed_date?: string;
};

export type UpdatePreventiveMaintenanceData = Partial<CreatePreventiveMaintenanceData>;

export interface CompletePreventiveMaintenanceData {
  completion_notes?: string;
  after_image?: File;
}

export interface DashboardStats {
  avg_completion_times: Record<string, number>; 
  counts: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  frequency_distribution: {
    frequency: string;
    count: number;
  }[];
  completion_rate?: number;
  machine_distribution?: {
    machine_id: string;
    name: string;
    count: number;
  }[];
  upcoming: PreventiveMaintenance[];
}

export interface UploadImagesData {
  before_image?: File;
  after_image?: File;
}

// Add interface for paginated response
interface PaginatedMaintenanceResponse {
  results: PreventiveMaintenance[];
  count: number;
  next?: string | null;
  previous?: string | null;
}

// Union type for API responses
type MaintenanceApiResponse = PreventiveMaintenance[] | PaginatedMaintenanceResponse;

class PreventiveMaintenanceService {
  private baseUrl: string = '/api/preventive-maintenance';

  // Helper method to check if an item matches a machine
  private itemMatchesMachine(item: PreventiveMaintenance, machineId: string): boolean {
    if (!machineId) return true;

    // Check direct machine_id property
    if (item.machine_id === machineId) {
      console.log(`✅ Direct match: item.machine_id (${item.machine_id}) === ${machineId}`);
      return true;
    }

    // Check machines array/object
    if (item.machines) {
      if (Array.isArray(item.machines)) {
        const arrayMatch = item.machines.some(machine => {
          if (typeof machine === 'string') {
            return machine === machineId;
          }
          if (typeof machine === 'object' && machine !== null) {
            return (machine as any).machine_id === machineId || 
                   String((machine as any).id) === machineId ||
                   (machine as any).machineId === machineId;
          }
          return false;
        });
        
        if (arrayMatch) {
          console.log(`✅ Array match found in machines:`, item.machines);
          return true;
        }
      } else if (typeof item.machines === 'object' && item.machines !== null) {
        const machine = item.machines as any;
        const objectMatch = machine.machine_id === machineId || 
                          String(machine.id) === machineId ||
                          machine.machineId === machineId;
        
        if (objectMatch) {
          console.log(`✅ Object match found:`, machine);
          return true;
        }
      }
    }

    console.log(`❌ No match for item:`, {
      pm_id: item.pm_id,
      machine_id: item.machine_id,
      machines: item.machines
    });
    return false;
  }

  // Helper method to extract items from API response
  private extractItemsFromResponse(data: MaintenanceApiResponse): { items: PreventiveMaintenance[], count: number } {
    if (Array.isArray(data)) {
      return { items: data, count: data.length };
    } else {
      return { items: data.results || [], count: data.count || 0 };
    }
  }

  // ENHANCED: getAllPreventiveMaintenance with better typing
  async getAllPreventiveMaintenance(
    params?: Record<string, any>
  ): Promise<ServiceResponse<MaintenanceApiResponse>> {
    try {
      console.log('=== FETCHING PREVENTIVE MAINTENANCE ===');
      console.log('Input params:', params);
      
      // Create clean params object
      const cleanParams = { ...params };
      
      // Log the machine_id specifically
      if (cleanParams.machine_id) {
        console.log(`🔍 Filtering by machine_id: ${cleanParams.machine_id}`);
      }

      const response = await apiClient.get<MaintenanceApiResponse>(`${this.baseUrl}/`, { params: cleanParams });
      
      console.log('Raw API response:', response.data);
      console.log('Response type:', typeof response.data);
      console.log('Is array?', Array.isArray(response.data));
      
      // Extract items for logging
      const { items, count } = this.extractItemsFromResponse(response.data);
      
      if (Array.isArray(response.data)) {
        console.log(`✅ Got ${items.length} items (array format)`);
      } else {
        console.log(`✅ Got ${items.length} items (paginated format, total: ${count})`);
      }

      // Log machine filtering results
      if (cleanParams.machine_id && items.length > 0) {
        console.log('=== MACHINE FILTERING DEBUG ===');
        console.log(`Looking for machine_id: ${cleanParams.machine_id}`);
        
        items.forEach((item, index) => {
          console.log(`Item ${index + 1}:`, {
            pm_id: item.pm_id,
            title: item.pmtitle,
            machine_id: item.machine_id,
            machines: item.machines,
            machines_type: typeof item.machines,
            machines_length: Array.isArray(item.machines) ? item.machines.length : 'not array'
          });
        });
      }

      return { 
        success: true, 
        data: response.data,
        message: `Fetched ${items.length} maintenance items successfully`
      };
    } catch (error: any) {
      console.error('Service error fetching with filters:', error);
      console.error('Error details:', {
        status: error.status,
        message: error.message,
        response: error.response?.data
      });
      throw handleApiError(error);
    }
  }

  // ENHANCED: Better machine-specific fetching with proper typing
  async getPreventiveMaintenanceByMachine(
    machineId: string,
    additionalParams?: Record<string, any>
  ): Promise<ServiceResponse<MaintenanceApiResponse>> {
    if (!machineId) {
      console.error('Cannot fetch: Machine ID is undefined or empty');
      return { success: false, message: 'Machine ID is required to fetch related maintenance' };
    }

    console.log(`=== FETCHING MAINTENANCE FOR MACHINE: ${machineId} ===`);

    try {
      // Strategy 1: Try the standard endpoint with machine_id parameter
      console.log('📡 Strategy 1: Using machine_id parameter');
      const params = { machine_id: machineId, ...additionalParams };
      const response = await this.getAllPreventiveMaintenance(params);
      
      if (response.success && response.data) {
        // Extract items for validation
        const { items } = this.extractItemsFromResponse(response.data);

        console.log(`✅ Strategy 1 returned ${items.length} items`);
        
        // Verify that the items actually match the machine
        const matchingItems = items.filter(item => this.itemMatchesMachine(item, machineId));
        
        if (matchingItems.length === items.length || items.length === 0) {
          console.log(`✅ All items match the machine filter (or no items found)`);
          return response;
        } else {
          console.log(`⚠️ Only ${matchingItems.length}/${items.length} items match - backend filtering may not be working`);
          // Continue to fallback strategies
        }
      }

      // Strategy 2: Try alternative parameter names
      console.log('📡 Strategy 2: Trying alternative parameter names');
      const alternativeParams = [
        { machine: machineId, ...additionalParams },
        { machine_ids: machineId, ...additionalParams },
        { machineId: machineId, ...additionalParams },
      ];

      for (const altParams of alternativeParams) {
        try {
          console.log('Trying params:', altParams);
          const altResponse = await this.getAllPreventiveMaintenance(altParams);
          
          if (altResponse.success && altResponse.data) {
            const { items: altItems } = this.extractItemsFromResponse(altResponse.data);
            const matchingAltItems = altItems.filter(item => this.itemMatchesMachine(item, machineId));
            
            if (matchingAltItems.length > 0) {
              console.log(`✅ Strategy 2 success with ${matchingAltItems.length} matching items`);
              return altResponse;
            }
          }
        } catch (error) {
          console.log('Alternative params failed:', (error as Error).message);
        }
      }

      // Strategy 3: Get all items and filter client-side
      console.log('📡 Strategy 3: Client-side filtering fallback');
      const allResponse = await this.getAllPreventiveMaintenance(additionalParams);
      
      if (allResponse.success && allResponse.data) {
        const { items: allItems } = this.extractItemsFromResponse(allResponse.data);
        const filteredItems = allItems.filter(item => this.itemMatchesMachine(item, machineId));
        
        console.log(`✅ Strategy 3: Filtered ${allItems.length} -> ${filteredItems.length} items`);
        
        // Return in the same format as the original response
        if (Array.isArray(allResponse.data)) {
          return { 
            success: true, 
            data: filteredItems, 
            message: `Found ${filteredItems.length} maintenance items for machine ${machineId}` 
          };
        } else {
          const paginatedResponse: PaginatedMaintenanceResponse = {
            ...allResponse.data,
            results: filteredItems,
            count: filteredItems.length
          };
          return { 
            success: true, 
            data: paginatedResponse, 
            message: `Found ${filteredItems.length} maintenance items for machine ${machineId}` 
          };
        }
      }

      // If all strategies fail
      console.log('❌ All strategies failed');
      return { success: false, message: `No maintenance items found for machine ${machineId}` };

    } catch (error: any) {
      console.error(`Service error fetching maintenance for machine ${machineId}:`, error);
      throw handleApiError(error);
    }
  }

  // NEW: Debug method specifically for machine filtering
  async debugMachineFiltering(machineId: string): Promise<void> {
    console.log(`=== DEBUGGING MACHINE FILTERING FOR: ${machineId} ===`);
    
    try {
      // Test 1: Get all maintenance items
      console.log('🧪 Test 1: Getting all maintenance items');
      const allResponse = await this.getAllPreventiveMaintenance();
      
      if (allResponse.success && allResponse.data) {
        const { items: allItems } = this.extractItemsFromResponse(allResponse.data);

        console.log(`📊 Total items: ${allItems.length}`);
        
        // Analyze machine data structure
        console.log('🔍 Analyzing machine data structures:');
        allItems.slice(0, 5).forEach((item, index) => {
          console.log(`Item ${index + 1}:`, {
            pm_id: item.pm_id,
            machine_id: item.machine_id,
            machines: item.machines,
            machines_type: typeof item.machines,
            machines_isArray: Array.isArray(item.machines)
          });
        });

        // Test client-side filtering
        const clientFiltered = allItems.filter(item => this.itemMatchesMachine(item, machineId));
        console.log(`🎯 Client-side filtered: ${clientFiltered.length} items match machine ${machineId}`);
      }

      // Test 2: Try API filtering
      console.log('🧪 Test 2: Testing API filtering');
      const apiFiltered = await this.getAllPreventiveMaintenance({ machine_id: machineId });
      
      if (apiFiltered.success && apiFiltered.data) {
        const { items: apiItems } = this.extractItemsFromResponse(apiFiltered.data);
        console.log(`📡 API filtered: ${apiItems.length} items returned`);
      }

    } catch (error) {
      console.error('Debug error:', error);
    }
  }

  // Keep all your existing methods exactly as they are...
  async createPreventiveMaintenance(
    data: CreatePreventiveMaintenanceData
  ): Promise<ServiceResponse<PreventiveMaintenance>> {
    console.log('=== CREATE PREVENTIVE MAINTENANCE ===');
    console.log('Input data:', {
      ...data,
      before_image: data.before_image
        ? { name: data.before_image.name, size: data.before_image.size, type: data.before_image.type }
        : undefined,
      after_image: data.after_image
        ? { name: data.after_image.name, size: data.after_image.size, type: data.after_image.type }
        : undefined,
    });

    try {
      const formData = new FormData();
      
      // Add basic fields
      if (data.pmtitle?.trim()) formData.append('pmtitle', data.pmtitle.trim());
      formData.append('scheduled_date', data.scheduled_date);
      if (data.completed_date) formData.append('completed_date', data.completed_date);
      formData.append('frequency', data.frequency);
      if (data.custom_days != null) formData.append('custom_days', String(data.custom_days));
      if (data.notes !== undefined) formData.append('notes', data.notes?.trim() || '');
      if (data.procedure !== undefined) formData.append('procedure', data.procedure?.trim() || '');
      
      // Add array fields - FIXED: removed [] from field names
      if (data.topic_ids?.length) {
        data.topic_ids.forEach((id) => formData.append('topic_ids', String(id)));
      }
      
      if (data.machine_ids?.length) {
        data.machine_ids.forEach((id) => formData.append('machine_ids', id));
      }
      
      if (data.property_id) formData.append('property_id', data.property_id);

      // Add image files directly to the initial request
      if (data.before_image instanceof File) {
        formData.append('before_image', data.before_image);
        console.log(`Adding before image: ${data.before_image.name} (${data.before_image.size} bytes)`);
      }
      
      if (data.after_image instanceof File) {
        formData.append('after_image', data.after_image);
        console.log(`Adding after image: ${data.after_image.name} (${data.after_image.size} bytes)`);
      }

      console.log('FormData entries (create):');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value instanceof File ? `${value.name} (${value.size} bytes)` : value}`);
      }

      const createResponse = await apiClient.post<any>(`${this.baseUrl}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const responseData = createResponse.data;
      console.log('Raw API response:', responseData);

      let actualRecord: PreventiveMaintenance;

      if ('data' in responseData && responseData.data && 'pm_id' in responseData.data) {
        actualRecord = responseData.data;
        console.log('Found record in nested data structure:', actualRecord.pm_id);
      } else if ('pm_id' in responseData) {
        actualRecord = responseData;
        console.log('Found record directly in response:', actualRecord.pm_id);
      } else {
        console.error('Unexpected response format:', responseData);
        throw new Error('Invalid response format: Missing pm_id');
      }

      return { success: true, data: actualRecord, message: 'Maintenance created successfully' };
    } catch (error: any) {
      console.error('Service error creating maintenance:', error);
      throw handleApiError(error);
    }
  }

  async uploadMaintenanceImages(
    pmId: string,
    data: UploadImagesData
  ): Promise<ServiceResponse<null>> {
    console.log(`=== UPLOAD IMAGES FOR PM ${pmId} ===`);

    if (!pmId) {
      console.error('Cannot upload images: PM ID is undefined or empty');
      return { success: false, message: 'PM ID is required for image upload' };
    }

    const hasBefore = data.before_image instanceof File;
    const hasAfter = data.after_image instanceof File;

    if (!hasBefore && !hasAfter) {
      console.log('No images to upload');
      return { success: true, data: null, message: 'No images provided' };
    }

    try {
      const imageFormData = new FormData();
      if (hasBefore) {
        imageFormData.append('before_image', data.before_image!);
        console.log(`Adding before image: ${data.before_image!.name} (${data.before_image!.size} bytes)`);
      }
      if (hasAfter) {
        imageFormData.append('after_image', data.after_image!);
        console.log(`Adding after image: ${data.after_image!.name} (${data.after_image!.size} bytes)`);
      }

      console.log('FormData entries:');
      for (const [key, value] of imageFormData.entries()) {
        console.log(`  ${key}: ${value instanceof File ? `${value.name} (${value.size} bytes)` : value}`);
      }

      await apiClient.post(`${this.baseUrl}/${pmId}/upload-images/`, imageFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('Images uploaded successfully');
      return { success: true, data: null, message: 'Images uploaded successfully' };
    } catch (error: any) {
      console.error(`Service error uploading images for PM ${pmId}:`, error);
      throw handleApiError(error);
    }
  }

  async updatePreventiveMaintenance(
    id: string,
    data: UpdatePreventiveMaintenanceData
  ): Promise<ServiceResponse<PreventiveMaintenance>> {
    console.log('=== UPDATE PREVENTIVE MAINTENANCE ===');
    console.log('Update data:', {
      ...data,
      before_image: data.before_image
        ? { name: data.before_image.name, size: data.before_image.size, type: data.before_image.type }
        : undefined,
      after_image: data.after_image
        ? { name: data.after_image.name, size: data.after_image.size, type: data.after_image.type }
        : undefined,
    });

    if (!id) {
      console.error('Cannot update: PM ID is undefined or empty');
      return { success: false, message: 'PM ID is required for updates' };
    }

    try {
      const formData = new FormData();
      
      // Add basic fields
      if (data.pmtitle !== undefined) formData.append('pmtitle', data.pmtitle.trim() || 'Untitled Maintenance');
      if (data.scheduled_date !== undefined) formData.append('scheduled_date', data.scheduled_date);
      if (data.completed_date !== undefined) {
        formData.append('completed_date', data.completed_date || '');
      }
      if (data.frequency !== undefined) formData.append('frequency', validateFrequency(data.frequency));
      if (data.custom_days !== undefined) {
        formData.append('custom_days', data.custom_days != null ? String(data.custom_days) : '');
      }
      if (data.notes !== undefined) formData.append('notes', data.notes?.trim() || '');
      if (data.procedure !== undefined) formData.append('procedure', data.procedure?.trim() || '');
      
      // Add array fields - FIXED: removed [] from field names
      if (data.topic_ids !== undefined) {
        if (data.topic_ids.length) {
          data.topic_ids.forEach((id) => formData.append('topic_ids', String(id)));
        }
      }
      
      if (data.machine_ids !== undefined) {
        if (data.machine_ids.length) {
          data.machine_ids.forEach((id) => formData.append('machine_ids', id));
        }
      }
      
      if (data.property_id !== undefined) {
        formData.append('property_id', data.property_id || '');
      }
      
      // Add image files directly to the formData
      if (data.before_image instanceof File) {
        formData.append('before_image', data.before_image);
        console.log(`Adding before image: ${data.before_image.name} (${data.before_image.size} bytes)`);
      }
      
      if (data.after_image instanceof File) {
        formData.append('after_image', data.after_image);
        console.log(`Adding after image: ${data.after_image.name} (${data.after_image.size} bytes)`);
      }

      console.log('FormData entries (update):');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value instanceof File ? `${value.name} (${value.size} bytes)` : value}`);
      }

      const response = await apiClient.put<PreventiveMaintenance>(
        `${this.baseUrl}/${id}/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      return { success: true, data: response.data, message: 'Maintenance updated successfully' };
    } catch (error: any) {
      console.error('Service error updating maintenance:', error);
      throw handleApiError(error);
    }
  }

  async completePreventiveMaintenance(
    id: string,
    data: CompletePreventiveMaintenanceData
  ): Promise<ServiceResponse<PreventiveMaintenance>> {
    console.log('=== COMPLETE PREVENTIVE MAINTENANCE ===');

    if (!id) {
      console.error('Cannot complete: PM ID is undefined or empty');
      return { success: false, message: 'PM ID is required to mark as complete' };
    }

    try {
      const formData = new FormData();
      if (data.completion_notes?.trim()) {
        formData.append('completion_notes', data.completion_notes.trim());
      }
      
      // Add after image directly to the completion request
      if (data.after_image instanceof File) {
        formData.append('after_image', data.after_image);
        console.log(`Adding after image: ${data.after_image.name} (${data.after_image.size} bytes)`);
      }

      console.log('FormData entries (complete):');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value instanceof File ? `${value.name} (${value.size} bytes)` : value}`);
      }

      const response = await apiClient.post<PreventiveMaintenance>(
        `${this.baseUrl}/${id}/complete/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      return { success: true, data: response.data, message: 'Maintenance completed successfully' };
    } catch (error: any) {
      console.error('Service error completing maintenance:', error);
      throw handleApiError(error);
    }
  }

  async getPreventiveMaintenanceById(
    id: string
  ): Promise<ServiceResponse<PreventiveMaintenance>> {
    if (!id) {
      console.error('Cannot fetch: PM ID is undefined or empty');
      return { success: false, message: 'PM ID is required to fetch details' };
    }

    try {
      const response = await apiClient.get<PreventiveMaintenance>(`${this.baseUrl}/${id}/`);
      return { success: true, data: response.data, message: 'Maintenance fetched successfully' };
    } catch (error: any) {
      console.error('Service error fetching maintenance:', error);
      throw handleApiError(error);
    }
  }

  async getPreventiveMaintenances(): Promise<ServiceResponse<PreventiveMaintenance[]>> {
    try {
      const response = await apiClient.get<PreventiveMaintenance[]>(`${this.baseUrl}/`);
      return { success: true, data: response.data, message: 'Maintenances fetched successfully' };
    } catch (error: any) {
      console.error('Service error fetching maintenances:', error);
      throw handleApiError(error);
    }
  }

  async getMaintenanceStatistics(): Promise<ServiceResponse<DashboardStats>> {
    try {
      const response = await apiClient.get<DashboardStats>(`${this.baseUrl}/stats/`);
      console.log('=== MAINTENANCE STATISTICS DEBUG ===');
      console.log('Raw stats response:', response.data);
      console.log('Frequency distribution:', response.data.frequency_distribution);
      console.log('Upcoming tasks:', response.data.upcoming);
      console.log('Avg completion times:', response.data.avg_completion_times);
      
      return { success: true, data: response.data, message: 'Statistics fetched successfully' };
    } catch (error: any) {
      console.error('Service error fetching maintenance statistics:', error);
      
      // Handle the case where no data exists (404 error)
      if (error.status === 404 || (error.response && error.response.status === 404)) {
        console.log('No maintenance data found, returning empty statistics');
        const emptyStats: DashboardStats = {
          counts: {
            total: 0,
            completed: 0,
            pending: 0,
            overdue: 0
          },
          frequency_distribution: [],
          avg_completion_times: {},
          upcoming: []
        };
        return { success: true, data: emptyStats, message: 'No maintenance data found' };
      }
      
      throw handleApiError(error);
    }
  }

  async getUpcomingMaintenance(days: number = 30): Promise<ServiceResponse<PreventiveMaintenance[]>> {
    try {
      console.log(`=== FETCHING UPCOMING MAINTENANCE ===`);
      console.log(`Fetching upcoming maintenance for next ${days} days`);
      
      const response = await apiClient.get<PreventiveMaintenance[]>(
        `${this.baseUrl}/upcoming/`,
        { params: { days } }
      );
      
      console.log(`Found ${response.data.length} upcoming maintenance tasks`);
      console.log('Upcoming tasks:', response.data);
      
      return { success: true, data: response.data, message: 'Upcoming maintenance fetched successfully' };
    } catch (error: any) {
      console.error('Service error fetching upcoming maintenance:', error);
      throw handleApiError(error);
    }
  }

  async getEnhancedStatistics(upcomingDays: number = 30): Promise<ServiceResponse<DashboardStats>> {
    try {
      console.log('=== FETCHING ENHANCED STATISTICS ===');
      
      const statsResponse = await this.getMaintenanceStatistics();
      if (!statsResponse.success || !statsResponse.data) {
        return statsResponse;
      }

      const upcomingResponse = await this.getUpcomingMaintenance(upcomingDays);
      
      if (upcomingResponse.success && upcomingResponse.data) {
        const enhancedStats: DashboardStats = {
          ...statsResponse.data,
          upcoming: upcomingResponse.data
        };
        
        console.log(`Enhanced stats: ${enhancedStats.upcoming.length} upcoming tasks (${upcomingDays} days)`);
        return { success: true, data: enhancedStats, message: 'Enhanced statistics fetched successfully' };
      }
      
      return statsResponse;
    } catch (error: any) {
      console.error('Service error fetching enhanced statistics:', error);
      throw handleApiError(error);
    }
  }

  async debugMaintenanceData(): Promise<void> {
    try {
      console.log('=== DEBUG MAINTENANCE DATA ===');
      
      const statsResponse = await apiClient.get<any>(`${this.baseUrl}/stats/`);
      console.log('Stats response:', statsResponse.data);
      console.log('Stats upcoming length:', statsResponse.data.upcoming?.length || 0);
      
      const upcomingResponse = await apiClient.get<any>(`${this.baseUrl}/upcoming/?days=30`);
      console.log('Upcoming endpoint response length:', upcomingResponse.data?.length || 0);
      console.log('Upcoming endpoint response:', upcomingResponse.data);
      
      const allResponse = await apiClient.get<any>(`${this.baseUrl}/`);
      console.log('All maintenance count:', allResponse.data?.length || 0);
      
    } catch (error) {
      console.error('Debug error:', error);
    }
  }

  async deletePreventiveMaintenance(id: string): Promise<ServiceResponse<null>> {
    if (!id) {
      console.error('Cannot delete: PM ID is undefined or empty');
      return { success: false, message: 'PM ID is required for deletion' };
    }

    try {
      console.log(`=== DELETE PREVENTIVE MAINTENANCE ===`);
      console.log(`Attempting to delete preventive maintenance with ID: ${id}`);
      
      const response = await apiClient.delete(`${this.baseUrl}/${id}/`);
      
      console.log(`Successfully deleted preventive maintenance with ID: ${id}`);
      return { success: true, data: null, message: 'Maintenance deleted successfully' };
    } catch (error: any) {
      console.error(`Service error deleting maintenance ${id}:`, error);
      
      if (error.status === 403) {
        return { 
          success: false, 
          message: error.details?.detail || 'You don\'t have permission to delete this maintenance record. Please contact an administrator.' 
        };
      }
      
      if (error.status === 401) {
        return { 
          success: false, 
          message: 'Your session has expired. Please log in again to continue.' 
        };
      }
      
      if (error.status === 404) {
        return { 
          success: false, 
          message: 'This maintenance record no longer exists or has already been deleted.' 
        };
      }
      
      throw handleApiError(error);
    }
  }
  async debugAPIEndpoint(machineId: string): Promise<void> {
    console.log(`=== DEBUGGING API ENDPOINT FOR MACHINE: ${machineId} ===`);
    
    try {
      // Test different parameter formats
      const testParams = [
        { machine: machineId },
        { machine_id: machineId },
        { machines: machineId },
        { machine_ids: machineId },
      ];
  
      for (const params of testParams) {
        console.log(`\n🧪 Testing params:`, params);
        
        try {
          const response = await apiClient.get<any>(`${this.baseUrl}/`, { params });
          const { items } = this.extractItemsFromResponse(response.data);
          
          console.log(`📊 Returned ${items.length} items`);
          
          // Check first few items
          items.slice(0, 3).forEach((item, index) => {
            console.log(`Item ${index + 1}:`, {
              pm_id: item.pm_id,
              machine_id: item.machine_id,
              machines: item.machines?.map(m => ({ id: m.machine_id, name: m.name }))
            });
          });
          
          // Check if target machine is in results
          const hasTargetMachine = items.some(item => 
            item.machines?.some(m => m.machine_id === machineId)
          );
          
          if (hasTargetMachine) {
            console.log(`✅ Found target machine ${machineId} in results`);
          } else {
            console.log(`❌ Target machine ${machineId} NOT found in results`);
          }
          console.log(`\n🔍 Checking machine data structure:`, {
            machineId,
            params,
            responseData: response.data
          });
        } catch (error) {
          console.error('Error in debugMachineFiltering:', error);
        }
      }
    } catch (error) {
      console.error('Debug error:', error);
    }
  }
}

export const preventiveMaintenanceService = new PreventiveMaintenanceService();