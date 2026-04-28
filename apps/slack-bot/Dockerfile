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

EXPOSE 3002

CMD ["uv", "run", "start"]
