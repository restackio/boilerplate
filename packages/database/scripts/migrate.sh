#!/bin/bash
# Run database migrations
# Can be called via: turbo migrate --filter=@boilerplate/database
# Or directly: ./packages/database/scripts/migrate.sh

set -e

echo "========================================"
echo "Database Migrations"
echo "========================================"

# Set default URLs for local development if not provided
: "${DATABASE_URL:=postgresql://postgres:postgres@localhost:5432/boilerplate_postgres}"
: "${CLICKHOUSE_URL:=http://clickhouse:clickhouse@localhost:8123/boilerplate_clickhouse}"

# Function to parse PostgreSQL URL
parse_postgres_url() {
  local url="$1"
  url="${url#postgresql://}"
  url="${url#postgres://}"
  
  if [[ $url =~ ^([^:]+):([^@]+)@(.+)$ ]]; then
    POSTGRES_USER="${BASH_REMATCH[1]}"
    POSTGRES_PASSWORD="${BASH_REMATCH[2]}"
    url="${BASH_REMATCH[3]}"
  fi
  
  if [[ $url =~ ^([^:]+):([^/]+)/(.+)$ ]]; then
    POSTGRES_HOST="${BASH_REMATCH[1]}"
    POSTGRES_PORT="${BASH_REMATCH[2]}"
    POSTGRES_DB="${BASH_REMATCH[3]}"
  elif [[ $url =~ ^([^/]+)/(.+)$ ]]; then
    POSTGRES_HOST="${BASH_REMATCH[1]}"
    POSTGRES_PORT="5432"
    POSTGRES_DB="${BASH_REMATCH[2]}"
  fi
}

# Function to parse ClickHouse URL
parse_clickhouse_url() {
  local url="$1"
  url="${url#clickhouse://}"
  url="${url#http://}"
  url="${url#https://}"
  
  if [[ $url =~ ^([^:]+):([^@]+)@(.+)$ ]]; then
    CLICKHOUSE_USER="${BASH_REMATCH[1]}"
    CLICKHOUSE_PASSWORD="${BASH_REMATCH[2]}"
    url="${BASH_REMATCH[3]}"
  fi
  
  if [[ $url =~ ^([^:]+):([^/]+)/(.+)$ ]]; then
    CLICKHOUSE_HOST="${BASH_REMATCH[1]}"
    CLICKHOUSE_PORT="${BASH_REMATCH[2]}"
    CLICKHOUSE_DB="${BASH_REMATCH[3]}"
  elif [[ $url =~ ^([^/]+)/(.+)$ ]]; then
    CLICKHOUSE_HOST="${BASH_REMATCH[1]}"
    CLICKHOUSE_PORT="8123"
    CLICKHOUSE_DB="${BASH_REMATCH[2]}"
  fi
}

# Parse connection URLs
parse_postgres_url "$DATABASE_URL"
parse_clickhouse_url "$CLICKHOUSE_URL"

# Override host if running inside the Docker container environment
if [ -d "/app" ]; then
  echo "  Running inside Docker, targeting service hostnames..."
  POSTGRES_HOST="postgres"
  CLICKHOUSE_HOST="clickhouse"
fi

# Ensure the DB names are always correct for this project
POSTGRES_DB="boilerplate_postgres"
CLICKHOUSE_DB="boilerplate_clickhouse"

echo "PostgreSQL: $POSTGRES_USER@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
echo "ClickHouse: $CLICKHOUSE_USER@$CLICKHOUSE_HOST:$CLICKHOUSE_PORT/$CLICKHOUSE_DB"
echo ""

# Determine migrations directory
# Support both running from repo root and from Docker container
if [ -d "/app/packages/database/migrations" ]; then
  # Running in Docker container
  POSTGRES_MIGRATIONS_DIR="/app/packages/database/migrations/postgres"
  CLICKHOUSE_MIGRATIONS_DIR="/app/packages/database/migrations/clickhouse"
elif [ -d "packages/database/migrations" ]; then
  # Running from repo root
  POSTGRES_MIGRATIONS_DIR="packages/database/migrations/postgres"
  CLICKHOUSE_MIGRATIONS_DIR="packages/database/migrations/clickhouse"
elif [ -d "$(dirname "$0")/../migrations" ]; then
  # Running from scripts directory
  POSTGRES_MIGRATIONS_DIR="$(dirname "$0")/../migrations/postgres"
  CLICKHOUSE_MIGRATIONS_DIR="$(dirname "$0")/../migrations/clickhouse"
else
  echo "Error: Cannot find migrations directory"
  exit 1
fi

echo "Migrations: $POSTGRES_MIGRATIONS_DIR"
echo ""

# Wait for databases to be ready
echo "Checking database connectivity..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  echo "  Waiting for PostgreSQL..."
  sleep 2
done
echo "✓ PostgreSQL is ready"

