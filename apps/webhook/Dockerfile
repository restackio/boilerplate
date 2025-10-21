FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Copy dependency files
COPY pyproject.toml ./
COPY uv.lock ./

# Copy application source
COPY . .

# Install dependencies
RUN uv sync --no-dev

# Expose port 8000
EXPOSE 8000

# Start the application
CMD ["uv", "run", "start"]
