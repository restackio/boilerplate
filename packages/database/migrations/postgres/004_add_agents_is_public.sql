-- Add is_public to agents for public chat URLs (no login required)
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN agents.is_public IS 'When true, agent can be chatted with at /chat/[agentId] without login.';
