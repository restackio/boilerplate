FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Copy dependency files
COPY pyproject.toml ./
COPY uv.lock ./

# Copy application source
COPY . .

# Install dependencies
RUN uv sync --no-dev

# Disable colorama to prevent recursion errors in Docker
ENV NO_COLOR=1
ENV PYTHONUNBUFFERED=1

# Expose port 80
EXPOSE 80

# Start the application
CMD ["uv", "run", "start"]
