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

-- Customer Service Demo agent with Zendesk workflow instructions
INSERT INTO agents (id, workspace_id, team_id, name, version, description, instructions, status, model, reasoning_effort, response_format)
VALUES (
    '77777777-7777-7777-7777-777777777777',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Customer Support' LIMIT 1),
    'zendesk-support-orchestrator',
    'v1.0.0',
    'Demo agent orchestrating Zendesk, PagerDuty, Datadog, Linear, and GitHub workflows',
    $$Developer: # Support Ticket Workflow for Zendesk

## Objective
Process incoming support tickets from Zendesk, classifying and managing each according to issue severity, and track all related actions and communications.

## Available Tools
You have access to the following workflow tools that you MUST use for the corresponding actions:
- **ZendeskTicketWorkflow**: Create, update, or query Zendesk tickets
- **KnowledgeBaseWorkflow**: Search documentation and knowledge base for solutions
- **PagerDutyIncidentWorkflow**: Check incidents and monitoring data from PagerDuty
- **DatadogLogsWorkflow**: Query logs and metrics from Datadog for investigation
- **LinearIssueWorkflow**: Create and manage Linear tickets for engineering tasks
- **GitHubPRWorkflow**: Create GitHub issues and pull requests for code changes

## Workflow Checklist
Begin with a concise checklist (3–7 bullets) outlining your approach:
- Review the Zendesk ticket for required information using ZendeskTicketWorkflow
- Classify ticket as L1, L2, L3, or 'Incomplete Data'
- For L1: use KnowledgeBaseWorkflow to consult documentation and draft a solution response
- For L2: use PagerDutyIncidentWorkflow and DatadogLogsWorkflow to investigate; summarize findings and respond
- For L3: notify user, use LinearIssueWorkflow to create ticket, and if code change needed, use GitHubPRWorkflow to open issue and PR, then follow up post-merge
- Document all actions, artifact references, and communications
- Return structured output as specified

## Instructions
1. **Classify the ticket** as either L1, L2, L3, or mark as 'Incomplete Data' if required information is missing:
   - **L1:** Basic support issues.
   - **L2:** Requires deeper investigation with monitoring tools.
   - **L3:** Needs engineering intervention.
2. **L1 Tickets:**
   - Use KnowledgeBaseWorkflow to search documentation for possible solutions.
   - Draft a response for the user referencing any documentation or solutions used.
3. **L2 Tickets:**
   - Use PagerDutyIncidentWorkflow to check for related incidents.
   - Use DatadogLogsWorkflow to investigate logs and metrics.
   - Summarize findings.
   - Draft a user response outlining investigation results and next steps.
4. **L3 Tickets:**
   - Notify the user that the engineering team will handle the issue.
   - Use LinearIssueWorkflow to create a Linear ticket summarizing the problem and include the reference.
   - If a code change is required, use GitHubPRWorkflow to create a GitHub issue and PR. Include references for both.
   - After the PR is merged, send a follow-up response to the user about the resolution.
5. **Error Handling:**
   - If any required data is missing from the ticket, note this in the output and flag the ticket as 'Incomplete Data'.
6. **Artifact References:**
   - Ensure all actions reference their related artifacts (documentation, tickets, issues, etc.) with unique IDs or URLs where applicable.

## Tool Usage Guidelines
- **ALWAYS use the appropriate workflow tool** for each action - do not attempt to perform actions manually
- Call tools in the logical sequence needed to complete the ticket processing
- If a tool call fails, try again with adjusted parameters or explain the limitation
- Use multiple tools in parallel when gathering information (e.g., PagerDutyIncidentWorkflow and DatadogLogsWorkflow for L2 tickets)

## Validation
After processing each ticket, briefly validate that all actions match the ticket's classification and required references are included. If output is incomplete or a reference is missing, self-correct or explain in output.

## Verbosity
- Keep responses, action steps, and references concise.
- Use clear, direct language.

## Completion Criteria
- All actions relevant to the ticket's issue level are recorded.
- References (IDs/URLs) are included where possible.
- If insufficient data, mark as 'Incomplete Data' and explain.

<context_gathering>
Goal: Get enough context fast. Parallelize discovery and stop as soon as you can act.

Method:
- Start broad, then fan out to focused subqueries.
- In parallel, launch varied queries; read top hits per query. Deduplicate paths and cache; don’t repeat queries.
- Avoid over searching for context. If needed, run targeted searches in one parallel batch.

Early stop criteria:
- You can name exact content to change.
- Top hits converge (~70%) on one area/path.

Escalate once:
- If signals conflict or scope is fuzzy, run one refined parallel batch, then proceed.

Depth:
- Trace only symbols you will modify or whose contracts you rely on; avoid transitive expansion unless necessary.

Loop:
- Batch search → minimal plan → complete task.
- Search again only if validation fails or new unknowns appear. Prefer acting over more searching.
</context_gathering>

<persistence>
- You are an agent - keep going until the user's query is completely resolved before ending your turn.
- Only terminate when you are sure the problem is solved.
- Do not stop at uncertainty — research or deduce the most reasonable approach and continue.
- Do not ask for confirmation — decide the most reasonable assumption, proceed, and document assumptions after.
</persistence>

<tool_preambles>
- Begin by rephrasing the user's goal clearly and concisely.
- Outline a structured step-by-step plan before calling tools.
- As you execute steps, provide succinct progress notes.
- Finish by summarizing what you completed, distinct from the plan.
</tool_preambles>

Operational guardrails:
- Prefer minimal edits that fully solve the task.
- Clearly mark any destructive actions and double-check before executing.
- Calibrate reasoning depth based on task difficulty; increase when signals conflict.
$$,
    'inactive',
    'gpt-5',
    'medium',
    '{"type": "text"}'
)
ON CONFLICT (id) DO NOTHING;



