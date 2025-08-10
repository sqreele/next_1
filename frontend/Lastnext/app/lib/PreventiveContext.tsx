// app/lib/PreventiveContext.tsx

'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { 
  PreventiveMaintenance, 
  FrequencyType, 
  ServiceResponse,
  itemMatchesMachine // ✅ Import the helper function
} from '@/app/lib/preventiveMaintenanceModels';
import { 
  preventiveMaintenanceService,
  CreatePreventiveMaintenanceData, 
  UpdatePreventiveMaintenanceData,
  CompletePreventiveMaintenanceData,
  DashboardStats
} from '@/app/lib/PreventiveMaintenanceService';
import TopicService from '@/app/lib/TopicService';
import MachineService, { Machine } from '@/app/lib/MachineService';
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

export type PreventiveMaintenanceRequest = CreatePreventiveMaintenanceData;
export type PreventiveMaintenanceUpdateRequest = UpdatePreventiveMaintenanceData;
export type PreventiveMaintenanceCompleteRequest = CompletePreventiveMaintenanceData;

interface PreventiveMaintenanceContextState {
  maintenanceItems: PreventiveMaintenance[];
  topics: Topic[];
  machines: Machine[];
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
  fetchMachines: (propertyId?: string) => Promise<void>;
  setFilterParams: (params: SearchParams) => void;
  clearError: () => void;
  debugMachineFilter: (machineId: string) => Promise<void>;
  testMachineFiltering: () => void;
}

const PreventiveMaintenanceContext = createContext<PreventiveMaintenanceContextState | undefined>(undefined);

interface PreventiveMaintenanceProviderProps {
  children: ReactNode;
}

