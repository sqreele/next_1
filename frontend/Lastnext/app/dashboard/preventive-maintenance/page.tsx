'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePreventiveMaintenance } from '@/app/lib/PreventiveContext';
import { useFilters } from '@/app/lib/FilterContext';
import { PreventiveMaintenance } from '@/app/lib/preventiveMaintenanceModels';

// Import types
import { FilterState, MachineOption, Stats } from '@/app/lib/hooks/filterTypes';

// Import components
import MobileHeader from '@/app/components/preventive/list/MobileHeader';
import DesktopHeader from '@/app/components/preventive/list/DesktopHeader';
import StatsCards from '@/app/components/preventive/list/StatsCards';
import FilterPanel from '@/app/components/preventive/list/FilterPanel';
import MaintenanceList from '@/app/components/preventive/list/MaintenanceList';
import Pagination from '@/app/components/preventive/list/Pagination';
import DeleteModal from '@/app/components/preventive/list/DeleteModal';
import BulkActions from '@/app/components/preventive/list/BulkActions';
import LoadingState from '@/app/components/preventive/list/LoadingState';
import EmptyState from '@/app/components/preventive/list/EmptyState';
import ErrorDisplay from '@/app/components/preventive/list/ErrorDisplay';
import Link from 'next/link';
import { Filter, Plus, FileText } from 'lucide-react';

// Import utility functions
import {
  formatDate,
  getFrequencyText,
  getStatusInfo,
  getMachineNames
} from '@/app/lib/utils/maintenanceUtils';

// Define the sort field type
type SortField = 'date' | 'status' | 'frequency' | 'machine';

