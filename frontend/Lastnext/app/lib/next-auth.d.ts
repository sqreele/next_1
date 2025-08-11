import type { Property } from "@/app/lib/types";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    email: string | null;
    profile_image: string | null;
    positions: string;
    properties: Property[];
    accessToken: string;
    refreshToken: string;
    accessTokenExpires?: number;
    created_at?: string;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      email: string | null;
      profile_image: string | null;
      positions: string;
      properties: Property[];
      accessToken: string;
      refreshToken: string;
      accessTokenExpires?: number;
      sessionToken?: string;
      created_at?: string;
      error?: string;
    };
    error?: string;
    expires: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    email: string | null;
    profile_image: string | null;
    positions: string;
    properties: Property[];
    created_at?: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpires?: number;
    error?: string;
    iat?: number;
    exp?: number;
    jti?: string;
  }
}
