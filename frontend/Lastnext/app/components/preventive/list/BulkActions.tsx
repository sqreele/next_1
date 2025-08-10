'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';

interface BulkActionsProps {
  selectedCount: number;
  onBulkDelete: () => void;
  onClear: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({ selectedCount, onBulkDelete, onClear }) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mx-4 md:mx-0 mb-4 md:mb-6">
      <div className="flex items-center justify-between">
        <span className="text-blue-700 text-sm md:text-base font-medium">
          {selectedCount} item(s) selected
        </span>
        <div className="flex gap-2">
          <button
            onClick={onBulkDelete}
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4 inline mr-1" />
            Delete
          </button>
          <button
            onClick={onClear}
            className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActions;