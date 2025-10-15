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
  
  # ClickHouse (if CLICKHOUSE_URL is set)
  if [ -n "$CLICKHOUSE_URL" ]; then
    if [ -f "$DEMO_DIR/clickhouse-demo.sql" ]; then
      CLICKHOUSE_CREDENTIALS=$(echo "$CLICKHOUSE_URL" | sed -E 's|^https?://([^@]+)@.*|\1|')
      CLICKHOUSE_ENDPOINT=$(echo "$CLICKHOUSE_URL" | sed -E 's|^https?://[^@]+@(.*)|\1|')
      
      curl -u "$CLICKHOUSE_CREDENTIALS" "http://$CLICKHOUSE_ENDPOINT" \
        --data-binary @"$DEMO_DIR/clickhouse-demo.sql" > /dev/null 2>&1
      echo "✓ ClickHouse demo data inserted"
    else
      echo "⚠ Warning: $DEMO_DIR/clickhouse-demo.sql not found"
    fi
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

