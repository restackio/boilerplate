#!/bin/bash
# Insert admin workspace data: admin user (generated password), admin workspace (is_admin=true), build agent (is_public), template agents.
# Run after migrations. Admin password is generated and printed once.
# Can be called via: pnpm run db:admin:insert (or similar)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -d "/app/packages/database" ]; then
  REPO_ROOT="/app"
else
  REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi

echo "========================================"
echo "Admin Data Insert"
echo "========================================"

: "${DATABASE_URL:=postgresql://postgres:postgres@localhost:5432/boilerplate_postgres}"

ADMIN_WORKSPACE_ID="c926e979-1f16-46bf-a7cc-8aab70162d65"

if [ -d "/app/packages/database/admin" ]; then
  ADMIN_DIR="/app/packages/database/admin"
elif [ -d "packages/database/admin" ]; then
  ADMIN_DIR="packages/database/admin"
elif [ -d "$SCRIPT_DIR/../admin" ]; then
  ADMIN_DIR="$SCRIPT_DIR/../admin"
else
  echo "Error: Cannot find admin data directory (postgres-admin.sql lives there)"
  exit 1
fi

# Use absolute path for SQL file so Python script works from any cwd
[ "${ADMIN_DIR#/}" = "$ADMIN_DIR" ] && ADMIN_DIR="$REPO_ROOT/$ADMIN_DIR"
ADMIN_SQL_FILE="$ADMIN_DIR/postgres-admin.sql"

echo "Admin seed SQL: $ADMIN_SQL_FILE"
echo ""

workspace_exists=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM workspaces WHERE id = '$ADMIN_WORKSPACE_ID'")

run_admin_sql() {
  PYTHONPATH="$REPO_ROOT/apps/backend" python3 "$SCRIPT_DIR/generate_admin_password.py" "$ADMIN_SQL_FILE" 2>/dev/null | psql "$DATABASE_URL" -f -
}

if [ "$workspace_exists" = "0" ]; then
  echo "→ Inserting admin data (workspace, user, build agent, template)..."
  if [ -f "$ADMIN_SQL_FILE" ]; then
    ADMIN_PASS=$(PYTHONPATH="$REPO_ROOT/apps/backend" python3 "$SCRIPT_DIR/generate_admin_password.py" "$ADMIN_SQL_FILE" 2>&1 | head -1)
    PYTHONPATH="$REPO_ROOT/apps/backend" python3 "$SCRIPT_DIR/generate_admin_password.py" "$ADMIN_SQL_FILE" 2>/dev/null | psql "$DATABASE_URL" -f - > /dev/null
    echo "✓ PostgreSQL admin data inserted"
  else
    echo "⚠ Warning: $ADMIN_SQL_FILE not found"
    exit 1
  fi
  echo ""
  echo "========================================"
  echo "✓ Admin workspace created!"
  echo "  User: admin@example.com"
  echo "  Password: $ADMIN_PASS"
  echo "  (Save this password; it will not be shown again.)"
  echo "========================================"
else
  echo "→ Updating admin workspace and build agent (is_public, is_admin)..."
  if [ -f "$ADMIN_SQL_FILE" ]; then
    # Preserve existing admin password when re-running seed
    EXISTING_HASH=$(psql "$DATABASE_URL" -tAc "SELECT password_hash FROM users WHERE email = 'admin@example.com' LIMIT 1" 2>/dev/null || true)
    if [ -n "$EXISTING_HASH" ]; then
      ESCAPED_HASH="${EXISTING_HASH//\\/\\\\}"
      ESCAPED_HASH="${ESCAPED_HASH//\$/\\$}"
      ESCAPED_HASH="${ESCAPED_HASH//&/\\&}"
      sed "s|__ADMIN_PASSWORD_HASH__|$ESCAPED_HASH|g" "$ADMIN_SQL_FILE" | psql "$DATABASE_URL" -f - > /dev/null
    else
      run_admin_sql > /dev/null
    fi
    echo "✓ PostgreSQL admin data applied (upsert)"
  fi
  echo ""
  echo "========================================"
  echo "✓ Admin seed applied"
  echo "  User: admin@example.com"
  echo "  (Password was set when workspace was first created.)"
  echo "========================================"
fi
