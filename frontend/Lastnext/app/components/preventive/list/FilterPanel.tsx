'use client';

import React from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

const getFrequencyText = (freq: string | number) => {
  if (typeof freq === 'number') return `Freq ${freq}`;
  if (!freq) return '';
  return freq.charAt(0).toUpperCase() + freq.slice(1);
};

interface FilterState {
  search: string;
  status: string;
  frequency: string | number;
  machine: string;
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
}

type SortField = 'date' | 'status' | 'frequency' | 'machine';

interface FilterPanelProps {
  currentFilters?: Partial<FilterState>;
  machineOptions: any[];
  totalCount: number;
  sortBy: SortField;
  sortOrder: 'asc' | 'desc';
  onFilterChangeAction: (key: keyof FilterState, value: string | number) => void;
  onClearFiltersAction: () => void;
  onSortChangeAction: (sortBy: SortField, sortOrder: 'asc' | 'desc') => void;
}

const defaultFilters: FilterState = {
  search: '',
  status: '',
  frequency: '',
  machine: '',
  startDate: '',
  endDate: '',
  page: 1,
  pageSize: 10
};

export default function FilterPanel({
  currentFilters = defaultFilters,
  machineOptions,
  totalCount,
  sortBy,
  sortOrder,
  onFilterChangeAction,
  onClearFiltersAction,
  onSortChangeAction,
}: FilterPanelProps) {
  const getMachineNameById = (machineId: string) => {
    const machine = machineOptions.find(m => m.id === machineId);
    return machine ? machine.name : machineId;
  };

  const handleSortChange = (value: string) => {
    const [field, order] = value.split('-');
    onSortChangeAction(field as SortField, order as 'asc' | 'desc');
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search maintenance tasks..."
          value={currentFilters.search || ''}
          onChange={(e) => onFilterChangeAction('search', e.target.value)}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {currentFilters.search && (
          <button
            onClick={() => onFilterChangeAction('search', '')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {currentFilters.status && (
          <FilterChip
            label={`Status: ${currentFilters.status}`}
            onRemove={() => onFilterChangeAction('status', '')}
            color="blue"
          />
        )}
        {currentFilters.frequency && (
          <FilterChip
            label={`Freq: ${getFrequencyText(currentFilters.frequency)}`}
            onRemove={() => onFilterChangeAction('frequency', '')}
            color="green"
          />
        )}
        {currentFilters.machine && (
          <FilterChip
            label={`Machine: ${getMachineNameById(currentFilters.machine)}`}
            onRemove={() => onFilterChangeAction('machine', '')}
            color="purple"
          />
        )}
      </div>

      {/* Expandable sections */}
      <div className="space-y-3">
        <FilterSection title="Status & Frequency">
          <div className="grid grid-cols-2 gap-3">
            <select
              value={currentFilters.status || ''}
              onChange={(e) => onFilterChangeAction('status', e.target.value)}
              className="px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
            <select
              value={currentFilters.frequency || ''}
              onChange={(e) => onFilterChangeAction('frequency', e.target.value)}
              className="px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Frequencies</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="biannually">Biannually</option>
              <option value="annually">Annually</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </FilterSection>

        <FilterSection title="Machine & Dates">
          <div className="space-y-3">
            <select
              value={currentFilters.machine || ''}
              onChange={(e) => onFilterChangeAction('machine', e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Machines</option>
              {machineOptions.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.label} ({machine.count})
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={currentFilters.startDate || ''}
                  onChange={(e) => onFilterChangeAction('startDate', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={currentFilters.endDate || ''}
                  onChange={(e) => onFilterChangeAction('endDate', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </FilterSection>

        <FilterSection title="Sort & Display">
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date-desc">Date (Newest First)</option>
            <option value="date-asc">Date (Oldest First)</option>
            <option value="status-asc">Status (A-Z)</option>
            <option value="status-desc">Status (Z-A)</option>
            <option value="machine-asc">Machine (A-Z)</option>
            <option value="machine-desc">Machine (Z-A)</option>
          </select>
        </FilterSection>
      </div>
      
      {/* Filter actions */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
        <span className="text-sm text-gray-600">
          {totalCount} tasks found
          {currentFilters.machine && (
            <span className="block text-blue-600 font-medium mt-1">
              Filtered by: {getMachineNameById(currentFilters.machine)}
            </span>
          )}
        </span>
        <button
          onClick={onClearFiltersAction}
          className="text-sm text-blue-600 hover:text-blue-800 px-3 py-2 font-medium rounded-lg hover:bg-blue-50 transition-colors"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}

// Helper components
function FilterChip({ label, onRemove, color }: { label: string; onRemove: () => void; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    purple: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className={`flex items-center px-3 py-1 rounded-full text-sm ${colorClasses[color as keyof typeof colorClasses]}`}>
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="ml-2 hover:opacity-70"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-gray-200 last:border-b-0">
      <summary className="flex items-center justify-between py-3 cursor-pointer select-none">
        <span className="font-medium text-gray-700">{title}</span>
        <ChevronDown className="h-4 w-4 text-gray-500 group-open:rotate-180 transition-transform" />
      </summary>
      <div className="pt-2 pb-4">
        {children}
      </div>
    </details>
  );
}