-- Add build_task_id to agents and datasets for fast "by build" lookups.
-- When the agent builder creates agents/datasets, they are linked to the build task.
-- ON DELETE SET NULL so deleting the build task does not delete the created entities.

ALTER TABLE agents
ADD COLUMN IF NOT EXISTS build_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agents_build_task_id
ON agents(build_task_id) WHERE build_task_id IS NOT NULL;

COMMENT ON COLUMN agents.build_task_id IS 'Task (Build) that created this agent; null for manually created agents.';

ALTER TABLE datasets
ADD COLUMN IF NOT EXISTS build_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_datasets_build_task_id
ON datasets(build_task_id) WHERE build_task_id IS NOT NULL;

COMMENT ON COLUMN datasets.build_task_id IS 'Task (Build) that created this dataset; null for manually created datasets.';
