# ============
# Builder stage - do everything in one stage
# ============
FROM node:20-bookworm-slim AS builder

# Install all tools in ONE layer
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
    && update-ca-certificates \
    && npm config set update-notifier false \
    && npm config set fund false \
    && npm config set audit false \
    && npm install -g pnpm@10.15.1 turbo@2.5.6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace config files in ONE layer
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml ./

# Copy all package.json files - ONE COPY per directory level
COPY apps/backend/package.json ./apps/backend/ \
     apps/frontend/package.json ./apps/frontend/ \
     apps/mcp_server/package.json ./apps/mcp_server/ \
     apps/webhook/package.json ./apps/webhook/

COPY packages/database/package.json ./packages/database/ \
     packages/eslint-config/package.json ./packages/eslint-config/ \
     packages/typescript-config/package.json ./packages/typescript-config/ \
     packages/ui/package.json ./packages/ui/

# Copy source directories
COPY apps/frontend ./apps/frontend
COPY packages ./packages

# Accept build arguments - can be passed as NEXT_PUBLIC_* or regular vars (we'll map them)
ARG RESTACK_ENGINE_API_ADDRESS
ARG RESTACK_ENGINE_API_KEY
ARG POSTHOG_KEY
ARG POSTHOG_HOST
ARG NEXT_PUBLIC_RESTACK_ENGINE_API_ADDRESS=${RESTACK_ENGINE_API_ADDRESS}
ARG NEXT_PUBLIC_RESTACK_ENGINE_API_KEY=${RESTACK_ENGINE_API_KEY}
ARG NEXT_PUBLIC_POSTHOG_KEY=${POSTHOG_KEY}
ARG NEXT_PUBLIC_POSTHOG_HOST=${POSTHOG_HOST}

# Prune, install, and build - proper turbo prune workflow
# 1. Prune to get minimal package.json files and full source
# 2. Install dependencies using pruned package.json
# 3. Copy full source (keeps node_modules from step 2)
# 4. Build with environment variables
RUN turbo prune boilerplate-frontend --docker \
    && cp -r out/json/. . \
    && pnpm install --frozen-lockfile \
    && cp -r out/full/. . \
    && NODE_ENV=production \
       NEXT_TELEMETRY_DISABLED=1 \
       NEXT_SKIP_TYPE_CHECK=true \
       NODE_OPTIONS="--max-old-space-size=4096" \
       NEXT_PUBLIC_RESTACK_ENGINE_API_ADDRESS="${NEXT_PUBLIC_RESTACK_ENGINE_API_ADDRESS}" \
       NEXT_PUBLIC_RESTACK_ENGINE_API_KEY="${NEXT_PUBLIC_RESTACK_ENGINE_API_KEY}" \
       NEXT_PUBLIC_POSTHOG_KEY="${NEXT_PUBLIC_POSTHOG_KEY}" \
       NEXT_PUBLIC_POSTHOG_HOST="${NEXT_PUBLIC_POSTHOG_HOST}" \
       pnpm build --filter=boilerplate-frontend

# ============
# Runner stage (production)
# ============
FROM node:20-bookworm-slim AS runner
# Use minimal base for smallest runtime image

# Create non-root user for security
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy Next.js standalone output
# Note: These must be separate COPYs as they have different destination paths
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/public ./apps/frontend/public

# Switch to non-root user
USER nodejs

EXPOSE 3000

# Start the standalone Next.js server
CMD ["node", "apps/frontend/server.js"]
