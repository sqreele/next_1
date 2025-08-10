import { useMemo, useState, useCallback } from 'react';
import { PreventiveMaintenance } from '@/app/lib/preventiveMaintenanceModels';

// Define the sort field type
type SortField = 'date' | 'status' | 'frequency' | 'machine';

// Helper function to get machine names for sorting
function getMachineNamesForSort(machines: any): string {
  if (!machines) return '';
  
  if (Array.isArray(machines)) {
    if (machines.length === 0) return '';
    
    const names = machines
      .map(machine => {
        if (typeof machine === 'string') return machine;
        if (typeof machine === 'object' && machine.name) return machine.name;
        if (typeof machine === 'object' && machine.machine_name) return machine.machine_name;
        return '';
      })
      .filter(name => name !== '');
    
    return names.length > 0 ? names.join(', ') : '';
  }
  
  if (typeof machines === 'object') {
    return machines.name || machines.machine_name || '';
  }
  
  if (typeof machines === 'string') {
    return machines;
  }
  
  return '';
}

export function useMaintenanceSort(items: PreventiveMaintenance[]) {
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
          break;
          
        case 'status':
          // Determine status for each item
          const statusA = a.completed_date ? 'completed' : 
            new Date(a.scheduled_date) < new Date() ? 'overdue' : 'pending';
          const statusB = b.completed_date ? 'completed' : 
            new Date(b.scheduled_date) < new Date() ? 'overdue' : 'pending';
          comparison = statusA.localeCompare(statusB);
          break;
          
        case 'frequency':
          comparison = (a.frequency || '').localeCompare(b.frequency || '');
          break;
          
        case 'machine':
          const machineA = getMachineNamesForSort(a.machines);
          const machineB = getMachineNamesForSort(b.machines);
          comparison = machineA.localeCompare(machineB);
          break;
          
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [items, sortBy, sortOrder]);

  const handleSort = useCallback((field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy]);

  // Helper function to get sort indicator
  const getSortIndicator = useCallback((field: SortField): string => {
    if (sortBy === field) {
      return sortOrder === 'asc' ? '↑' : '↓';
    }
    return '';
  }, [sortBy, sortOrder]);

  // Helper function to check if a field is currently being sorted
  const isSortedBy = useCallback((field: SortField): boolean => {
    return sortBy === field;
  }, [sortBy]);

  return { 
    sortedItems, 
    sortBy, 
    sortOrder, 
    handleSort,
    getSortIndicator,
    isSortedBy
  };
}

// Export the type for use in other components
export type { SortField };