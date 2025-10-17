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

# Detect if ClickHouse uses HTTPS (ClickHouse Cloud)
CLICKHOUSE_SECURE=false
if [[ "$CLICKHOUSE_URL" == https://* ]]; then
  CLICKHOUSE_SECURE=true
  # ClickHouse Cloud uses secure native protocol on port 9440
  CLICKHOUSE_NATIVE_PORT=9440
else
  CLICKHOUSE_NATIVE_PORT=9000
fi

echo "PostgreSQL: $POSTGRES_USER@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
echo "ClickHouse: $CLICKHOUSE_USER@$CLICKHOUSE_HOST:$CLICKHOUSE_PORT/$CLICKHOUSE_DB (secure: $CLICKHOUSE_SECURE)"
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
until PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c '\q' 2>/dev/null; do
  echo "  Waiting for PostgreSQL..."
  sleep 2
done
echo "✓ PostgreSQL is ready"

# Try HTTPS first (for ClickHouse Cloud), then HTTP
until curl -sf "https://$CLICKHOUSE_HOST:$CLICKHOUSE_PORT/ping" > /dev/null 2>&1 || \
      curl -sf "http://$CLICKHOUSE_HOST:$CLICKHOUSE_PORT/ping" > /dev/null 2>&1; do
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
  already_applied=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -tAc \
    "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$migration_name'" 2>/dev/null || echo "0")
  
  if [ "$already_applied" = "0" ]; then
    echo "  Applying: $migration_name"
    PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB \
      -f "$migration_file" > /dev/null
    
    # Record migration
    PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB \
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

# Determine if we should use docker exec or direct clickhouse-client
USE_DOCKER=false
if ! command -v clickhouse-client &> /dev/null; then
  # Check if we're running locally and should use docker
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "boilerplate_clickhouse"; then
    USE_DOCKER=true
    echo "  Using docker exec for ClickHouse (clickhouse-client not found locally)"
  else
    echo "  Error: clickhouse-client not found and Docker container not running"
    exit 1
  fi
fi

for migration_file in "$CLICKHOUSE_MIGRATIONS_DIR"/*.sql; do
  if [ ! -f "$migration_file" ]; then
    echo "  No migrations found in $CLICKHOUSE_MIGRATIONS_DIR"
    break
  fi
  
  migration_name=$(basename "$migration_file")
  
  # Check if migration has already been applied
  # First check if the database and table exist
  if [ "$USE_DOCKER" = true ]; then
    already_applied=$(docker exec boilerplate_clickhouse clickhouse-client \
      --query "SELECT count() FROM system.tables WHERE database = '$CLICKHOUSE_DB' AND name = 'schema_migrations'" 2>/dev/null || echo "0")
  else
    # Use secure or regular connection based on CLICKHOUSE_SECURE flag
    if [ "$CLICKHOUSE_SECURE" = true ]; then
      already_applied=$(clickhouse-client --host $CLICKHOUSE_HOST --port $CLICKHOUSE_NATIVE_PORT --user $CLICKHOUSE_USER --password $CLICKHOUSE_PASSWORD --secure \
        --query "SELECT count() FROM system.tables WHERE database = '$CLICKHOUSE_DB' AND name = 'schema_migrations'" 2>/dev/null || echo "0")
    else
      already_applied=$(clickhouse-client --host $CLICKHOUSE_HOST --port $CLICKHOUSE_NATIVE_PORT --user $CLICKHOUSE_USER --password $CLICKHOUSE_PASSWORD \
        --query "SELECT count() FROM system.tables WHERE database = '$CLICKHOUSE_DB' AND name = 'schema_migrations'" 2>/dev/null || echo "0")
    fi
  fi
  
  if [ "$already_applied" != "0" ]; then
    if [ "$USE_DOCKER" = true ]; then
      already_applied=$(docker exec boilerplate_clickhouse clickhouse-client \
        --query "SELECT count() FROM $CLICKHOUSE_DB.schema_migrations WHERE migration_name = '$migration_name'" 2>/dev/null || echo "0")
    else
      if [ "$CLICKHOUSE_SECURE" = true ]; then
        already_applied=$(clickhouse-client --host $CLICKHOUSE_HOST --port $CLICKHOUSE_NATIVE_PORT --user $CLICKHOUSE_USER --password $CLICKHOUSE_PASSWORD --secure \
          --query "SELECT count() FROM $CLICKHOUSE_DB.schema_migrations WHERE migration_name = '$migration_name'" 2>/dev/null || echo "0")
      else
        already_applied=$(clickhouse-client --host $CLICKHOUSE_HOST --port $CLICKHOUSE_NATIVE_PORT --user $CLICKHOUSE_USER --password $CLICKHOUSE_PASSWORD \
          --query "SELECT count() FROM $CLICKHOUSE_DB.schema_migrations WHERE migration_name = '$migration_name'" 2>/dev/null || echo "0")
      fi
    fi
  fi
  
  if [ "$already_applied" = "0" ]; then
    echo "  Applying: $migration_name"
    
    # Execute migration file using clickhouse-client (supports multi-statement)
    if [ "$USE_DOCKER" = true ]; then
      docker exec -i boilerplate_clickhouse clickhouse-client \
        --allow_experimental_json_type 1 --multiquery < "$migration_file" > /dev/null
      
      # Record migration
      docker exec boilerplate_clickhouse clickhouse-client \
        --query "INSERT INTO $CLICKHOUSE_DB.schema_migrations (migration_name) VALUES ('$migration_name')" > /dev/null
    else
      if [ "$CLICKHOUSE_SECURE" = true ]; then
        # ClickHouse Cloud - secure connection
        clickhouse-client --host $CLICKHOUSE_HOST --port $CLICKHOUSE_NATIVE_PORT --user $CLICKHOUSE_USER --password $CLICKHOUSE_PASSWORD --secure \
          --allow_experimental_json_type 1 --multiquery < "$migration_file" > /dev/null
        
        # Record migration
        clickhouse-client --host $CLICKHOUSE_HOST --port $CLICKHOUSE_NATIVE_PORT --user $CLICKHOUSE_USER --password $CLICKHOUSE_PASSWORD --secure \
          --query "INSERT INTO $CLICKHOUSE_DB.schema_migrations (migration_name) VALUES ('$migration_name')" > /dev/null
      else
        # Local ClickHouse - regular connection
        clickhouse-client --host $CLICKHOUSE_HOST --port $CLICKHOUSE_NATIVE_PORT --user $CLICKHOUSE_USER --password $CLICKHOUSE_PASSWORD \
          --allow_experimental_json_type 1 --multiquery < "$migration_file" > /dev/null
        
        # Record migration
        clickhouse-client --host $CLICKHOUSE_HOST --port $CLICKHOUSE_NATIVE_PORT --user $CLICKHOUSE_USER --password $CLICKHOUSE_PASSWORD \
          --query "INSERT INTO $CLICKHOUSE_DB.schema_migrations (migration_name) VALUES ('$migration_name')" > /dev/null
      fi
    fi
    
    echo "  ✓ Applied: $migration_name"
  else
    echo "  ⊙ Skipped: $migration_name (already applied)"
  fi
done

echo "✓ ClickHouse migrations complete"
echo "========================================"

