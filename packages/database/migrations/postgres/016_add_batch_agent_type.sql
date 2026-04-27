-- Add 'batch' as a valid agent type alongside 'interactive' and 'pipeline'.
-- Batch agents run once across a list of inputs (e.g. company domains),
-- writing one structured row per input to a dataset and calling completetask
-- when the whole list is done.

ALTER TABLE agents
DROP CONSTRAINT IF EXISTS agents_type_check;

ALTER TABLE agents
DROP CONSTRAINT IF EXISTS valid_type;

ALTER TABLE agents
ADD CONSTRAINT agents_type_check
CHECK (type IN ('interactive', 'pipeline', 'batch'));
