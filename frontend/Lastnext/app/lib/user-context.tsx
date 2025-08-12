'use client';

import React, { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';
import { useUserStore, type UserProfile } from '@/app/stores/userStore';

export interface UserContextType {
  userProfile: UserProfile | null;
  selectedProperty: string;
  setSelectedProperty: (propertyId: string) => void;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<UserProfile | null>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const userProfile = useUserStore((s) => s.userProfile);
  const selectedProperty = useUserStore((s) => s.selectedProperty);
  const setSelectedProperty = useUserStore((s) => s.setSelectedProperty);
  const loading = useUserStore((s) => s.loading);
  const error = useUserStore((s) => s.error);
  const refetchStore = useUserStore((s) => s.refetch);

  const refetch = React.useCallback(async () => {
    const token = (session as any)?.user?.accessToken as string | undefined;
    if (!token) return null;
    return await refetchStore(token);
  }, [session, refetchStore]);

  React.useEffect(() => {
    if (status === 'authenticated') {
      const token = (session as any)?.user?.accessToken as string | undefined;
      if (token) {
        void refetchStore(token);
      }
    }
  }, [status, session, refetchStore]);

  return (
    <UserContext.Provider
      value={{
        userProfile,
        selectedProperty,
        setSelectedProperty,
        loading,
        error,
        refetch,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}