export const PreventiveMaintenanceProvider: React.FC<PreventiveMaintenanceProviderProps> = ({ children }) => {
  const [maintenanceItems, setMaintenanceItems] = useState<PreventiveMaintenance[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
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

  // Enhanced fetchMachines function
  const fetchMachines = useCallback(async (propertyId?: string) => {
    try {
      console.log('🏭 Fetching machines...');
      const machineService = new MachineService();
      const response = await machineService.getMachines(propertyId);

      if (response.success && response.data) {
        console.log(`✅ Loaded ${response.data.length} machines:`, response.data);
        setMachines(response.data);
      } else {
        console.warn('⚠️ Failed to fetch machines:', response.message);
        setMachines([]);
      }
    } catch (err: any) {
      console.warn('⚠️ Error fetching machines (machines may not be available):', err.message);
      setMachines([]);
    }
  }, []);

  // ✅ COMPLETELY REWRITTEN fetchMaintenanceItems with proper machine filtering
  const fetchMaintenanceItems = useCallback(
    async (params?: SearchParams) => {
      setIsLoading(true);
      clearError();

      try {
        const fetchParams = { ...filterParams, ...params };
        console.log('🔄 Fetching maintenance items with params:', fetchParams);

        // Prepare base query parameters (excluding machine filter)
        const queryParams: Record<string, string | number> = {};
        if (fetchParams.status) queryParams.status = fetchParams.status;
        if (fetchParams.frequency) queryParams.frequency = fetchParams.frequency;
        if (fetchParams.search) queryParams.search = fetchParams.search;
        if (fetchParams.start_date) queryParams.date_from = fetchParams.start_date;
        if (fetchParams.end_date) queryParams.date_to = fetchParams.end_date;
        if (fetchParams.property_id) queryParams.property_id = fetchParams.property_id;
        if (fetchParams.topic_id) queryParams.topic_id = fetchParams.topic_id;

        let finalItems: PreventiveMaintenance[] = [];
        let finalCount = 0;

        // ✅ Always get all data first, then filter client-side for machine
        if (fetchParams.machine_id) {
          console.log(`🎯 Machine filter detected: ${fetchParams.machine_id}`);
          console.log('📡 Getting all data for client-side machine filtering...');
          
          // Get all data without machine filter (since API filter is broken)
          const response = await preventiveMaintenanceService.getAllPreventiveMaintenance(queryParams);
          
          if (response.success && response.data) {
            let allItems: PreventiveMaintenance[] = [];
            
            if (Array.isArray(response.data)) {
              allItems = response.data;
            } else if (response.data && 'results' in response.data) {
              allItems = (response.data as any).results;
            }
            
            console.log(`📡 Got ${allItems.length} total items`);
            
            // ✅ Apply client-side machine filtering using the helper function
            finalItems = allItems.filter(item => {
              const matches = itemMatchesMachine(item, fetchParams.machine_id!);
              return matches;
            });
            
            finalCount = finalItems.length;
            
            console.log(`✅ Client-side machine filtering result: ${allItems.length} -> ${finalItems.length} items`);
            console.log('✅ Filtered items:', finalItems.map(i => ({ 
              id: i.pm_id, 
              title: i.pmtitle,
              machines: i.machines?.map(m => `${m.name} (${m.machine_id})`)
            })));
          }
        } else {
          // No machine filter, use standard API call with pagination
          if (fetchParams.page) queryParams.page = fetchParams.page;
          if (fetchParams.page_size) queryParams.page_size = fetchParams.page_size;
          
          const response = await preventiveMaintenanceService.getAllPreventiveMaintenance(queryParams);

          if (response.success && response.data) {
            if (Array.isArray(response.data)) {
              finalItems = response.data;
              finalCount = finalItems.length;
            } else if (response.data && 'results' in response.data) {
              finalItems = (response.data as any).results;
              finalCount = (response.data as any).count || finalItems.length;
            }
          } else {
            throw new Error(response.message || 'Failed to fetch maintenance items');
          }
        }

        setMaintenanceItems(finalItems);
        setTotalCount(finalCount);
        
        console.log(`📊 Final result: ${finalItems.length} items loaded, total count: ${finalCount}`);
        
      } catch (err: any) {
        console.error('❌ Error fetching maintenance items:', err);
        setError(err.message || 'Failed to fetch maintenance items');
        setMaintenanceItems([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    },
    [filterParams, clearError]
  );

  // Enhanced fetchMaintenanceByMachine function
  const fetchMaintenanceByMachine = useCallback(
    async (machineId: string) => {
      if (!machineId) {
        setError('Machine ID is required');
        return;
      }
      
      console.log(`🎯 Fetching maintenance specifically for machine: ${machineId}`);
      await fetchMaintenanceItems({ machine_id: machineId });
    },
    [fetchMaintenanceItems]
  );

  // ✅ Enhanced debug function for machine filtering
  const debugMachineFilter = useCallback(async (machineId: string) => {
    console.log(`🧪 === DEBUGGING MACHINE FILTER FOR: ${machineId} ===`);
    
    try {
      // Debug using the service method
      await preventiveMaintenanceService.debugMachineFiltering(machineId);
      
      // Also test current context state
      console.log('📊 Current context state:');
      console.log('- Available machines:', machines.length);
      console.log('- Current maintenance items:', maintenanceItems.length);
      console.log('- Filter params:', filterParams);
      
      // Test client-side filtering on current items using imported function
      const matching = maintenanceItems.filter(item => itemMatchesMachine(item, machineId));
      console.log(`🎯 Client-side filtering result: ${matching.length}/${maintenanceItems.length} items match`);
      
      if (matching.length > 0) {
        console.log('✅ Matching items:', matching.map(i => ({ 
          id: i.pm_id, 
          title: i.pmtitle,
          machines: i.machines?.map(m => `${m.name} (${m.machine_id})`)
        })));
      }
      
    } catch (error) {
      console.error('🧪 Debug failed:', error);
    }
  }, [machines, maintenanceItems, filterParams]);

  // ✅ NEW: Test machine filtering function
  const testMachineFiltering = useCallback(() => {
    console.log('=== MANUAL FILTER TEST ===');
    const targetMachine = 'M257E5AC03B';
    
    console.log('All maintenance items:', maintenanceItems.length);
    console.log('Available machines:', machines.map(m => ({ id: m.machine_id, name: m.name })));
    
    const matchingItems = maintenanceItems.filter(item => {
      console.log(`Testing item ${item.pm_id}:`, {
        machines: item.machines,
        hasTarget: item.machines?.some(m => m.machine_id === targetMachine),
        machineIds: item.machines?.map(m => m.machine_id)
      });
      
      return item.machines?.some(m => m.machine_id === targetMachine);
    });
    
    console.log('Matching items:', matchingItems.length, matchingItems.map(i => i.pm_id));
    
    // Also test with the helper function
    const helperMatching = maintenanceItems.filter(item => itemMatchesMachine(item, targetMachine));
    console.log('Helper function matching:', helperMatching.length, helperMatching.map(i => i.pm_id));
  }, [maintenanceItems, machines]);

  // Fetch statistics function
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

  // Fetch topics function
  const fetchTopics = useCallback(async () => {
    setIsLoading(true);
    clearError();

    try {
      const topicService = new TopicService();
      const response = await topicService.getTopics();

      if (response.success && response.data) {
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

  // Fetch maintenance by ID function
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

  // Create maintenance function
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

  // Update maintenance function
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

  // Delete maintenance function
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

  // Complete maintenance function
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

 // Initialize data on component mount
 useEffect(() => {
   console.log('🚀 Initializing PreventiveMaintenanceProvider');
   
   const initializeData = async () => {
     await Promise.all([
       fetchTopics(),
       fetchStatistics(),
       fetchMachines()
     ]);
     
     // Fetch maintenance items last
     await fetchMaintenanceItems();
   };

   initializeData();
 }, [fetchTopics, fetchStatistics, fetchMachines, fetchMaintenanceItems]);

 // ✅ Enhanced debug effect to monitor filter changes
 useEffect(() => {
   if (process.env.NODE_ENV === 'development') {
     console.log('🔍 Filter params changed:', filterParams);
     if (filterParams.machine_id) {
       const selectedMachine = machines.find(m => m.machine_id === filterParams.machine_id);
       console.log('📍 Selected machine:', selectedMachine);
       console.log('📊 Current items count:', maintenanceItems.length);
       
       // Test filtering with current data
       const shouldMatch = maintenanceItems.filter(item => itemMatchesMachine(item, filterParams.machine_id!));
       console.log(`🎯 Items that should match ${filterParams.machine_id}:`, shouldMatch.length);
     }
   }
 }, [filterParams, machines, maintenanceItems]);

 const contextValue: PreventiveMaintenanceContextState = {
   maintenanceItems,
   topics,
   machines,
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
   fetchMachines,
   setFilterParams,
   clearError,
   debugMachineFilter,
   testMachineFiltering,
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