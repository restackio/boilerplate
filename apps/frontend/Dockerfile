# ============
# Base stage
# ============
FROM node:20-bullseye-slim AS base
# Use the official Node 20 image based on bullseye slim.
# This stage serves as the base image for all subsequent stages.

# ============
# Builder stage
# ============
FROM base AS builder

WORKDIR /app

# Install Turbo globally as it is needed during the build.
RUN npm install -g turbo@2.5.6

# First copy workspace configuration files
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY pnpm-lock.yaml ./

# Copy package.json files from all workspaces to understand the dependency structure
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/mcp_server/package.json ./apps/mcp_server/
COPY apps/webhook/package.json ./apps/webhook/
COPY packages/database/package.json ./packages/database/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/

# Now copy the rest of the application source code
COPY . .

# Prune the workspace to only include the necessary scopes.
RUN turbo prune --docker --scope boilerplate-frontend

# ============
# Installer stage
# ============
FROM base AS installer

WORKDIR /app

# Update the certificate store in this Debian-based stage.
RUN apt-get update && \
    apt-get install -y ca-certificates && \
    update-ca-certificates  \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10.15.1 && \
    npm install -g turbo@2.5.6

# Copy pre-pruned dependency files from the builder stage.
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies.
RUN pnpm install 

# Copy the full application and build it.
COPY --from=builder /app/out/full/ .
RUN pnpm build

# ============
# Final Runner stage
# ============
FROM node:20-bullseye-slim AS runner

WORKDIR /app

# Copy the production-ready built application from the installer stage.
COPY --from=installer /app .

# Install only runtime packages. Here we install curl and ca-certificates,
# then update the certificate store for secure TLS connections.
RUN npm install -g pnpm@10.15.1 \
    && apt-get update \
    && apt-get install -y ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Expose port 3000 for Next.js
EXPOSE 3000

# Start the application using pnpm.
CMD ["pnpm", "start"]

# # Dummy shell for troubleshooting
# CMD ["sh"]
