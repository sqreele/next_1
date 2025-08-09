#!/bin/bash
set -e

echo "🚀 Starting deployment process..."

# Pull the latest changes
git pull origin main

# Build and start containers
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d

echo "✅ Deployment completed successfully!"
