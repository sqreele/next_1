// app/lib/utils/auth-utils.ts
import { jwtDecode } from 'jwt-decode';

export interface TokenPayload {
  user_id: string;
  exp: number;
  iat: number;
  [key: string]: any;
}

/**
 * Decode and validate JWT token
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    
    // Check if token has required fields
    if (!decoded.user_id || !decoded.exp) {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
}

/**
 * Check if token will expire soon (within threshold)
 */
export function isTokenExpiringSoon(token: string, thresholdMinutes: number = 5): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  
  const currentTime = Date.now() / 1000;
  const thresholdSeconds = thresholdMinutes * 60;
  return decoded.exp - currentTime < thresholdSeconds;
}

/**
 * Get token expiry time in milliseconds
 */
export function getTokenExpiryTime(token: string): number | null {
  const decoded = decodeToken(token);
  if (!decoded) return null;
  
  return decoded.exp * 1000; // Convert to milliseconds
}

/**
 * Validate token format and structure
 */
export function validateToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Basic JWT format validation (3 parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  // Try to decode to check if it's a valid JWT
  const decoded = decodeToken(token);
  return decoded !== null;
}

/**
 * Sanitize user data for client-side use
 */
export function sanitizeUserData(user: any) {
  if (!user) return null;
  
  // Remove sensitive information
  const { accessToken, refreshToken, ...sanitizedUser } = user;
  
  return sanitizedUser;
}

/**
 * Create secure headers for API requests
 */
export function createSecureHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  return headers;
}

/**
 * Handle authentication errors consistently
 */
export function handleAuthError(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }
  
  if (error?.response?.status === 401) {
    return 'Authentication failed. Please log in again.';
  }
  
  if (error?.response?.status === 403) {
    return 'Access denied. You do not have permission to perform this action.';
  }
  
  if (error?.response?.status >= 500) {
    return 'Server error. Please try again later.';
  }
  
  return 'An unexpected error occurred. Please try again.';
} 