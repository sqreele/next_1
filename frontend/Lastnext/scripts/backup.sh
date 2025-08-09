#!/bin/bash
set -e

BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)

echo "📦 Starting backup process..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup your application data
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz ./frontend

echo "✅ Backup completed successfully!"
