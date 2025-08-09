// lib/fetch-client.ts
import { getSession } from 'next-auth/react';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const session = await getSession();
  
  if (!session?.user?.accessToken) {
    throw new Error('No access token');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.user.accessToken}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        if (errorData.detail) {
          throw new Error(errorData.detail);
        }
        // If no detail field, throw the raw error
        throw new Error(JSON.stringify(errorData));
      }
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}