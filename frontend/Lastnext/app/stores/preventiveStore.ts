'use client';
import { create } from 'zustand';
import {
  PreventiveMaintenance,
  itemMatchesMachine,
} from '@/app/lib/preventiveMaintenanceModels';
import {
  preventiveMaintenanceService,
  CreatePreventiveMaintenanceData,
  UpdatePreventiveMaintenanceData,
  CompletePreventiveMaintenanceData,
  DashboardStats,
} from '@/app/lib/PreventiveMaintenanceService';
import TopicService, { Topic } from '@/app/lib/TopicService';
import MachineService, { Machine } from '@/app/lib/MachineService';

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

export interface PreventiveStoreState {
  maintenanceItems: PreventiveMaintenance[];
  topics: Topic[];
  machines: Machine[];
  statistics: DashboardStats | null;
  selectedMaintenance: PreventiveMaintenance | null;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  filterParams: SearchParams;

  setFilterParams: (params: SearchParams) => void;
  clearError: () => void;

  fetchMachines: (propertyId?: string) => Promise<void>;
  fetchTopics: () => Promise<void>;
  fetchStatistics: () => Promise<void>;

  fetchMaintenanceItems: (params?: SearchParams) => Promise<void>;
  fetchMaintenanceByMachine: (machineId: string) => Promise<void>;
  fetchMaintenanceById: (pmId: string) => Promise<PreventiveMaintenance | null>;
  createMaintenance: (data: CreatePreventiveMaintenanceData) => Promise<PreventiveMaintenance | null>;
  updateMaintenance: (pmId: string, data: UpdatePreventiveMaintenanceData) => Promise<PreventiveMaintenance | null>;
  deleteMaintenance: (pmId: string) => Promise<boolean>;
  completeMaintenance: (pmId: string, data: CompletePreventiveMaintenanceData) => Promise<PreventiveMaintenance | null>;

  initialize: () => Promise<void>;

  debugMachineFilter: (machineId: string) => Promise<void>;
  testMachineFiltering: () => void;
}

