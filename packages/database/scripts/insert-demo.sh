#!/bin/bash
# Insert demo workspace data (only if not exists)
# Can be called via: turbo demo:insert --filter=@boilerplate/database

set -e

echo "========================================"
echo "Demo Data Insert"
echo "========================================"

# Set default URLs for local development if not provided
: "${DATABASE_URL:=postgresql://postgres:postgres@localhost:5432/boilerplate_postgres}"
: "${CLICKHOUSE_URL:=http://clickhouse:clickhouse@localhost:8123/boilerplate_clickhouse}"

DEMO_WORKSPACE_ID="c926e979-1f16-46bf-a7cc-8aab70162d65"

# Determine demo data directory
if [ -d "/app/packages/database/demo" ]; then
  DEMO_DIR="/app/packages/database/demo"
elif [ -d "packages/database/demo" ]; then
  DEMO_DIR="packages/database/demo"
elif [ -d "$(dirname "$0")/../demo" ]; then
  DEMO_DIR="$(dirname "$0")/../demo"
else
  echo "Error: Cannot find demo data directory"
  exit 1
fi

echo "Demo data: $DEMO_DIR"
echo ""

# Check if demo workspace exists
workspace_exists=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM workspaces WHERE id = '$DEMO_WORKSPACE_ID'")

if [ "$workspace_exists" = "0" ]; then
  echo "→ Inserting demo data..."
  
  # PostgreSQL
  if [ -f "$DEMO_DIR/postgres-demo.sql" ]; then
    psql "$DATABASE_URL" -f "$DEMO_DIR/postgres-demo.sql" > /dev/null
    echo "✓ PostgreSQL demo data inserted"
  else
    echo "⚠ Warning: $DEMO_DIR/postgres-demo.sql not found"
  fi
  
  # ClickHouse
  if [ -f "$DEMO_DIR/clickhouse-demo.sql" ]; then
    # Parse ClickHouse connection - prioritize individual env vars over URL
    if [ -n "$CLICKHOUSE_HOST" ] && [ -n "$CLICKHOUSE_DATABASE" ]; then
      # Use individual environment variables
      CLICKHOUSE_USER="${CLICKHOUSE_USERNAME:-default}"
      CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-}"
      CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-8123}"
      CLICKHOUSE_DB="${CLICKHOUSE_DATABASE}"
    else
      # Fall back to URL parsing
      CLICKHOUSE_URL_CLEAN="${CLICKHOUSE_URL#clickhouse://}"
      CLICKHOUSE_URL_CLEAN="${CLICKHOUSE_URL_CLEAN#http://}"
      CLICKHOUSE_URL_CLEAN="${CLICKHOUSE_URL_CLEAN#https://}"
      
      if [[ $CLICKHOUSE_URL_CLEAN =~ ^([^:]+):([^@]+)@(.+)$ ]]; then
        CLICKHOUSE_USER="${BASH_REMATCH[1]}"
        CLICKHOUSE_PASSWORD="${BASH_REMATCH[2]}"
        CLICKHOUSE_URL_CLEAN="${BASH_REMATCH[3]}"
      fi
      
      if [[ $CLICKHOUSE_URL_CLEAN =~ ^([^:]+):([^/]+)/(.+)$ ]]; then
        CLICKHOUSE_HOST="${BASH_REMATCH[1]}"
        CLICKHOUSE_PORT="${BASH_REMATCH[2]}"
        CLICKHOUSE_DB="${BASH_REMATCH[3]}"
      fi
      
      CLICKHOUSE_USER="${CLICKHOUSE_USER:-default}"
    fi
    
    # Detect secure connection
    CLICKHOUSE_SECURE=false
    if [[ "$CLICKHOUSE_PORT" == "8443" ]] || [[ "$CLICKHOUSE_PORT" == "9440" ]] || [[ "$CLICKHOUSE_URL" == https://* ]]; then
      CLICKHOUSE_SECURE=true
      CLICKHOUSE_NATIVE_PORT=9440
    else
      CLICKHOUSE_SECURE=false
      CLICKHOUSE_NATIVE_PORT=9000
    fi
    
    # Build and execute clickhouse-client command
    if [ "$CLICKHOUSE_SECURE" = true ]; then
      clickhouse-client --host $CLICKHOUSE_HOST --port $CLICKHOUSE_NATIVE_PORT \
        --user $CLICKHOUSE_USER --password $CLICKHOUSE_PASSWORD --secure \
        --database=$CLICKHOUSE_DB --multiquery < "$DEMO_DIR/clickhouse-demo.sql" > /dev/null
    else
      clickhouse-client --host $CLICKHOUSE_HOST --port $CLICKHOUSE_NATIVE_PORT \
        --user $CLICKHOUSE_USER --password $CLICKHOUSE_PASSWORD \
        --database=$CLICKHOUSE_DB --multiquery < "$DEMO_DIR/clickhouse-demo.sql" > /dev/null
    fi
    echo "✓ ClickHouse demo data inserted"
  else
    echo "⚠ Warning: $DEMO_DIR/clickhouse-demo.sql not found"
  fi
  
  echo ""
  echo "========================================"
  echo "✓ Demo workspace created!"
  echo "  User: demo@example.com"
  echo "  Password: password"
  echo "========================================"
else
  echo "⊙ Demo workspace already exists"
  echo "  Use 'pnpm db:demo:reset' to reset it"
  echo "========================================"
fi

