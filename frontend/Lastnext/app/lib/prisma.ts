// ./app/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Define types for global objects
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
  authPrisma: PrismaClient | undefined;
};

// Main Prisma client for your Django-generated schema
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Lazily instantiate Auth Prisma client specifically for NextAuth tables
export function getAuthPrisma(): PrismaClient {
  if (!globalForPrisma.authPrisma) {
    const databaseUrl = process.env.DATABASE_URL;
    globalForPrisma.authPrisma = new PrismaClient(
      databaseUrl
        ? { log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'] }
        : { log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'] }
    );
  }
  return globalForPrisma.authPrisma;
}

// Cache clients in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
