-- Migration: Ensure agents.reasoning_effort allows 'none' (UI sends it for chat/dataset agents).
-- Some DBs have a stricter check; this aligns the constraint with 001_initial_schema and the app.

ALTER TABLE agents
DROP CONSTRAINT IF EXISTS agents_reasoning_effort_check;

ALTER TABLE agents
DROP CONSTRAINT IF EXISTS valid_reasoning_effort;

ALTER TABLE agents
ADD CONSTRAINT agents_reasoning_effort_check CHECK (reasoning_effort IN ('none', 'low', 'medium', 'high'));
