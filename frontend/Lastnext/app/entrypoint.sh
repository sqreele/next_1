#!/bin/sh
set -e

echo "🚀 Setting up Next.js application with Prisma and NextAuth..."

# Function to check if database is ready
check_database() {
    echo "🔍 Checking database connectivity..."
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        # Use a simple connection test with timeout
        if timeout 5 node -e "
            const { Pool } = require('pg');
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            pool.query('SELECT 1')
                .then(() => { console.log('DB connected'); process.exit(0); })
                .catch(() => process.exit(1));
        " 2>/dev/null; then
            echo "✅ Database is ready!"
            return 0
        fi
        
        echo "⏳ Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Database is not ready after $max_attempts attempts"
    return 1
}

# Function to setup database schema
setup_database() {
    echo "📋 Setting up database schema..."
    
    # Check which Prisma schema files exist
    auth_schema="./prisma/auth.prisma"
    main_schema="./prisma/schema.prisma"
    
    if [ -f "$auth_schema" ]; then
        echo "🗄️  Found auth schema, creating NextAuth tables..."
        if npx prisma db push --schema="$auth_schema" --accept-data-loss --skip-generate; then
            echo "✅ Auth database schema updated successfully!"
        else
            echo "❌ Failed to update auth database schema"
            return 1
        fi
    fi
    
    if [ -f "$main_schema" ]; then
        echo "🗄️  Found main schema, updating database..."
        if npx prisma db push --schema="$main_schema" --accept-data-loss --skip-generate; then
            echo "✅ Main database schema updated successfully!"
        else
            echo "❌ Failed to update main database schema"
            return 1
        fi
        
        # Generate Prisma client
        echo "🔧 Generating Prisma client..."
        if npx prisma generate --schema="$main_schema"; then
            echo "✅ Prisma client generated successfully!"
        else
            echo "⚠️  Failed to generate Prisma client, but continuing..."
        fi
    fi
    
    if [ ! -f "$auth_schema" ] && [ ! -f "$main_schema" ]; then
        echo "⚠️  No Prisma schema files found, skipping database setup..."
    fi
}

# Function to run database migrations (alternative to db push)
run_migrations() {
    echo "🔄 Running database migrations..."
    
    auth_schema="./prisma/auth.prisma"
    main_schema="./prisma/schema.prisma"
    migration_success=true
    
    if [ -f "$auth_schema" ] && [ -d "./prisma/migrations-auth" ]; then
        echo "🔄 Running auth migrations..."
        if ! npx prisma migrate deploy --schema="$auth_schema"; then
            echo "⚠️  Auth migrations failed"
            migration_success=false
        fi
    fi
    
    if [ -f "$main_schema" ] && [ -d "./prisma/migrations" ]; then
        echo "🔄 Running main migrations..."
        if ! npx prisma migrate deploy --schema="$main_schema"; then
            echo "⚠️  Main migrations failed"
            migration_success=false
        fi
    fi
    
    if [ "$migration_success" = false ]; then
        echo "⚠️  Some migrations failed, falling back to db push..."
        setup_database
    else
        echo "✅ All migrations completed successfully!"
    fi
}

# Function to create health check endpoint
create_health_check() {
    echo "🏥 Setting up health check..."
    
    # Create api directory if it doesn't exist
    mkdir -p ./pages/api 2>/dev/null || mkdir -p ./app/api/health 2>/dev/null || true
    
    # Create a simple health check if it doesn't exist
    if [ ! -f "./pages/api/health.js" ] && [ ! -f "./app/api/health/route.js" ]; then
        echo "Creating health check endpoint..."
        if [ -d "./pages/api" ]; then
            cat > ./pages/api/health.js << 'EOF'
export default function handler(req, res) {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
}
EOF
        elif [ -d "./app/api" ]; then
            mkdir -p ./app/api/health
            cat > ./app/api/health/route.js << 'EOF'
export async function GET() {
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
EOF
        fi
    fi
}

# Main setup process
main() {
    echo "🔧 Starting application setup..."
    
    # Create health check endpoint
    create_health_check
    
    # Check if we should skip database setup
    if [ "$SKIP_DB_SETUP" = "true" ]; then
        echo "⏭️  Skipping database setup (SKIP_DB_SETUP=true)"
    else
        # Wait for database to be ready
        if check_database; then
            # Choose migration strategy based on environment
            if [ "$NODE_ENV" = "production" ] && [ -d "./prisma/migrations" ]; then
                run_migrations
            else
                setup_database
            fi
        else
            echo "⚠️  Database not ready, but continuing with application startup..."
        fi
    fi
    
    echo "🎉 Setup complete! Starting Next.js application..."
    echo "🌐 Application will be available on port ${PORT:-3000}"
    
    # Start the Next.js application
    # Check if we have a standalone build (this should exist now)
    if [ -f "./server.js" ]; then
        echo "🚀 Starting standalone server..."
        exec node server.js
    elif [ -f "./node_modules/.bin/next" ]; then
        echo "🚀 Starting with Next.js CLI..."
        exec ./node_modules/.bin/next start
    else
        echo "🚀 Starting with npm..."
        exec npm start
    fi
}

# Handle signals gracefully
cleanup() {
    echo "🛑 Received signal, shutting down gracefully..."
    # Kill any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    exit 0
}

trap cleanup TERM INT QUIT

# Run main function
main "$@"