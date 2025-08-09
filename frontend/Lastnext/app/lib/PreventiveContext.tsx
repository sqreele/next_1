'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { PreventiveMaintenance, FrequencyType, ServiceResponse } from '@/app/lib/preventiveMaintenanceModels';
import preventiveMaintenanceService, { 
  CreatePreventiveMaintenanceData, 
  UpdatePreventiveMaintenanceData,
  CompletePreventiveMaintenanceData,
  DashboardStats
} from '@/app/lib/PreventiveMaintenanceService';
import TopicService from '@/app/lib/TopicService';
// Import Topic from the same place as TopicService to avoid type conflicts
import { Topic } from '@/app/lib/TopicService';

export interface SearchParams {
  status?: string;
  frequency?: string;
  page?: number;
  page_size?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  property_id?: string;
  topic_id?: string;
  machine_id?: string;
}

// Using the exact same interface from the service layer for consistency
export type PreventiveMaintenanceRequest = CreatePreventiveMaintenanceData;
export type PreventiveMaintenanceUpdateRequest = UpdatePreventiveMaintenanceData;
export type PreventiveMaintenanceCompleteRequest = CompletePreventiveMaintenanceData;

interface PreventiveMaintenanceContextState {
  maintenanceItems: PreventiveMaintenance[];
  topics: Topic[];
  statistics: DashboardStats | null;
  selectedMaintenance: PreventiveMaintenance | null;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  filterParams: SearchParams;
  fetchMaintenanceItems: (params?: SearchParams) => Promise<void>;
  fetchStatistics: () => Promise<void>;
  fetchMaintenanceById: (pmId: string) => Promise<PreventiveMaintenance | null>;
  fetchMaintenanceByMachine: (machineId: string) => Promise<void>;
  createMaintenance: (data: PreventiveMaintenanceRequest) => Promise<PreventiveMaintenance | null>;
  updateMaintenance: (pmId: string, data: PreventiveMaintenanceUpdateRequest) => Promise<PreventiveMaintenance | null>;
  deleteMaintenance: (pmId: string) => Promise<boolean>;
  completeMaintenance: (pmId: string, data: PreventiveMaintenanceCompleteRequest) => Promise<PreventiveMaintenance | null>;
  fetchTopics: () => Promise<void>;
  setFilterParams: (params: SearchParams) => void;
  clearError: () => void;
}

const PreventiveMaintenanceContext = createContext<PreventiveMaintenanceContextState | undefined>(undefined);

interface PreventiveMaintenanceProviderProps {
  children: ReactNode;
}

