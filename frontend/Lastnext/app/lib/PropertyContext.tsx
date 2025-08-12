"use client";
import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePropertyStore } from "@/app/stores/propertyStore";

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
  const selectedProperty = usePropertyStore((s) => s.selectedProperty);
  const setSelectedProperty = usePropertyStore((s) => s.setSelectedProperty);
  const hasProperties = usePropertyStore((s) => s.hasProperties);
  const userProperties = usePropertyStore((s) => s.userProperties);
  const initializeFromSession = usePropertyStore((s) => s.initializeFromSession);

  useEffect(() => {
    const props = (session as any)?.user?.properties;
    if (props) initializeFromSession(props);
  }, [session, initializeFromSession]);

  return (
    <PropertyContext.Provider value={{ selectedProperty, setSelectedProperty, hasProperties, userProperties }}>
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
