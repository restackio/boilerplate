-- Add optional display name for bearer/OAuth tokens (e.g. "Production", "Personal").
ALTER TABLE user_oauth_connections
ADD COLUMN IF NOT EXISTS token_name VARCHAR(255);
