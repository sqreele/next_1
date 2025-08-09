// app/dashboard/Preventive_maintenance/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useProperty } from '@/app/lib/PropertyContext';
import { useUser } from '@/app/lib/user-context';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import PreventiveMaintenanceDashboard from '@/app/dashboard/Preventive_maintenance/PreventiveMaintenanceDashboard';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import Link from 'next/link';
import { Wrench, AlertTriangle, Building } from 'lucide-react';

export default function PreventiveMaintenancePage() {
  const { selectedProperty, hasProperties } = useProperty();
  const { userProfile, loading: userLoading } = useUser();
  const { status } = useSession();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // If not authenticated, redirect to login
    if (status === 'unauthenticated') {
      redirect('/auth/signin');
    }
  }, [status]);

  // Handle loading state
  if (status === 'loading' || userLoading || !isClient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="text-gray-600">Loading maintenance dashboard...</p>
        </div>
      </div>
    );
  }

  // If no property is selected, show property selection prompt
  if (!selectedProperty) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <div className="mb-4 flex justify-center">
            <Building className="h-12 w-12 text-amber-500" />
          </div>
          <h1 className="text-xl font-semibold text-amber-800 mb-2">Select a Property</h1>
          <p className="text-amber-700 mb-4">
            Please select a property to view its preventive maintenance dashboard.
          </p>
          <Link href="/dashboard">
            <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // If user has no properties, show no properties message
  if (!hasProperties) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="mb-4 flex justify-center">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-red-800 mb-2">No Properties Found</h1>
          <p className="text-red-700 mb-4">
            You don't have any properties assigned to your account. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // Get the property name for the selected property
  const getPropertyName = () => {
    if (!selectedProperty || !userProfile?.properties) return 'Selected Property';
    
    const property = userProfile.properties.find(p => 
      p.property_id === selectedProperty);
    
    return property?.name || `Property ${selectedProperty}`;
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Preventive Maintenance</h1>
          <div className="flex items-center mt-2">
            <Badge variant="outline" className="text-sm font-normal flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5" />
              {getPropertyName()}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="flex items-center gap-1.5">
            <Link href="/dashboard">
              View Dashboard
            </Link>
          </Button>
          <Button asChild className="flex items-center gap-1.5">
            <Link href="/dashboard/createJob">
              <Wrench className="h-4 w-4" />
              Create Job
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Pass the selected property ID to the Preventive Maintenance Dashboard */}
      <PreventiveMaintenanceDashboard propertyId={selectedProperty} />
    </div>
  );
}