until curl -sf "http://$CLICKHOUSE_HOST:$CLICKHOUSE_PORT/ping" > /dev/null 2>&1; do
  echo "  Waiting for ClickHouse..."
  sleep 2
done
echo "✓ ClickHouse is ready"
echo ""

# PostgreSQL migrations
echo "→ Running PostgreSQL migrations..."
for migration_file in "$POSTGRES_MIGRATIONS_DIR"/*.sql; do
  if [ ! -f "$migration_file" ]; then
    echo "  No migrations found in $POSTGRES_MIGRATIONS_DIR"
    break
  fi
  
  migration_name=$(basename "$migration_file")
  
  # Check if migration has already been applied
  already_applied=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
    "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$migration_name'" 2>/dev/null || echo "0")
  
  if [ "$already_applied" = "0" ]; then
    echo "  Applying: $migration_name"
    PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
      -f "$migration_file" > /dev/null
    
    # Record migration
    PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
      -c "INSERT INTO schema_migrations (migration_name) VALUES ('$migration_name')" > /dev/null
    
    echo "  ✓ Applied: $migration_name"
  else
    echo "  ⊙ Skipped: $migration_name (already applied)"
  fi
done

echo "✓ PostgreSQL migrations complete"
echo ""

# ClickHouse migrations
echo "→ Running ClickHouse migrations..."

for migration_file in "$CLICKHOUSE_MIGRATIONS_DIR"/*.sql; do
  if [ ! -f "$migration_file" ]; then
    echo "  No migrations found in $CLICKHOUSE_MIGRATIONS_DIR"
    break
  fi
  
  migration_name=$(basename "$migration_file")
  
  # Check if migration has already been applied, using docker exec as a fallback for local dev
  if command -v clickhouse-client &> /dev/null || [ -d "/app" ]; then
    # Use direct client if it exists OR if we are in Docker (where it's guaranteed to exist)
    already_applied=$(clickhouse-client --host "$CLICKHOUSE_HOST" --port 9000 --user "$CLICKHOUSE_USER" --password "$CLICKHOUSE_PASSWORD" --query "SELECT count() FROM system.tables WHERE database = '$CLICKHOUSE_DB' AND name = 'schema_migrations'" 2>/dev/null || echo "0")
    if [ "$already_applied" != "0" ]; then
      already_applied=$(clickhouse-client --host "$CLICKHOUSE_HOST" --port 9000 --user "$CLICKHOUSE_USER" --password "$CLICKHOUSE_PASSWORD" --query "SELECT count() FROM $CLICKHOUSE_DB.schema_migrations WHERE migration_name = '$migration_name'" 2>/dev/null || echo "0")
    fi
    
    if [ "$already_applied" = "0" ]; then
      echo "  Applying: $migration_name"
      clickhouse-client --host "$CLICKHOUSE_HOST" --port 9000 --user "$CLICKHOUSE_USER" --password "$CLICKHOUSE_PASSWORD" --allow_experimental_json_type 1 --multiquery < "$migration_file" > /dev/null
      clickhouse-client --host "$CLICKHOUSE_HOST" --port 9000 --user "$CLICKHOUSE_USER" --password "$CLICKHOUSE_PASSWORD" --query "INSERT INTO $CLICKHOUSE_DB.schema_migrations (migration_name) VALUES ('$migration_name')" > /dev/null
      echo "  ✓ Applied: $migration_name"
    else
      echo "  ⊙ Skipped: $migration_name (already applied)"
    fi

  elif docker ps --format '{{.Names}}' 2>/dev/null | grep -q "boilerplate_clickhouse"; then
    # Fallback to docker exec if running locally and client is not installed
    echo "  clickhouse-client not found, falling back to 'docker exec'..."
    already_applied=$(docker exec boilerplate_clickhouse clickhouse-client --query "SELECT count() FROM system.tables WHERE database = '$CLICKHOUSE_DB' AND name = 'schema_migrations'" 2>/dev/null || echo "0")
    if [ "$already_applied" != "0" ]; then
      already_applied=$(docker exec boilerplate_clickhouse clickhouse-client --query "SELECT count() FROM $CLICKHOUSE_DB.schema_migrations WHERE migration_name = '$migration_name'" 2>/dev/null || echo "0")
    fi
    
    if [ "$already_applied" = "0" ]; then
      echo "  Applying: $migration_name"
      docker exec -i boilerplate_clickhouse clickhouse-client --allow_experimental_json_type 1 --multiquery < "$migration_file" > /dev/null
      docker exec boilerplate_clickhouse clickhouse-client --query "INSERT INTO $CLICKHOUSE_DB.schema_migrations (migration_name) VALUES ('$migration_name')" > /dev/null
      echo "  ✓ Applied: $migration_name"
    else
      echo "  ⊙ Skipped: $migration_name (already applied)"
    fi
  
  else
    echo "Error: clickhouse-client is not installed, and the ClickHouse Docker container is not running."
    exit 1
  fi
done

echo "✓ ClickHouse migrations complete"
echo "========================================"

