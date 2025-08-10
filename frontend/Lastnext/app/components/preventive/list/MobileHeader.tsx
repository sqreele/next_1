'use client';

import Link from 'next/link';
import { BarChart3, RefreshCw, Filter, Plus } from 'lucide-react';

interface MobileHeaderProps {
  totalCount: number;
  overdueCount: number;
  currentFilters: any;
  isLoading: boolean;
  showFilters: boolean;
  activeFiltersCount: number;
  onRefresh: () => void;
  onToggleFilters: () => void;
}

export default function MobileHeader({
  totalCount,
  overdueCount,
  currentFilters,
  isLoading,
  showFilters,
  activeFiltersCount,
  onRefresh,
  onToggleFilters
}: MobileHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4 md:hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-600">
            {totalCount} tasks • {overdueCount} overdue
            {currentFilters.machine && (
              <span className="text-blue-600"> • Filtered</span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href="/dashboard/preventive-maintenance/dashboard"
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            title="Dashboard"
          >
            <BarChart3 className="h-5 w-5" />
          </Link>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onToggleFilters}
            className={`relative p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Filter className="h-5 w-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <Link
            href="/dashboard/preventive-maintenance/create"
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
