import { create } from 'zustand';

export interface FilterState {
  status: string;
  frequency: string;
  search: string;
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
  machine: string;
}

export interface FilterStore {
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
  machine: '',
};

export const useFilterStore = create<FilterStore>((set) => ({
  currentFilters: defaultFilters,
  setCurrentFilters: (filters) => set({ currentFilters: { ...filters } }),
  clearFilters: () => set({ currentFilters: { ...defaultFilters } }),
  updateFilter: (key, value) =>
    set((state) => ({
      currentFilters: {
        ...state.currentFilters,
        [key]: value as any,
        ...(key !== 'page' && key !== 'pageSize' ? { page: 1 } : {}),
      },
    })),
}));