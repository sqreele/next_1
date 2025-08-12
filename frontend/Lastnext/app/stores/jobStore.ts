import { create } from 'zustand';

export interface JobStore {
  jobCreationCount: number;
  triggerJobCreation: () => void;
}

export const useJobStore = create<JobStore>((set) => ({
  jobCreationCount: 0,
  triggerJobCreation: () => set((state) => ({ jobCreationCount: state.jobCreationCount + 1 })),
}));