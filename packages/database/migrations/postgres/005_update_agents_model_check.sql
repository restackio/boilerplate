-- Migration: Update agents.model check constraint to include gpt-5.2 and all current allowed models
-- Fixes demo seed (and app) when DB was created from an older schema that did not allow gpt-5.2

ALTER TABLE agents
DROP CONSTRAINT IF EXISTS agents_model_check;

ALTER TABLE agents
ADD CONSTRAINT agents_model_check CHECK (model IN (
    'gpt-5.2', 'gpt-5.1', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano',
    'o3-deep-research', 'o4-mini-deep-research'
));
