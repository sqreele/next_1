"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useSession } from "next-auth/react";

interface Property {
  property_id: string; // e.g., "PAA1A6A0E"
  name: string;
  description?: string | null;  // Updated to accept null values
  users?: number[];
  created_at?: string;
  id: string | number;  // Django PK, e.g., 1
}

interface PropertyContextType {
  selectedProperty: string | null;
  setSelectedProperty: (propertyId: string) => void;
  hasProperties: boolean;
  userProperties: Property[];
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [selectedProperty, setSelectedPropertyState] = useState<string | null>(null);
  const [userProperties, setUserProperties] = useState<Property[]>([]);
  
  const hasProperties = userProperties.length > 0;
  
  // Debug function to log what's happening in the PropertyContext
  const logDebug = useCallback((message: string, data?: any) => {
    console.log(`[PropertyContext] ${message}`, data !== undefined ? data : '');
  }, []);
  
  // Get and normalize properties from session
  useEffect(() => {
    if (session?.user?.properties) {
      // Get properties from session
      const properties = session.user.properties;
      logDebug(`Got ${properties.length} properties from session:`, properties);
      
      // Normalize to ensure all properties have property_id consistently 
      const normalizedProperties = properties.map((prop: any) => {
        // Ensure property_id exists and is a string
        const propertyId = prop.property_id ? String(prop.property_id) : 
                           prop.id ? String(prop.id) : 
                           (typeof prop === 'string' || typeof prop === 'number') ? String(prop) : null;
        
        if (!propertyId) {
          logDebug(`Property without ID detected:`, prop);
        }
        
        return {
          ...prop,
          // Always ensure property_id is set
          property_id: propertyId || '1', // Default to '1' if no ID found
          // Ensure name is set
          name: prop.name || `Property ${propertyId || 'Unknown'}`
        };
      });
      
      logDebug(`Normalized ${normalizedProperties.length} properties`);
      setUserProperties(normalizedProperties);
    } else {
      logDebug('No properties in session');
      setUserProperties([]);
    }
  }, [session?.user?.properties, logDebug]);
  
  // Load saved selected property from localStorage on initial render
  useEffect(() => {
    const savedPropertyId = typeof window !== 'undefined' ? localStorage.getItem("selectedPropertyId") : null;
    
    if (savedPropertyId) {
      logDebug(`Found saved property ID in localStorage:`, savedPropertyId);
      
      // Only set if it exists in the user's properties
      if (userProperties.some(p => p.property_id === savedPropertyId)) {
        logDebug(`Setting selected property from localStorage:`, savedPropertyId);
        setSelectedPropertyState(savedPropertyId);
      } else if (userProperties.length > 0) {
        // If saved property doesn't exist in user properties but user has properties, select the first one
        const firstPropertyId = userProperties[0].property_id;
        logDebug(`Saved property not found in user properties. Selecting first property:`, firstPropertyId);
        setSelectedPropertyState(firstPropertyId);
        localStorage.setItem("selectedPropertyId", firstPropertyId);
      }
    } else if (userProperties.length > 0 && !selectedProperty) {
      // If no saved property but user has properties and none selected, select the first one
      const firstPropertyId = userProperties[0].property_id;
      logDebug(`No saved property. Selecting first property:`, firstPropertyId);
      setSelectedPropertyState(firstPropertyId);
      localStorage.setItem("selectedPropertyId", firstPropertyId);
    }
  }, [userProperties, selectedProperty, logDebug]);
  
  // Improved function to set the selected property
  const setSelectedProperty = useCallback((propertyId: string) => {
    logDebug(`Setting selectedProperty to:`, propertyId);
    
    if (!propertyId || propertyId === "") {
      logDebug(`Empty property ID received, setting to null`);
      setSelectedPropertyState(null);
      localStorage.removeItem("selectedPropertyId");
      return;
    }
    
    // Validate that the property exists in user properties
    const propertyExists = userProperties.some(p => p.property_id === propertyId);
    
    if (propertyExists) {
      logDebug(`Property exists, setting selected property:`, propertyId);
      setSelectedPropertyState(propertyId);
      localStorage.setItem("selectedPropertyId", propertyId);
    } else {
      logDebug(`Property ID not found in user properties:`, propertyId);
      // If property doesn't exist, don't change selection
    }
  }, [userProperties, logDebug]);
  
  // Create the context value
  const contextValue = {
    selectedProperty,
    setSelectedProperty,
    hasProperties,
    userProperties
  };
  
  return (
    <PropertyContext.Provider value={contextValue}>
      {children}
    </PropertyContext.Provider>
  );
}

// Custom hook to use the PropertyContext
export function useProperty() {
  const context = useContext(PropertyContext);
  
  if (context === undefined) {
    throw new Error("useProperty must be used within a PropertyProvider");
  }
  
  return context;
}
