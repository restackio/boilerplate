-- Add provider_metadata JSONB column to user_oauth_connections for storing provider-specific data
-- This enables multi-tenancy for Slack (storing team_id) and other OAuth providers

ALTER TABLE user_oauth_connections 
ADD COLUMN IF NOT EXISTS provider_metadata JSONB DEFAULT '{}'::jsonb;

-- Create index on provider_metadata for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_oauth_connections_provider_metadata ON user_oauth_connections USING GIN (provider_metadata);

-- Add comment
COMMENT ON COLUMN user_oauth_connections.provider_metadata IS 'Provider-specific metadata (e.g., Slack team_id for multi-tenancy)';

