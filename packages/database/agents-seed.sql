-- Agents and completed tasks seed data
-- This file creates demo agents and completed tasks with realistic conversation history

-- Customer Support Agent - Zendesk orchestrator
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, status, model, reasoning_effort)
VALUES (
    '77777777-7777-7777-7777-777777777777',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111', -- Customer Support team
    'zendesk-support-orchestrator',
    'Demo agent orchestrating Zendesk, PagerDuty, Datadog, Linear, and GitHub',
    $$Developer: # Support Ticket for Zendesk

## Objective
Process incoming support tickets from Zendesk, classifying and managing each according to issue severity, and track all related actions and communications.

## Available Tools
You have access to the following tools that you MUST use for the corresponding actions:
- **ZendeskTicket**: Create, update, or query Zendesk tickets
- **KnowledgeBase**: Search documentation and knowledge base for solutions
- **PagerDutyIncident**: Check incidents and monitoring data from PagerDuty
- **DatadogLogs**: Query logs and metrics from Datadog for investigation
- **LinearIssue**: Create and manage Linear tickets for engineering tasks
- **GitHubPR**: Create GitHub issues and pull requests for code changes

## Checklist
Begin with a concise checklist (3–7 bullets) outlining your approach:
- Review the Zendesk ticket for required information using ZendeskTicket
- Classify ticket as L1, L2, L3, or 'Incomplete Data'
- For L1: use KnowledgeBase to consult documentation and draft a solution response
- For L2: use PagerDutyIncident and DatadogLogs to investigate; summarize findings and respond
- For L3: notify user, use LinearIssue to create ticket, and if code change needed, use GitHubPR to open issue and PR, then follow up post-merge
- Document all actions, artifact references, and communications
- Return structured output as specified

## Instructions
1. **Classify the ticket** as either L1, L2, L3, or mark as 'Incomplete Data' if required information is missing:
   - **L1:** Basic support issues.
   - **L2:** Requires deeper investigation with monitoring tools.
   - **L3:** Needs engineering intervention.
2. **L1 Tickets:**
   - Use KnowledgeBase to search documentation for possible solutions.
   - Draft a response for the user referencing any documentation or solutions used.
3. **L2 Tickets:**
   - Use PagerDutyIncident to check for related incidents.
   - Use DatadogLogs to investigate logs and metrics.
   - Summarize findings.
   - Draft a user response outlining investigation results and next steps.
4. **L3 Tickets:**
   - Notify the user that the engineering team will handle the issue.
   - Use LinearIssue to create a Linear ticket summarizing the problem and include the reference.
   - If a code change is required, use GitHubPR to create a GitHub issue and PR. Include references for both.
   - After the PR is merged, send a follow-up response to the user about the resolution.
5. **Error Handling:**
   - If any required data is missing from the ticket, note this in the output and flag the ticket as 'Incomplete Data'.
6. **Artifact References:**
   - Ensure all actions reference their related artifacts (documentation, tickets, issues, etc.) with unique IDs or URLs where applicable.

## Tool Usage Guidelines
- **ALWAYS use the appropriate tool** for each action - do not attempt to perform actions manually
- Call tools in the logical sequence needed to complete the ticket processing
- If a tool call fails, try again with adjusted parameters or explain the limitation
- Use multiple tools in parallel when gathering information (e.g., PagerDutyIncident and DatadogLogs for L2 tickets)

## Validation
After processing each ticket, briefly validate that all actions match the ticket's classification and required references are included. If output is incomplete or a reference is missing, self-correct or explain in output.

## Verbosity
- Keep responses, action steps, and references concise.
- Use clear, direct language.

## Completion Criteria
- All actions relevant to the ticket's issue level are recorded.
- References (IDs/URLs) are included where possible.
- If insufficient data, mark as 'Incomplete Data' and explain.$$,
    'published',
    'gpt-5',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- Sales Agent - CRM and lead management
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, status, model, reasoning_effort)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '22222222-2222-2222-2222-222222222222', -- Sales team
    'sales-lead-manager',
    'AI agent for managing sales leads, opportunities, and customer relationships',
    $$You are a sales lead management assistant focused on converting prospects into customers.

## Objective
Manage sales leads, track opportunities, and provide insights on sales pipeline performance.

## Available Tools
- **CRM Integration**: Access lead information and update opportunity status
- **Lead Scoring**: Analyze lead quality and conversion probability
- **Communication Tracking**: Monitor customer interactions and follow-ups

## Instructions
1. Qualify incoming leads based on budget, authority, need, and timeline
2. Update CRM records with interaction history and lead scores
3. Recommend next steps for lead nurturing and conversion
4. Track opportunity progression through sales stages
5. Provide insights on pipeline health and conversion rates

Always maintain accurate records and follow up on commitments made to prospects.$$,
    'published',
    'gpt-5-mini',
    'low'
)
ON CONFLICT (id) DO NOTHING;

-- Marketing Agent - Campaign analytics and optimization
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, status, model, reasoning_effort)
VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333', -- Marketing team
    'campaign-analytics-optimizer',
    'AI agent for analyzing marketing campaign performance and optimization',
    $$You are a marketing analytics specialist focused on campaign performance and optimization.

## Objective
Analyze marketing campaign performance, provide insights, and recommend optimizations.

## Available Tools
- **PostHog Analytics**: Access campaign metrics and user behavior data
- **Performance Analysis**: Calculate ROI, conversion rates, and engagement metrics
- **Optimization Recommendations**: Suggest improvements based on data analysis

## Instructions
1. Analyze campaign performance across all channels
2. Calculate key metrics like ROI, CAC, and conversion rates
3. Identify top-performing campaigns and channels
4. Provide actionable recommendations for optimization
5. Track campaign goals and measure success against objectives

Focus on data-driven insights and clear recommendations for improving marketing effectiveness.$$,
    'published',
    'gpt-5',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- Engineering Agent - Documentation and research
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, status, model, reasoning_effort)
VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '44444444-4444-4444-4444-444444444444', -- Engineering team
    'technical-research-assistant',
    'AI agent for technical research, documentation, and knowledge management',
    $$You are a technical research assistant specializing in finding solutions and documentation.

## Objective
Research technical solutions, search documentation, and provide comprehensive answers to engineering questions.

## Available Tools
- **SearchRestack**: Access internal documentation and technical resources
- **web_search_preview**: Find current information about technologies and best practices
- **ask_question**: Parse and summarize technical documentation

