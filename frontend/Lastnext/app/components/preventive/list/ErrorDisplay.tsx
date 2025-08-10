'use client';

import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorDisplayProps {
  error: string;
  onClear: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onClear }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-4 md:mx-0 mb-4 md:mb-6">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-red-700 text-sm md:text-base">{error}</p>
        </div>
        <button
          onClick={onClear}
          className="ml-2 text-red-500 hover:text-red-700 p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ErrorDisplay;