import { useMemo, useCallback } from 'react';
import { PreventiveMaintenance } from '@/app/lib/preventiveMaintenanceModels';

// Helper function to check if item matches status filter
function matchesStatus(item: PreventiveMaintenance, statusFilter: string): boolean {
  if (!statusFilter || statusFilter === 'all') return true;
  
  const now = new Date();
  const scheduledDate = new Date(item.scheduled_date);
  
  switch (statusFilter) {
    case 'completed':
      return !!item.completed_date;
    case 'pending':
      return !item.completed_date && scheduledDate >= now;
    case 'overdue':
      return !item.completed_date && scheduledDate < now;
    default:
      return true;
  }
}

// Helper function to check if item matches machine filter
function matchesMachine(item: PreventiveMaintenance, machineFilter: string): boolean {
  if (!machineFilter || machineFilter === 'all') return true;
  
  // Check if item has machines array
  if (!item.machines || !Array.isArray(item.machines)) {
    return false;
  }
  
  // Check if any machine in the array matches the filter
  return item.machines.some(machine => {
    if (typeof machine === 'object' && machine !== null) {
      // Check machine_id (exact match)
      if (machine.machine_id === machineFilter) return true;
      
      // Check name (case insensitive)
      if (machine.name && machine.name.toLowerCase().includes(machineFilter.toLowerCase())) return true;
    }
    return false;
  });
}

// Helper function to check if item matches frequency filter
function matchesFrequency(item: PreventiveMaintenance, frequencyFilter: string): boolean {
  if (!frequencyFilter || frequencyFilter === 'all') return true;
  return item.frequency === frequencyFilter;
}

// Helper function to check if item matches search filter
function matchesSearch(item: PreventiveMaintenance, searchFilter: string): boolean {
  if (!searchFilter || searchFilter.trim() === '') return true;
  
  const searchTerm = searchFilter.toLowerCase().trim();
  
  // Search in title
  if (item.pmtitle && item.pmtitle.toLowerCase().includes(searchTerm)) return true;
  
  // Search in notes
  if (item.notes && item.notes.toLowerCase().includes(searchTerm)) return true;
  
  // Search in PM ID
  if (item.pm_id && item.pm_id.toLowerCase().includes(searchTerm)) return true;
  
  // Search in machine names
  if (item.machines && Array.isArray(item.machines)) {
    const machineMatch = item.machines.some(machine => {
      if (typeof machine === 'object' && machine !== null) {
        return (machine.name && machine.name.toLowerCase().includes(searchTerm)) ||
               (machine.machine_id && machine.machine_id.toLowerCase().includes(searchTerm));
      }
      return false;
    });
    if (machineMatch) return true;
  }
  
  return false;
}

// Helper function to check if item matches date range filter
function matchesDateRange(item: PreventiveMaintenance, startDate?: string, endDate?: string): boolean {
  if (!startDate && !endDate) return true;
  
  const itemDate = new Date(item.scheduled_date);
  
  if (startDate) {
    const start = new Date(startDate);
    if (itemDate < start) return false;
  }
  
  if (endDate) {
    const end = new Date(endDate);
    if (itemDate > end) return false;
  }
  
  return true;
}

export interface FilterOptions {
  status?: string;
  machine?: string;
  frequency?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface MaintenanceStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

export function useMaintenanceFilters(items: PreventiveMaintenance[], filters: FilterOptions) {
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Apply all filters
      if (!matchesStatus(item, filters.status || '')) return false;
      if (!matchesMachine(item, filters.machine || '')) return false;
      if (!matchesFrequency(item, filters.frequency || '')) return false;
      if (!matchesSearch(item, filters.search || '')) return false;
      if (!matchesDateRange(item, filters.startDate, filters.endDate)) return false;
      
      return true;
    });
  }, [items, filters]);

  const stats = useMemo((): MaintenanceStats => {
    const now = new Date();
    
    const completed = filteredItems.filter(item => item.completed_date).length;
    const overdue = filteredItems.filter(item => 
      !item.completed_date && new Date(item.scheduled_date) < now
    ).length;
    const pending = filteredItems.filter(item => 
      !item.completed_date && new Date(item.scheduled_date) >= now
    ).length;
    
    return { 
      total: filteredItems.length, 
      completed, 
      overdue, 
      pending 
    };
  }, [filteredItems]);

  // Function to get unique machines from filtered items
  const getUniqueMachines = useCallback(() => {
    const machineMap = new Map<string, { id: string; name: string; count: number }>();
    
    filteredItems.forEach(item => {
      if (item.machines && Array.isArray(item.machines)) {
        item.machines.forEach(machine => {
          if (typeof machine === 'object' && machine !== null && machine.machine_id) {
            const existing = machineMap.get(machine.machine_id);
            if (existing) {
              existing.count += 1;
            } else {
              machineMap.set(machine.machine_id, {
                id: machine.machine_id,
                name: machine.name || machine.machine_id,
                count: 1
              });
            }
          }
        });
      }
    });
    
    return Array.from(machineMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredItems]);

  // Function to get unique frequencies from filtered items
  const getUniqueFrequencies = useCallback(() => {
    const frequencyMap = new Map<string, number>();
    
    filteredItems.forEach(item => {
      const existing = frequencyMap.get(item.frequency);
      frequencyMap.set(item.frequency, (existing || 0) + 1);
    });
    
    return Array.from(frequencyMap.entries()).map(([frequency, count]) => ({
      frequency,
      count
    })).sort((a, b) => a.frequency.localeCompare(b.frequency));
  }, [filteredItems]);

  return { 
    filteredItems, 
    stats,
    getUniqueMachines,
    getUniqueFrequencies
  };
}
