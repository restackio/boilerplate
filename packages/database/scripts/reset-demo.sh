#!/bin/bash
# Reset demo workspace data
# Can be called via: turbo demo:reset --filter=@boilerplate/database

set -e

echo "========================================"
echo "Demo Data Reset"
echo "========================================"

# Set default URLs for local development if not provided
: "${DATABASE_URL:=postgresql://postgres:postgres@localhost:5432/boilerplate_postgres}"
: "${CLICKHOUSE_URL:=http://clickhouse:clickhouse@localhost:8123/boilerplate_clickhouse}"

DEMO_WORKSPACE_ID="c926e979-1f16-46bf-a7cc-8aab70162d65"
DEMO_USER_ID="29fcdd0a-708e-478a-8030-34b02ad9ef84"

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

# PostgreSQL: Delete and re-insert
echo "→ Deleting PostgreSQL demo data (CASCADE)..."
psql "$DATABASE_URL" <<-EOSQL
  DELETE FROM workspaces WHERE id = '$DEMO_WORKSPACE_ID';
  DELETE FROM users WHERE id = '$DEMO_USER_ID';
EOSQL
echo "✓ PostgreSQL demo data deleted"

echo "→ Inserting PostgreSQL demo data..."
if [ -f "$DEMO_DIR/postgres-demo.sql" ]; then
  psql "$DATABASE_URL" -f "$DEMO_DIR/postgres-demo.sql" > /dev/null
  echo "✓ PostgreSQL demo data inserted"
else
  echo "⚠ Warning: $DEMO_DIR/postgres-demo.sql not found"
fi

# ClickHouse: Delete and re-insert using clickhouse-client via Docker
echo "→ Deleting ClickHouse demo data..."
docker compose exec -T clickhouse clickhouse-client --database=boilerplate_clickhouse --multiquery <<-EOSQL
  DELETE FROM pipeline_events WHERE workspace_id = '$DEMO_WORKSPACE_ID';
  DELETE FROM task_metrics WHERE workspace_id = '$DEMO_WORKSPACE_ID';
EOSQL
echo "✓ ClickHouse demo data deleted"

echo "→ Inserting ClickHouse demo data..."
if [ -f "$DEMO_DIR/clickhouse-demo.sql" ]; then
  docker compose exec -T clickhouse clickhouse-client --database=boilerplate_clickhouse --multiquery < "$DEMO_DIR/clickhouse-demo.sql"
  echo "✓ ClickHouse demo data inserted"
else
  echo "⚠ Warning: $DEMO_DIR/clickhouse-demo.sql not found"
fi

echo ""
echo "========================================"
echo "✓ Demo workspace reset complete!"
echo "  User: demo@example.com"
echo "  Password: password"
echo "========================================"

