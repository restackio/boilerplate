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

-- Insert demo agents
INSERT INTO agents (id, workspace_id, team_id, name, version, description, instructions, status) VALUES
(
    uuid_generate_v4(),
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Engineering' LIMIT 1),
    'GitHub Support Agent',
    'v1.2.0',
    'Handles GitHub issues, PRs, and repository management',
    'You are a helpful GitHub support agent. Your role is to assist users with GitHub-related issues, pull requests, and repository management. Always be polite, professional, and thorough in your responses. Use @github_mcp_read_repos, @github_mcp_create_issues, @github_mcp_manage_prs when needed.',
    'active'
),
(
    uuid_generate_v4(),
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Customer Support' LIMIT 1),
    'Slack Support Agent',
    'v1.1.5',
    'Manages Slack channels, messages, and team communication',
    'You are a helpful Slack support agent. Your role is to assist users with Slack-related issues, channel management, and team communication. Always be polite, professional, and thorough in your responses. Use @slack_mcp_send_messages, @slack_mcp_create_channels, @slack_mcp_manage_users when needed.',
    'active'
),
(
    uuid_generate_v4(),
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Customer Support' LIMIT 1),
    'Email Support Agent',
    'v1.0.8',
    'Handles customer email inquiries and support tickets',
    'You are a helpful email support agent. Your role is to assist users with their inquiries and support tickets via email. Always be polite, professional, and thorough in your responses. Follow up on customer issues and ensure resolution.',
    'inactive'
),
(
    uuid_generate_v4(),
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Engineering' LIMIT 1),
    'Alerts Monitor Agent',
    'v1.3.2',
    'Monitors system alerts and performs automated responses',
    'You are an alerts monitoring agent. Your role is to monitor system alerts, analyze their severity, and perform automated responses when possible. Use @datadog_mcp_query_metrics, @datadog_mcp_set_alerts when needed. Escalate critical issues to human operators.',
    'active'
),
(
    uuid_generate_v4(),
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Customer Support' LIMIT 1),
    'Intercom Support Agent',
    'v1.1.0',
    'Manages customer conversations and support tickets',
    'You are a helpful Intercom support agent. Your role is to assist customers with their inquiries and support tickets via Intercom. Always be polite, professional, and thorough in your responses. Use @intercom_mcp_send_messages, @intercom_mcp_create_tickets when needed.',
    'inactive'
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo tasks
INSERT INTO tasks (id, workspace_id, team_id, title, description, status, agent_id, assigned_to_id) VALUES
(
    uuid_generate_v4(),
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Engineering' LIMIT 1),
    'Database Performance Optimization',
    'Analyze and optimize database query performance for the user service',
    'active',
    (SELECT id FROM agents WHERE name = 'GitHub Support Agent' LIMIT 1),
    '29fcdd0a-708e-478a-8030-34b02ad9ef84'
),
(
    uuid_generate_v4(),
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Engineering' LIMIT 1),
    'API Rate Limiting Implementation',
    'Implement rate limiting for the public API endpoints',
    'open',
    (SELECT id FROM agents WHERE name = 'GitHub Support Agent' LIMIT 1),
    '29fcdd0a-708e-478a-8030-34b02ad9ef84'
),
(
    uuid_generate_v4(),
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Engineering' LIMIT 1),
    'Security Vulnerability Assessment',
    'Conduct security assessment of the authentication system',
    'completed',
    (SELECT id FROM agents WHERE name = 'Alerts Monitor Agent' LIMIT 1),
    '29fcdd0a-708e-478a-8030-34b02ad9ef84'
),
(
    uuid_generate_v4(),
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Customer Support' LIMIT 1),
    'User Onboarding Flow Improvement',
    'Improve the user onboarding experience based on feedback',
    'completed',
    (SELECT id FROM agents WHERE name = 'Email Support Agent' LIMIT 1),
    '29fcdd0a-708e-478a-8030-34b02ad9ef84'
),
(
    uuid_generate_v4(),
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Customer Support' LIMIT 1),
    'Mobile App Bug Investigation',
    'Investigate and fix critical bugs in the mobile application',
    'waiting',
    (SELECT id FROM agents WHERE name = 'Slack Support Agent' LIMIT 1),
    '29fcdd0a-708e-478a-8030-34b02ad9ef84'
)
ON CONFLICT (id) DO NOTHING;