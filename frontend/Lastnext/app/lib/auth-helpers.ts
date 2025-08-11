// app/lib/auth-helpers.ts (update the refresh function)
import { API_CONFIG, DEBUG_CONFIG } from '@/app/lib/config';

export async function refreshAccessToken(refreshToken: string) {
  if (DEBUG_CONFIG.logAuth) {
    console.log("🔐 Starting token refresh...");
  }
  
  try {
    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.tokenRefresh}`;
    
    if (DEBUG_CONFIG.logAuth) {
      console.log("🔐 Refresh URL:", url);
    }
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🔐 Token refresh failed:", response.status, errorText);
      return { error: "Failed to refresh token" };
    }

    const tokens = await response.json();
    
    if (DEBUG_CONFIG.logAuth) {
      console.log("🔐 Token refresh successful");
    }
    
    return {
      accessToken: tokens.access,
      refreshToken: tokens.refresh || refreshToken,
      accessTokenExpires: Date.now() + 60 * 60 * 1000, // 1 hour
    };
  } catch (error) {
    console.error("🔐 Token refresh error:", error);
    return { error: "Network error during token refresh" };
  }
}
