-- Seed data for the agent orchestration platform

-- Insert demo workspace
INSERT INTO workspaces (id, name) VALUES 
(uuid_generate_v4(), 'Demo Company')
ON CONFLICT (id) DO NOTHING;

-- Insert demo user
INSERT INTO users (id, workspace_id, name, email, avatar_url) VALUES 
(uuid_generate_v4(), (SELECT id FROM workspaces WHERE name = 'Demo Company' LIMIT 1), 'Philippe', 'philippe@demo.com', 'https://avatars.githubusercontent.com/u/1234567?v=4')
ON CONFLICT (id) DO NOTHING;

-- Insert demo agents
INSERT INTO agents (id, name, version, description, instructions, status) VALUES 
(
    uuid_generate_v4(),
    'GitHub Support Agent',
    'v1.2.0',
    'Handles GitHub issues, PRs, and repository management',
    'You are a helpful GitHub support agent. Your role is to assist users with GitHub-related issues, pull requests, and repository management. Always be polite, professional, and thorough in your responses. Use @github_mcp_read_repos, @github_mcp_create_issues, @github_mcp_manage_prs when needed.',
    'active'
),
(
    uuid_generate_v4(),
    'Slack Support Agent',
    'v1.1.5',
    'Manages Slack channels, messages, and team communication',
    'You are a helpful Slack support agent. Your role is to assist users with Slack-related issues, channel management, and team communication. Always be polite, professional, and thorough in your responses. Use @slack_mcp_send_messages, @slack_mcp_create_channels, @slack_mcp_manage_users when needed.',
    'active'
),
(
    uuid_generate_v4(),
    'Email Support Agent',
    'v1.0.8',
    'Handles customer email inquiries and support tickets',
    'You are a helpful email support agent. Your role is to assist customers with their inquiries and support tickets via email. Always be polite, professional, and thorough in your responses. Follow up on customer issues and ensure resolution.',
    'inactive'
),
(
    uuid_generate_v4(),
    'Alerts Monitor Agent',
    'v1.3.2',
    'Monitors system alerts and performs automated responses',
    'You are an alerts monitoring agent. Your role is to monitor system alerts, analyze their severity, and perform automated responses when possible. Use @datadog_mcp_query_metrics, @datadog_mcp_set_alerts when needed. Escalate critical issues to human operators.',
    'active'
),
(
    uuid_generate_v4(),
    'Intercom Support Agent',
    'v1.1.0',
    'Manages customer conversations and support tickets',
    'You are a helpful Intercom support agent. Your role is to assist customers with their inquiries and support tickets via Intercom. Always be polite, professional, and thorough in your responses. Use @intercom_mcp_send_messages, @intercom_mcp_create_tickets when needed.',
    'inactive'
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo tasks
INSERT INTO tasks (id, title, description, status, agent_id, assigned_to) VALUES 
(
    uuid_generate_v4(),
    'Database Performance Optimization',
    'Analyze and optimize database query performance for the user service',
    'active',
    (SELECT id FROM agents WHERE name = 'GitHub Support Agent' LIMIT 1),
    (SELECT id FROM users WHERE email = 'philippe@demo.com' LIMIT 1)
),
(
    uuid_generate_v4(),
    'API Rate Limiting Implementation',
    'Implement rate limiting for the public API endpoints',
    'open',
    (SELECT id FROM agents WHERE name = 'GitHub Support Agent' LIMIT 1),
    (SELECT id FROM users WHERE email = 'philippe@demo.com' LIMIT 1)
),
(
    uuid_generate_v4(),
    'Security Vulnerability Assessment',
    'Conduct security assessment of the authentication system',
    'completed',
    (SELECT id FROM agents WHERE name = 'Alerts Monitor Agent' LIMIT 1),
    (SELECT id FROM users WHERE email = 'philippe@demo.com' LIMIT 1)
),
(
    uuid_generate_v4(),
    'User Onboarding Flow Improvement',
    'Improve the user onboarding experience based on feedback',
    'completed',
    (SELECT id FROM agents WHERE name = 'Email Support Agent' LIMIT 1),
    (SELECT id FROM users WHERE email = 'philippe@demo.com' LIMIT 1)
),
(
    uuid_generate_v4(),
    'Mobile App Bug Investigation',
    'Investigate and fix critical bugs in the mobile application',
    'waiting',
    (SELECT id FROM agents WHERE name = 'Slack Support Agent' LIMIT 1),
    (SELECT id FROM users WHERE email = 'philippe@demo.com' LIMIT 1)
)
ON CONFLICT (id) DO NOTHING; 