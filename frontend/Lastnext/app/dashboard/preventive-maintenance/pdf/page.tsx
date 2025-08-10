'use client';

import React from 'react';
import { useFilters } from '@/app/lib/FilterContext';
import PDFMaintenanceGenerator from '@/app/components/ducument/ PDFMaintenanceGenerator';

export default function PDFGeneratorPage() {
  const { currentFilters } = useFilters();

  // ✅ Correct: The 'PDFMaintenanceGenerator' component accepts the initialFilters prop.
  return <PDFMaintenanceGenerator initialFilters={{ ...currentFilters, machineId: '' /* TODO: Provide actual machineId */ }} />;
}