## Instructions
1. Search internal knowledge base first for existing solutions
2. Use web_search_preview for current best practices and emerging technologies
3. Provide comprehensive answers with code examples when applicable
4. Include references and sources for all recommendations
5. Suggest implementation approaches and potential gotchas

Always prioritize accuracy and provide multiple approaches when possible.$$,
    'published',
    'gpt-5',
    'low'
)
ON CONFLICT (id) DO NOTHING;

-- HR Agent - Employee data and operations
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, status, model, reasoning_effort)
VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '55555555-5555-5555-5555-555555555555', -- HR team
    'hr-operations-assistant',
    'AI agent for HR operations, employee data management, and policy assistance',
    $$You are an HR operations assistant focused on employee support and data management.

## Objective
Assist with HR operations, employee data queries, and policy guidance.

## Available Tools
- **HR System**: Access employee records and organizational data
- **Policy Database**: Reference company policies and procedures
- **Benefits Management**: Information about employee benefits and programs

## Instructions
1. Handle employee data queries with strict confidentiality
2. Provide guidance on company policies and procedures
3. Assist with benefits enrollment and information requests
4. Support onboarding and offboarding processes
5. Ensure compliance with privacy and data protection requirements

Always maintain confidentiality and follow proper authorization protocols for sensitive information.$$,
    'published',
    'gpt-5-mini',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- News Research Agent - Web search demonstration
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, status, model, reasoning_effort)
VALUES (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333', -- Marketing team
    'news-research-agent',
    'AI agent demonstrating web search capabilities for news research and fact-checking',
    $$You are a news research specialist focused on finding current information and fact-checking.

## Objective
Research current news, trends, and information using web search capabilities to provide accurate, up-to-date responses.

## Available Tools
- **Web Search**: Search the internet for current news, information, and trends
- **Knowledge Base**: Access internal documentation for context

## Instructions
1. **Search Strategy**: Use targeted searches with specific sites when appropriate (e.g., site:reuters.com, site:techcrunch.com)
2. **Fact Verification**: Cross-reference information across multiple reliable sources
3. **Current Events**: Focus on recent developments and breaking news
4. **Source Quality**: Prioritize reputable news sources and official announcements
5. **Comprehensive Coverage**: Search multiple angles of a story for complete context

## Search Examples
- For technology news: "site:techcrunch.com AI developments 2024"
- For business news: "site:bloomberg.com market trends today"
- For general news: "site:reuters.com breaking news"
- For science: "site:nature.com recent discoveries"

## Response Format
Always provide:
- Summary of findings
- Sources searched and results found
- Key insights and trends identified
- Recommendations for follow-up research if needed

Demonstrate the full capabilities of web search with detailed, informative responses.$$,
    'published',
    'gpt-5',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- Error Testing Agent - For testing MCP failure scenarios
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, status, model, reasoning_effort)
VALUES (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '44444444-4444-4444-4444-444444444444', -- Engineering team
    'error-testing-agent',
    'AI agent for testing MCP error handling and failure scenarios',
    $$You are an error testing specialist designed to test various MCP failure scenarios.

## Objective
Test and demonstrate different types of MCP tool failures to validate error handling systems.

## Available Tools
- **FailingMcpTest**: A tool that intentionally fails in various ways to test error handling

## Instructions
1. **Test Different Failure Types**: Use the FailingMcpTest tool with different failure_type parameters:
   - "timeout" - Simulates MCP tool timeout (NonRetryableError)
   - "invalid_params" - Simulates invalid parameter errors (NonRetryableError)
   - "tool_not_found" - Simulates tool not found errors (NonRetryableError)
   - "permission_denied" - Simulates permission/authorization errors (NonRetryableError)
   - "network_error" - Simulates network connectivity issues (NonRetryableError)
   - "json_parse_error" - Simulates JSON parsing failures (NonRetryableError)
   - "workflow_error" - Simulates workflow execution errors (NonRetryableError)
   - "activity_failure" - Simulates activity failure errors (NonRetryableError)
   - "random" - Randomly selects one of the above failure types

2. **Success Testing**: Set should_fail=false to test successful execution

3. **Error Analysis**: When failures occur, analyze the error response and explain:
   - What type of error occurred
   - How the system handled the error
   - Whether the error was properly caught and displayed
   - Any improvements that could be made to error handling

## Example Usage
To test a timeout error:
```
Use FailingMcpTest with:
- failure_type: "timeout"
- user_request: "Test timeout scenario"
- should_fail: true
```

To test a workflow execution error:
```
Use FailingMcpTest with:
- failure_type: "workflow_error"
- user_request: "Test workflow failure"
- should_fail: true
```

## Testing Scenarios
- **Systematic Testing**: Test each failure type individually
- **Random Testing**: Use "random" failure type for unpredictable scenarios
- **Success Validation**: Verify tool works when should_fail=false
- **Error Recovery**: Test how the system recovers from different error types

Focus on thorough testing and clear documentation of error handling behavior.$$,
    'published',
    'gpt-5',
    'low'
)
ON CONFLICT (id) DO NOTHING;

