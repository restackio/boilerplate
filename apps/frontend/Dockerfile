# syntax=docker/dockerfile:1.4
# Enable BuildKit features for better caching and performance

# ============
# Base stage
# ============
FROM node:20-bullseye-slim AS base
# Use the official Node 20 image based on bullseye slim.
# This stage serves as the base image for all subsequent stages.

# Configure npm for better performance
RUN npm config set update-notifier false \
    && npm config set fund false

# ============
# Pruner stage
# ============
FROM base AS pruner

WORKDIR /app

# Install Turbo globally with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm install -g turbo@2.5.6

# Copy workspace configuration files first
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml ./

# Copy all package.json files to understand dependency structure
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/mcp_server/package.json ./apps/mcp_server/
COPY apps/webhook/package.json ./apps/webhook/
COPY packages/database/package.json ./packages/database/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/

# Copy only what turbo prune needs (more targeted than COPY . .)
COPY apps/frontend ./apps/frontend
COPY packages ./packages
COPY turbo.json ./

# Prune the workspace to only include necessary dependencies
RUN turbo prune boilerplate-frontend --docker

# ============
# Dependencies stage
# ============
FROM base AS dependencies

WORKDIR /app

# Install system dependencies
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && update-ca-certificates

# Install pnpm and turbo globally with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@10.15.1 turbo@2.5.6

# Copy pre-pruned dependency files from the pruner stage
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies with pnpm cache mount
# Using --frozen-lockfile for reproducible builds
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ============
# Builder stage
# ============
FROM dependencies AS builder

WORKDIR /app

# Copy the full pruned application
COPY --from=pruner /app/out/full/ .

# Build optimizations
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Skip type checking in Docker (should be done in CI)
ENV NEXT_SKIP_TYPE_CHECK=true
# Use all available CPU cores
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build the application with aggressive caching
# Next.js standalone output creates a minimal production bundle
RUN --mount=type=cache,target=/app/apps/frontend/.next/cache \
    --mount=type=cache,target=/app/.turbo \
    pnpm build --filter=boilerplate-frontend

# ============
# Runner stage (production)
# ============
FROM base AS runner

WORKDIR /app

# Install runtime dependencies (curl for healthchecks, ca-certificates for HTTPS)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
    && update-ca-certificates

# Create non-root user for security
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy Next.js standalone output (minimal, self-contained)
# This includes only the necessary files for production
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/public ./apps/frontend/public

# Switch to non-root user
USER nodejs

# Expose port 3000 for Next.js
EXPOSE 3000

# Start the standalone Next.js server directly (no pnpm needed)
# This is significantly faster and uses less memory
CMD ["node", "apps/frontend/server.js"]
