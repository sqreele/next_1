'use client';
import { create } from 'zustand';

export interface Property {
  property_id: string;
  name: string;
  description?: string | null;
  users?: number[];
  created_at?: string;
  id: string | number;
}

export interface PropertyStore {
  selectedProperty: string | null;
  userProperties: Property[];
  hasProperties: boolean;
  initializeFromSession: (properties: any[]) => void;
  setSelectedProperty: (propertyId: string) => void;
}

function normalizeProperties(raw: any[]): Property[] {
  return (raw || []).map((prop: any) => {
    const propertyId = prop?.property_id
      ? String(prop.property_id)
      : prop?.id
      ? String(prop.id)
      : typeof prop === 'string' || typeof prop === 'number'
      ? String(prop)
      : null;

    return {
      ...prop,
      property_id: propertyId || '1',
      name: prop?.name || `Property ${propertyId || 'Unknown'}`,
      id: prop?.id ?? propertyId ?? '1',
    } as Property;
  });
}

const getSavedSelectedProperty = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('selectedPropertyId');
  } catch {
    return null;
  }
};

const saveSelectedProperty = (propertyId: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (propertyId) localStorage.setItem('selectedPropertyId', propertyId);
    else localStorage.removeItem('selectedPropertyId');
  } catch {}
};

export const usePropertyStore = create<PropertyStore>((set, get) => ({
  selectedProperty: null,
  userProperties: [],
  get hasProperties() {
    return get().userProperties.length > 0;
  },
  initializeFromSession: (properties: any[]) => {
    const normalized = normalizeProperties(properties || []);
    const saved = getSavedSelectedProperty();

    let selected: string | null = null;
    if (saved && normalized.some((p) => p.property_id === saved)) {
      selected = saved;
    } else if (normalized.length > 0) {
      selected = normalized[0].property_id;
    }

    saveSelectedProperty(selected);

    set({ userProperties: normalized, selectedProperty: selected });
  },
  setSelectedProperty: (propertyId: string) => {
    if (!propertyId) {
      saveSelectedProperty(null);
      set({ selectedProperty: null });
      return;
    }

    const exists = get().userProperties.some((p) => p.property_id === propertyId);
    if (exists) {
      saveSelectedProperty(propertyId);
      set({ selectedProperty: propertyId });
    }
  },
}));