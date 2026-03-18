-- Allow multiple bearer tokens per (user_id, mcp_server_id).
-- OAuth remains one-per-user-per-server via application logic; bearer tokens can be multiple.
ALTER TABLE user_oauth_connections
DROP CONSTRAINT IF EXISTS unique_user_mcp_oauth;
