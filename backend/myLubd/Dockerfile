FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    gcc \
    netcat-traditional \
    postgresql-client \
    libpq-dev \
    python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create directories for static and media files
RUN mkdir -p /app/static /app/media

# Copy project
COPY . .

# Make entrypoint script executable
COPY entrypoint.sh .
RUN chmod +x /app/entrypoint.sh

# Run entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]

# Start Gunicorn from the src directory
CMD ["gunicorn", "--chdir", "/app/src", "--bind", "0.0.0.0:8000", "--workers", "4", "myLubd.wsgi:application"]