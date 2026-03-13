-- Add OpenAI integration (MCP server) for every workspace that does not have one.
-- Users add their API key in Integrations (OpenAI) > Add Bearer Token; key is stored encrypted.
INSERT INTO mcp_servers (id, workspace_id, server_label, server_url, local, server_description, headers)
SELECT uuid_generate_v4(), w.id, 'OpenAI', NULL, true,
  'Add your OpenAI API key so agents in this workspace can use LLM features. The key is stored encrypted.',
  NULL
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM mcp_servers m WHERE m.workspace_id = w.id AND m.server_label = 'OpenAI'
);