export const PreventiveMaintenanceProvider: React.FC<PreventiveMaintenanceProviderProps> = ({ children }) => {
  const [maintenanceItems, setMaintenanceItems] = useState<PreventiveMaintenance[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [statistics, setStatistics] = useState<DashboardStats | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<PreventiveMaintenance | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterParams, setFilterParams] = useState<SearchParams>({
    status: '',
    page: 1,
    page_size: 10,
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchMaintenanceItems = useCallback(
    async (params?: SearchParams) => {
      setIsLoading(true);
      clearError();

      try {
        const fetchParams = { ...filterParams, ...params };
        const queryParams: Record<string, string | number> = {};

        if (fetchParams.status) queryParams.status = fetchParams.status;
        if (fetchParams.frequency) queryParams.frequency = fetchParams.frequency;
        if (fetchParams.page) queryParams.page = fetchParams.page;
        if (fetchParams.page_size) queryParams.page_size = fetchParams.page_size;
        if (fetchParams.search) queryParams.search = fetchParams.search;
        if (fetchParams.start_date) queryParams.date_from = fetchParams.start_date;
        if (fetchParams.end_date) queryParams.date_to = fetchParams.end_date;
        if (fetchParams.property_id) queryParams.property_id = fetchParams.property_id;
        if (fetchParams.topic_id) queryParams.topic_id = fetchParams.topic_id;
        if (fetchParams.machine_id) queryParams.machine_id = fetchParams.machine_id;

        console.log('Fetching maintenance items with params:', queryParams);
        const response = await preventiveMaintenanceService.getAllPreventiveMaintenance(queryParams);

        if (response.success && response.data) {
          let items: PreventiveMaintenance[] = [];
          let count: number = 0;

          // Use type assertion to tell TypeScript about the possible types
          type ResponseDataType = PreventiveMaintenance[] | { 
            results: PreventiveMaintenance[]; 
            count: number;
          };
          
          const responseData = response.data as ResponseDataType;

          if (Array.isArray(responseData)) {
            items = responseData;
            count = responseData.length;
          } else {
            // Now TypeScript knows this must be the object type with results and count
            items = responseData.results;
            count = responseData.count;
          }

          setMaintenanceItems(items);
          setTotalCount(count);
        } else {
          throw new Error(response.message || 'Failed to fetch maintenance items');
        }
      } catch (err: any) {
        console.error('Error fetching maintenance items:', err);
        setError(err.message || 'Failed to fetch maintenance items');
      } finally {
        setIsLoading(false);
      }
    },
    [filterParams, clearError]
  );

  const fetchMaintenanceByMachine = useCallback(
    async (machineId: string) => {
      if (!machineId) {
        setError('Machine ID is required');
        return;
      }
      await fetchMaintenanceItems({ machine_id: machineId });
    },
    [fetchMaintenanceItems]
  );

  const fetchStatistics = useCallback(async () => {
    setIsLoading(true);
    clearError();

    try {
      const response = await preventiveMaintenanceService.getMaintenanceStatistics();

      if (response.success && response.data) {
        setStatistics(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch maintenance statistics');
      }
    } catch (err: any) {
      console.error('Error fetching statistics:', err);
      setError(err.message || 'Failed to fetch maintenance statistics');
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  const fetchTopics = useCallback(async () => {
    setIsLoading(true);
    clearError();

    try {
      const topicService = new TopicService();
      const response = await topicService.getTopics();

      if (response.success && response.data) {
        // Explicitly convert the returned data to be compatible with the state type
        setTopics(response.data as Topic[]);
      } else {
        throw new Error(response.message || 'Failed to fetch topics');
      }
    } catch (err: any) {
      console.error('Error fetching topics:', err);
      setError(err.message || 'Failed to fetch topics');
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  const fetchMaintenanceById = useCallback(async (pmId: string) => {
    setIsLoading(true);
    clearError();

    try {
      if (!pmId) throw new Error('Maintenance ID is required');

      const response = await preventiveMaintenanceService.getPreventiveMaintenanceById(pmId);

      if (response.success && response.data) {
        setSelectedMaintenance(response.data);
        return response.data;
      } else {
        throw new Error(response.message || `Failed to fetch maintenance with ID ${pmId}`);
      }
    } catch (err: any) {
      console.error(`Error fetching maintenance with ID ${pmId}:`, err);
      setError(err.message || 'Failed to fetch maintenance details');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  const createMaintenance = useCallback(
    async (data: CreatePreventiveMaintenanceData) => {
      setIsLoading(true);
      clearError();

      try {
        console.log('Creating maintenance with data:', {
          ...data,
          before_image: data.before_image ? { name: data.before_image.name, size: data.before_image.size } : undefined,
          after_image: data.after_image ? { name: data.after_image.name, size: data.after_image.size } : undefined,
        });

        const response = await preventiveMaintenanceService.createPreventiveMaintenance(data);

        if (response.success && response.data) {
          await fetchMaintenanceItems();
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to create maintenance record');
        }
      } catch (err: any) {
        console.error('Error creating maintenance:', err);
        setError(err.message || 'Failed to create maintenance record');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchMaintenanceItems, clearError]
  );

  const updateMaintenance = useCallback(
    async (pmId: string, data: UpdatePreventiveMaintenanceData) => {
      setIsLoading(true);
      clearError();

      try {
        console.log('Updating maintenance with data:', {
          pmId,
          ...data,
          before_image: data.before_image ? { name: data.before_image.name, size: data.before_image.size } : undefined,
          after_image: data.after_image ? { name: data.after_image.name, size: data.after_image.size } : undefined,
        });

        const response = await preventiveMaintenanceService.updatePreventiveMaintenance(pmId, data);

        if (response.success && response.data) {
          setSelectedMaintenance(response.data);
          await fetchMaintenanceItems();
          return response.data;
        } else {
          throw new Error(response.message || `Failed to update maintenance with ID ${pmId}`);
        }
      } catch (err: any) {
        console.error(`Error updating maintenance with ID ${pmId}:`, err);
        setError(err.message || 'Failed to update maintenance record');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchMaintenanceItems, clearError]
  );

  const deleteMaintenance = useCallback(
    async (pmId: string) => {
      setIsLoading(true);
      clearError();

      try {
        if (!pmId) throw new Error('Maintenance ID is required');

        const response = await preventiveMaintenanceService.deletePreventiveMaintenance(pmId);

        if (response.success) {
          await fetchMaintenanceItems();
          if (selectedMaintenance?.pm_id === pmId) setSelectedMaintenance(null);
          return true;
        } else {
          throw new Error(response.message || `Failed to delete maintenance with ID ${pmId}`);
        }
      } catch (err: any) {
        console.error(`Error deleting maintenance with ID ${pmId}:`, err);
        setError(err.message || 'Failed to delete maintenance record');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchMaintenanceItems, selectedMaintenance, clearError]
  );

  const completeMaintenance = useCallback(
    async (pmId: string, data: CompletePreventiveMaintenanceData) => {
      setIsLoading(true);
      clearError();

      try {
        if (!pmId) throw new Error('Maintenance ID is required');

        const response = await preventiveMaintenanceService.completePreventiveMaintenance(pmId, data);

        if (response.success && response.data) {
          setSelectedMaintenance(response.data);
          await fetchMaintenanceItems();
          return response.data;
        } else {
          throw new Error(response.message || `Failed to complete maintenance with ID ${pmId}`);
        }
      } catch (err: any) {
        console.error(`Error completing maintenance with ID ${pmId}:`, err);
        setError(err.message || 'Failed to complete maintenance record');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchMaintenanceItems, clearError]
  );

  useEffect(() => {
    fetchTopics();
    fetchStatistics();
    fetchMaintenanceItems();
  }, [fetchTopics, fetchStatistics, fetchMaintenanceItems]);

  const contextValue: PreventiveMaintenanceContextState = {
    maintenanceItems,
    topics,
    statistics,
    selectedMaintenance,
    totalCount,
    isLoading,
    error,
    filterParams,
    fetchMaintenanceItems,
    fetchStatistics,
    fetchMaintenanceById,
    fetchMaintenanceByMachine,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    completeMaintenance,
    fetchTopics,
    setFilterParams,
    clearError,
  };

  return (
    <PreventiveMaintenanceContext.Provider value={contextValue}>
      {children}
    </PreventiveMaintenanceContext.Provider>
  );
};

export const usePreventiveMaintenance = () => {
  const context = useContext(PreventiveMaintenanceContext);
  if (context === undefined) {
    throw new Error('usePreventiveMaintenance must be used within a PreventiveMaintenanceProvider');
  }
  return context;
};