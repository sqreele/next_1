#!/bin/sh
set -e

echo "Starting Frontend Application..."

# Generate Prisma client for main schema
echo "Generating Prisma client for main schema..."
npx prisma generate

# Generate Prisma client for auth schema
echo "Generating Prisma client for auth schema..."
npx prisma generate --schema=./prisma/auth.prisma

# Push auth schema to database
echo "Creating NextAuth tables in database..."
npx prisma db push --schema=./prisma/auth.prisma --accept-data-loss

# Start the application
echo "Starting Next.js..."
npm start