-- Notion Knowledge Management Agent - Demonstrates OAuth token refresh
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, status, model, reasoning_effort)
VALUES (
    '11111111-2222-3333-4444-555555555555',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111', -- Product team
    'notion-knowledge-manager',
    'AI agent for managing knowledge base and documentation in Notion with OAuth token refresh',
    $$You are a knowledge management specialist focused on organizing and maintaining documentation in Notion.

## Objective
Manage knowledge base content, create documentation, and organize information using Notion's API with automatic token refresh capabilities.

## Available Tools
- **Notion API**: Full access to Notion workspace for creating, updating, and querying pages and databases
- **Token Refresh**: Automatic refresh of OAuth tokens for uninterrupted access

## Instructions
1. **Knowledge Organization**: Structure information logically in Notion databases and pages
2. **Content Creation**: Create comprehensive documentation with proper formatting
3. **Search & Retrieval**: Find existing information quickly using Notion's search capabilities
4. **Database Management**: Maintain and update Notion databases with structured data
5. **Collaboration**: Facilitate team knowledge sharing through organized Notion workspaces

## Key Features
- **Offline Token Access**: Uses refresh tokens to maintain long-term access to Notion
- **Automatic Refresh**: Seamlessly refreshes expired tokens without user intervention
- **Comprehensive API Access**: Full CRUD operations on Notion pages, databases, and blocks
- **Rich Content Support**: Handle text, images, embeds, and structured data

## Use Cases
- Create and update project documentation
- Maintain team knowledge bases
- Organize meeting notes and decisions
- Track project progress in databases
- Search and retrieve information across workspaces

## Token Management
This agent demonstrates OAuth 2.0 refresh token functionality:
- Stores both access and refresh tokens securely
- Automatically refreshes expired access tokens
- Maintains continuous access to Notion API
- Handles token refresh errors gracefully

Always ensure information is well-organized, searchable, and accessible to team members.$$,
    'published',
    'gpt-5',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- Link agents to MCP servers via agent_tools table
INSERT INTO agent_tools (id, agent_id, tool_type, mcp_server_id, allowed_tools, enabled) VALUES
-- Customer Support Agent tools
('10000001-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777', 'mcp', 'f4567890-1234-5678-9abc-def012345678', '["zendeskticket"]', true),
('10000002-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777777', 'mcp', '15678901-2345-6789-bcde-f01234567890', '["knowledgebase"]', true),
('10000003-0000-0000-0000-000000000003', '77777777-7777-7777-7777-777777777777', 'mcp', '26789012-3456-789a-cdef-012345678901', '["pagerdutyincident"]', true),
('10000004-0000-0000-0000-000000000004', '77777777-7777-7777-7777-777777777777', 'mcp', '37890123-4567-890b-cdef-123456789012', '["datadoglogs"]', true),
('10000005-0000-0000-0000-000000000005', '77777777-7777-7777-7777-777777777777', 'mcp', '48901234-5678-901c-def0-234567890123', '["linearissue"]', true),
('10000006-0000-0000-0000-000000000006', '77777777-7777-7777-7777-777777777777', 'mcp', '59012345-6789-012d-ef01-345678901234', '["githubpr"]', true),

-- Sales Agent tools
('10000007-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'mcp', '70123456-789a-123e-f012-456789012346', '["create_lead", "update_opportunity", "get_lead_status"]', true),

-- Marketing Agent tools
('10000008-0000-0000-0000-000000000008', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'mcp', 'd2e3f456-7890-0123-def0-456789012345', '["insights-get-all", "insight-get"]', true),

-- Engineering Agent tools
('10000009-0000-0000-0000-000000000009', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'mcp', 'c1d2e3f4-5678-9012-cdef-345678901234', '["ask_question"]', true),
('10000010-0000-0000-0000-000000000010', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'web_search_preview', NULL, NULL, true),
('10000011-0000-0000-0000-000000000011', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'mcp', '60123456-789a-123e-f012-456789012345', '["SearchRestack"]', true),

-- HR Agent tools
('10000012-0000-0000-0000-000000000012', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'mcp', '80123456-789a-123e-f012-456789012347', '["employee_search", "update_employee", "get_employee_info"]', true),

-- News Research Agent tools
('10000013-0000-0000-0000-000000000013', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'web_search_preview', NULL, NULL, true),

-- Error Testing Agent tools
('10000014-0000-0000-0000-000000000014', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'mcp', '90123456-789a-123e-f012-456789012348', '["failingmcptest"]', true),

-- Notion Knowledge Management Agent tools
('10000015-0000-0000-0000-000000000015', '11111111-2222-3333-4444-555555555555', 'mcp', 'a0123456-789a-123e-f012-456789012349', '["search_pages", "create_page", "update_page", "get_page", "query_database", "create_database", "update_database"]', true)
ON CONFLICT (id) DO NOTHING;

-- Demo completed tasks with realistic conversation history
-- Customer Support: Login issue resolution
INSERT INTO tasks (id, workspace_id, team_id, title, description, status, agent_id, assigned_to_id, agent_task_id, messages) VALUES
(
    '20000001-0000-0000-0000-000000000001',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Resolve customer login authentication error',
    'Customer reported unable to login with error "Invalid credentials" despite correct password',
    'completed',
    '77777777-7777-7777-7777-777777777777',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '30000001-0000-0000-0000-000000000001',
    '[
      {
        "id": "msg-001",
        "type": "user",
        "timestamp": "2024-01-15T10:30:00Z",
        "openai_output": {
          "id": "msg-001",
          "type": "message",
          "role": "user",
          "status": "completed",
          "content": [{"type": "input_text", "text": "A customer reported they cannot log into their account. They get an error message saying \"Invalid credentials\" even though they are sure their password is correct. Customer email: john.doe@example.com"}]
        }
      },
      {
        "id": "msg-002",
        "type": "assistant",
        "timestamp": "2024-01-15T10:30:15Z",
        "openai_output": {
          "id": "msg-002",
          "type": "message",
          "role": "assistant",
          "status": "completed",
          "content": [{"type": "text", "text": "I will help you resolve this login issue. Let me start by investigating the customer account status and checking for any related incidents or authentication problems."}]
        }
      },
      {
        "id": "msg-003",
        "type": "mcp_call",
        "timestamp": "2024-01-15T10:30:30Z",
        "openai_output": {
          "id": "msg-003",
          "type": "mcp_call",
          "name": "zendeskticket",
          "server_label": "zendesk",
          "status": "completed",
          "arguments": {"query": "login authentication errors", "timeframe": "24h"},
          "output": "Found 3 related tickets in the past 24 hours with similar authentication errors"
        }
      },
      {
        "id": "msg-004",
        "type": "mcp_call",
        "timestamp": "2024-01-15T10:31:00Z",
        "openai_output": {
          "id": "msg-004",
          "type": "mcp_call",
          "name": "pagerdutyincident",
          "server_label": "pagerduty",
          "status": "completed",
          "arguments": {"service": "authentication", "status": "open"},
          "output": "No active incidents found for authentication services"
        }
      },
      {
        "id": "msg-005",
        "type": "mcp_call",
        "timestamp": "2024-01-15T10:31:30Z",
        "openai_output": {
          "id": "msg-005",
          "type": "mcp_call",
          "name": "datadoglogs",
          "server_label": "datadog",
          "status": "completed",
          "arguments": {"user": "john.doe@example.com", "service": "authentication", "timeframe": "1h"},
          "output": "Found account lockout due to 5 failed login attempts in 10 minutes. Account status: LOCKED"
        }
      },
      {
        "id": "msg-006",
        "type": "assistant",
        "timestamp": "2024-01-15T10:32:00Z",
        "openai_output": {
          "id": "msg-006",
          "type": "message",
          "role": "assistant",
          "status": "completed",
          "content": [{"type": "text", "text": "I found the issue! The customer account was temporarily locked due to multiple failed login attempts (security feature). I have unlocked the account and sent them a password reset email as a precaution. The customer should now be able to log in successfully."}]
        }
      },
      {
        "id": "msg-007",
        "type": "mcp_call",
        "timestamp": "2024-01-15T10:32:30Z",
        "openai_output": {
          "id": "msg-007",
          "type": "mcp_call",
          "name": "zendeskticket",
          "server_label": "zendesk",
          "status": "completed",
          "arguments": {"action": "create", "subject": "Login issue resolved", "status": "resolved"},
          "output": "Ticket #ZD-12345 created and marked as resolved"
        }
      },
      {
        "id": "msg-008",
        "type": "assistant",
        "content": "✅ **Issue Resolved Successfully**\n\n**Root Cause**: Account lockout due to failed login attempts\n**Solution**: Unlocked account and sent password reset email\n**Documentation**: Zendesk ticket #ZD-12345\n**Status**: Customer can now log in normally\n\nThe security lockout was working as intended to protect the account from potential unauthorized access attempts.",
        "timestamp": "2024-01-15T10:33:00Z"
      }
    ]'
),

-- Customer Support: Tool approval declined example
(
    '20000002-0000-0000-0000-000000000002',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Investigate payment processing security alert',
    'Security alert triggered for suspicious payment patterns requiring immediate investigation',
    'completed',
    '77777777-7777-7777-7777-777777777777',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '30000002-0000-0000-0000-000000000002',
    '[
      {
        "id": "msg-101",
        "type": "user",
        "content": "We received a security alert about suspicious payment processing patterns. Multiple declined transactions from the same IP address with different credit cards. Need immediate investigation.",
        "timestamp": "2024-01-16T14:20:00Z"
      },
      {
        "id": "msg-102",
        "type": "assistant",
        "content": "This is a critical security issue that requires immediate investigation. I will analyze the payment logs and check for any related incidents to determine if this is fraudulent activity.",
        "timestamp": "2024-01-16T14:20:30Z"
      },
      {
        "id": "msg-103",
        "type": "mcp_approval_request",
        "timestamp": "2024-01-16T14:21:00Z",
        "openai_output": {
          "id": "msg-103",
          "type": "mcp_approval_request",
          "name": "datadoglogs",
          "server_label": "datadog",
          "status": "failed",
          "arguments": {"service": "payment", "log_level": "error", "timeframe": "1h"},
          "output": "Access denied - Security investigation requires manual approval from Security team",
          "decline_reason": "Sensitive payment data access requires Security team authorization"
        }
      },
      {
        "id": "msg-104",
        "type": "assistant",
        "content": "I cannot access the payment logs directly due to security restrictions. Let me escalate this through proper channels and use alternative investigation methods.",
        "timestamp": "2024-01-16T14:21:30Z"
      },
      {
        "id": "msg-105",
        "type": "mcp_call",
        "timestamp": "2024-01-16T14:22:00Z",
        "openai_output": {
          "id": "msg-105",
          "type": "mcp_call",
          "name": "linearissue",
          "server_label": "linear",
          "status": "completed",
          "arguments": {"priority": "high", "team": "security", "title": "Payment fraud investigation", "description": "Suspicious payment patterns detected"},
          "output": "High-priority security ticket LIN-SEC-789 created and assigned to Security team"
        }
      },
      {
        "id": "msg-106",
        "type": "mcp_call",
        "timestamp": "2024-01-16T14:22:30Z",
        "openai_output": {
          "id": "msg-106",
          "type": "mcp_call",
          "name": "pagerdutyincident",
          "server_label": "pagerduty",
          "status": "completed",
          "arguments": {"category": "security", "status": "resolved", "timeframe": "7d"},
          "output": "Found similar incident PD-INC-456 from last week, marked as resolved - card testing attack"
        }
      },
      {
        "id": "msg-107",
        "type": "assistant",
        "content": "Based on the previous incident pattern, this appears to be a card testing attack. I have escalated to the Security team via Linear ticket LIN-SEC-789. They will need to:\n\n1. Review payment logs manually\n2. Implement IP blocking if confirmed fraudulent\n3. Review fraud detection rules\n\nThe Security team has been notified and will investigate within their established protocols.",
        "timestamp": "2024-01-16T14:23:00Z"
      },
      {
        "id": "msg-108",
        "type": "mcp_call",
        "timestamp": "2024-01-16T14:23:30Z",
        "openai_output": {
          "id": "msg-108",
          "type": "mcp_call",
          "name": "zendeskticket",
          "server_label": "zendesk",
          "status": "completed",
          "arguments": {"action": "create", "subject": "Security escalation - Payment fraud", "priority": "high"},
          "output": "Security escalation ticket #ZD-SEC-123 created"
        }
      },
      {
        "id": "msg-109",
        "type": "assistant",
        "content": "🔒 **Security Investigation Escalated**\n\n**Issue**: Suspicious payment patterns detected\n**Assessment**: Likely card testing attack (similar to PD-INC-456)\n**Action**: Escalated to Security team via LIN-SEC-789\n**Documentation**: Zendesk ticket #ZD-SEC-123\n**Status**: Under Security team investigation\n\n**Note**: Direct payment log access was appropriately restricted and required manual Security team approval, following proper security protocols.",
        "timestamp": "2024-01-16T14:24:00Z"
      }
    ]'
),

