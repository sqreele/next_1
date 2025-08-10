'use client';

import React from 'react';
import { PreventiveMaintenance } from '@/app/lib/preventiveMaintenanceModels';
import MaintenanceItem from './MaintenanceItem';

// Define the sort field type
type SortField = 'date' | 'status' | 'frequency' | 'machine';

interface MaintenanceListProps {
  items: PreventiveMaintenance[];
  selectedItems: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectItem: (id: string, checked: boolean) => void;
  onSort: (field: string) => void;
  onDelete: (id: string) => void;
  sortBy: SortField;
  sortOrder: 'asc' | 'desc';
  formatDate: (date: string) => string;
  getMachineNames: (machines: any) => string;
  getStatusInfo: (item: PreventiveMaintenance) => any;
  getFrequencyText: (frequency: string) => string;
  currentFilters: any;
}

const MaintenanceList: React.FC<MaintenanceListProps> = ({
  items,
  selectedItems,
  onSelectAll,
  onSelectItem,
  onSort,
  onDelete,
  sortBy,
  sortOrder,
  formatDate,
  getMachineNames,
  getStatusInfo,
  getFrequencyText,
  currentFilters,
}) => {
  return (
    <div className="bg-white md:border md:border-gray-200 md:rounded-lg overflow-hidden">
      {/* Desktop Header */}
      <div className="hidden md:block bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8">
            <input
              type="checkbox"
              checked={selectedItems.length === items.length && items.length > 0}
              onChange={(e) => onSelectAll(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex-1 grid grid-cols-6 gap-4 ml-4">
            <button
              onClick={() => onSort('date')}
              className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 focus:outline-none"
            >
              Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            
            <button
              onClick={() => onSort('status')}
              className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 focus:outline-none"
            >
              Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            
            <button
              onClick={() => onSort('frequency')}
              className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 focus:outline-none"
            >
              Frequency {sortBy === 'frequency' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            
            <button
              onClick={() => onSort('machine')}
              className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 focus:outline-none"
            >
              Machine {sortBy === 'machine' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            
            <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Procedure
            </div>
            
            <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-200">
        {items.map((item) => (
          <MaintenanceItem
            key={item.pm_id}
            item={item}
            isSelected={selectedItems.includes(item.pm_id)}
            onSelect={(checked) => onSelectItem(item.pm_id, checked)}
            onDelete={onDelete}
            formatDate={formatDate}
            getMachineNames={getMachineNames}
            getStatusInfo={getStatusInfo}
            getFrequencyText={getFrequencyText}
          />
        ))}
      </div>
    </div>
  );
};

export default MaintenanceList;
