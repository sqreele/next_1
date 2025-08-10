// app/lib/FilterContext.tsx

'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FilterState {
  status: string;
  frequency: string;
  search: string;
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
  machine: string; // Add machine filter
}

interface FilterContextType {
  currentFilters: FilterState;
  setCurrentFilters: (filters: FilterState) => void;
  clearFilters: () => void;
  updateFilter: (key: keyof FilterState, value: string | number) => void;
}

const defaultFilters: FilterState = {
  status: '',
  frequency: '',
  search: '',
  startDate: '',
  endDate: '',
  page: 1,
  pageSize: 10,
  machine: '', // Add default machine filter
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentFilters, setCurrentFilters] = useState<FilterState>(defaultFilters);

  const clearFilters = () => {
    setCurrentFilters(defaultFilters);
  };

  const updateFilter = (key: keyof FilterState, value: string | number) => {
    setCurrentFilters(prev => ({
      ...prev,
      [key]: value,
      // Reset page when filter changes (except when updating page itself)
      ...(key !== 'page' && key !== 'pageSize' && { page: 1 })
    }));
  };

  return (
    <FilterContext.Provider value={{
      currentFilters,
      setCurrentFilters,
      clearFilters,
      updateFilter
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};

export type { FilterState };
