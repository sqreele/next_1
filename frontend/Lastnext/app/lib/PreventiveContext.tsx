// app/lib/PreventiveContext.tsx

'use client';

import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  usePreventiveStore,
  type SearchParams,
  type PreventiveStoreState,
} from '@/app/stores/preventiveStore';

interface PreventiveMaintenanceContextState {
  maintenanceItems: PreventiveStoreState['maintenanceItems'];
  topics: PreventiveStoreState['topics'];
  machines: PreventiveStoreState['machines'];
  statistics: PreventiveStoreState['statistics'];
  selectedMaintenance: PreventiveStoreState['selectedMaintenance'];
  totalCount: PreventiveStoreState['totalCount'];
  isLoading: PreventiveStoreState['isLoading'];
  error: PreventiveStoreState['error'];
  filterParams: PreventiveStoreState['filterParams'];
  fetchMaintenanceItems: (params?: SearchParams) => Promise<void>;
  fetchStatistics: () => Promise<void>;
  fetchMaintenanceById: (pmId: string) => Promise<any>;
  fetchMaintenanceByMachine: (machineId: string) => Promise<void>;
  createMaintenance: PreventiveStoreState['createMaintenance'];
  updateMaintenance: PreventiveStoreState['updateMaintenance'];
  deleteMaintenance: PreventiveStoreState['deleteMaintenance'];
  completeMaintenance: PreventiveStoreState['completeMaintenance'];
  fetchTopics: PreventiveStoreState['fetchTopics'];
  fetchMachines: PreventiveStoreState['fetchMachines'];
  setFilterParams: PreventiveStoreState['setFilterParams'];
  clearError: PreventiveStoreState['clearError'];
  debugMachineFilter: PreventiveStoreState['debugMachineFilter'];
  testMachineFiltering: PreventiveStoreState['testMachineFiltering'];
}

const PreventiveMaintenanceContext = createContext<PreventiveMaintenanceContextState | undefined>(undefined);

interface PreventiveMaintenanceProviderProps {
  children: ReactNode;
}

export const PreventiveMaintenanceProvider: React.FC<PreventiveMaintenanceProviderProps> = ({ children }) => {
  const { status } = useSession();
  const initialize = usePreventiveStore((s) => s.initialize);

  useEffect(() => {
    if (status !== 'authenticated') return;
    void initialize();
  }, [status, initialize]);

  const value: PreventiveMaintenanceContextState = {
    maintenanceItems: usePreventiveStore((s) => s.maintenanceItems),
    topics: usePreventiveStore((s) => s.topics),
    machines: usePreventiveStore((s) => s.machines),
    statistics: usePreventiveStore((s) => s.statistics),
    selectedMaintenance: usePreventiveStore((s) => s.selectedMaintenance),
    totalCount: usePreventiveStore((s) => s.totalCount),
    isLoading: usePreventiveStore((s) => s.isLoading),
    error: usePreventiveStore((s) => s.error),
    filterParams: usePreventiveStore((s) => s.filterParams),
    fetchMaintenanceItems: usePreventiveStore((s) => s.fetchMaintenanceItems),
    fetchStatistics: usePreventiveStore((s) => s.fetchStatistics),
    fetchMaintenanceById: usePreventiveStore((s) => s.fetchMaintenanceById),
    fetchMaintenanceByMachine: usePreventiveStore((s) => s.fetchMaintenanceByMachine),
    createMaintenance: usePreventiveStore((s) => s.createMaintenance),
    updateMaintenance: usePreventiveStore((s) => s.updateMaintenance),
    deleteMaintenance: usePreventiveStore((s) => s.deleteMaintenance),
    completeMaintenance: usePreventiveStore((s) => s.completeMaintenance),
    fetchTopics: usePreventiveStore((s) => s.fetchTopics),
    fetchMachines: usePreventiveStore((s) => s.fetchMachines),
    setFilterParams: usePreventiveStore((s) => s.setFilterParams),
    clearError: usePreventiveStore((s) => s.clearError),
    debugMachineFilter: usePreventiveStore((s) => s.debugMachineFilter),
    testMachineFiltering: usePreventiveStore((s) => s.testMachineFiltering),
  };

  return (
    <PreventiveMaintenanceContext.Provider value={value}>
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