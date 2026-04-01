-- Add task_metadata JSONB column to tasks for storing integration context
-- Used by Slack, webhooks, and future connectors to store origin context

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS task_metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tasks_task_metadata ON tasks USING GIN (task_metadata);

CREATE INDEX IF NOT EXISTS idx_tasks_task_metadata_slack_thread ON tasks ((task_metadata->>'slack_thread_ts'))
WHERE task_metadata->>'slack_thread_ts' IS NOT NULL;

COMMENT ON COLUMN tasks.task_metadata IS 'Integration context (e.g., slack_channel, slack_thread_ts, source)';
