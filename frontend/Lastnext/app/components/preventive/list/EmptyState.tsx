'use client';

import Link from 'next/link';
import { Settings, Plus, X } from 'lucide-react';

interface EmptyStateProps {
  hasFilters: boolean;
  currentFilters: any;
  onClearFilters: () => void;
  getMachineNameById: (id: string) => string;
}

export default function EmptyState({ 
  hasFilters, 
  currentFilters, 
  onClearFilters, 
  getMachineNameById 
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="flex justify-center mb-4">
        <div className="bg-gray-100 rounded-full p-4">
          <Settings className="h-8 w-8 text-gray-400" />
        </div>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance tasks found</h3>
      <p className="text-gray-600 mb-6 text-sm md:text-base max-w-md mx-auto">
        {hasFilters 
          ? "Try adjusting your filters to see more results or create a new task."
          : "Get started by creating your first maintenance task to keep your equipment running smoothly."
        }
      </p>
      
      {hasFilters ? (
        <div className="space-y-3">
          {currentFilters.machine && (
            <p className="text-sm text-blue-600 bg-blue-50 rounded-lg p-3 max-w-md mx-auto">
              No tasks found for machine: <strong>{getMachineNameById(currentFilters.machine)}</strong>
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onClearFilters}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
            <Link
              href="/dashboard/preventive-maintenance/create"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Task
            </Link>
          </div>
        </div>
      ) : (
        <Link
          href="/dashboard/preventive-maintenance/create"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Maintenance Task
        </Link>
      )}
    </div>
  );
}
