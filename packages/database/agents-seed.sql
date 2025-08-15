-- Agents and completed tasks seed data
-- This file creates demo agents and completed tasks with realistic conversation history

-- Customer Support Agent - Zendesk orchestrator
INSERT INTO agents (id, workspace_id, team_id, name, version, description, instructions, status, model, reasoning_effort, response_format)
VALUES (
    '77777777-7777-7777-7777-777777777777',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111', -- Customer Support team
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
- If insufficient data, mark as 'Incomplete Data' and explain.$$,
    'active',
    'gpt-5',
    'medium',
    '{"type": "text"}'
)
ON CONFLICT (id) DO NOTHING;

-- Sales Agent - CRM and lead management
INSERT INTO agents (id, workspace_id, team_id, name, version, description, instructions, status, model, reasoning_effort, response_format)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '22222222-2222-2222-2222-222222222222', -- Sales team
    'sales-lead-manager',
    'v1.0.0',
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
    'active',
    'gpt-5-mini',
    'low',
    '{"type": "text"}'
)
ON CONFLICT (id) DO NOTHING;

-- Marketing Agent - Campaign analytics and optimization
INSERT INTO agents (id, workspace_id, team_id, name, version, description, instructions, status, model, reasoning_effort, response_format)
VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333', -- Marketing team
    'campaign-analytics-optimizer',
    'v1.0.0',
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
    'active',
    'gpt-5',
    'medium',
    '{"type": "json_object"}'
)
ON CONFLICT (id) DO NOTHING;

-- Engineering Agent - Documentation and research
INSERT INTO agents (id, workspace_id, team_id, name, version, description, instructions, status, model, reasoning_effort, response_format)
VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '44444444-4444-4444-4444-444444444444', -- Engineering team
    'technical-research-assistant',
    'v1.0.0',
    'AI agent for technical research, documentation, and knowledge management',
    $$You are a technical research assistant specializing in finding solutions and documentation.

## Objective
Research technical solutions, search documentation, and provide comprehensive answers to engineering questions.

## Available Tools
- **Knowledge Base Search**: Access internal documentation and technical resources
- **Web Research**: Find current information about technologies and best practices
- **Documentation Analysis**: Parse and summarize technical documentation

## Instructions
1. Search internal knowledge base first for existing solutions
2. Use web research for current best practices and emerging technologies
3. Provide comprehensive answers with code examples when applicable
4. Include references and sources for all recommendations
5. Suggest implementation approaches and potential gotchas

Always prioritize accuracy and provide multiple approaches when possible.$$,
    'active',
    'gpt-5',
    'high',
    '{"type": "text"}'
)
ON CONFLICT (id) DO NOTHING;

-- HR Agent - Employee data and operations
INSERT INTO agents (id, workspace_id, team_id, name, version, description, instructions, status, model, reasoning_effort, response_format)
VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '55555555-5555-5555-5555-555555555555', -- HR team
    'hr-operations-assistant',
    'v1.0.0',
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
    'active',
    'gpt-5-mini',
    'medium',
    '{"type": "text"}'
)
ON CONFLICT (id) DO NOTHING;

-- Link agents to MCP servers via agent_tools table
INSERT INTO agent_tools (id, agent_id, tool_type, mcp_server_id, allowed_tools, enabled) VALUES
-- Customer Support Agent tools
('10000001-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777', 'mcp', 'f4567890-1234-5678-9abc-def012345678', '["zendeskticketworkflow"]', true),
('10000002-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777777', 'mcp', '15678901-2345-6789-bcde-f01234567890', '["knowledgebaseworkflow"]', true),
('10000003-0000-0000-0000-000000000003', '77777777-7777-7777-7777-777777777777', 'mcp', '26789012-3456-789a-cdef-012345678901', '["pagerdutyincidentworkflow"]', true),
('10000004-0000-0000-0000-000000000004', '77777777-7777-7777-7777-777777777777', 'mcp', '37890123-4567-890b-cdef-123456789012', '["datadoglogsworkflow"]', true),
('10000005-0000-0000-0000-000000000005', '77777777-7777-7777-7777-777777777777', 'mcp', '48901234-5678-901c-def0-234567890123', '["linearissueworkflow"]', true),
('10000006-0000-0000-0000-000000000006', '77777777-7777-7777-7777-777777777777', 'mcp', '59012345-6789-012d-ef01-345678901234', '["githubprworkflow"]', true),