-- Sales: Lead qualification and opportunity management
(
    '20000003-0000-0000-0000-000000000003',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '22222222-2222-2222-2222-222222222222',
    'Qualify enterprise lead and create opportunity',
    'New enterprise lead from TechCorp requires qualification and opportunity creation',
    'completed',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '30000003-0000-0000-0000-000000000003',
    '[
      {
        "id": "msg-201",
        "type": "user",
        "content": "We have a new enterprise lead from TechCorp. Contact: Sarah Johnson, CTO. They are interested in our platform for their team of 200+ developers. Please qualify this lead and create an opportunity if appropriate.",
        "timestamp": "2024-01-17T09:15:00Z"
      },
      {
        "id": "msg-202",
        "type": "assistant",
        "content": "I will qualify this enterprise lead using our BANT criteria (Budget, Authority, Need, Timeline) and create an appropriate opportunity in our CRM system.",
        "timestamp": "2024-01-17T09:15:30Z"
      },
      {
        "id": "msg-203",
        "type": "mcp_call",
        "timestamp": "2024-01-17T09:16:00Z",
        "openai_output": {
          "id": "msg-203",
          "type": "mcp_call",
          "name": "create_lead",
          "server_label": "sales-crm",
          "status": "completed",
          "arguments": {"company": "TechCorp", "contact": "Sarah Johnson", "title": "CTO", "team_size": 200},
          "output": "Lead CRM-LEAD-456 created for TechCorp - Sarah Johnson"
        }
      },
      {
        "id": "msg-204",
        "type": "mcp_call",
        "timestamp": "2024-01-17T09:17:00Z",
        "openai_output": {
          "id": "msg-204",
          "type": "mcp_call",
          "name": "get_lead_status",
          "server_label": "sales-crm",
          "status": "completed",
          "arguments": {"company": "TechCorp", "fields": ["funding_stage", "employee_count", "arr", "budget_range"]},
          "output": "TechCorp: Series B company, 500 employees, $50M ARR, budget range $100K-500K annually"
        }
      },
      {
        "id": "msg-205",
        "type": "assistant",
        "content": "Based on my qualification analysis:\n\n**Budget**: ✅ Strong ($100K-500K range)\n**Authority**: ✅ CTO has decision-making power\n**Need**: ✅ Developer platform for 200+ team\n**Timeline**: ⏳ To be determined\n\nThis is a high-quality enterprise lead. Creating opportunity now.",
        "timestamp": "2024-01-17T09:18:00Z"
      },
      {
        "id": "msg-206",
        "type": "mcp_call",
        "timestamp": "2024-01-17T09:18:30Z",
        "openai_output": {
          "id": "msg-206",
          "type": "mcp_call",
          "name": "update_opportunity",
          "server_label": "sales-crm",
          "status": "completed",
          "arguments": {"lead_id": "CRM-LEAD-456", "estimated_value": 300000, "timeline": "6-month", "stage": "discovery"},
          "output": "Opportunity CRM-OPP-789 created: $300K estimated value, 6-month timeline"
        }
      },
      {
        "id": "msg-207",
        "type": "assistant",
        "content": "🎯 **Enterprise Lead Successfully Qualified**\n\n**Company**: TechCorp (Series B, $50M ARR)\n**Contact**: Sarah Johnson, CTO\n**Team Size**: 200+ developers\n**Lead Score**: 85/100 (High Priority)\n\n**CRM Records Created**:\n- Lead: CRM-LEAD-456\n- Opportunity: CRM-OPP-789 ($300K estimated)\n\n**Next Steps**:\n1. Schedule discovery call within 48 hours\n2. Prepare enterprise demo environment\n3. Send welcome packet and case studies\n\n**Recommended**: Fast-track to enterprise sales process due to strong qualification metrics.",
        "timestamp": "2024-01-17T09:19:00Z"
      }
    ]'
),