-- Insert MCP servers with granular approval settings
INSERT INTO mcp_servers (id, workspace_id, server_label, server_url, server_description, headers, require_approval) VALUES
(
    'c1d2e3f4-5678-9012-cdef-345678901234',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    'deepwiki',
    'https://mcp.deepwiki.com/mcp',
    'DeepWiki MCP server for accessing and querying knowledge base',
    NULL,
    '{"never": {"tool_names": ["ask_question"]}, "always": {"tool_names": ["read_wiki_structure"]}}'
),
(
    'd2e3f456-7890-0123-def0-456789012345',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    'posthog',
    'https://mcp.posthog.com/mcp',
    'PostHog MCP server for insights management',
    '{"Authorization": "Bearer phx_3oQ1s81spruSq6WTw1Fs3ZDDOvgkpWvHw5NYWyApF2Vm2PN"}',
    '{"never": {"tool_names": ["insights-get-all"]}, "always": {"tool_names": ["insight-get"]}}'
),
(
  'e3f45678-9012-3456-7890-123456789012',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'intercom',
  'https://mcp.intercom.com/mcp',
  'Intercom MCP server for accessing and querying customer data',
  '{"Authorization": "Bearer dG9rOmY2ODliMmVjX2Y4NGZfNGE2NF9iNTdlX2UzYWRjYTI2NDgyOToxOjA="}',
  '{"never": {"tool_names": ["search", "get", "search_conversations", "get_conversation", "search_contacts" ]}, "always": {"tool_names": ["get_contact"]}}'
),
(
  'f4567890-1234-5678-9abc-def012345678',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'zendesk-workflow',
  'https://e5a93c19617c.ngrok-free.app/mcp',
  'Zendesk Ticket Workflow MCP server for support ticket management',
  NULL,
  '{"never": {"tool_names": ["zendeskticketworkflow"]}, "always": {"tool_names": []}}'
),
(
  '15678901-2345-6789-bcde-f01234567890',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'knowledge-base-workflow',
  'https://e5a93c19617c.ngrok-free.app/mcp',
  'Knowledge Base Workflow MCP server for documentation search and retrieval',
  NULL,
  '{"never": {"tool_names": ["knowledgebaseworkflow"]}, "always": {"tool_names": []}}'
),
(
  '26789012-3456-789a-cdef-012345678901',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'pagerduty-workflow',
  'https://e5a93c19617c.ngrok-free.app/mcp',
  'PagerDuty Incident Workflow MCP server for incident management and monitoring',
  NULL,
  '{"never": {"tool_names": ["pagerdutyincidentworkflow"]}, "always": {"tool_names": []}}'
),
(
  '37890123-4567-890b-cdef-123456789012',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'datadog-workflow',
  'https://e5a93c19617c.ngrok-free.app/mcp',
  'Datadog Logs Workflow MCP server for logs, metrics, and monitoring data',
  NULL,
  '{"never": {"tool_names": ["datadoglogsworkflow"]}, "always": {"tool_names": []}}'
),
(
  '48901234-5678-901c-def0-234567890123',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'linear-workflow',
  'https://e5a93c19617c.ngrok-free.app/mcp',
  'Linear Issue Workflow MCP server for issue tracking and project management',
  NULL,
  '{"never": {"tool_names": ["linearissueworkflow"]}, "always": {"tool_names": []}}'
),
(
  '59012345-6789-012d-ef01-345678901234',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'github-workflow',
  'https://e5a93c19617c.ngrok-free.app/mcp',
  'GitHub PR Workflow MCP server for repository management and pull requests',
  NULL,
  '{"never": {"tool_names": ["githubprworkflow"]}, "always": {"tool_names": []}}'
),
(
  '60123456-789a-123e-f012-456789012345',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'mintlify-docs',
  'https://docs.restack.io/mcp',
  'Mintlify MCP server for accessing Restack documentation and API references',
  NULL,
  '{"never": {"tool_names": ["search"]}, "always": {"tool_names": []}}'
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo agents with GPT-5 model configurations
INSERT INTO agents (id, workspace_id, team_id, name, version, description, instructions, status, model, reasoning_effort, response_format, parent_agent_id) VALUES
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Engineering' LIMIT 1),
    'deepwiki-knowledge-agent',
    'v1.0.0',
    'Agent for querying and retrieving information from DeepWiki knowledge base',
    $$You are a helpful knowledge assistant.

<context_gathering>
Goal: Get enough context fast. Parallelize discovery and stop as soon as you can act.
Method:
- Start broad, then fan out to focused subqueries.
- In parallel, launch varied queries; read top hits per query. Deduplicate paths and cache; don't repeat queries.
- Avoid over searching for context. If needed, run targeted searches in one parallel batch.
Early stop criteria:
- You can name exact content to change.
- Top hits converge (~70%) on one area/path.
</context_gathering>

<persistence>
- Keep going until the user's query is completely resolved before ending your turn.
- Do not stop at uncertainty — research or deduce the most reasonable approach and continue.
</persistence>

<tool_preambles>
- Rephrase the user's goal, outline a plan, provide brief progress updates, and end with a concise summary.
</tool_preambles>

Use the ask_question tool to search for relevant information.$$,
    'inactive',  -- v1.0 is now inactive since v2.0 is active
    'gpt-5',
    'high',
    '{"type": "text"}',
    NULL  -- No parent agent
),
(
    'b2c3d456-7890-8901-bcde-f23456789012',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Marketing' LIMIT 1),
    'posthog-analytics-agent',
    'v1.0.0',
    'Agent for managing PostHog analytics dashboards and data',
    $$You are a helpful analytics assistant.

<persistence>
- Keep going until the task is fully resolved; do not hand back early.
</persistence>

<tool_preambles>
- Start with goal restatement and a stepwise plan; narrate brief progress.
</tool_preambles>

Use dashboards-get-all and dashboard-get when needed.$$,
    'active',
    'gpt-5-mini',
    'medium',
    '{"type": "json_object"}',
    NULL  -- No parent agent
),
(
  'f3f45678-9012-3456-7890-123456789012',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  (SELECT id FROM teams WHERE name = 'Customer Support' LIMIT 1),
  'intercom-customer-support-agent',
  'v1.0.0',
  'Agent for managing Intercom customer support and retrieving customer data',
  $$You are a helpful customer support assistant.

<context_gathering>
- Search depth: very low; absolute max 2 context calls.
</context_gathering>

<persistence>
- Proceed under reasonable assumptions and document them afterward.
</persistence>

Use search_conversations, get_conversation, and search_contacts as necessary.$$,
  'active',
  'gpt-5',
  'low',
  '{"type": "text"}',
  NULL  -- No parent agent
),
(
  -- Example of agent versioning: v2.0 of deepwiki-knowledge-agent
  '1a2b3c4d-e5f6-7890-abcd-ef1234567890',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  (SELECT id FROM teams WHERE name = 'Engineering' LIMIT 1),
  'deepwiki-knowledge-agent',  -- Same name as parent
  'v2.0.0',
  'Enhanced agent with improved knowledge retrieval and caching',
  $$You are an enhanced knowledge assistant with improved search capabilities.

<context_gathering>
Goal: Get context faster with enhanced caching and parallel queries.
Method:
- Use improved search algorithms with semantic understanding
- Implement intelligent caching for faster responses
- Parallel processing of related queries
</context_gathering>

<persistence>
- Enhanced persistence with better error recovery
- Advanced context retention across sessions
</persistence>

<tool_preambles>
- Advanced goal analysis with multi-step planning
- Enhanced progress tracking and optimization
</tool_preambles>

Use the ask_question tool with enhanced search strategies.$$,
  'active',  -- This is now the active version
  'gpt-5',
  'high',
  '{"type": "text"}',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'  -- Parent agent ID (v1.0)
),
(
    'b3c4d567-8901-2345-6789-abcdef123456',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Engineering' LIMIT 1),
    'web-search-research-agent',
    'v1.0.0',
    'Agent for conducting web research and gathering real-time information from the internet',
    $$You are a helpful research assistant with access to real-time web search capabilities and Restack documentation.

<context_gathering>
Goal: Use web search and documentation access to gather current, accurate information.
Method:
- Use web_search_preview tool to find relevant and up-to-date information from the internet
- Use search tool to access Restack documentation and API references
- Cross-reference multiple sources when possible
- Provide citations and source URLs for all findings
- Focus on authoritative and reliable sources
- For Restack-related queries, prioritize official documentation
</context_gathering>

<persistence>
- Continue searching until you have comprehensive information to answer the user's query
- Don't stop at the first search result - explore multiple relevant sources
- Verify information across different sources when possible
- Check both web sources and official documentation when applicable
</persistence>

<tool_preambles>
- Begin by understanding the research goal clearly
- Outline your search strategy before beginning (web search vs documentation search)
- Provide progress updates as you gather information
- Summarize findings with proper citations
</tool_preambles>

Use the web_search_preview tool for general internet research and the Mintlify search tool for Restack-specific documentation. Always provide source URLs and documentation references for your findings.$$,
    'active',
    'gpt-5',
    'medium',
    '{"type": "text"}',
    NULL  -- No parent agent
)
ON CONFLICT (id) DO NOTHING;