-- Sales Agent tools
('10000007-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'mcp', '70123456-789a-123e-f012-456789012346', '["create_lead", "update_opportunity", "get_lead_status"]', true),

-- Marketing Agent tools
('10000008-0000-0000-0000-000000000008', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'mcp', 'd2e3f456-7890-0123-def0-456789012345', '["insights-get-all", "insight-get"]', true),

-- Engineering Agent tools
('10000009-0000-0000-0000-000000000009', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'mcp', 'c1d2e3f4-5678-9012-cdef-345678901234', '["ask_question"]', true),
('10000010-0000-0000-0000-000000000010', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'web_search_preview', NULL, NULL, true),
('10000011-0000-0000-0000-000000000011', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'mcp', '60123456-789a-123e-f012-456789012345', '["search"]', true),

-- HR Agent tools
('10000012-0000-0000-0000-000000000012', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'mcp', '80123456-789a-123e-f012-456789012347', '["employee_search", "update_employee", "get_employee_info"]', true)
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
        "content": "A customer reported they cannot log into their account. They get an error message saying \"Invalid credentials\" even though they are sure their password is correct. Customer email: john.doe@example.com",
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "id": "msg-002",
        "type": "assistant",
        "content": "I will help you resolve this login issue. Let me start by investigating the customer account status and checking for any related incidents or authentication problems.",
        "timestamp": "2024-01-15T10:30:15Z"
      },
      {
        "id": "msg-003",
        "type": "tool-call",
        "content": "Searching Zendesk for existing tickets related to login issues",
        "timestamp": "2024-01-15T10:30:30Z",
        "toolName": "zendeskticketworkflow",
        "serverLabel": "zendesk-workflow",
        "status": "completed",
        "result": "Found 3 related tickets in the past 24 hours with similar authentication errors"
      },
      {
        "id": "msg-004",
        "type": "tool-call",
        "content": "Checking PagerDuty for authentication service incidents",
        "timestamp": "2024-01-15T10:31:00Z",
        "toolName": "pagerdutyincidentworkflow",
        "serverLabel": "pagerduty-workflow",
        "status": "completed",
        "result": "No active incidents found for authentication services"
      },
      {
        "id": "msg-005",
        "type": "tool-call",
        "content": "Analyzing authentication logs in Datadog for user john.doe@example.com",
        "timestamp": "2024-01-15T10:31:30Z",
        "toolName": "datadoglogsworkflow",
        "serverLabel": "datadog-workflow",
        "status": "completed",
        "result": "Found account lockout due to 5 failed login attempts in 10 minutes. Account status: LOCKED"
      },
      {
        "id": "msg-006",
        "type": "assistant",
        "content": "I found the issue! The customer account was temporarily locked due to multiple failed login attempts (security feature). I have unlocked the account and sent them a password reset email as a precaution. The customer should now be able to log in successfully.",
        "timestamp": "2024-01-15T10:32:00Z"
      },
      {
        "id": "msg-007",
        "type": "tool-call",
        "content": "Creating Zendesk ticket to document the resolution",
        "timestamp": "2024-01-15T10:32:30Z",
        "toolName": "zendeskticketworkflow",
        "serverLabel": "zendesk-workflow",
        "status": "completed",
        "result": "Ticket #ZD-12345 created and marked as resolved"
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
        "type": "tool-call",
        "content": "Requesting access to Datadog payment logs for security analysis",
        "timestamp": "2024-01-16T14:21:00Z",
        "toolName": "datadoglogsworkflow",
        "serverLabel": "datadog-workflow",
        "status": "approval_declined",
        "result": "Access denied - Security investigation requires manual approval from Security team",
        "approvalRequired": true,
        "approvalStatus": "declined",
        "declineReason": "Sensitive payment data access requires Security team authorization"
      },
      {
        "id": "msg-104",
        "type": "assistant",
        "content": "I cannot access the payment logs directly due to security restrictions. Let me escalate this through proper channels and use alternative investigation methods.",
        "timestamp": "2024-01-16T14:21:30Z"
      },
      {
        "id": "msg-105",
        "type": "tool-call",
        "content": "Creating high-priority Linear ticket for security team investigation",
        "timestamp": "2024-01-16T14:22:00Z",
        "toolName": "linearissueworkflow",
        "serverLabel": "linear-workflow",
        "status": "completed",
        "result": "High-priority security ticket LIN-SEC-789 created and assigned to Security team"
      },
      {
        "id": "msg-106",
        "type": "tool-call",
        "content": "Checking PagerDuty for any related security incidents",
        "timestamp": "2024-01-16T14:22:30Z",
        "toolName": "pagerdutyincidentworkflow",
        "serverLabel": "pagerduty-workflow",
        "status": "completed",
        "result": "Found similar incident PD-INC-456 from last week, marked as resolved - card testing attack"
      },
      {
        "id": "msg-107",
        "type": "assistant",
        "content": "Based on the previous incident pattern, this appears to be a card testing attack. I have escalated to the Security team via Linear ticket LIN-SEC-789. They will need to:\n\n1. Review payment logs manually\n2. Implement IP blocking if confirmed fraudulent\n3. Review fraud detection rules\n\nThe Security team has been notified and will investigate within their established protocols.",
        "timestamp": "2024-01-16T14:23:00Z"
      },
      {
        "id": "msg-108",
        "type": "tool-call",
        "content": "Creating Zendesk ticket to document security escalation",
        "timestamp": "2024-01-16T14:23:30Z",
        "toolName": "zendeskticketworkflow",
        "serverLabel": "zendesk-workflow",
        "status": "completed",
        "result": "Security escalation ticket #ZD-SEC-123 created"
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
        "type": "tool-call",
        "content": "Creating new lead record for TechCorp in CRM",
        "timestamp": "2024-01-17T09:16:00Z",
        "toolName": "create_lead",
        "serverLabel": "sales-crm",
        "status": "completed",
        "result": "Lead CRM-LEAD-456 created for TechCorp - Sarah Johnson"
      },
      {
        "id": "msg-204",
        "type": "tool-call",
        "content": "Researching TechCorp company information and budget capacity",
        "timestamp": "2024-01-17T09:17:00Z",
        "toolName": "get_lead_status",
        "serverLabel": "sales-crm",
        "status": "completed",
        "result": "TechCorp: Series B company, 500 employees, $50M ARR, budget range $100K-500K annually"
      },
      {
        "id": "msg-205",
        "type": "assistant",
        "content": "Based on my qualification analysis:\n\n**Budget**: ✅ Strong ($100K-500K range)\n**Authority**: ✅ CTO has decision-making power\n**Need**: ✅ Developer platform for 200+ team\n**Timeline**: ⏳ To be determined\n\nThis is a high-quality enterprise lead. Creating opportunity now.",
        "timestamp": "2024-01-17T09:18:00Z"
      },
      {
        "id": "msg-206",
        "type": "tool-call",
        "content": "Creating sales opportunity for TechCorp enterprise deal",
        "timestamp": "2024-01-17T09:18:30Z",
        "toolName": "update_opportunity",
        "serverLabel": "sales-crm",
        "status": "completed",
        "result": "Opportunity CRM-OPP-789 created: $300K estimated value, 6-month timeline"
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
        "type": "tool-call",
        "content": "Retrieving Q1 campaign performance data from PostHog",
        "timestamp": "2024-01-18T11:01:00Z",
        "toolName": "insights-get-all",
        "serverLabel": "posthog",
        "status": "completed",
        "result": "Retrieved 15 campaigns data: Total spend $45K, Total conversions 1,247, Overall ROI 285%"
      },
      {
        "id": "msg-304",
        "type": "tool-call",
        "content": "Analyzing detailed metrics for top-performing campaigns",
        "timestamp": "2024-01-18T11:02:00Z",
        "toolName": "insight-get",
        "serverLabel": "posthog",
        "status": "completed",
        "result": "Top 3 campaigns: 1) Email nurture series (ROI 420%), 2) LinkedIn ads (ROI 340%), 3) Content marketing (ROI 290%)"
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
        "type": "tool-call",
        "content": "Searching internal knowledge base for microservices documentation",
        "timestamp": "2024-01-19T13:31:00Z",
        "toolName": "ask_question",
        "serverLabel": "deepwiki",
        "status": "completed",
        "result": "Found 12 internal docs on microservices: API gateway patterns, service mesh, database per service"
      },
      {
        "id": "msg-404",
        "type": "tool-call",
        "content": "Researching latest microservices best practices and patterns",
        "timestamp": "2024-01-19T13:32:00Z",
        "toolName": "web_search_preview",
        "serverLabel": "web-search",
        "status": "completed",
        "result": "Found current trends: Event-driven architecture, CQRS patterns, service mesh adoption, observability strategies"
      },
      {
        "id": "msg-405",
        "type": "tool-call",
        "content": "Checking Restack documentation for microservices implementation guides",
        "timestamp": "2024-01-19T13:33:00Z",
        "toolName": "search",
        "serverLabel": "mintlify-docs",
        "status": "completed",
        "result": "Restack workflow orchestration patterns for microservices coordination and state management"
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
        "type": "tool-call",
        "content": "Reviewing current employee onboarding data and requirements",
        "timestamp": "2024-01-20T10:01:00Z",
        "toolName": "employee_search",
        "serverLabel": "hr-system",
        "status": "completed",
        "result": "Current process: 15 manual steps, 3-day average setup time, 85% completion rate"
      },
      {
        "id": "msg-504",
        "type": "tool-call",
        "content": "Analyzing employee feedback on onboarding experience",
        "timestamp": "2024-01-20T10:02:00Z",
        "toolName": "get_employee_info",
        "serverLabel": "hr-system",
        "status": "completed",
        "result": "Common issues: Delayed equipment, missing access credentials, unclear first-week schedule"
      },
      {
        "id": "msg-505",
        "type": "assistant",
        "content": "🚀 **Automated Onboarding Workflow Design**\n\n**Pre-Boarding (Offer Acceptance → Start Date)**:\n1. **Equipment Provisioning** - Auto-order laptop, peripherals based on role\n2. **Account Creation** - Generate email, Slack, GitHub, AWS accounts\n3. **Access Provisioning** - Assign to appropriate teams and repositories\n4. **Welcome Package** - Send digital welcome kit with company info\n\n**Day 1 Automation**:\n1. **Slack Welcome** - Auto-add to team channels with introduction\n2. **Calendar Setup** - Schedule first-week meetings with team/manager\n3. **Task Assignment** - Create first-week learning tasks in project management\n4. **Buddy Assignment** - Pair with onboarding buddy from team\n\n**Week 1 Follow-up**:\n1. **Progress Tracking** - Automated check-ins on task completion\n2. **Feedback Collection** - Survey on onboarding experience\n3. **Manager Alerts** - Notify manager of any incomplete items\n\n**Key Improvements**:\n- **Reduced setup time**: 3 days → 4 hours\n- **Automated reminders**: For managers and IT team\n- **Self-service portal**: New hire can track progress\n- **Integration points**: HR system, IT provisioning, Slack, GitHub\n\n**Implementation Timeline**: 4-6 weeks\n**Expected Outcome**: 95% completion rate, improved new hire satisfaction",
        "timestamp": "2024-01-20T10:05:00Z"
      }
    ]'
)
ON CONFLICT (id) DO NOTHING;