-- Marketing: Campaign performance analysis
(
    '20000004-0000-0000-0000-000000000004',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333',
    'Analyze Q1 campaign performance and optimize budget',
    'Review Q1 marketing campaign results and provide optimization recommendations',
    'completed',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '30000004-0000-0000-0000-000000000004',
    '[
      {
        "id": "msg-301",
        "type": "user",
        "content": "Please analyze our Q1 marketing campaign performance. We need insights on ROI, conversion rates, and recommendations for Q2 budget allocation. Focus on identifying our best-performing channels.",
        "timestamp": "2024-01-18T11:00:00Z"
      },
      {
        "id": "msg-302",
        "type": "assistant",
        "content": "I will analyze the Q1 campaign performance across all channels and provide comprehensive insights with optimization recommendations for Q2 planning.",
        "timestamp": "2024-01-18T11:00:30Z"
      },
      {
        "id": "msg-303",
        "type": "mcp_call",
        "timestamp": "2024-01-18T11:01:00Z",
        "openai_output": {
          "id": "msg-303",
          "type": "mcp_call",
          "name": "insights-get-all",
          "server_label": "posthog",
          "status": "completed",
          "arguments": {"period": "Q1", "metrics": ["spend", "conversions", "roi"]},
          "output": "Retrieved 15 campaigns data: Total spend $45K, Total conversions 1,247, Overall ROI 285%"
        }
      },
      {
        "id": "msg-304",
        "type": "mcp_call",
        "timestamp": "2024-01-18T11:02:00Z",
        "openai_output": {
          "id": "msg-304",
          "type": "mcp_call",
          "name": "insight-get",
          "server_label": "posthog",
          "status": "completed",
          "arguments": {"filter": "top_performing", "limit": 3, "sort_by": "roi"},
          "output": "Top 3 campaigns: 1) Email nurture series (ROI 420%), 2) LinkedIn ads (ROI 340%), 3) Content marketing (ROI 290%)"
        }
      },
      {
        "id": "msg-305",
        "type": "assistant",
        "content": "📊 **Q1 Campaign Performance Analysis Complete**\n\n**Overall Performance**:\n- Total Investment: $45,000\n- Total Conversions: 1,247\n- Overall ROI: 285%\n- Average CAC: $36\n\n**Top Performing Channels**:\n1. **Email Nurture Series**: 420% ROI, $24 CAC\n2. **LinkedIn Ads**: 340% ROI, $31 CAC  \n3. **Content Marketing**: 290% ROI, $28 CAC\n\n**Q2 Optimization Recommendations**:\n1. **Increase email marketing budget by 40%** (highest ROI)\n2. **Expand LinkedIn targeting** to similar audiences\n3. **Reduce spend on display ads** (lowest ROI at 180%)\n4. **Invest in content amplification** strategies\n\n**Projected Q2 Impact**: 35% improvement in overall ROI with recommended changes",
        "timestamp": "2024-01-18T11:03:00Z"
      }
    ]'
),

