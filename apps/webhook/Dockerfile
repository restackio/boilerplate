FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Copy dependency files
COPY pyproject.toml ./
COPY uv.lock ./

# Copy application source
COPY . .

# Install dependencies
RUN uv sync --no-dev

# HTTP port the webhook server binds to. Defaults to 3000 to match the Helm
# chart's containerPort/ingress. Override with WEBHOOK_HTTP_PORT.
ENV WEBHOOK_HTTP_PORT=3000

EXPOSE 3000

# Start the application
CMD ["uv", "run", "start"]
