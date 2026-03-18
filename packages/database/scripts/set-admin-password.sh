#!/bin/bash
# Set a new admin password and print it so you can save it.
# Usage: set-admin-password.sh [new_password]
#   If new_password is omitted, a random password is generated and printed.
# Run from repo root or from packages/database/scripts; works in Docker (/app) and locally.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -d "/app/packages/database" ]; then
  REPO_ROOT="/app"
else
  REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
fi

BACKEND_DIR="$REPO_ROOT/apps/backend"
if [ ! -d "$BACKEND_DIR/src" ]; then
  if [ -d "$REPO_ROOT/src" ]; then
    BACKEND_DIR="$REPO_ROOT"
  else
    echo "Error: Backend not found at $BACKEND_DIR or $REPO_ROOT with src/" >&2
    exit 1
  fi
fi
export PYTHONPATH="$BACKEND_DIR"

: "${DATABASE_URL:=postgresql://postgres:postgres@localhost:5432/boilerplate_postgres}"

NEW_PASS="$("$SCRIPT_DIR/set_admin_password.py" "$@")"
if [ $? -ne 0 ]; then
  exit 1
fi

echo ""
echo "========================================"
echo "Admin password has been updated."
echo "  User: admin@example.com"
echo "  Password: $NEW_PASS"
echo "  (Save this password; it will not be shown again.)"
echo "========================================"
