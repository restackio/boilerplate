-- Add pattern_specs JSONB to tasks for agent design pattern / flow diagrams.
-- Stores nodes and edges that power a React Flow illustration; updated as the build
-- agent creates/updates/deletes agents, datasets, views, or integrations.

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS pattern_specs JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN tasks.pattern_specs IS 'Agent design pattern: { title?, nodes: [{ id, type, position, data: { label, entityType?, entityId?, href?, ... } }], edges: [{ id, source, target, ... }] }. Powers React Flow and Created list.';
