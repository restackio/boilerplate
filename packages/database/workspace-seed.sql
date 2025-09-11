-- Insert demo workspace
INSERT INTO workspaces (id, name) VALUES
('c926e979-1f16-46bf-a7cc-8aab70162d65', 'Demo Company')
ON CONFLICT (id) DO NOTHING;

-- Insert demo user with fixed ID for consistency (password: "password" - will be hashed by the application)
INSERT INTO users (id, name, email, password_hash, avatar_url) VALUES
('29fcdd0a-708e-478a-8030-34b02ad9ef84', 'Demo User', 'demo@example.com', '$2b$12$cL0ShBkTO1OH0lwd4rXc1efFz0Zvg764SgVB2E0UY1xTMmKOL3qHa', 'https://avatars.githubusercontent.com/u/1234567?v=4')
ON CONFLICT (id) DO NOTHING;

-- Link user to workspace using fixed IDs
INSERT INTO user_workspaces (id, user_id, workspace_id, role) VALUES
('12345678-1234-5678-9012-123456789012', '29fcdd0a-708e-478a-8030-34b02ad9ef84', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'owner')
ON CONFLICT (id) DO NOTHING;

-- Insert demo teams with fixed IDs for consistency
INSERT INTO teams (id, workspace_id, name, description, icon) VALUES
('11111111-1111-1111-1111-111111111111', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Product', 'Responsible for product strategy and development', 'Lightbulb'),
('22222222-2222-2222-2222-222222222222', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Engineering', 'Develops and maintains the product', 'Code'),
('33333333-3333-3333-3333-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Marketing', 'Handles marketing and customer outreach', 'Megaphone'),
('44444444-4444-4444-4444-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Sales', 'Manages sales and customer relationships', 'DollarSign'),
('55555555-5555-5555-5555-555555555555', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Support', 'Provides customer support', 'HeadphonesIcon')
ON CONFLICT (id) DO NOTHING;

-- Insert MCP servers (OAuth will be discovered dynamically)
INSERT INTO mcp_servers (id, workspace_id, server_label, server_url, local, server_description, headers, require_approval) VALUES
(
  'a0123456-789a-123e-f012-456789012349',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'notion',
  'https://mcp.notion.com/mcp',
  FALSE,
  'Notion MCP server for accessing and managing Notion workspaces, pages, and databases',
  NULL,
  '{"never": {"tool_names": []}, "always": {"tool_names": []}}'
),
(
  'b0123456-789a-123e-f012-456789012350',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'github-mcp',
  'https://mcp.github.com/mcp',
  FALSE,
  'GitHub MCP server for repository management and issue tracking',
  '{"Authorization": "Bearer ghp_demo_token"}',
  '{"never": {"tool_names": ["create_repo", "delete_repo"]}, "always": {"tool_names": ["list_repos", "get_repo_info"]}}'
),
(
  'c0123456-789a-123e-f012-456789012351',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'slack-notifications',
  'https://mcp.slack.com/mcp',
  FALSE,
  'Slack MCP server for sending notifications and managing channels',
  '{"Authorization": "Bearer xoxb-slack-demo-token"}',
  '{"never": {"tool_names": ["create_channel", "delete_message"]}, "always": {"tool_names": ["send_message", "list_channels"]}}'
),
(
  'f4567890-1234-5678-9abc-def012345678',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'zendesk-mcp',
  'https://mcp.zendesk.com/mcp',
  FALSE,
  'Zendesk MCP server for ticket management and customer support',
  '{"Authorization": "Bearer zendesk-demo-token"}',
  '{"never": {"tool_names": []}, "always": {"tool_names": ["zendeskticket"]}}'
),
(
  '15678901-2345-6789-bcde-f01234567890',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'knowledge-base',
  'https://mcp.knowledgebase.com/mcp',
  FALSE,
  'Knowledge base MCP server for documentation and knowledge management',
  '{"Authorization": "Bearer kb-demo-token"}',
  '{"never": {"tool_names": []}, "always": {"tool_names": ["knowledgebase"]}}'
),
(
  '26789012-3456-789a-cdef-012345678901',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'pagerduty',
  'https://mcp.pagerduty.com/mcp',
  FALSE,
  'PagerDuty MCP server for incident management and monitoring',
  '{"Authorization": "Bearer pd-demo-token"}',
  '{"never": {"tool_names": []}, "always": {"tool_names": ["pagerdutyincident"]}}'
),
(
  '37890123-4567-890b-cdef-123456789012',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'datadog',
  'https://mcp.datadog.com/mcp',
  FALSE,
  'Datadog MCP server for logs and metrics monitoring',
  '{"Authorization": "Bearer dd-demo-token"}',
  '{"never": {"tool_names": []}, "always": {"tool_names": ["datadoglogs"]}}'
),
(
  '48901234-5678-901c-def0-234567890123',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'linear',
  'https://mcp.linear.app/mcp',
  FALSE,
  'Linear MCP server for issue and project management',
  '{"Authorization": "Bearer linear-demo-token"}',
  '{"never": {"tool_names": []}, "always": {"tool_names": ["linearissue"]}}'
),
(
  '59012345-6789-012d-ef01-345678901234',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'github-pr',
  'https://mcp.github.com/pr',
  FALSE,
  'GitHub PR MCP server for pull request management',
  '{"Authorization": "Bearer ghpr-demo-token"}',
  '{"never": {"tool_names": []}, "always": {"tool_names": ["githubpr"]}}'
)
ON CONFLICT (id) DO NOTHING;
