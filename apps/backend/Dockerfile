# Build stage
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Install postgresql-client, clickhouse-client, curl for database operations
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    bash \
    gnupg \
    && curl -fsSL 'https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key' | gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb stable main" | tee /etc/apt/sources.list.d/clickhouse.list \
    && apt-get update \
    && apt-get install -y clickhouse-client \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY apps/backend/pyproject.toml ./
COPY apps/backend/uv.lock ./
COPY apps/backend/README.md ./

# Install dependencies first (better layer caching)
RUN uv sync --no-dev

# Copy source code
COPY apps/backend/src ./src

# Copy database package (migrations, demo, scripts)
COPY packages/database/ /app/packages/database/
RUN chmod +x /app/packages/database/scripts/*.sh

# Expose port 80
EXPOSE 80

# Run migrations, handle demo data, then start backend
CMD ["/bin/bash", "-c", "\
  set -e && \
  echo 'Running database migrations...' && \
  /app/packages/database/scripts/migrate.sh && \
  if [ \"$DEMO_MODE\" = \"true\" ]; then \
    if [ \"$RESET_DEMO\" = \"true\" ]; then \
      echo 'Resetting demo data...' && \
      /app/packages/database/scripts/reset-demo.sh; \
    else \
      echo 'Inserting demo data...' && \
      /app/packages/database/scripts/insert-demo.sh; \
    fi; \
  fi && \
  echo 'Starting backend service...' && \
  exec uv run start \
"]
