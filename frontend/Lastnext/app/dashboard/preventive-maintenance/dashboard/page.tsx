'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { PreventiveMaintenanceProvider } from '@/app/lib/PreventiveContext';

// Dynamically import the dashboard component with no SSR
const PreventiveMaintenanceDashboard = dynamic(
  () => import('@/app/components/preventive/PreventiveMaintenanceDashboard'),
  { ssr: false }
);

export default function PreventiveMaintenanceDashboardPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <PreventiveMaintenanceProvider>
        <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Preventive Maintenance Dashboard</h1>
          <PreventiveMaintenanceDashboard />
        </div>
      </PreventiveMaintenanceProvider>
    </div>
  );
}