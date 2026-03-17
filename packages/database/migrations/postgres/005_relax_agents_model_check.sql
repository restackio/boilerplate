-- Migration: Relax agents.model check so new models don't require DB migrations.
-- Application (agents_crud, UI) remains the source of truth for allowed model IDs.

ALTER TABLE agents
DROP CONSTRAINT IF EXISTS agents_model_check;

ALTER TABLE agents
ADD CONSTRAINT agents_model_check CHECK (length(model) > 0 AND length(model) <= 100);
