// src/services/TopicService.ts
import apiClient from './api-client';
import { handleApiError } from './api-client';
import type { ServiceResponse } from './types';

export interface Topic {
  id: number;
  title: string;
  description?: string;
}

export default class TopicService {
  private baseUrl: string = '/api/topics';

  async getTopics(): Promise<ServiceResponse<Topic[]>> {
    try {
      console.log('Fetching topics');
      const response = await apiClient.get<Topic[]>(this.baseUrl);
      console.log('Topics received:', response.data);
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Service error fetching topics:', error);
      throw handleApiError(error); // Removed the second argument
    }
  }
}