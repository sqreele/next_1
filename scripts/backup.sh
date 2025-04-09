#!/bin/bash
set -e

DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/backup_script.log"

echo "[$DATE] 📦 Starting database backup..." >> $LOG_FILE

# Run dbbackup inside the Django container
docker exec backend python manage.py dbbackup >> $LOG_FILE 2>&1

echo "[$DATE] ✅ Database backup completed successfully." >> $LOG_FILE
