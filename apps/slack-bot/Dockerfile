FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS dependencies

WORKDIR /app

COPY pyproject.toml uv.lock README.md ./

RUN uv sync --no-dev --frozen

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS runtime

WORKDIR /app

COPY --from=dependencies /app/.venv ./.venv
COPY pyproject.toml uv.lock README.md ./

COPY src/ ./src/

ENV PATH="/app/.venv/bin:$PATH"
ENV NO_COLOR=1
ENV PYTHONUNBUFFERED=1
# HTTP mode (SLACK_EVENT_MODE=http) binds here; match typical ingress / targetPort 80.
# Local docker-compose overrides with SLACK_HTTP_PORT=3002. Socket mode ignores this.
ENV SLACK_HTTP_PORT=80

EXPOSE 80

CMD ["uv", "run", "start"]
