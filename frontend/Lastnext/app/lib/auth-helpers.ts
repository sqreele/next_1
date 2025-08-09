import { jwtDecode } from "jwt-decode";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "https://pmcs.site");

/**
 * Helper function to refresh the access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Refresh token failed: ${response.status}`);
    }

    const refreshedTokens = await response.json();

    if (!refreshedTokens.access) {
      throw new Error("Refresh response did not contain access token");
    }

    // Calculate expiry time from JWT
    const decoded = jwtDecode(refreshedTokens.access);
    const expiresAt = decoded.exp ? decoded.exp * 1000 : Date.now() + 60 * 60 * 1000; // Default 1 hour

    return {
      accessToken: refreshedTokens.access,
      refreshToken: refreshedTokens.refresh || refreshToken, // Use new refresh token if provided
      accessTokenExpires: expiresAt,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      error: "RefreshAccessTokenError",
    };
  }
}
