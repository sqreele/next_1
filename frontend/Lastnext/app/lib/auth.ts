import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "@/app/lib/prisma";
import { UserProfile, Property } from "@/app/lib/types";
import { getUserProperties } from "./prisma-user-property";
import { refreshAccessToken } from "./auth-helpers";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "https://pmcs.site");

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
          throw new Error("Missing credentials.");
        }

        try {
          /** 🔹 Step 1: Get authentication tokens from API */
          const tokenResponse = await fetch(`${API_BASE_URL}/api/token/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          });

          if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error(`Token fetch failed: ${tokenResponse.status} - ${errorText}`);
            throw new Error("Invalid credentials.");
          }

          const tokenData = await tokenResponse.json();
          if (!tokenData.access || !tokenData.refresh) {
            throw new Error("Token response missing access or refresh token.");
          }

          /** 🔹 Step 2: Decode JWT token to get user ID and expiry */
          const decoded = jwt.decode(tokenData.access) as JwtPayload;
          if (!decoded || typeof decoded !== "object" || !decoded.user_id) {
            throw new Error("Failed to decode access token.");
          }

          const userId = String(decoded.user_id);
          // Calculate token expiry time
          const accessTokenExpires = decoded.exp ? decoded.exp * 1000 : Date.now() + 60 * 60 * 1000;

          /** 🔹 Step 3: Fetch user from Prisma database */
          let user = await prisma.user.findUnique({
            where: { id: userId },
          });

          /** 🔹 Step 4: Fetch user profile from API */
          let profileData: Partial<UserProfile> = {};
          const profileResponse = await fetch(`${API_BASE_URL}/api/user-profiles/${userId}/`, {
            headers: { Authorization: `Bearer ${tokenData.access}`, "Content-Type": "application/json" },
          });

          if (profileResponse.ok) {
            profileData = await profileResponse.json();
          } else {
            console.error(`Profile fetch failed: ${profileResponse.status}`);
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
              console.error("Failed to get properties:", error);
              normalizedProperties = [];
            }
          }

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
          return {
            ...userProfile,
            accessToken: tokenData.access,
            refreshToken: tokenData.refresh,
            accessTokenExpires: accessTokenExpires,
          };
        } catch (error) {
          console.error("Authorization Error:", error);
          throw new Error("Unable to log in. Please check your credentials.");
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.email = user.email;
        token.profile_image = user.profile_image;
        token.positions = user.positions;
        token.properties = Array.isArray(user.properties) ? user.properties : [];
        token.created_at = user.created_at;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = user.accessTokenExpires;
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, try to update it
      try {
        console.log("Access token has expired. Attempting refresh...");
        const refreshedToken = await refreshAccessToken(token.refreshToken as string);
        
        if (refreshedToken.error) {
          console.error("Error refreshing token:", refreshedToken.error);
          return { ...token, error: "RefreshAccessTokenError" };
        }
        
        console.log("Token refreshed successfully");
        return {
          ...token,
          accessToken: refreshedToken.accessToken,
          refreshToken: refreshedToken.refreshToken || token.refreshToken,
          accessTokenExpires: refreshedToken.accessTokenExpires,
        };
      } catch (error) {
        console.error("Token refresh error:", error);
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },

    async session({ session, token }) {
      session.user = {
        id: token.id as string,
        username: token.username as string,
        email: token.email as string | null,
        profile_image: token.profile_image as string | null,
        positions: token.positions as string,
        properties: token.properties as Property[],
        created_at: token.created_at as string,
        accessToken: token.accessToken as string,
        refreshToken: token.refreshToken as string,
      };
      
      // Pass error to the session if token refresh failed
      if (token.error) {
        session.error = token.error as string;
      }
      
      return session;
    },
  },

  events: {
    async signIn({ user }) {
      console.log(`User ${user.id} signed in successfully`);
    },
    async session({ session, token }) {
      if (token.error === "RefreshAccessTokenError") {
        console.error(`Session error: Failed to refresh access token`);
      }
    },
  },

  pages: { signIn: "/auth/signin" },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Refresh every 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== "production",
};

export default NextAuth(authOptions);
