// app/lib/FilterContext.tsx

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useFilterStore, type FilterState as FilterStateType } from '@/app/stores/filterStore';

interface FilterContextType {
  currentFilters: FilterStateType;
  setCurrentFilters: (filters: FilterStateType) => void;
  clearFilters: () => void;
  updateFilter: (key: keyof FilterStateType, value: string | number) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <FilterContext.Provider value={undefined}>{children}</FilterContext.Provider>;
};

export const useFilters = () => {
  const currentFilters = useFilterStore((s) => s.currentFilters);
  const setCurrentFilters = useFilterStore((s) => s.setCurrentFilters);
  const clearFilters = useFilterStore((s) => s.clearFilters);
  const updateFilter = useFilterStore((s) => s.updateFilter);

  return { currentFilters, setCurrentFilters, clearFilters, updateFilter } as FilterContextType;
};

export type { FilterStateType as FilterState };
