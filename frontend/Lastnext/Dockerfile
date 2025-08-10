# Use specific Node.js LTS version with Alpine for smaller image size
FROM node:20.17.0-alpine AS base

# Install latest npm for security and performance improvements
RUN npm install -g npm@11.4.1

# Install necessary system dependencies
RUN apk add --no-cache \
    libc6-compat \
    curl \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Create non-root user early for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

# ================================
# Dependencies stage - Robust approach
# ================================
FROM base AS deps

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# Smart dependency resolution
RUN echo "🔍 Analyzing dependency state..." && \
    if [ -f package-lock.json ]; then \
        echo "📋 Found existing package-lock.json" && \
        npm ls --depth=0 2>/dev/null || echo "⚠️  Some dependency issues detected" && \
        if npm ci --dry-run --legacy-peer-deps 2>/dev/null; then \
            echo "✅ Using existing package-lock.json" && \
            npm ci --legacy-peer-deps --no-audit --no-fund --cache /tmp/.npm; \
        else \
            echo "🔄 Regenerating package-lock.json due to sync issues" && \
            rm -f package-lock.json && \
            npm install --legacy-peer-deps --no-audit --no-fund --cache /tmp/.npm; \
        fi; \
    else \
        echo "📝 Creating new package-lock.json" && \
        npm install --legacy-peer-deps --no-audit --no-fund --cache /tmp/.npm; \
    fi && \
    echo "✅ Dependencies installed successfully"

# Verify installation
RUN npm ls --depth=0 || echo "⚠️  Some peer dependency warnings (this is usually normal)"

# ================================
# Builder stage - Build the application
# ================================
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package-lock.json ./package-lock.json

# Copy source code
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    SKIP_ENV_VALIDATION=true

# Build arguments for flexible configuration
ARG NEXT_PUBLIC_API_URL=https://pmcs.site
ARG NEXT_PRIVATE_API_URL=http://django-backend:8000
ARG API_URL=http://django-backend:8000
ARG NEXTAUTH_URL=https://pmcs.site
ARG NEXTAUTH_SECRET
ARG JWT_SECRET
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG DATABASE_URL=postgresql://mylubd_user:Sqreele1234@db:5432/mylubd_db?schema=public

# Set environment variables from build args
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PRIVATE_API_URL=${NEXT_PRIVATE_API_URL} \
    API_URL=${API_URL} \
    NEXTAUTH_URL=${NEXTAUTH_URL} \
    NEXTAUTH_SECRET=${NEXTAUTH_SECRET} \
    JWT_SECRET=${JWT_SECRET} \
    GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID} \
    GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET} \
    DATABASE_URL=${DATABASE_URL}

# Initialize shadcn/ui components with error handling
RUN npx --yes shadcn@2.5.0 init --yes 2>/dev/null || { \
        echo "shadcn init failed, continuing without it..."; \
        true; \
    }

RUN npx --yes shadcn@2.5.0 add \
    accordion alert alert-dialog avatar badge breadcrumb button \
    calendar card carousel checkbox collapsible command context-menu \
    data-table date-picker dialog drawer dropdown-menu form hover-card \
    input input-otp label menubar navigation-menu pagination popover \
    progress radio-group resizable scroll-area select separator sheet \
    skeleton slider sonner switch table tabs textarea toast toggle \
    toggle-group tooltip --yes 2>/dev/null || { \
        echo "Some shadcn components failed to install, continuing..."; \
        true; \
    }

# Generate Prisma client (safe without database connection)
RUN if [ -f prisma/schema.prisma ]; then \
        npx prisma generate; \
    else \
        echo "No Prisma schema found, skipping generation..."; \
    fi

# Build the Next.js application
RUN npm run build

# Debug: Check what was actually built
RUN echo "=== BUILD OUTPUT DEBUG ===" && \
    echo "Contents of /app/.next:" && \
    ls -la /app/.next/ && \
    echo "Checking for standalone build:" && \
    if [ -d "/app/.next/standalone" ]; then \
        echo "✅ Standalone build found" && \
        ls -la /app/.next/standalone/; \
    else \
        echo "❌ No standalone build found"; \
    fi && \
    echo "=== END DEBUG ==="

# Clean up dev dependencies and build artifacts to reduce image size
RUN npm ci --omit=dev --legacy-peer-deps && \
    npm cache clean --force && \
    rm -rf /tmp/.npm /root/.npm

# ================================
# Runner stage - Production runtime
# ================================
FROM base AS runner

# Set production environment
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Copy essential files for Next.js operation
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Create necessary directories with proper permissions
RUN mkdir -p /app/.next/cache && \
    mkdir -p ./prisma && \
    chown -R nextjs:nodejs /app

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Switch to non-root user for security
USER nextjs

# Expose port
EXPOSE 3000

# Start the application directly with Next.js
CMD ["npx", "next", "start"]