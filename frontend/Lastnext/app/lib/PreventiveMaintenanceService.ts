import apiClient from './api-client';
import { handleApiError } from './api-client';
import {
  validateFrequency,
  type PreventiveMaintenance,
  type FrequencyType,
  type ServiceResponse,
} from './preventiveMaintenanceModels';

export type CreatePreventiveMaintenanceData = {
  pmtitle: string;
  scheduled_date: string;
  frequency: FrequencyType;
  custom_days: number | null;
  notes?: string;
  property_id?: string;
  topic_ids?: number[];
  machine_ids?: string[];
  completed_date?: string;
  before_image?: File;
  after_image?: File;
};

export interface UpdatePreventiveMaintenanceData extends Partial<CreatePreventiveMaintenanceData> {
  machine_ids?: string[]; // Consistent with create, supports multiple machine IDs
}

export interface CompletePreventiveMaintenanceData {
  completion_notes?: string;
  after_image?: File;
}

export interface DashboardStats {
  counts: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  frequency_distribution: {
    name: string;
    value: number;
  }[];
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

class PreventiveMaintenanceService {
  private baseUrl: string = '/api/preventive-maintenance';

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
      if (data.notes?.trim()) formData.append('notes', data.notes.trim());
      
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

  async getAllPreventiveMaintenance(
    params?: Record<string, any>
  ): Promise<ServiceResponse<PreventiveMaintenance[]>> {
    try {
      console.log('Fetching preventive maintenances with params:', params);
      const response = await apiClient.get<PreventiveMaintenance[]>(`${this.baseUrl}/`, { params });
      return { success: true, data: response.data, message: 'Maintenances fetched successfully' };
    } catch (error: any) {
      console.error('Service error fetching with filters:', error);
      throw handleApiError(error);
    }
  }

  async getPreventiveMaintenanceByMachine(
    machineId: string
  ): Promise<ServiceResponse<PreventiveMaintenance[]>> {
    if (!machineId) {
      console.error('Cannot fetch: Machine ID is undefined or empty');
      return { success: false, message: 'Machine ID is required to fetch related maintenance' };
    }

    try {
      console.log(`Fetching preventive maintenances for machine: ${machineId}`);
      const response = await apiClient.get<PreventiveMaintenance[]>(`${this.baseUrl}/`, {
        params: { machine_id: machineId },
      });
      return { success: true, data: response.data, message: 'Maintenances fetched successfully' };
    } catch (error: any) {
      console.error(`Service error fetching maintenance for machine ${machineId}:`, error);
      throw handleApiError(error);
    }
  }

  async getMaintenanceStatistics(): Promise<ServiceResponse<DashboardStats>> {
    try {
      const response = await apiClient.get<DashboardStats>(`${this.baseUrl}/statistics/`);
      return { success: true, data: response.data, message: 'Statistics fetched successfully' };
    } catch (error: any) {
      console.error('Service error fetching maintenance statistics:', error);
      throw handleApiError(error);
    }
  }

  async deletePreventiveMaintenance(id: string): Promise<ServiceResponse<null>> {
    if (!id) {
      console.error('Cannot delete: PM ID is undefined or empty');
      return { success: false, message: 'PM ID is required for deletion' };
    }
  
    try {
      console.log(`Attempting to delete preventive maintenance with ID: ${id}`);
      await apiClient.delete(`${this.baseUrl}/${id}/`);
      return { success: true, data: null, message: 'Maintenance deleted successfully' };
    } catch (error: any) {
      console.error(`Service error deleting maintenance ${id}:`, error);
      
      // Check if it's an authentication error (401)
      if (error.response?.status === 401) {
        console.warn('Authentication failed when deleting maintenance. User may need to log in again.');
        return { 
          success: false, 
          message: 'You don\'t have permission to delete this record or your session has expired.' 
        };
      }
      
      // Use the existing error handler for other errors
      throw handleApiError(error);
    }
  }
}

export default new PreventiveMaintenanceService();