export const usePreventiveStore = create<PreventiveStoreState>((set, get) => ({
  maintenanceItems: [],
  topics: [],
  machines: [],
  statistics: null,
  selectedMaintenance: null,
  totalCount: 0,
  isLoading: false,
  error: null,
  filterParams: { status: '', page: 1, page_size: 10 },

  setFilterParams: (params) => set({ filterParams: { ...get().filterParams, ...params } }),
  clearError: () => set({ error: null }),

  fetchMachines: async (propertyId?: string) => {
    try {
      const service = new MachineService();
      const response = await service.getMachines(propertyId);
      if (response.success && response.data) {
        set({ machines: response.data });
      } else {
        set({ machines: [] });
      }
    } catch (err: any) {
      set({ machines: [] });
    }
  },

  fetchTopics: async () => {
    set({ isLoading: true, error: null });
    try {
      const topicService = new TopicService();
      const response = await topicService.getTopics();
      if (response.success && response.data) {
        set({ topics: response.data as Topic[] });
      } else {
        throw new Error(response.message || 'Failed to fetch topics');
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch topics' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchStatistics: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await preventiveMaintenanceService.getMaintenanceStatistics();
      if (response.success && response.data) {
        set({ statistics: response.data });
      } else {
        throw new Error(response.message || 'Failed to fetch maintenance statistics');
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch maintenance statistics' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMaintenanceItems: async (params?: SearchParams) => {
    set({ isLoading: true, error: null });
    try {
      const merged = { ...get().filterParams, ...params };

      const queryParams: Record<string, string | number> = {};
      if (merged.status) queryParams.status = merged.status;
      if (merged.frequency) queryParams.frequency = merged.frequency;
      if (merged.search) queryParams.search = merged.search;
      if (merged.start_date) queryParams.date_from = merged.start_date;
      if (merged.end_date) queryParams.date_to = merged.end_date;
      if (merged.property_id) queryParams.property_id = merged.property_id;
      if (merged.topic_id) queryParams.topic_id = merged.topic_id;

      let finalItems: PreventiveMaintenance[] = [];
      let finalCount = 0;

      if (merged.machine_id) {
        const response = await preventiveMaintenanceService.getAllPreventiveMaintenance(queryParams);
        if (response.success && response.data) {
          let allItems: PreventiveMaintenance[] = [];
          if (Array.isArray(response.data)) {
            allItems = response.data;
          } else if (response.data && 'results' in response.data) {
            allItems = (response.data as any).results;
          }
          finalItems = allItems.filter((item) => itemMatchesMachine(item, merged.machine_id!));
          finalCount = finalItems.length;
        }
      } else {
        if (merged.page) queryParams.page = merged.page;
        if (merged.page_size) queryParams.page_size = merged.page_size;
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

      set({ maintenanceItems: finalItems, totalCount: finalCount });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch maintenance items', maintenanceItems: [], totalCount: 0 });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMaintenanceByMachine: async (machineId: string) => {
    if (!machineId) {
      set({ error: 'Machine ID is required' });
      return;
    }
    await get().fetchMaintenanceItems({ machine_id: machineId });
  },

  fetchMaintenanceById: async (pmId: string) => {
    set({ isLoading: true, error: null });
    try {
      if (!pmId) throw new Error('Maintenance ID is required');
      const response = await preventiveMaintenanceService.getPreventiveMaintenanceById(pmId);
      if (response.success && response.data) {
        set({ selectedMaintenance: response.data });
        return response.data;
      } else {
        throw new Error(response.message || `Failed to fetch maintenance with ID ${pmId}`);
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch maintenance details' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  createMaintenance: async (data: CreatePreventiveMaintenanceData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await preventiveMaintenanceService.createPreventiveMaintenance(data);
      if (response.success && response.data) {
        await get().fetchMaintenanceItems();
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create maintenance record');
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to create maintenance record' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  updateMaintenance: async (pmId: string, data: UpdatePreventiveMaintenanceData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await preventiveMaintenanceService.updatePreventiveMaintenance(pmId, data);
      if (response.success && response.data) {
        set({ selectedMaintenance: response.data });
        await get().fetchMaintenanceItems();
        return response.data;
      } else {
        throw new Error(response.message || `Failed to update maintenance with ID ${pmId}`);
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to update maintenance record' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteMaintenance: async (pmId: string) => {
    set({ isLoading: true, error: null });
    try {
      if (!pmId) throw new Error('Maintenance ID is required');
      const response = await preventiveMaintenanceService.deletePreventiveMaintenance(pmId);
      if (response.success) {
        await get().fetchMaintenanceItems();
        if (get().selectedMaintenance?.pm_id === pmId) set({ selectedMaintenance: null });
        return true;
      } else {
        throw new Error(response.message || `Failed to delete maintenance with ID ${pmId}`);
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete maintenance record' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  completeMaintenance: async (pmId: string, data: CompletePreventiveMaintenanceData) => {
    set({ isLoading: true, error: null });
    try {
      if (!pmId) throw new Error('Maintenance ID is required');
      const response = await preventiveMaintenanceService.completePreventiveMaintenance(pmId, data);
      if (response.success && response.data) {
        set({ selectedMaintenance: response.data });
        await get().fetchMaintenanceItems();
        return response.data;
      } else {
        throw new Error(response.message || `Failed to complete maintenance with ID ${pmId}`);
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to complete maintenance record' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  initialize: async () => {
    await Promise.all([get().fetchTopics(), get().fetchStatistics(), get().fetchMachines()]);
    await get().fetchMaintenanceItems();
  },

  debugMachineFilter: async (machineId: string) => {
    try {
      await preventiveMaintenanceService.debugMachineFiltering(machineId);
      const { machines, maintenanceItems, filterParams } = get();
      const matching = maintenanceItems.filter((item) => itemMatchesMachine(item, machineId));
      console.log('Debug state:', { machinesCount: machines.length, itemsCount: maintenanceItems.length, filterParams });
      console.log(`Client-side matching: ${matching.length}/${maintenanceItems.length}`);
    } catch (error) {
      console.error('Debug failed:', error);
    }
  },

  testMachineFiltering: () => {
    const { maintenanceItems, machines } = get();
    const targetMachine = 'M257E5AC03B';
    const matching = maintenanceItems.filter((item) => item.machines?.some((m) => m.machine_id === targetMachine));
    const helperMatching = maintenanceItems.filter((item) => itemMatchesMachine(item, targetMachine));
    console.log('Manual test — counts:', maintenanceItems.length, machines.length, matching.length, helperMatching.length);
  },
}));