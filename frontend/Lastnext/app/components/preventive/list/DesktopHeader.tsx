'use client';

import Link from 'next/link';
import { BarChart3, RefreshCw, Filter, Plus, FileText, Bug } from 'lucide-react';

interface DesktopHeaderProps {
  currentFilters: any;
  isLoading: boolean;
  showFilters: boolean;
  activeFiltersCount: number;
  getMachineNameById: (id: string) => string;
  onRefresh: () => void;
  onToggleFilters: () => void;
  onTestFiltering?: () => void;
  onDebugMachine?: () => void;
}

export default function DesktopHeader({
  currentFilters,
  isLoading,
  showFilters,
  activeFiltersCount,
  getMachineNameById,
  onRefresh,
  onToggleFilters,
  onTestFiltering,
  onDebugMachine
}: DesktopHeaderProps) {
  return (
    <div className="hidden md:block container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Preventive Maintenance</h1>
          <p className="text-gray-600 mt-1">
            Manage your scheduled maintenance tasks
            {currentFilters.machine && (
              <span className="text-blue-600 font-medium"> • Filtered by: {getMachineNameById(currentFilters.machine)}</span>
            )}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* DEBUG BUTTONS - Remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="flex gap-2">
              <button
                onClick={onTestFiltering}
                className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm transition-colors"
                title="Test Filtering"
              >
                <Bug className="h-4 w-4 mr-1" />
                Test
              </button>
              <button
                onClick={onDebugMachine}
                className="flex items-center px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm transition-colors"
                title="Debug Machine"
              >
                <Bug className="h-4 w-4 mr-1" />
                Debug
              </button>
            </div>
          )}
          
          <Link
            href="/dashboard/preventive-maintenance/dashboard"
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </Link>
          
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={onToggleFilters}
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
            href="/dashboard/preventive-maintenance/pdf"
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate PDF
          </Link>
        </div>
      </div>
    </div>
  );
}