-- Engineering: Technical research and documentation
(
    '20000005-0000-0000-0000-000000000005',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '44444444-4444-4444-4444-444444444444',
    'Research microservices architecture patterns',
    'Research and document best practices for microservices architecture implementation',
    'completed',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '30000005-0000-0000-0000-000000000005',
    '[
      {
        "id": "msg-401",
        "type": "user",
        "content": "We are planning to migrate from monolith to microservices architecture. Please research current best practices, patterns, and potential challenges. Include both internal documentation and latest industry trends.",
        "timestamp": "2024-01-19T13:30:00Z"
      },
      {
        "id": "msg-402",
        "type": "assistant",
        "content": "I will research microservices architecture patterns, best practices, and migration strategies using both our internal knowledge base and current industry resources.",
        "timestamp": "2024-01-19T13:30:30Z"
      },
      {
        "id": "msg-403",
        "type": "mcp_call",
        "timestamp": "2024-01-19T13:31:00Z",
        "openai_output": {
          "id": "msg-403",
          "type": "mcp_call",
          "name": "ask_question",
          "server_label": "deepwiki",
          "status": "completed",
          "arguments": {"query": "microservices architecture patterns", "category": "engineering"},
          "output": "Found 12 internal docs on microservices: API gateway patterns, service mesh, database per service"
        }
      },
      {
        "id": "msg-404",
        "type": "web_search_call",
        "timestamp": "2024-01-19T13:32:00Z",
        "openai_output": {
          "id": "msg-404",
          "type": "web_search_call",
          "action": {"query": "microservices best practices 2024", "type": "search"},
          "status": "completed",
          "output": "Found current trends: Event-driven architecture, CQRS patterns, service mesh adoption, observability strategies"
        }
      },
      {
        "id": "msg-405",
        "type": "mcp_call",
        "timestamp": "2024-01-19T13:33:00Z",
        "openai_output": {
          "id": "msg-405",
          "type": "mcp_call",
          "name": "SearchRestack",
          "server_label": "mintlify-docs",
          "status": "completed",
          "arguments": {"query": "microservices orchestration", "section": "workflows"},
          "output": "Restack workflow orchestration patterns for microservices coordination and state management"
        }
      },
      {
        "id": "msg-406",
        "type": "assistant",
        "content": "🏗️ **Microservices Architecture Research Summary**\n\n**Core Patterns Identified**:\n1. **API Gateway Pattern** - Single entry point for client requests\n2. **Database per Service** - Data isolation and autonomy\n3. **Event-Driven Architecture** - Asynchronous service communication\n4. **Service Mesh** - Infrastructure layer for service-to-service communication\n\n**Migration Strategy Recommendations**:\n1. **Strangler Fig Pattern** - Gradually replace monolith components\n2. **Start with bounded contexts** - Identify clear service boundaries\n3. **Implement observability first** - Distributed tracing, logging, metrics\n4. **Use workflow orchestration** - Restack for complex business processes\n\n**Key Challenges & Solutions**:\n- **Data Consistency**: Implement saga patterns for distributed transactions\n- **Service Discovery**: Use service mesh or dedicated discovery service\n- **Testing**: Implement contract testing and end-to-end test strategies\n- **Deployment**: Adopt CI/CD with independent service deployment\n\n**Next Steps**:\n1. Create proof-of-concept with 2-3 services\n2. Establish monitoring and observability baseline\n3. Define service communication protocols\n4. Plan gradual migration roadmap\n\n**Recommended Tools**: Kubernetes, Istio, Restack workflows, Jaeger tracing",
        "timestamp": "2024-01-19T13:35:00Z"
      }
    ]'
),

-- HR: Employee onboarding automation
(
    '20000006-0000-0000-0000-000000000006',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '55555555-5555-5555-5555-555555555555',
    'Automate new employee onboarding process',
    'Design and implement automated onboarding workflow for new engineering hires',
    'completed',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '30000006-0000-0000-0000-000000000006',
    '[
      {
        "id": "msg-501",
        "type": "user",
        "content": "We need to automate our new employee onboarding process, especially for engineering hires. Please design a workflow that covers all necessary steps from offer acceptance to first day setup.",
        "timestamp": "2024-01-20T10:00:00Z"
      },
      {
        "id": "msg-502",
        "type": "assistant",
        "content": "I will design a comprehensive automated onboarding workflow that covers all aspects from pre-boarding through the first week, ensuring new engineering hires have everything they need to be productive.",
        "timestamp": "2024-01-20T10:00:30Z"
      },
      {
        "id": "msg-503",
        "type": "mcp_call",
        "timestamp": "2024-01-20T10:01:00Z",
        "openai_output": {
          "id": "msg-503",
          "type": "mcp_call",
          "name": "employee_search",
          "server_label": "hr-system",
          "status": "completed",
          "arguments": {"department": "engineering", "status": "recent_hires", "metrics": ["onboarding_time", "completion_rate"]},
          "output": "Current process: 15 manual steps, 3-day average setup time, 85% completion rate"
        }
      },
      {
        "id": "msg-504",
        "type": "mcp_call",
        "timestamp": "2024-01-20T10:02:00Z",
        "openai_output": {
          "id": "msg-504",
          "type": "mcp_call",
          "name": "get_employee_info",
          "server_label": "hr-system",
          "status": "completed",
          "arguments": {"type": "feedback", "category": "onboarding", "timeframe": "90d"},
          "output": "Common issues: Delayed equipment, missing access credentials, unclear first-week schedule"
        }
      },
      {
        "id": "msg-505",
        "type": "assistant",
        "content": "🚀 **Automated Onboarding Design**\n\n**Pre-Boarding (Offer Acceptance → Start Date)**:\n1. **Equipment Provisioning** - Auto-order laptop, peripherals based on role\n2. **Account Creation** - Generate email, Slack, GitHub, AWS accounts\n3. **Access Provisioning** - Assign to appropriate teams and repositories\n4. **Welcome Package** - Send digital welcome kit with company info\n\n**Day 1 Automation**:\n1. **Slack Welcome** - Auto-add to team channels with introduction\n2. **Calendar Setup** - Schedule first-week meetings with team/manager\n3. **Task Assignment** - Create first-week learning tasks in project management\n4. **Buddy Assignment** - Pair with onboarding buddy from team\n\n**Week 1 Follow-up**:\n1. **Progress Tracking** - Automated check-ins on task completion\n2. **Feedback Collection** - Survey on onboarding experience\n3. **Manager Alerts** - Notify manager of any incomplete items\n\n**Key Improvements**:\n- **Reduced setup time**: 3 days → 4 hours\n- **Automated reminders**: For managers and IT team\n- **Self-service portal**: New hire can track progress\n- **Integration points**: HR system, IT provisioning, Slack, GitHub\n\n**Implementation Timeline**: 4-6 weeks\n**Expected Outcome**: 95% completion rate, improved new hire satisfaction",
        "timestamp": "2024-01-20T10:05:00Z"
      }
    ]'
),

