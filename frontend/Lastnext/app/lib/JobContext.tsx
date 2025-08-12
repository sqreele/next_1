// /app/lib/JobContext.tsx
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useJobStore } from '@/app/stores/jobStore';

interface JobContextType {
  jobCreationCount: number; // Updated to number
  triggerJobCreation: () => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  return <JobContext.Provider value={undefined}>{children}</JobContext.Provider>;
}

export function useJob() {
  const jobCreationCount = useJobStore((s) => s.jobCreationCount);
  const triggerJobCreation = useJobStore((s) => s.triggerJobCreation);
  return { jobCreationCount, triggerJobCreation } as JobContextType;
}
