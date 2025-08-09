// app/lib/hooks/usePropertySelection.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useUser } from '@/app/lib/user-context';
import { useProperty } from '@/app/lib/PropertyContext';
import { Property, Job } from '@/app/lib/types';

/**
 * Custom hook for enhanced property selection and filtering
 */
export function usePropertySelection() {
  const { data: session, status: sessionStatus } = useSession();
  const { userProfile, loading: userLoading } = useUser();
  const { selectedProperty, setSelectedProperty } = useProperty();
  const [loading, setLoading] = useState(true);
  
  // Determine properties from either source, preferring user context
  const properties = useMemo(() => {
    const userProps = userProfile?.properties || [];
    const sessionProps = session?.user?.properties || [];
    
    return userProps.length > 0 ? userProps : sessionProps;
  }, [userProfile?.properties, session?.user?.properties]);

  // Find current property object, with fallback to first property or null if none
  const currentProperty = useMemo(() => {
    return properties.find((p) => p.property_id === selectedProperty) || properties[0] || null;
  }, [properties, selectedProperty]);

  // Select a property and persist selection
  const selectProperty = useCallback((propertyId: string | null) => {
    if (typeof window !== 'undefined') {
      if (propertyId === null) {
        localStorage.removeItem("selectedPropertyId");
        // Use empty string instead of null to satisfy the string type constraint
        setSelectedProperty("");
      } else {
        localStorage.setItem("selectedPropertyId", propertyId);
        setSelectedProperty(propertyId);
      }
    }
  }, [setSelectedProperty]);

  // Auto-select property from localStorage or first available on mount
  useEffect(() => {
    // Check if we're running in the browser environment
    if (typeof window === 'undefined') {
      return;
    }
    
    if (properties.length > 0) {
      const storedPropertyId = localStorage.getItem("selectedPropertyId");
      
      // If there's a stored property ID and it exists in our properties list
      if (storedPropertyId && properties.some(p => p.property_id === storedPropertyId)) {
        setSelectedProperty(storedPropertyId);
      } 
      // If no stored ID or it doesn't exist in properties, use the first property
      else if (!selectedProperty) {
        setSelectedProperty(properties[0].property_id);
      }
      
      setLoading(false);
    } else if (!userLoading && sessionStatus !== 'loading') {
      setLoading(false);
    }
  }, [properties, selectedProperty, setSelectedProperty, userLoading, sessionStatus]);

  // Filter jobs by property
  const filterJobsByProperty = useCallback((jobs: Job[], propertyId?: string | null): Job[] => {
    const effectivePropertyId = propertyId !== undefined ? propertyId : selectedProperty;
    
    if (!effectivePropertyId) return jobs;
    
    return jobs.filter((job) => {
      // Don't try to access property_id directly on job as it doesn't exist in the type
      
      // Check profile_image.properties
      const profileMatches = job.profile_image?.properties?.some(
        prop => {
          if (typeof prop === 'object' && prop !== null && 'property_id' in prop) {
            return String(prop.property_id) === effectivePropertyId;
          }
          return String(prop) === effectivePropertyId;
        }
      ) || false;

      if (profileMatches) return true;

      // Check rooms.properties
      const roomsMatch = job.rooms?.some(room => {
        return room.properties?.some(
          propId => String(propId) === effectivePropertyId
        );
      }) || false;

      return roomsMatch;
    });
  }, [selectedProperty]);

  // Get property name by ID
  const getPropertyName = useCallback((propertyId?: string | null): string => {
    const effectivePropertyId = propertyId !== undefined ? propertyId : selectedProperty;
    
    if (!effectivePropertyId) return 'All Properties';
    
    const property = properties.find((p) => p.property_id === effectivePropertyId);
    return property?.name || 'Unknown Property';
  }, [properties, selectedProperty]);

  return {
    properties,
    selectedProperty,
    currentProperty,
    selectProperty,
    loading: loading || userLoading || sessionStatus === 'loading',
    filterJobsByProperty,
    getPropertyName,
    isPropertySelected: !!selectedProperty,
  };
}

export default usePropertySelection;