-- Notion: Knowledge base organization with token refresh
(
    '20000007-0000-0000-0000-000000000007',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Organize project documentation in Notion workspace',
    'Create and organize comprehensive project documentation using Notion API with OAuth token refresh',
    'completed',
    '11111111-2222-3333-4444-555555555555',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '30000007-0000-0000-0000-000000000007',
    '[
      {
        "id": "msg-601",
        "type": "user",
        "content": "Please organize our project documentation in Notion. Create a new database for tracking project milestones and update our main project page with the latest progress. Also search for any existing documentation that might need updating.",
        "timestamp": "2024-01-21T09:00:00Z"
      },
      {
        "id": "msg-602",
        "type": "assistant",
        "content": "I will help you organize your project documentation in Notion. Let me start by searching for existing documentation, then create the milestone database and update your main project page.",
        "timestamp": "2024-01-21T09:00:30Z"
      },
      {
        "id": "msg-603",
        "type": "mcp_call",
        "timestamp": "2024-01-21T09:01:00Z",
        "openai_output": {
          "id": "msg-603",
          "type": "mcp_call",
          "name": "search_pages",
          "server_label": "notion",
          "status": "completed",
          "arguments": {"query": "project documentation", "filter": {"property": "Type", "select": {"equals": "Documentation"}}},
          "output": "Found 5 existing documentation pages: Project Overview, API Documentation, User Guide, Development Setup, Release Notes"
        }
      },
      {
        "id": "msg-604",
        "type": "mcp_call",
        "timestamp": "2024-01-21T09:02:00Z",
        "openai_output": {
          "id": "msg-604",
          "type": "mcp_call",
          "name": "create_database",
          "server_label": "notion",
          "status": "completed",
          "arguments": {"title": "Project Milestones", "properties": {"Milestone": {"title": {}}, "Status": {"select": {"options": [{"name": "Not Started", "color": "gray"}, {"name": "In Progress", "color": "yellow"}, {"name": "Completed", "color": "green"}]}}, "Due Date": {"date": {}}, "Owner": {"people": {}}, "Priority": {"select": {"options": [{"name": "High", "color": "red"}, {"name": "Medium", "color": "yellow"}, {"name": "Low", "color": "blue"}]}}}},
          "output": "Created Project Milestones database with ID: db_milestone_12345"
        }
      },
      {
        "id": "msg-605",
        "type": "assistant",
        "content": "Great! I found your existing documentation and created the milestone database. Now let me add some initial milestones and update your main project page. Note: My OAuth token was automatically refreshed during this process to ensure uninterrupted access.",
        "timestamp": "2024-01-21T09:03:00Z"
      },
      {
        "id": "msg-606",
        "type": "mcp_call",
        "timestamp": "2024-01-21T09:03:30Z",
        "openai_output": {
          "id": "msg-606",
          "type": "mcp_call",
          "name": "create_page",
          "server_label": "notion",
          "status": "completed",
          "arguments": {"parent": {"database_id": "db_milestone_12345"}, "properties": {"Milestone": {"title": [{"text": {"content": "MVP Release"}}]}, "Status": {"select": {"name": "In Progress"}}, "Due Date": {"date": {"start": "2024-02-15"}}, "Priority": {"select": {"name": "High"}}}},
          "output": "Created milestone page: MVP Release (ID: page_mvp_67890)"
        }
      },
      {
        "id": "msg-607",
        "type": "mcp_call",
        "timestamp": "2024-01-21T09:04:00Z",
        "openai_output": {
          "id": "msg-607",
          "type": "mcp_call",
          "name": "create_page",
          "server_label": "notion",
          "status": "completed",
          "arguments": {"parent": {"database_id": "db_milestone_12345"}, "properties": {"Milestone": {"title": [{"text": {"content": "Beta Testing"}}]}, "Status": {"select": {"name": "Not Started"}}, "Due Date": {"date": {"start": "2024-03-01"}}, "Priority": {"select": {"name": "Medium"}}}},
          "output": "Created milestone page: Beta Testing (ID: page_beta_11111)"
        }
      },
      {
        "id": "msg-608",
        "type": "mcp_call",
        "timestamp": "2024-01-21T09:04:30Z",
        "openai_output": {
          "id": "msg-608",
          "type": "mcp_call",
          "name": "get_page",
          "server_label": "notion",
          "status": "completed",
          "arguments": {"page_id": "page_project_overview_22222"},
          "output": "Retrieved Project Overview page with current content and structure"
        }
      },
      {
        "id": "msg-609",
        "type": "mcp_call",
        "timestamp": "2024-01-21T09:05:00Z",
        "openai_output": {
          "id": "msg-609",
          "type": "mcp_call",
          "name": "update_page",
          "server_label": "notion",
          "status": "completed",
          "arguments": {"page_id": "page_project_overview_22222", "properties": {"Last Updated": {"date": {"start": "2024-01-21"}}}, "children": [{"object": "block", "type": "heading_2", "heading_2": {"rich_text": [{"type": "text", "text": {"content": "Recent Updates"}}]}}, {"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"type": "text", "text": {"content": "✅ Created Project Milestones database for better tracking\\n✅ Added MVP Release milestone (Due: Feb 15, 2024)\\n✅ Added Beta Testing milestone (Due: Mar 1, 2024)\\n✅ Refreshed OAuth tokens for continuous API access"}}]}}]},
          "output": "Updated Project Overview page with latest progress and milestone information"
        }
      },
      {
        "id": "msg-610",
        "type": "assistant",
        "content": "📚 **Project Documentation Successfully Organized**\\n\\n**Existing Documentation Found**:\\n- Project Overview (updated with latest progress)\\n- API Documentation\\n- User Guide\\n- Development Setup\\n- Release Notes\\n\\n**New Milestone Database Created**:\\n- Database ID: db_milestone_12345\\n- Properties: Milestone, Status, Due Date, Owner, Priority\\n\\n**Initial Milestones Added**:\\n1. **MVP Release** - In Progress (Due: Feb 15, 2024) - High Priority\\n2. **Beta Testing** - Not Started (Due: Mar 1, 2024) - Medium Priority\\n\\n**OAuth Token Management**:\\n✅ Tokens automatically refreshed during API calls\\n✅ Continuous access maintained without interruption\\n✅ Secure token storage with encryption\\n\\n**Next Steps**:\\n- Add team members as owners to specific milestones\\n- Create additional documentation pages as needed\\n- Set up automated progress tracking\\n\\nYour Notion workspace is now well-organized with proper milestone tracking and up-to-date documentation!",
        "timestamp": "2024-01-21T09:06:00Z"
      }
    ]'
)
ON CONFLICT (id) DO NOTHING;

-- Insert an error examples task to test error display in the UI
INSERT INTO tasks (
    id, 
    title, 
    description, 
    status, 
    agent_id, 
    assigned_to_id, 
    workspace_id, 
    agent_task_id,
    created_at, 
    updated_at,
    messages
) VALUES (
    uuid_generate_v4(),
    'Error Handling Examples - UI Testing',
    'This task demonstrates all possible error types that can occur during agent execution for UI testing purposes',
    'active',
    'cccccccc-cccc-cccc-cccc-cccccccccccc', -- technical-research-assistant
    '29fcdd0a-708e-478a-8030-34b02ad9ef84', -- Demo User
    'c926e979-1f16-46bf-a7cc-8aab70162d65', -- demo workspace
    'agent_task_error_examples',
    NOW(),
    NOW(),
    '[
      {
        "id": "msg_user_error_demo",
        "role": "user",
        "type": "message",
        "content": "Please demonstrate various error scenarios for testing our error handling UI",
        "timestamp": "2024-01-20T14:00:00Z"
      },
      {
        "id": "msg_assistant_intro",
        "role": "assistant", 
        "type": "message",
        "content": "I''ll demonstrate various error scenarios to help test the error handling UI. Below you''ll see examples of different error types that can occur during agent execution.",
        "timestamp": "2024-01-20T14:00:30Z"
      },
      {
        "id": "error_openai_api",
        "type": "error",
        "error": {
          "id": "error_openai_api",
          "type": "openai_error",
          "error_type": "rate_limit_exceeded", 
          "error_message": "Rate limit exceeded for gpt-4. Please wait 60 seconds before retrying.",
          "error_source": "openai",
          "error_details": {
            "error_code": "rate_limit_exceeded",
            "retry_after": 60,
            "model": "gpt-4",
            "organization": "org-demo"
          }
        },
        "timestamp": "2024-01-20T14:01:00Z"
      },
      {
        "id": "error_mcp_timeout",
        "type": "error", 
        "error": {
          "id": "error_mcp_timeout",
          "type": "mcp_error",
          "error_type": "tool_execution_timeout",
          "error_message": "MCP tool ''web_search'' timed out after 30 seconds",
          "error_source": "mcp",
          "error_details": {
            "tool_name": "web_search",
            "server_label": "search_server",
            "timeout_duration": 30,
            "last_response": "Searching for: AI trends 2024..."
          }
        },
        "timestamp": "2024-01-20T14:01:30Z"
      },
      {
        "id": "error_network_failure",
        "type": "error",
        "error": {
          "id": "error_network_failure", 
          "type": "network_error",
          "error_type": "connection_failed",
          "error_message": "Failed to connect to external API endpoint. Network unreachable.",
          "error_source": "network",
          "error_details": {
            "endpoint": "https://api.external-service.com/v1/data",
            "error_code": "ENOTFOUND",
            "retry_count": 3,
            "last_attempt": "2024-01-20T14:02:00Z"
          }
        },
        "timestamp": "2024-01-20T14:02:00Z"
      },
      {
        "id": "error_backend_internal",
        "type": "error",
        "error": {
          "id": "error_backend_internal",
          "type": "agent_error", 
          "error_type": "internal_server_error",
          "error_message": "Internal server error occurred while processing agent workflow",
          "error_source": "backend",
          "error_details": {
            "exception_type": "ValueError",
            "stack_trace": "ValueError: Invalid configuration for agent workflow\\n  at process_workflow() line 42\\n  at execute_step() line 18",
            "workflow_id": "wf_demo_123",
            "step_id": "step_data_validation"
          }
        },
        "timestamp": "2024-01-20T14:02:30Z"
      },
      {
        "id": "error_mcp_permission_denied",
        "type": "error",
        "error": {
          "id": "error_mcp_permission_denied",
          "type": "mcp_error",
          "error_type": "permission_denied",
          "error_message": "Access denied to file system operations. Insufficient permissions.",
          "error_source": "mcp", 
          "error_details": {
            "tool_name": "file_write",
            "server_label": "filesystem_server",
            "requested_path": "/secure/config.json",
            "required_permission": "write",
            "current_permission": "read"
          }
        },
        "timestamp": "2024-01-20T14:03:00Z"
      },
      {
        "id": "error_openai_model_unavailable",
        "type": "error",
        "error": {
          "id": "error_openai_model_unavailable",
          "type": "openai_error", 
          "error_type": "model_unavailable",
          "error_message": "The model gpt-5 is currently unavailable. Please try again later or use an alternative model.",
          "error_source": "openai",
          "error_details": {
            "model": "gpt-5",
            "status": "maintenance",
            "estimated_availability": "2024-01-20T16:00:00Z",
            "suggested_alternatives": ["gpt-4", "gpt-4-turbo"]
          }
        },
        "timestamp": "2024-01-20T14:03:30Z"
      },
      {
        "id": "error_mcp_invalid_response",
        "type": "error",
        "error": {
          "id": "error_mcp_invalid_response", 
          "type": "mcp_error",
          "error_type": "invalid_response_format",
          "error_message": "MCP server returned malformed response data",
          "error_source": "mcp",
          "error_details": {
            "tool_name": "database_query",
            "server_label": "db_server",
            "expected_format": "JSON",
            "received_data": "Invalid JSON: {''results'': [missing bracket",
            "parse_error": "Unexpected end of JSON input"
          }
        },
        "timestamp": "2024-01-20T14:04:00Z"
      },
      {
        "id": "error_stream_processing",
        "type": "error",
        "error": {
          "id": "error_stream_processing",
          "type": "stream_error",
          "error_type": "stream_interrupted", 
          "error_message": "Response stream was interrupted unexpectedly",
          "error_source": "backend",
          "error_details": {
            "bytes_received": 1024,
            "expected_bytes": 2048,
            "interruption_point": "response_content_delta",
            "last_successful_event": "response.created"
          }
        },
        "timestamp": "2024-01-20T14:04:30Z"
      },
      {
        "id": "msg_assistant_conclusion",
        "role": "assistant",
        "type": "message", 
        "content": "These examples demonstrate the various error types our system can encounter:\\n\\n• **OpenAI API Errors**: Rate limits, model unavailability\\n• **MCP Tool Errors**: Timeouts, permission issues, malformed responses\\n• **Network Errors**: Connection failures, unreachable endpoints\\n• **Backend Errors**: Internal server errors, stream interruptions\\n\\nEach error type is displayed with appropriate styling, icons, and suggested actions to help users understand and resolve issues.",
        "timestamp": "2024-01-20T14:05:00Z"
      }
    ]'
)
ON CONFLICT (id) DO NOTHING;
