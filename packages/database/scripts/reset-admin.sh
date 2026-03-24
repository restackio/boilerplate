#!/bin/bash
# Reset admin workspace: remove all workspace-scoped data (teams, agents, tasks, datasets, MCP servers, etc.),
# then re-run the admin seed. Keeps the workspace and admin user membership so the seed runs in "update" mode.
# Use: pnpm run db:admin:reset

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -d "/app/packages/database" ]; then
  REPO_ROOT="/app"
else
  REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi

: "${DATABASE_URL:=postgresql://postgres:postgres@localhost:5432/boilerplate_postgres}"

ADMIN_WORKSPACE_ID="c926e979-1f16-46bf-a7cc-8aab70162d65"

echo "========================================"
echo "Admin Data Reset"
echo "========================================"
echo "→ Cleaning all data for admin workspace (order respects FKs)..."
echo ""

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
-- Full workspace cleanup: delete all workspace-scoped data; keep workspaces + user_workspaces so admin stays.
DELETE FROM user_oauth_connections WHERE workspace_id = '$ADMIN_WORKSPACE_ID'::uuid;
DELETE FROM agent_tools WHERE agent_id IN (SELECT id FROM agents WHERE workspace_id = '$ADMIN_WORKSPACE_ID'::uuid);
DELETE FROM agent_subagents WHERE parent_agent_id IN (SELECT id FROM agents WHERE workspace_id = '$ADMIN_WORKSPACE_ID'::uuid)
  OR subagent_id IN (SELECT id FROM agents WHERE workspace_id = '$ADMIN_WORKSPACE_ID'::uuid);
DELETE FROM metric_agents WHERE parent_agent_id IN (SELECT id FROM agents WHERE workspace_id = '$ADMIN_WORKSPACE_ID'::uuid);
DELETE FROM tasks WHERE workspace_id = '$ADMIN_WORKSPACE_ID'::uuid;
DELETE FROM agents WHERE workspace_id = '$ADMIN_WORKSPACE_ID'::uuid;
DELETE FROM datasets WHERE workspace_id = '$ADMIN_WORKSPACE_ID'::uuid;
DELETE FROM metric_definitions WHERE workspace_id = '$ADMIN_WORKSPACE_ID'::uuid;
DELETE FROM mcp_servers WHERE workspace_id = '$ADMIN_WORKSPACE_ID'::uuid;
DELETE FROM teams WHERE workspace_id = '$ADMIN_WORKSPACE_ID'::uuid;
SQL

echo "✓ Admin workspace data removed"
echo "→ Re-running admin seed..."
echo ""

exec bash "$SCRIPT_DIR/insert-admin.sh"
