-- Add view_specs JSONB to tasks for Build (meta-agent) view definitions.
-- Each view spec describes a table (name, columns, dataset_id) and optional row timeline filter.

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS view_specs JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN tasks.view_specs IS 'View definitions for this task: array of {id, name, columns, dataset_id, entity_id_field?, activity_filter?}. Used by Build page right panel.';
