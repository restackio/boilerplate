-- Seed data for the agent orchestration platform

-- Insert demo workspace with fixed ID for consistency
INSERT INTO workspaces (id, name) VALUES
('c926e979-1f16-46bf-a7cc-8aab70162d65', 'Demo Company')
ON CONFLICT (id) DO NOTHING;

-- Insert demo user with fixed ID for consistency (password: "password" - will be hashed by the application)
INSERT INTO users (id, name, email, password_hash, avatar_url) VALUES
('29fcdd0a-708e-478a-8030-34b02ad9ef84', 'Demo', 'demo@example.com', '$2b$12$cL0ShBkTO1OH0lwd4rXc1efFz0Zvg764SgVB2E0UY1xTMmKOL3qHa', 'https://avatars.githubusercontent.com/u/1234567?v=4')
ON CONFLICT (id) DO NOTHING;

-- Link user to workspace using fixed IDs
INSERT INTO user_workspaces (user_id, workspace_id, role) VALUES
('29fcdd0a-708e-478a-8030-34b02ad9ef84', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'owner')
ON CONFLICT (user_id, workspace_id) DO NOTHING;

-- Insert demo teams
INSERT INTO teams (id, workspace_id, name, description, icon) VALUES
(uuid_generate_v4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Customer Support', 'Handles customer inquiries and support tickets', 'Users'),
(uuid_generate_v4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Sales', 'Manages sales leads and customer relationships', 'Target'),
(uuid_generate_v4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Marketing', 'Handles marketing campaigns and brand management', 'Zap'),
(uuid_generate_v4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Engineering', 'Develops and maintains the product', 'Shield'),
(uuid_generate_v4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'HR', 'Manages human resources and employee relations', 'Briefcase')
ON CONFLICT (id) DO NOTHING;

-- Insert MCP servers
INSERT INTO mcp_servers (id, workspace_id, server_label, server_url, server_description, headers, require_approval) VALUES
(
    'c1d2e3f4-5678-9012-cdef-345678901234',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    'deepwiki',
    'https://mcp.deepwiki.com/mcp',
    'DeepWiki MCP server for accessing and querying knowledge base',
    NULL,
    'never'
),
(
    'd2e3f456-7890-0123-def0-456789012345',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    'posthog',
    'https://mcp.posthog.com/mcp',
    'PostHog MCP server for analytics and dashboard management',
    '{"Authorization": "Bearer phx_3oQ1s81spruSq6WTw1Fs3ZDDOvgkpWvHw5NYWyApF2Vm2PN"}',
    'always'
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo agents (simplified to just 2 agents as requested)
INSERT INTO agents (id, workspace_id, team_id, name, version, description, instructions, status) VALUES
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Engineering' LIMIT 1),
    'DeepWiki Knowledge Agent',
    'v1.0.0',
    'Agent for querying and retrieving information from DeepWiki knowledge base',
    'You are a helpful knowledge assistant. Your role is to help users find information by querying the DeepWiki knowledge base. Always be thorough and accurate in your responses. Use the ask_question tool to search for relevant information.',
    'active'
),
(
    'b2c3d456-7890-8901-bcde-f23456789012',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Marketing' LIMIT 1),
    'PostHog Analytics Agent',
    'v1.0.0',
    'Agent for managing PostHog analytics dashboards and data',
    'You are a helpful analytics assistant. Your role is to help users manage PostHog dashboards and retrieve analytics data. Always be precise and provide clear insights. Use the dashboards-get-all and dashboard-get tools to access dashboard information.',
    'active'
)
ON CONFLICT (id) DO NOTHING;

-- Link agents to MCP servers with allowed tools
INSERT INTO agent_mcp_servers (agent_id, mcp_server_id, allowed_tools) VALUES
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'c1d2e3f4-5678-9012-cdef-345678901234',
    '["ask_question"]'
),
(
    'b2c3d456-7890-8901-bcde-f23456789012',
    'd2e3f456-7890-0123-def0-456789012345',
    '["dashboards-get-all", "dashboard-get"]'
)
ON CONFLICT (agent_id, mcp_server_id) DO NOTHING;

-- Insert demo tasks
INSERT INTO tasks (id, workspace_id, team_id, title, description, status, agent_id, assigned_to_id) VALUES
(
    uuid_generate_v4(),
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Engineering' LIMIT 1),
    'Research API Documentation',
    'Find information about API authentication methods in the knowledge base',
    'active',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84'
),
(
    uuid_generate_v4(),
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Marketing' LIMIT 1),
    'Analytics Dashboard Review',
    'Review and analyze current marketing campaign performance dashboards',
    'open',
    'b2c3d456-7890-8901-bcde-f23456789012',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84'
)
ON CONFLICT (id) DO NOTHING;