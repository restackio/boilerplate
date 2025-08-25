-- Workspace, teams, users and MCP servers seed data
-- This file sets up the basic infrastructure for the demo workspace

-- Insert demo workspace with fixed ID for consistency
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
('11111111-1111-1111-1111-111111111111', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Customer Support', 'Handles customer inquiries and support tickets', 'Users'),
('22222222-2222-2222-2222-222222222222', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Sales', 'Manages sales leads and customer relationships', 'Target'),
('33333333-3333-3333-3333-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Marketing', 'Handles marketing campaigns and brand management', 'Zap'),
('44444444-4444-4444-4444-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Engineering', 'Develops and maintains the product', 'Shield'),
('55555555-5555-5555-5555-555555555555', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'HR', 'Manages human resources and employee relations', 'Briefcase')
ON CONFLICT (id) DO NOTHING;

-- Insert MCP servers with granular approval settings
INSERT INTO mcp_servers (id, workspace_id, server_label, server_url, local, server_description, headers, require_approval) VALUES
(
    'c1d2e3f4-5678-9012-cdef-345678901234',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    'deepwiki',
    'https://mcp.deepwiki.com/mcp',
    FALSE,
    'DeepWiki MCP server for accessing and querying knowledge base',
    NULL,
    '{"never": {"tool_names": ["ask_question"]}, "always": {"tool_names": ["read_wiki_structure"]}}'
),
(
    'd2e3f456-7890-0123-def0-456789012345',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    'posthog',
    'https://mcp.posthog.com/mcp',
    FALSE,
    'PostHog MCP server for insights management',
    '{"Authorization": "Bearer phx_3oQ1s81spruSq6WTw1Fs3ZDDOvgkpWvHw5NYWyApF2Vm2PN"}',
    '{"never": {"tool_names": ["insights-get-all"]}, "always": {"tool_names": ["insight-get"]}}'
),
(
  'e3f45678-9012-3456-7890-123456789012',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'intercom',
  'https://mcp.intercom.com/mcp',
  FALSE,
  'Intercom MCP server for accessing and querying customer data',
  '{"Authorization": "Bearer dG9rOmY2ODliMmVjX2Y4NGZfNGE2NF9iNTdlX2UzYWRjYTI2NDgyOToxOjA="}',
  '{"never": {"tool_names": ["search", "get", "search_conversations", "get_conversation", "search_contacts" ]}, "always": {"tool_names": ["get_contact"]}}'
),
(
  'f4567890-1234-5678-9abc-def012345678',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'zendesk-workflow',
  NULL,
  TRUE,
  'Zendesk Ticket Workflow MCP server for support ticket management',
  NULL,
  '{"never": {"tool_names": ["zendeskticketworkflow"]}, "always": {"tool_names": []}}'
),
(
  '15678901-2345-6789-bcde-f01234567890',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'knowledge-base-workflow',
  NULL,
  TRUE,
  'Knowledge Base Workflow MCP server for documentation search and retrieval',
  NULL,
  '{"never": {"tool_names": ["knowledgebaseworkflow"]}, "always": {"tool_names": []}}'
),
(
  '26789012-3456-789a-cdef-012345678901',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'pagerduty-workflow',
  NULL,
  TRUE,
  'PagerDuty Incident Workflow MCP server for incident management and monitoring',
  NULL,
  '{"never": {"tool_names": ["pagerdutyincidentworkflow"]}, "always": {"tool_names": []}}'
),
(
  '37890123-4567-890b-cdef-123456789012',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'datadog-workflow',
  NULL,
  TRUE,
  'Datadog Logs Workflow MCP server for logs, metrics, and monitoring data',
  NULL,
  '{"never": {"tool_names": ["datadoglogsworkflow"]}, "always": {"tool_names": []}}'
),
(
  '48901234-5678-901c-def0-234567890123',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'linear-workflow',
  NULL,
  TRUE,
  'Linear Issue Workflow MCP server for issue tracking and project management',
  NULL,
  '{"never": {"tool_names": ["linearissueworkflow"]}, "always": {"tool_names": []}}'
),
(
  '59012345-6789-012d-ef01-345678901234',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'github-workflow',
  NULL,
  TRUE,
  'GitHub PR Workflow MCP server for repository management and pull requests',
  NULL,
  '{"never": {"tool_names": ["githubprworkflow"]}, "always": {"tool_names": []}}'
),
(
  '60123456-789a-123e-f012-456789012345',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'mintlify-docs',
  'https://docs.restack.io/mcp',
  FALSE,
  'Mintlify MCP server for accessing Restack documentation and API references',
  NULL,
  '{"never": {"tool_names": ["search"]}, "always": {"tool_names": []}}'
),
(
  '70123456-789a-123e-f012-456789012346',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'sales-crm',
  'https://mcp.salesforce.com/mcp',
  FALSE,
  'Salesforce CRM MCP server for lead and opportunity management',
  '{"Authorization": "Bearer sf_token_12345"}',
  '{"never": {"tool_names": ["create_lead", "update_opportunity"]}, "always": {"tool_names": ["get_lead_status"]}}'
),
(
  '80123456-789a-123e-f012-456789012347',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'hr-system',
  'https://mcp.bamboohr.com/mcp',
  FALSE,
  'BambooHR MCP server for employee data and HR operations',
  '{"Authorization": "Bearer bamboo_api_key_67890"}',
  '{"never": {"tool_names": ["employee_search", "update_employee"]}, "always": {"tool_names": ["get_employee_info"]}}'
)
ON CONFLICT (id) DO NOTHING;
