// ./UserProvider.tsx

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, Dispatch, SetStateAction } from 'react'; // Import Dispatch, SetStateAction
import { useSession } from 'next-auth/react';
import { type UserProfile, type UserContextType, type Property } from '@/app/lib/types'; // Import Property if needed for profile structure

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Create context with the correct type OR undefined
const UserContext = createContext<UserContextType | undefined>(undefined);

interface FetchError extends Error {
  status?: number;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // Start loading true until initial fetch attempt
  const [error, setError] = useState<string | null>(null);
  // FIX: Change state type to allow null and initialize with null
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState(0);

  const fetchUserProfile = useCallback(async () => {
    // Don't fetch if not authenticated
    if (status !== 'authenticated' || !session?.user?.accessToken) {
        setUserProfile(null); // Clear profile if not authenticated
        setLoading(false); // Stop loading if auth status changes to unauthenticated
        return null;
    }

    // Check cache (optional, might refetch if selectedProperty changes logic below)
    // if (Date.now() - lastFetched < CACHE_DURATION && userProfile) {
    //  return userProfile;
    // }

    setLoading(true); // Set loading before fetch
    setError(null); // Clear previous errors

    try {
      const response = await fetch(`${API_URL}/api/user-profiles/me/`, { // Assuming a /me endpoint exists
        // credentials: 'include', // Usually not needed when sending Bearer token
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      });

      if (!response.ok) {
        const error = new Error('Failed to fetch user profile') as FetchError;
        error.status = response.status;
         // Handle specific errors like 401/403 if needed (e.g., trigger sign out)
        throw error;
      }

      // Assuming API returns a single profile object at /me/, not an array
      const profile: UserProfile = await response.json();

      if (!profile) {
        throw new Error('No profile data returned from API');
      }

      setUserProfile(profile);
      setLastFetched(Date.now());


      // FIX: Update default property selection logic to handle null
      // Set selectedProperty ONLY if it's currently null AND the profile has properties
      if (selectedProperty === null && profile.properties && profile.properties.length > 0) {
        // Ensure property_id exists and is string
        const firstPropertyId = profile.properties[0]?.property_id;
        if (firstPropertyId !== undefined && firstPropertyId !== null) {
             setSelectedProperty(String(firstPropertyId));
        }
      }
       // No need for else clause, keep existing selectedProperty if already set

      return profile;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch profile';
      console.error("Error fetching user profile:", err); // Log the actual error
      setError(message);
      setUserProfile(null); // Clear profile on error
      return null;
    } finally {
        // Ensure loading is set to false even if fetchUserProfile is called when component isn't mounted (though useEffect handles initial)
        setLoading(false);
    }
  }, [session?.user?.accessToken, status, selectedProperty /* removed userProfile, lastFetched to avoid potential loops if fetchUserProfile is in useEffect deps */ ]);


  // Effect to fetch profile when session status changes to authenticated
  useEffect(() => {
    if (status === 'authenticated') {
        console.log("User authenticated, fetching profile...");
        fetchUserProfile();
    } else {
        // Clear profile and reset state if user logs out or session is invalid
        setUserProfile(null);
        setSelectedProperty(null); // Reset selected property on logout
        setLoading(false); // Not loading if not authenticated
        setError(null);
    }
    // Depend only on status to trigger initial fetch or clear on logout
  }, [status, fetchUserProfile]); // fetchUserProfile is needed if it uses state that changes

  // The context value now matches UserContextType
  const value: UserContextType = { // Explicitly type the value for clarity
    userProfile,
    selectedProperty, // Now string | null
    setSelectedProperty, // Now Dispatch<SetStateAction<string | null>>, assignable to (id: string | null) => void
    loading,
    error,
    refetch: fetchUserProfile, // Provide refetch capability
  };

  // Render loading state centrally if desired, or let consumers handle it
  // if (loading && status === 'authenticated') {
  //    return <div>Loading user data...</div>; // Or a spinner component
  // }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// useUser hook remains the same
export const useUser = (): UserContextType => { // Return the non-undefined type
  const context = useContext(UserContext);
  if (context === undefined) { // Check for undefined explicitly
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};