-- btree index rows are capped (~2704 bytes on PostgreSQL 17). Including varchar
-- "description" in idx_tasks_list_covering fails inserts when description holds long prompts.

DROP INDEX IF EXISTS idx_tasks_list_covering;

CREATE INDEX IF NOT EXISTS idx_tasks_list_covering ON tasks(workspace_id, status)
INCLUDE (id, title, agent_id, assigned_to_id, created_at, updated_at);
