# syntax=docker/dockerfile:1.4
# Enable BuildKit features for better caching and performance

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base

WORKDIR /app

# Install system dependencies if needed
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates

# ============
# Dependencies stage
# ============
FROM base AS dependencies

# Copy only dependency files for better caching
COPY pyproject.toml uv.lock README.md ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-dev --frozen

# ============
# Runtime stage
# ============
FROM base AS runtime

# Copy installed dependencies from dependencies stage
COPY --from=dependencies /app/.venv /app/.venv

# Copy application source
COPY src ./src

# Set Python path to use installed dependencies
ENV PATH="/app/.venv/bin:$PATH"

# Expose port 80
EXPOSE 80

# Start the application with exec form for better signal handling
CMD ["uv", "run", "start"]
