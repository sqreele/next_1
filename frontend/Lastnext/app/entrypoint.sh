#!/bin/sh
set -e

echo "🚀 Setting up Next.js application with Prisma and NextAuth..."

# Function to check if database is ready
check_database() {
    echo "🔍 Checking database connectivity..."
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if npx prisma db execute --stdin <<< "SELECT 1;" --schema=./prisma/auth.prisma 2>/dev/null; then
            echo "✅ Database is ready!"
            return 0
        fi
        
        echo "⏳ Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Database is not ready after $max_attempts attempts"
    exit 1
}

# Function to setup database schema
setup_database() {
    echo "📋 Setting up database schema..."
    
    # Check if auth schema file exists
    if [ ! -f "./prisma/auth.prisma" ]; then
        echo "❌ Auth schema file not found at ./prisma/auth.prisma"
        exit 1
    fi
    
    # Push auth schema to database
    echo "🗄️  Creating NextAuth tables in database..."
    if npx prisma db push --schema=./prisma/auth.prisma --accept-data-loss; then
        echo "✅ Database schema updated successfully!"
    else
        echo "❌ Failed to update database schema"
        exit 1
    fi
    
    # Generate Prisma client if needed
    if [ -f "./prisma/schema.prisma" ]; then
        echo "🔧 Generating Prisma client..."
        npx prisma generate
    fi
}

# Function to run database migrations (alternative to db push)
run_migrations() {
    echo "🔄 Running database migrations..."
    if npx prisma migrate deploy --schema=./prisma/auth.prisma; then
        echo "✅ Migrations completed successfully!"
    else
        echo "⚠️  Migrations failed, falling back to db push..."
        setup_database
    fi
}

# Main setup process
main() {
    # Wait for database to be ready
    check_database
    
    # Choose migration strategy based on environment
    if [ "$NODE_ENV" = "production" ] && [ -d "./prisma/migrations" ]; then
        run_migrations
    else
        setup_database
    fi
    
    echo "🎉 Setup complete! Starting Next.js application..."
    echo "🌐 Application will be available on port ${PORT:-3000}"
    
    # Start the Next.js application
    exec npm start
}

# Handle signals gracefully
trap 'echo "🛑 Received signal, shutting down..."; exit 0' TERM INT

# Run main function
main