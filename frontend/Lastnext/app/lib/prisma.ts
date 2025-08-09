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

// Auth Prisma client specifically for NextAuth tables
export const authPrisma = globalForPrisma.authPrisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Cache clients in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.authPrisma = authPrisma;
}
