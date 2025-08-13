'use client';
import { create } from 'zustand';

const API_URL = ''; // Use Next.js rewrites with relative /api/v1/* URLs
const CACHE_DURATION = 5 * 60 * 1000;

export interface PropertyRef {
  property_id: string;
  id: string | number;
  name: string;
  [key: string]: any;
}

export interface UserProfile {
  id: number | string;
  username: string;
  profile_image: string | null;
  positions: string;
  properties: PropertyRef[];
  email?: string | null;
  created_at: string;
}

export interface UserStore {
  userProfile: UserProfile | null;
  selectedProperty: string;
  loading: boolean;
  error: string | null;
  lastFetched: number;
  setSelectedProperty: (propertyId: string) => void;
  refetch: (accessToken?: string) => Promise<UserProfile | null>;
}

function normalizeProperties(propertiesData: any[]): PropertyRef[] {
  return (propertiesData || []).map((property: any) => ({
    ...property,
    property_id: property.property_id || String(property.id),
  }));
}

export const useUserStore = create<UserStore>((set, get) => ({
  userProfile: null,
  selectedProperty: '',
  loading: false,
  error: null,
  lastFetched: 0,
  setSelectedProperty: (propertyId: string) => set({ selectedProperty: propertyId }),
  refetch: async (accessToken?: string) => {
    const { lastFetched, userProfile, selectedProperty } = get();
    if (!accessToken) return null;
    if (Date.now() - lastFetched < CACHE_DURATION && userProfile) {
      return userProfile;
    }

    set({ loading: true });

    try {
      const profileResponse = await fetch(`/api/user-profiles/`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!profileResponse.ok) {
        throw new Error(`Failed to fetch profile: ${profileResponse.status}`);
      }

      const profileDataArray = await profileResponse.json();
      const profileData = Array.isArray(profileDataArray) && profileDataArray.length > 0
        ? profileDataArray[0]
        : profileDataArray;

      if (!profileData) throw new Error('No profile data found');

      const propertiesResponse = await fetch(`/api/properties/`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!propertiesResponse.ok) {
        throw new Error(`Failed to fetch properties: ${propertiesResponse.status}`);
      }

      const propertiesData = await propertiesResponse.json();
      const normalizedProperties = normalizeProperties(propertiesData);

      const profile: UserProfile = {
        id: profileData.id,
        username: profileData.username,
        profile_image: profileData.profile_image,
        positions: profileData.positions,
        email: profileData.email,
        created_at: profileData.created_at,
        properties: normalizedProperties,
      };

      let nextSelected = selectedProperty;
      if (normalizedProperties.length > 0 && !nextSelected) {
        const storedPropertyId = typeof window !== 'undefined' ? localStorage.getItem('selectedPropertyId') : null;
        const defaultPropertyId = storedPropertyId && normalizedProperties.some((p: any) => `${p.property_id}` === storedPropertyId)
          ? storedPropertyId!
          : `${normalizedProperties[0].property_id}`;
        nextSelected = defaultPropertyId;
      }

      set({ userProfile: profile, lastFetched: Date.now(), error: null, selectedProperty: nextSelected, loading: false });

      return profile;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch profile';
      set({ error: message, userProfile: null, loading: false });
      return null;
    }
  },
}));