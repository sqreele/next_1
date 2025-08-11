// app/lib/auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import jwt, { JwtPayload } from "jsonwebtoken";
import { NextAuthOptions } from "next-auth";
import { prisma } from "@/app/lib/prisma";
import { UserProfile, Property } from "@/app/lib/types";
import { getUserProperties } from "./prisma-user-property";
import { refreshAccessToken } from "./auth-helpers";
import { API_CONFIG, AUTH_CONFIG, ERROR_TYPES } from "./config";
import { decodeToken, validateToken, getTokenExpiryTime } from "./utils/auth-utils";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.error("🔐 Missing credentials");
          throw new Error("Missing credentials.");
        }

        try {
          console.log("🔐 Starting authentication for:", credentials.username);

          /** 🔹 Step 1: Get authentication tokens from API */
          const tokenResponse = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          });

          console.log("🔐 Token response status:", tokenResponse.status);

          if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error(`🔐 Token fetch failed: ${tokenResponse.status} - ${errorText}`);
            throw new Error("Invalid credentials.");
          }

          const tokenData = await tokenResponse.json();
          console.log("🔐 Token data received:", {
            hasAccess: !!tokenData.access,
            hasRefresh: !!tokenData.refresh,
            accessLength: tokenData.access?.length,
            refreshLength: tokenData.refresh?.length
          });

          if (!tokenData.access || !tokenData.refresh) {
            throw new Error("Token response missing access or refresh token.");
          }

          /** 🔹 Step 2: Decode JWT token to get user ID and expiry */
          if (!validateToken(tokenData.access)) {
            throw new Error("Invalid access token format.");
          }

          const decoded = decodeToken(tokenData.access);
          if (!decoded) {
            throw new Error("Failed to decode access token.");
          }

          const userId = String(decoded.user_id);
          const accessTokenExpires = getTokenExpiryTime(tokenData.access) || Date.now() + 60 * 60 * 1000;

          console.log("🔐 Token decoded:", {
            userId,
            expiresAt: new Date(accessTokenExpires).toISOString()
          });

          /** 🔹 Step 3: Fetch user from Prisma database */
          let user = await prisma.user.findUnique({
            where: { id: userId },
          });

          /** 🔹 Step 4: Fetch user profile from API */
          let profileData: Partial<UserProfile> = {};
          const profileResponse = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.userProfile}${userId}/`, {
            headers: { Authorization: `Bearer ${tokenData.access}`, "Content-Type": "application/json" },
          });

          if (profileResponse.ok) {
            profileData = await profileResponse.json();
            console.log("🔐 Profile data fetched successfully");
          } else {
            console.error(`🔐 Profile fetch failed: ${profileResponse.status}`);
          }

          /** 🔹 Step 5: Create or update user in Prisma */
          if (!user) {
            user = await prisma.user.upsert({
              where: { id: userId },
              update: {
                username: credentials.username,
                email: profileData.email || null,
                profile_image: profileData.profile_image || null,
                positions: profileData.positions || "User",
                created_at: profileData.created_at ? new Date(profileData.created_at) : new Date(),
              },
              create: {
                id: userId,
                username: credentials.username,
                email: profileData.email || null,
                profile_image: profileData.profile_image || null,
                positions: profileData.positions || "User",
                created_at: profileData.created_at ? new Date(profileData.created_at) : new Date(),
              },
            });
            console.log("🔐 User created/updated in database");
          }

          /** 🔹 Step 6: Normalize properties */
          let normalizedProperties: Property[] = [];
          
          if (profileData.properties && profileData.properties.length > 0) {
            normalizedProperties = profileData.properties.map((prop: any) => ({
              id: String(prop.id),
              property_id: String(prop.property_id || prop.id),
              name: prop.name || `Property ${prop.id}`,
              description: prop.description || "",
              created_at: prop.created_at || new Date().toISOString(),
              users: prop.users || [],
            }));
          } else {
            try {
              normalizedProperties = await getUserProperties(userId);
            } catch (error) {
              console.error("🔐 Failed to get properties:", error);
              normalizedProperties = [];
            }
          }

          console.log("🔐 Properties normalized:", normalizedProperties.length);

          /** 🔹 Step 7: Construct user profile */
          const userProfile: UserProfile = {
            id: userId,
            username: credentials.username,
            email: user.email || profileData.email || null,
            profile_image: user.profile_image || profileData.profile_image || null,
            positions: user.positions || profileData.positions || "User",
            properties: normalizedProperties,
            created_at: user.created_at.toISOString() || profileData.created_at || new Date().toISOString(),
          };

          /** 🔹 Step 8: Return the user object with token expiry time */
          const returnUser = {
            ...userProfile,
            accessToken: tokenData.access,
            refreshToken: tokenData.refresh,
            accessTokenExpires: accessTokenExpires,
          };

          console.log("🔐 User authentication successful:", {
            userId: returnUser.id,
            username: returnUser.username,
            hasAccessToken: !!returnUser.accessToken,
            propertiesCount: returnUser.properties.length
          });

          return returnUser;
        } catch (error) {
          console.error("🔐 Authorization Error:", error);
          throw new Error("Unable to log in. Please check your credentials.");
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      console.log("🔐 JWT callback", {
        hasUser: !!user,
        hasToken: !!token,
        userKeys: user ? Object.keys(user) : [],
        tokenKeys: token ? Object.keys(token) : []
      });

      // Initial sign in
      if (user) {
        console.log("🔐 Initial sign in - setting token data");
        const newToken = {
          ...token,
          id: user.id,
          username: user.username,
          email: user.email,
          profile_image: user.profile_image,
          positions: user.positions,
          properties: Array.isArray(user.properties) ? user.properties : [],
          created_at: user.created_at,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: user.accessTokenExpires,
        };
        
        console.log("🔐 New token created", {
          hasAccessToken: !!newToken.accessToken,
          tokenLength: newToken.accessToken?.length,
          expiresAt: new Date(newToken.accessTokenExpires as number).toISOString()
        });
        
        return newToken;
      }

      // Check if token exists and has required properties
      if (!token?.accessToken || !token?.accessTokenExpires) {
        console.error("🔐 Token missing required properties", {
          hasAccessToken: !!token?.accessToken,
          hasExpires: !!token?.accessTokenExpires,
          tokenKeys: token ? Object.keys(token) : []
        });
        return { ...token, error: ERROR_TYPES.REFRESH_TOKEN_ERROR };
      }

      // Return previous token if the access token has not expired yet
      const now = Date.now();
      const expiresAt = token.accessTokenExpires as number;
      const timeUntilExpiry = expiresAt - now;
      
      console.log("🔐 Token expiry check", {
        now: new Date(now).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        timeUntilExpiry: Math.round(timeUntilExpiry / 1000 / 60) + " minutes",
        isExpired: now >= expiresAt
      });

      if (now < expiresAt) {
        console.log("🔐 Token still valid");
        return token;
      }

      // Access token has expired, try to update it
      console.log("🔐 Token expired, attempting refresh...");
      try {
        const refreshedToken = await refreshAccessToken(token.refreshToken as string);
        
        if (refreshedToken.error) {
          console.error("🔐 Token refresh failed:", refreshedToken.error);
          return { ...token, error: ERROR_TYPES.REFRESH_TOKEN_ERROR };
        }
        
        console.log("🔐 Token refreshed successfully");
        return {
          ...token,
          accessToken: refreshedToken.accessToken,
          refreshToken: refreshedToken.refreshToken || token.refreshToken,
          accessTokenExpires: refreshedToken.accessTokenExpires,
          error: undefined // Clear any previous errors
        };
      } catch (error) {
        console.error("🔐 Token refresh error:", error);
        return { ...token, error: ERROR_TYPES.REFRESH_TOKEN_ERROR };
      }
    },

    async session({ session, token }) {
      console.log("🔐 Session callback triggered", {
        hasToken: !!token,
        tokenKeys: token ? Object.keys(token) : [],
        hasAccessToken: !!(token as any)?.accessToken,
        tokenError: (token as any)?.error
      });

      // If token has an error, return it to trigger re-authentication
      if ((token as any)?.error) {
        console.error("🔐 Token error in session:", (token as any).error);
        return {
          ...session,
          error: (token as any).error as string,
          user: undefined // Clear user to force re-auth
        };
      }

      // Make sure we have required token data
      if (!(token as any)?.accessToken || !(token as any)?.id) {
        console.error("🔐 Missing required token data:", {
          hasAccessToken: !!(token as any)?.accessToken,
          hasId: !!(token as any)?.id,
          tokenKeys: token ? Object.keys(token) : []
        });
        return {
          ...session,
          error: "incomplete_token",
          user: undefined
        };
      }

      try {
        session.user = {
          id: (token as any).id as string,
          username: (token as any).username as string,
          email: (token as any).email as string | null,
          profile_image: (token as any).profile_image as string | null,
          positions: (token as any).positions as string,
          properties: ((token as any).properties as Property[]) || [],
          created_at: (token as any).created_at as string,
          accessToken: (token as any).accessToken as string,
          refreshToken: (token as any).refreshToken as string,
        };

        console.log("🔐 Session created successfully", {
          userId: session.user.id,
          username: session.user.username,
          hasAccessToken: !!session.user.accessToken,
          tokenLength: session.user.accessToken?.length,
          propertiesCount: session.user.properties.length
        });

        return session;
      } catch (error) {
        console.error("🔐 Error creating session:", error);
        return {
          ...session,
          error: "session_creation_error",
          user: undefined
        };
      }
    },
  },

  events: {
    async signIn({ user }) {
      console.log(`🔐 User ${user.id} signed in successfully`);
    },
    async session({ session, token }) {
      if ((token as any).error === ERROR_TYPES.REFRESH_TOKEN_ERROR) {
        console.error(`🔐 Session error: Failed to refresh access token`);
      }
    },
  },

  pages: { 
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  
  session: {
    strategy: "jwt",
    maxAge: AUTH_CONFIG.sessionMaxAge,
    updateAge: AUTH_CONFIG.sessionUpdateAge,
  },
  
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug temporarily
};

export default authOptions;
