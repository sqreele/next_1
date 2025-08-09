
//lib/authUtils.ts

export const getAuthHeader = (): HeadersInit => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  
  export const checkAuth = async (API_BASE_URL: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/check/`, {
        credentials: 'include',
        headers: getAuthHeader(),
      });
      return response.ok;
    } catch (error) {
      console.error('Authentication check failed:', error);
      return false;
    }
  };
  