// /app/lib/JobContext.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface JobContextType {
  jobCreationCount: number; // Updated to number
  triggerJobCreation: () => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const [jobCreationCount, setJobCreationCount] = useState(0);

  const triggerJobCreation = () => {
    setJobCreationCount(prev => prev + 1); // Increment counter on job creation
  };

  return (
    <JobContext.Provider value={{ jobCreationCount, triggerJobCreation }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJob() {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJob must be used within a JobProvider');
  }
  return context;
}
