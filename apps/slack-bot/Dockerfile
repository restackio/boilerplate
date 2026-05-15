FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base

WORKDIR /app

# ============
# Dependencies stage
# ============
FROM base AS dependencies

WORKDIR /app

# Copy only dependency files for better caching.
# README.md is required by uv for package metadata.
# Paths are relative to build context (project root).
COPY apps/slack-bot/pyproject.toml apps/slack-bot/uv.lock apps/slack-bot/README.md ./

RUN uv sync --no-dev --frozen

# ============
# Runtime stage
# ============
FROM base AS runtime

WORKDIR /app

COPY --from=dependencies /app/.venv ./.venv

# Project metadata is needed at runtime for ``uv run`` to resolve the script.
COPY apps/slack-bot/pyproject.toml apps/slack-bot/uv.lock apps/slack-bot/README.md ./

# Application source last so it doesn't bust the dependency cache on every edit.
COPY apps/slack-bot/src ./src

ENV PATH="/app/.venv/bin:$PATH"

ENV NO_COLOR=1
ENV PYTHONUNBUFFERED=1

# HTTP mode (SLACK_EVENT_MODE=http) binds here. Default is 3000 to match the
# ``app`` shape in restackio/helm (templates/app/deployment.yaml hard-codes
# containerPort=3000, the service forwards to it, and the ingress exposes it).
# Local docker-compose overrides with SLACK_HTTP_PORT=3002. Socket mode ignores
# this entirely.
ENV SLACK_HTTP_PORT=3000

EXPOSE 3000

CMD ["uv", "run", "start"]
