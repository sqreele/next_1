FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        netcat-traditional \
        postgresql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Make entrypoint script executable
COPY entrypoint.sh .
RUN chmod +x /app/entrypoint.sh

# Create directories for static and media files
RUN mkdir -p /app/static /app/media

# Run entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]

# Start Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "myLubd.wsgi:application"]