export default function PreventiveMaintenanceListPage() {
  const router = useRouter();
  const { currentFilters, updateFilter, clearFilters } = useFilters();
  
  const {
    maintenanceItems,
    machines,
    totalCount,
    isLoading,
    error,
    filterParams,
    fetchMaintenanceItems,
    deleteMaintenance,
    setFilterParams,
    clearError,
    debugMachineFilter,
    testMachineFiltering
  } = usePreventiveMaintenance();

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Enhanced machine options with better display
  const machineOptions = useMemo((): MachineOption[] => {
    const options = machines.map(machine => ({
      id: machine.machine_id,
      label: `${machine.name} (${machine.machine_id})`,
      name: machine.name,
      machine_id: machine.machine_id,
      count: maintenanceItems.filter(item => 
        item.machines?.some(m => m.machine_id === machine.machine_id)
      ).length
    }));
    
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [machines, maintenanceItems]);

  // Enhanced stats calculation
  const stats = useMemo((): Stats => {
    const completed = maintenanceItems.filter(item => item.completed_date).length;
    const overdue = maintenanceItems.filter(item => 
      !item.completed_date && new Date(item.scheduled_date) < new Date()
    ).length;
    const pending = maintenanceItems.filter(item => 
      !item.completed_date && new Date(item.scheduled_date) >= new Date()
    ).length;
    
    return { total: maintenanceItems.length, completed, overdue, pending };
  }, [maintenanceItems]);

  // Optimized sync with debouncing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      const newParams = {
        ...filterParams,
        status: currentFilters.status || '',
        frequency: currentFilters.frequency || '',
        search: currentFilters.search || '',
        start_date: currentFilters.startDate || '',
        end_date: currentFilters.endDate || '',
        machine_id: currentFilters.machine || '',
        page: currentFilters.page || 1,
        page_size: currentFilters.pageSize || 10
      };

      console.log('Filter sync - currentFilters:', currentFilters);
      console.log('Filter sync - newParams:', newParams);

      if (JSON.stringify(newParams) !== JSON.stringify(filterParams)) {
        console.log('Updating filter params...');
        setFilterParams(newParams);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [currentFilters, filterParams, setFilterParams]);

  // Sorted and filtered data
  const sortedItems = useMemo(() => {
    const sorted = [...maintenanceItems].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
          break;
        case 'status':
          const statusA = a.completed_date ? 'completed' : new Date(a.scheduled_date) < new Date() ? 'overdue' : 'pending';
          const statusB = b.completed_date ? 'completed' : new Date(b.scheduled_date) < new Date() ? 'overdue' : 'pending';
          comparison = statusA.localeCompare(statusB);
          break;
        case 'frequency':
          comparison = a.frequency.localeCompare(b.frequency);
          break;
        case 'machine':
          const machineA = getMachineNames(a.machines);
          const machineB = getMachineNames(b.machines);
          comparison = machineA.localeCompare(machineB);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [maintenanceItems, sortBy, sortOrder]);

  // Utility function to get machine name by ID
  const getMachineNameById = useCallback((machineId: string) => {
    const machine = machines.find(m => m.machine_id === machineId);
    return machine ? machine.name : machineId;
  }, [machines]);

  // Enhanced filter handlers - create a wrapper function
  const handleFilterChangeWrapper = useCallback((key: string, value: string | number) => {
    console.log('Filter change:', key, value);
    
    // Map string keys to FilterState keys
    const validKeys: Record<string, keyof FilterState> = {
      'status': 'status',
      'frequency': 'frequency',
      'search': 'search',
      'startDate': 'startDate',
      'endDate': 'endDate',
      'page': 'page',
      'pageSize': 'pageSize',
      'machine': 'machine'
    };

    const filterKey = validKeys[key];
    if (filterKey) {
      updateFilter(filterKey, value);
      
      // Reset to first page when filtering
      if (filterKey !== 'page' && filterKey !== 'pageSize') {
        updateFilter('page', 1);
      }
    }
  }, [updateFilter]);

  const clearAllFilters = useCallback(() => {
    console.log('Clearing all filters');
    clearFilters();
    setSelectedItems([]);
  }, [clearFilters]);

  // Enhanced sort handler with correct typing
  const handleSort = useCallback((field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy]);

  // Create a wrapper that accepts string and converts to SortField
  const handleSortWrapper = useCallback((field: string) => {
    // Validate that the field is a valid SortField
    const validSortFields: SortField[] = ['date', 'status', 'frequency', 'machine'];
    if (validSortFields.includes(field as SortField)) {
      handleSort(field as SortField);
    }
  }, [handleSort]);

  // Fixed sort change handler for FilterPanel
  const handleSortChangeAction = useCallback((field: SortField, order: 'asc' | 'desc') => {
    console.log('Sort change:', field, order);
    setSortBy(field);
    setSortOrder(order);
  }, []);

  // Selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedItems(sortedItems.map(item => item.pm_id));
    } else {
      setSelectedItems([]);
    }
  }, [sortedItems]);

  const handleSelectItem = useCallback((pmId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, pmId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== pmId));
    }
  }, []);

  // Delete handlers
  const handleDelete = useCallback(async (pmId: string) => {
    try {
      const success = await deleteMaintenance(pmId);
      if (success) {
        setDeleteConfirm(null);
        setSelectedItems(prev => prev.filter(id => id !== pmId));
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }, [deleteMaintenance]);

  const handleBulkDelete = useCallback(async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} items?`)) {
      return;
    }

    for (const pmId of selectedItems) {
      await deleteMaintenance(pmId);
    }
    setSelectedItems([]);
  }, [selectedItems, deleteMaintenance]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    console.log('Refreshing data...');
    await fetchMaintenanceItems();
  }, [fetchMaintenanceItems]);

  // DEBUG handlers
  const handleDebugMachine = useCallback(async () => {
    await debugMachineFilter('M257E5AC03B');
  }, [debugMachineFilter]);

  // Pagination
  const totalPages = Math.ceil(totalCount / (currentFilters.pageSize || 10));

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    return [
      currentFilters.status,
      currentFilters.frequency,
      currentFilters.search,
      currentFilters.startDate,
      currentFilters.endDate,
      currentFilters.machine,
    ].filter(value => value !== '').length;
  }, [currentFilters]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <MobileHeader
        totalCount={totalCount}
        overdueCount={stats.overdue}
        currentFilters={currentFilters}
        isLoading={isLoading}
        showFilters={showFilters}
        activeFiltersCount={activeFiltersCount}
        onRefresh={handleRefresh}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      {/* Desktop Header */}
      <DesktopHeader
        currentFilters={currentFilters}
        isLoading={isLoading}
        showFilters={showFilters}
        activeFiltersCount={activeFiltersCount}
        getMachineNameById={getMachineNameById}
        onRefresh={handleRefresh}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onTestFiltering={testMachineFiltering}
        onDebugMachine={handleDebugMachine}
      />

      {/* Stats Cards */}
      <div className="hidden md:block container mx-auto px-4">
        <StatsCards stats={stats} />
      </div>

      <div className="md:container md:mx-auto md:px-4">
        {/* Error Display */}
        {error && (
          <ErrorDisplay error={error} onClear={clearError} />
        )}

        {/* Filter Panel */}
        {showFilters && (
          <FilterPanel
            currentFilters={currentFilters}
            machineOptions={machineOptions}
            totalCount={totalCount}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onFilterChangeAction={handleFilterChangeWrapper}
            onClearFiltersAction={clearAllFilters}
            onSortChangeAction={handleSortChangeAction}
          />
        )}

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <BulkActions
            selectedCount={selectedItems.length}
            onBulkDelete={handleBulkDelete}
            onClear={() => setSelectedItems([])}
          />
        )}

        {/* Main Content */}
        {isLoading ? (
          <LoadingState />
        ) : sortedItems.length === 0 ? (
          <EmptyState 
            hasFilters={activeFiltersCount > 0}
            currentFilters={currentFilters}
            onClearFilters={clearAllFilters}
            getMachineNameById={getMachineNameById}
          />
        ) : (
          <MaintenanceList
            items={sortedItems}
            selectedItems={selectedItems}
            onSelectAll={handleSelectAll}
            onSelectItem={handleSelectItem}
            onSort={handleSortWrapper}
            onDelete={setDeleteConfirm}
            sortBy={sortBy}
            sortOrder={sortOrder}
            formatDate={formatDate}
            getMachineNames={getMachineNames}
            getStatusInfo={getStatusInfo}
            getFrequencyText={getFrequencyText}
            currentFilters={currentFilters}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentFilters.page || 1}
            totalPages={totalPages}
            pageSize={currentFilters.pageSize || 10}
            totalCount={totalCount}
            onPageChange={(page) => handleFilterChangeWrapper('page', page)}
            onPageSizeChange={(size) => handleFilterChangeWrapper('pageSize', size)}
          />
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 border rounded-lg transition-colors ${
              showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
          
          <Link
            href="/dashboard/preventive-maintenance/create"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Maintenance
          </Link>
          
          <Link
            href="/dashboard/preventive-maintenance/generate-report"
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate PDF
          </Link>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteConfirm && (
        <DeleteModal
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}