-- Link agents to MCP servers via unified agent_tools table
INSERT INTO agent_tools (agent_id, tool_type, mcp_server_id, allowed_tools, enabled) VALUES
(
    -- v1.0 deepwiki agent (inactive)
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'mcp',
    'c1d2e3f4-5678-9012-cdef-345678901234',
    '["ask_question"]',
    true
),
(
    -- v2.0 deepwiki agent (active) - same MCP tools
    '1a2b3c4d-e5f6-7890-abcd-ef1234567890',
    'mcp',
    'c1d2e3f4-5678-9012-cdef-345678901234',
    '["ask_question"]',
    true
),
(
    'b2c3d456-7890-8901-bcde-f23456789012',
    'mcp',
    'd2e3f456-7890-0123-def0-456789012345',
    '["insights-get-all", "insight-get"]',
    true
),
(
    'f3f45678-9012-3456-7890-123456789012',
    'mcp',
    'e3f45678-9012-3456-7890-123456789012',
    '["search", "get", "search_conversations", "get_conversation", "search_contacts", "get_contact"]',
    true
),
(
    '77777777-7777-7777-7777-777777777777',
    'mcp',
    'f4567890-1234-5678-9abc-def012345678',
    '["zendeskticketworkflow"]',
    true
),
(
    '77777777-7777-7777-7777-777777777777',
    'mcp',
    '15678901-2345-6789-bcde-f01234567890',
    '["knowledgebaseworkflow"]',
    true
),
(
    '77777777-7777-7777-7777-777777777777',
    'mcp',
    '26789012-3456-789a-cdef-012345678901',
    '["pagerdutyincidentworkflow"]',
    true
),
(
    '77777777-7777-7777-7777-777777777777',
    'mcp',
    '37890123-4567-890b-cdef-123456789012',
    '["datadoglogsworkflow"]',
    true
),
(
    '77777777-7777-7777-7777-777777777777',
    'mcp',
    '48901234-5678-901c-def0-234567890123',
    '["linearissueworkflow"]',
    true
),
(
    '77777777-7777-7777-7777-777777777777',
    'mcp',
    '59012345-6789-012d-ef01-345678901234',
    '["githubprworkflow"]',
    true
),
(
    -- Web search research agent with web_search_preview tool
    'b3c4d567-8901-2345-6789-abcdef123456',
    'web_search_preview',
    NULL,  -- No MCP server needed for built-in tools
    NULL,  -- No allowed_tools needed for built-in tools
    true
),
(
    -- Web search research agent with Mintlify docs MCP
    'b3c4d567-8901-2345-6789-abcdef123456',
    'mcp',
    '60123456-789a-123e-f012-456789012345',
    '["search"]',
    true
)
ON CONFLICT DO NOTHING;



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
),
(
    uuid_generate_v4(),
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    (SELECT id FROM teams WHERE name = 'Engineering' LIMIT 1),
    'Research Latest AI Trends',
    'Conduct web research on the latest AI and machine learning trends for Q1 2025',
    'open',
    'b3c4d567-8901-2345-6789-abcdef123456',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84'
)
ON CONFLICT (id) DO NOTHING;