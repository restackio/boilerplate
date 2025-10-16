# syntax=docker/dockerfile:1.4
# Enable BuildKit features for better caching and performance

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base

WORKDIR /app

# Install system dependencies (postgresql-client, clickhouse-client, curl)
# Combine all apt operations for fewer layers and better caching
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        curl \
        bash \
        gnupg \
        ca-certificates \
    && curl -fsSL 'https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key' \
        | gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb stable main" \
        | tee /etc/apt/sources.list.d/clickhouse.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends clickhouse-client

# ============
# Dependencies stage
# ============
FROM base AS dependencies

# Copy only dependency files for better caching
# README.md is required by uv for package metadata
COPY apps/backend/pyproject.toml apps/backend/uv.lock apps/backend/README.md ./

# Install Python dependencies with cache mount
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-dev --frozen

# ============
# Runtime stage
# ============
FROM base AS runtime

# Copy installed dependencies from dependencies stage
COPY --from=dependencies /app/.venv /app/.venv

# Copy database package (migrations, demo data, scripts)
COPY packages/database/ /app/packages/database/
RUN chmod +x /app/packages/database/scripts/*.sh

# Copy application source (changes most frequently, copy last)
COPY apps/backend/src ./src

# Set Python path to use installed dependencies
ENV PATH="/app/.venv/bin:$PATH"

# Expose port 80
EXPOSE 80

# Run migrations, handle demo data, then start backend
# Use exec form for better signal handling
CMD ["/bin/bash", "-c", "\
  set -e && \
  echo '[Backend] Running database migrations...' && \
  /app/packages/database/scripts/migrate.sh && \
  if [ \"$DEMO_MODE\" = \"true\" ]; then \
    if [ \"$RESET_DEMO\" = \"true\" ]; then \
      echo '[Backend] Resetting demo data...' && \
      /app/packages/database/scripts/reset-demo.sh; \
    else \
      echo '[Backend] Inserting demo data...' && \
      /app/packages/database/scripts/insert-demo.sh; \
    fi; \
  fi && \
  echo '[Backend] Starting backend service...' && \
  exec uv run start \
"]
