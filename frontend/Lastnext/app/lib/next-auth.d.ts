import type { Property } from "@/app/lib/types"; // Ensure this is correctly imported
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    email: string | null;
    profile_image: string | null;
    positions: string;
    properties: Property[]; // Use imported Property type
    accessToken: string;
    refreshToken: string;
    accessTokenExpires?: number; // Add this property
    created_at?: string; // Make optional to avoid strict TypeScript issues
  }

  interface Session {
    user: {
      id: string;
      username: string;
      email: string | null;
      profile_image: string | null;
      positions: string;
      properties: Property[]; // Use imported Property type
      accessToken: string;
      refreshToken: string;
      accessTokenExpires?: number; // Add this property
      sessionToken?: string;
      created_at?: string; // Optional
      error?: string;
    };
    error?: string; // Add this line to define the error property
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    email: string | null;
    profile_image: string | null;
    positions: string;
    properties: Property[]; // Use imported Property type
    created_at?: string; // Optional
    accessToken: string;
    refreshToken: string;
    accessTokenExpires?: number; // Add this property
    error?: string;
  }
}