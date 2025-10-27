#!/bin/sh

# Exit immediately if a command exits with a non-zero status, treat unset variables as errors
set -eu

# Defaults for SQL env vars if not set
SQL_HOST=${SQL_HOST:-db}
SQL_PORT=${SQL_PORT:-5432}
SQL_USER=${SQL_USER:-mylubd_user}
SQL_DATABASE=${SQL_DATABASE:-mylubd_db}

# Wait for Postgres to be ready using pg_isready (more reliable than port check)
echo "Waiting for PostgreSQL to be ready at ${SQL_HOST}:${SQL_PORT}..."
until pg_isready -h "$SQL_HOST" -p "$SQL_PORT" -U "$SQL_USER" -d "$SQL_DATABASE" >/dev/null 2>&1; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is ready"

cd src

# Create and set permissions for media and static directories
mkdir -p /app/media/maintenance_job_images
mkdir -p /app/static

# Set permissions
chown -R www-data:www-data /app/media
chown -R www-data:www-data /app/static
chmod -R 755 /app/media
chmod -R 755 /app/static

# Run migrations (fail fast if anything goes wrong)
echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --no-input

# Start server
echo "Starting Django development server..."
python manage.py runserver 0.0.0.0:8000

exec "$@"
