FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base

WORKDIR /app

# Install system dependencies (postgresql-client, clickhouse-client, curl)
RUN apt-get update \
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
    && apt-get install -y --no-install-recommends clickhouse-client \
    && rm -rf /var/lib/apt/lists/*

# ============
# Dependencies stage
# ============
FROM base AS dependencies

# Copy only dependency files for better caching
# README.md is required by uv for package metadata
COPY pyproject.toml uv.lock README.md ./

# Install Python dependencies
RUN uv sync --no-dev --frozen

# ============
# Runtime stage
# ============
FROM base AS runtime

# Copy installed dependencies from dependencies stage
COPY --from=dependencies /app/.venv /app/.venv

# Copy database package (migrations, demo data, scripts)
# Path is relative to Dockerfile location for Kaniko builds
COPY ../../packages/database/ /app/packages/database/
RUN chmod +x /app/packages/database/scripts/*.sh

# Copy application source (changes most frequently, copy last)
COPY src ./src

# Set Python path to use installed dependencies
ENV PATH="/app/.venv/bin:$PATH"

# Expose port 80
EXPOSE 80

# Start backend service
# Migrations and demo data are now handled in src/services.py:start()
CMD ["uv", "run", "start"]
