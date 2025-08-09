// types/next-auth.d.ts
import type { DefaultSession, DefaultUser } from 'next-auth'

// Define the Property interface with more specific types
interface Property {
  name: string;
  description: string;
  property_id: string;
  users: string[];
  created_at: string;  // Consider using Date type if working with dates
}

declare module 'next-auth' {
  /**
   * Extends the built-in Session type
   */
  interface Session {
    user: {
      id: string
      username: string
      email: string | null
      profile_image: string
      positions: string  // Consider making this an enum or string[] if it's a list
      properties: Property[]
      accessToken: string  // Moved from Session to user object for better organization
      refreshToken: string // Moved from Session to user object for better organization
    } & DefaultSession['user']
    expires: string
  }

  /**
   * Extends the built-in User type
   */
  interface User extends DefaultUser {
    id: string
    username: string
    email: string | null
    accessToken: string
    refreshToken: string
    profile_image: string
    positions: string
    properties: Property[]
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extends the built-in JWT type
   */
  interface JWT {
    id: string
    username: string
    email: string | null
    accessToken: string
    refreshToken: string
    profile_image: string
    positions: string
    properties: Property[]
    exp?: number  // Add expiration time for JWT
    iat?: number  // Add issued at time for JWT
    jti?: string  // Add JWT ID
  }
}

// Export the Property type for use in other files
export type { Property }