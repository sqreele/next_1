#!/bin/sh

# Wait for postgres
while ! nc -z $SQL_HOST $SQL_PORT; do
    echo "Waiting for postgres..."
    sleep 1
done
echo "PostgreSQL started"

cd src

# Create and set permissions for media and static directories
mkdir -p /app/media/maintenance_job_images
mkdir -p /app/static

# Set permissions
chown -R www-data:www-data /app/media
chown -R www-data:www-data /app/static
chmod -R 755 /app/media
chmod -R 755 /app/static

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --no-input

# Start server
python manage.py runserver 0.0.0.0:8000

exec "$@"
