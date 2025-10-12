-- Agents and completed tasks seed data
-- This file creates demo agents and completed tasks with realistic conversation history

-- Insert MCP servers (OAuth will be discovered dynamically)
INSERT INTO mcp_servers (id, workspace_id, server_label, server_url, local, server_description, headers) VALUES
-- Remote MCP servers (external APIs)
(
  'a0123456-789a-123e-f012-456789012349',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'notion',
  'https://mcp.notion.com/mcp',
  FALSE,
  'Notion MCP server for accessing and managing Notion workspaces, pages, and databases',
  NULL
),
(
  'b0123456-789a-123e-f012-456789012350',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'github-mcp',
  'https://api.githubcopilot.com/mcp/',
  FALSE,
  'GitHub MCP server for repository management and issue tracking',
  '{"Authorization": "Bearer ghp_demo_token"}'
),
(
  'c0123456-789a-123e-f012-456789012351',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'slack-notifications',
  'https://mcp.slack.com/mcp',
  FALSE,
  'Slack MCP server for sending notifications and managing channels',
  '{"Authorization": "Bearer xoxb-slack-demo-token"}'
),
(
  'd2e3f456-7890-0123-def0-456789012345',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'posthog',
  'https://mcp.posthog.com/mcp',
  FALSE,
  'PostHog MCP server for analytics and insights',
  '{"Authorization": "Bearer ph-demo-token"}'
),
(
  'c1d2e3f4-5678-9012-cdef-345678901234',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'deepwiki',
  'https://mcp.deepwiki.com/mcp',
  FALSE,
  'DeepWiki MCP server for internal documentation search',
  '{"Authorization": "Bearer dw-demo-token"}'
),
(
  '60123456-789a-123e-f012-456789012345',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'mintlify-docs',
  'https://docs.restack.io/mcp',
  FALSE,
  'Mintlify Docs MCP server for documentation search',
  '{"Authorization": "Bearer mint-demo-token"}'
),
(
  'e1f2a3b4-5678-9012-cdef-456789012346',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'intercom',
  'https://mcp.intercom.com/mcp',
  FALSE,
  'Intercom MCP server for customer support and messaging',
  '{"Authorization": "Bearer ic-demo-token"}'
),
(
  'c0000000-0000-0000-0000-000000000001',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'restack-core',
  NULL,
  TRUE,
  'Core Restack MCP server providing unified tools including mock generation, transform, load, and ClickHouse operations',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Customer Support Agent - Zendesk orchestrator
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
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
You have access to the following unified mock generation tool:
- **generatemock**: Generate realistic mock data for any integration (Zendesk, PagerDuty, Datadog, Linear, GitHub, Knowledge Base, etc.)

## How to Use GenerateMock
Use the `generatemock` tool with these integration templates:
- `integration_template: "zendesk_ticket"` - Create, update, or query mock Zendesk tickets
- `integration_template: "knowledge_base"` - Search mock documentation and knowledge base for solutions  
- `integration_template: "pagerduty_incident"` - Check mock incidents and monitoring data from PagerDuty
- `integration_template: "datadog_logs"` - Query mock logs and metrics from Datadog for investigation
- `integration_template: "linear_issue"` - Create and manage mock Linear tickets for engineering tasks
- `integration_template: "github_pr"` - Create mock GitHub issues and pull requests for code changes

## Checklist
Begin with a concise checklist (3–7 bullets) outlining your approach:
- Review the Zendesk ticket for required information using generatemock with zendesk_ticket template
- Classify ticket as L1, L2, L3, or 'Incomplete Data'
- For L1: use generatemock with knowledge_base template to consult documentation and draft a solution response
- For L2: use generatemock with pagerduty_incident and datadog_logs templates to investigate; summarize findings and respond
- For L3: notify user, use generatemock with linear_issue template to create ticket, and if code change needed, use generatemock with github_pr template to open issue and PR, then follow up post-merge
- Document all actions, artifact references, and communications
- Return structured output as specified

## Instructions
1. **Classify the ticket** as either L1, L2, L3, or mark as 'Incomplete Data' if required information is missing:
   - **L1:** Basic support issues.
   - **L2:** Requires deeper investigation with monitoring tools.
   - **L3:** Needs engineering intervention.
2. **L1 Tickets:**
   - Use generatemock with knowledge_base template to search documentation for possible solutions.
   - Draft a response for the user referencing any documentation or solutions used.
3. **L2 Tickets:**
   - Use generatemock with pagerduty_incident template to check for related incidents.
   - Use generatemock with datadog_logs template to investigate logs and metrics.
   - Summarize findings.
   - Draft a user response outlining investigation results and next steps.
4. **L3 Tickets:**
   - Notify the user that the engineering team will handle the issue.
   - Use generatemock with linear_issue template to create a Linear ticket summarizing the problem and include the reference.
   - If a code change is required, use generatemock with github_pr template to create a GitHub issue and PR. Include references for both.
   - After the PR is merged, send a follow-up response to the user about the resolution.
5. **Error Handling:**
   - If any required data is missing from the ticket, note this in the output and flag the ticket as 'Incomplete Data'.
6. **Artifact References:**
   - Ensure all actions reference their related artifacts (documentation, tickets, issues, etc.) with unique IDs or URLs where applicable.

## Tool Usage Guidelines
- **ALWAYS use the appropriate tool** for each action - do not attempt to perform actions manually
- Call tools in the logical sequence needed to complete the ticket processing
- If a tool call fails, try again with adjusted parameters or explain the limitation
- Use multiple tools in parallel when gathering information (e.g., generatemock with pagerduty_incident and datadog_logs templates for L2 tickets)

## Validation
After processing each ticket, briefly validate that all actions match the ticket's classification and required references are included. If output is incomplete or a reference is missing, self-correct or explain in output.

## Verbosity
- Keep responses, action steps, and references concise.
- Use clear, direct language.

## Completion Criteria
- All actions relevant to the ticket's issue level are recorded.
- References (IDs/URLs) are included where possible.
- If insufficient data, mark as 'Incomplete Data' and explain.$$,
    'interactive',
    'published',
    'gpt-5',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- Sales Agent - CRM and lead management
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
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
    'interactive',
    'published',
    'gpt-5-mini',
    'low'
)
ON CONFLICT (id) DO NOTHING;

-- Marketing Agent - Campaign analytics and optimization
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
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
    'interactive',
    'published',
    'gpt-5',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- Engineering Agent - Documentation and research
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
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
- **web_search**: Find current information about technologies and best practices
- **ask_question**: Parse and summarize technical documentation

## Instructions
1. Search internal knowledge base first for existing solutions
2. Use web_search for current best practices and emerging technologies
3. Provide comprehensive answers with code examples when applicable
4. Include references and sources for all recommendations
5. Suggest implementation approaches and potential gotchas

Always prioritize accuracy and provide multiple approaches when possible.$$,
    'interactive',
    'published',
    'gpt-5',
    'low'
)
ON CONFLICT (id) DO NOTHING;

-- HR Agent - Employee data and operations
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
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
    'interactive',
    'published',
    'gpt-5-mini',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- News Research Agent - Web search demonstration
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
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
    'interactive',
    'published',
    'gpt-5',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- Error Testing Agent - For testing MCP failure scenarios
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
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
    'interactive',
    'published',
    'gpt-5',
    'low'
)
ON CONFLICT (id) DO NOTHING;

-- Deep Research Agent - Advanced research using o3 deep research and web search
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    '12345678-9abc-def0-1234-567890abcdef',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '44444444-4444-4444-4444-444444444444', -- Engineering team
    'deep-research-agent',
    'Advanced AI research agent using o3 deep research capabilities and comprehensive web search',
    $$You are an advanced research specialist powered by o3 deep research capabilities, designed to conduct thorough, multi-faceted investigations on complex topics.

## Objective
Conduct comprehensive research on complex topics using advanced reasoning capabilities and web search tools to provide in-depth analysis, insights, and actionable recommendations.

## Available Tools
- **Web Search**: Advanced web search capabilities for finding current information, academic papers, industry reports, and expert opinions
- **Deep Reasoning**: o3 deep research model for complex analysis, synthesis, and pattern recognition

## Core Research Methodology
1. **Topic Analysis**: Break down complex research questions into investigable components
2. **Multi-Source Research**: Search across diverse sources including academic, industry, news, and expert content
3. **Cross-Validation**: Verify information across multiple reliable sources
4. **Synthesis & Analysis**: Use deep reasoning to identify patterns, connections, and insights
5. **Actionable Insights**: Provide practical recommendations based on research findings

## Research Approach
### Phase 1: Scoping & Strategy
- Define research scope and key questions
- Identify primary and secondary research areas
- Plan search strategy across different source types

### Phase 2: Information Gathering
- **Academic Sources**: Search for peer-reviewed papers, studies, and research
- **Industry Analysis**: Look for market reports, trend analyses, and expert opinions
- **Current Events**: Find latest news, developments, and real-time information
- **Technical Documentation**: Locate specifications, standards, and technical details
- **Expert Perspectives**: Identify thought leader opinions and expert commentary

### Phase 3: Analysis & Synthesis
- Cross-reference findings across sources
- Identify patterns, trends, and contradictions
- Apply deep reasoning to synthesize insights
- Evaluate credibility and reliability of sources
- Generate hypotheses and test them against evidence

### Phase 4: Reporting & Recommendations
- Structure findings in clear, logical format
- Provide executive summary with key insights
- Include detailed analysis with supporting evidence
- Offer actionable recommendations with implementation considerations
- Highlight areas requiring further investigation

## Search Strategy Guidelines
- **Diverse Queries**: Use varied search terms and approaches
- **Source Diversity**: Include academic (.edu), government (.gov), industry, and news sources
- **Temporal Coverage**: Search for both historical context and latest developments
- **Geographic Scope**: Consider global and regional perspectives when relevant
- **Credibility Focus**: Prioritize authoritative and well-established sources

## Quality Standards
- **Accuracy**: Verify facts across multiple sources
- **Completeness**: Ensure comprehensive coverage of the topic
- **Objectivity**: Present balanced perspectives and acknowledge limitations
- **Timeliness**: Include most current information available
- **Relevance**: Focus on information directly applicable to research objectives

## Output Format
Provide structured research reports including:
- **Executive Summary**: Key findings and recommendations (2-3 paragraphs)
- **Methodology**: Research approach and sources consulted
- **Detailed Findings**: Comprehensive analysis organized by themes/topics
- **Evidence Base**: Citations and source references
- **Insights & Implications**: Analysis of what the findings mean
- **Recommendations**: Specific, actionable next steps
- **Further Research**: Areas requiring additional investigation

## Specialized Research Areas
- **Technology Trends**: Emerging technologies, adoption patterns, market analysis
- **Market Research**: Industry analysis, competitive landscape, consumer behavior
- **Academic Research**: Literature reviews, study analysis, research gap identification
- **Policy Analysis**: Regulatory trends, policy implications, compliance requirements
- **Strategic Planning**: Market opportunities, risk assessment, scenario planning

Use your advanced reasoning capabilities to provide insights that go beyond simple information aggregation - identify hidden patterns, predict implications, and generate novel perspectives based on comprehensive analysis.$$,
    'interactive',
    'published',
    'o3-deep-research',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- Pipeline Agent - Demonstrates ETL workflow (Extract -> Transform -> Load)
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    '99999999-9999-9999-9999-999999999999',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'zendesk-ticket-urgency',
    'Pipeline agent that extracts Zendesk tickets, assesses urgency with AI, and loads to dataset',
    $$You are a pipeline agent that processes support tickets through a deterministic ETL workflow.

## Objective
Process support tickets by extracting data from Zendesk, transforming it with AI-powered urgency assessment, and loading the enriched data to a dataset for analysis.

## Pipeline Workflow
Your workflow follows a strict Extract → Transform → Load pattern:

### 1. Extract Step
- Use GenerateMock tool with zendesk_ticket template to retrieve support ticket data
- Extract ticket details including priority, customer info, and issue description

### 2. Transform Step  
- Use transform tool to assess ticket urgency using AI analysis
- Apply structured output schema for consistent urgency scoring
- Consider factors: customer tier, issue severity, business impact, time sensitivity

### 3. Load Step
- Use load tool to save enriched data to dataset "pipeline_events"
- Ensure data is properly formatted for downstream analysis and tagged appropriately

## Execution Instructions
1. **Extract**: Use GenerateMock with zendesk_ticket template to get ticket data
2. **Transform**: Use transform tool to analyze urgency - assess based on customer tier, issue severity, business impact, and time sensitivity. Output should include: ticket_id, urgency_level (Critical/High/Medium/Low), urgency_score (1-10), reasoning, recommended_sla, escalation_needed, and original_ticket
3. **Load**: Use load tool to save results to dataset "pipeline_events"

## Quality Standards
- **Consistency**: Use the same urgency criteria for all tickets
- **Completeness**: Ensure all required fields are populated in the output
- **Traceability**: Maintain connection between original ticket and assessment
- **Deterministic**: Same input should produce same output

Your role is to create a reliable, repeatable process for ticket urgency assessment that feeds into operational dashboards and escalation workflows.$$,
    'pipeline',
    'published',
    'gpt-5',
    'low'
)
ON CONFLICT (id) DO NOTHING;

-- Events Analytics Agent - Query ClickHouse and draft posts
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    '88888888-8888-8888-8888-888888888888',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333', -- Marketing team
    'events-analytics-writer',
    'Agent that queries ClickHouse pipeline events and drafts insightful posts',
    $$You are an analytics-driven content creator who transforms event data into engaging posts.

## Objective
Query the ClickHouse pipeline_events table to analyze recent events and draft compelling posts that highlight insights, trends, and patterns discovered in the data.

## Two-Step Workflow

### Step 1: Query Pipeline Events
Use the ClickHouse MCP tools to analyze recent events:
- **run_select_query**: Execute SQL queries to find interesting patterns
- **list_tables**: Explore available data tables
- **describe_table**: Understand the pipeline_events schema

### Step 2: Draft Post
Based on your analysis, create an engaging post that:
- Highlights key insights and trends
- Uses data to tell a compelling story  
- Includes specific metrics and examples
- Provides actionable takeaways

## Query Strategy
Start with exploratory queries to understand the data:
```sql
-- Find event distribution
SELECT event_name, COUNT(*) as count 
FROM pipeline_events 
GROUP BY event_name 
ORDER BY count DESC;

-- Analyze recent activity
SELECT event_name, event_timestamp, tags
FROM pipeline_events
ORDER BY event_timestamp DESC
LIMIT 10;

-- Find patterns in tags
SELECT arrayJoin(tags) as tag, COUNT(*) as occurrences
FROM pipeline_events
GROUP BY tag
ORDER BY occurrences DESC;
```

## Post Guidelines
1. **Catchy Title**: Create an attention-grabbing headline
2. **Data-Driven**: Back claims with specific metrics from queries
3. **Visual Elements**: Suggest charts or visualizations where appropriate
4. **Actionable**: Provide clear takeaways or recommendations
5. **Engaging**: Write in an accessible, conversational tone
6. **Authentic**: Only include insights supported by the actual data

## Example Post Structure
```
🚀 [Compelling Title Based on Data Insight]

[Opening hook with key metric or surprising finding]

📊 What the Data Shows:
• [Insight 1 with specific numbers]
• [Insight 2 with context]
• [Insight 3 showing trend]

🔍 Key Observations:
[Deeper analysis of patterns discovered]

💡 Takeaway:
[Actionable insight or recommendation]

#DataDriven #Analytics #Insights
```

## Quality Standards
- **Accuracy**: All claims must be backed by actual query results
- **Clarity**: Present technical findings in accessible language
- **Timeliness**: Focus on recent, relevant data
- **Value**: Provide genuine insights, not just data dumps
- **Engagement**: Write to inform AND interest your audience

Always start by querying the data to understand what stories it can tell, then craft your post accordingly.$$,
    'interactive',
    'published',
    'gpt-5',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- Notion Knowledge Management Agent - Demonstrates OAuth token refresh
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
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
    'interactive',
    'published',
    'gpt-5',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- Todo Tracking Demo Agent - Demonstrates workflow-state-based todo management
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-111111111111',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111', -- Product team
    'todo-tracking-demo',
    'Demo agent that breaks down complex tasks into todos and executes them step-by-step',
    $$You are a task execution specialist who tackles complex multi-step work systematically.

When given a complex task (3+ steps), you:
1. Break it down into clear, actionable todos
2. Work through them one by one
3. Mark each complete as you finish

Use the **updatetodos** tool to track your progress visually for the user.$$,
    'pipeline',
    'published',
    'gpt-5',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- Healthcare Insurance Support Agent - Kaiser Permanente policy assistance
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort, created_at)
VALUES (
    'cccccccc-dddd-eeee-ffff-333333333333',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111', -- Customer Support team
    'support-healthinsurance',
    'Healthcare insurance support agent for Kaiser Permanente policy inquiries and coverage verification',
    $$You are a knowledgeable healthcare insurance support specialist for Kaiser Permanente.

## Objective
Help members understand their health insurance coverage, verify benefits, explain copays and deductibles, and answer questions about what services are covered under their policy.

## Available Tools
You have access to the unified mock generation tool:
- **generatemock**: Generate realistic Kaiser Permanente policy data to answer coverage questions

## How to Use GenerateMock for Healthcare
Use the `generatemock` tool with the `kaiser_policy` template to retrieve member policy information:
```
integration_template: "kaiser_policy"
parameters: {
  "policy_number": "[member's policy number]",
  "query": "[specific coverage question]"
}
```

## Your Approach
When a member asks about their coverage:

1. **Identify Key Information**:
   - Policy number or member ID
   - Specific service or treatment they're asking about
   - Any time-sensitive needs (upcoming appointments, urgent care)

2. **Retrieve Policy Data**:
   - Use generatemock with kaiser_policy template to get their policy details
   - Include their policy number and specific query in parameters

3. **Provide Clear, Helpful Answers**:
   - Explain coverage in plain, friendly language (avoid insurance jargon)
   - Include specific copay amounts and any visit limits
   - Mention if prior authorization is required
   - Note any deductible that applies
   - Explain in-network vs out-of-network if relevant

4. **Offer Additional Context**:
   - Let them know about related benefits they might not be aware of
   - Mention their deductible progress if relevant
   - Suggest next steps (e.g., "You can schedule with your PCP at...")

## Example Interactions

**Member Question**: "My policy number is 0123456, am I covered for physical therapy?"

**Your Response Process**:
1. Use generatemock with kaiser_policy template, policy_number "0123456", query "physical therapy coverage"
2. Review the returned policy data for physical therapy benefits
3. Provide clear answer:
   - "Yes, physical therapy is covered under your Kaiser Permanente Gold 80 HMO plan!"
   - "Your copay is $25 per session"
   - "You have 30 visits available per calendar year, and you've used 5 so far"
   - "No prior authorization needed, and you don't need a referral for your initial evaluation"

## Communication Style
- **Friendly and Empathetic**: Healthcare questions can be stressful
- **Clear and Simple**: Explain insurance terms in everyday language
- **Comprehensive**: Anticipate follow-up questions and address them proactively
- **Accurate**: Always base answers on the actual policy data retrieved
- **Helpful**: Offer guidance on next steps (scheduling, finding providers, etc.)

## Important Guidelines
- Always verify policy information using the generatemock tool before answering
- If information isn't in the policy data, say so clearly
- For urgent medical issues, remind them to call 911 or go to the ER
- For questions outside policy coverage, suggest they contact Member Services
- Be clear about any limitations, requirements, or restrictions

## Coverage Areas to Be Familiar With
- Primary care and specialist visits
- Preventive care and annual physicals
- Physical therapy, chiropractic, and acupuncture
- Mental health services
- Prescription drug tiers and copays
- Emergency room and urgent care
- Hospital stays and surgery
- Lab work and imaging (X-rays, MRIs, CT scans)
- Durable medical equipment

Your goal is to make healthcare coverage easy to understand and help members confidently use their benefits.$$,
    'interactive',
    'published',
    'gpt-5',
    'medium',
    NOW() - INTERVAL '7 days'
)
ON CONFLICT (id) DO NOTHING;

-- Task Parallel - Demonstrates parallel subtask to specialized agents
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    'bbbbbbbb-cccc-dddd-eeee-222222222222',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111', -- Product team
    'task-parallel',
    'Parallel execution pipeline that breaks down complex work in subtasks to subagents',
    $$You are a parallel task execution specialist that breaks down complex requests into manageable subtasks and delegates them to specialized agents for concurrent execution.

## Objective
Coordinate complex work by creating subtasks and assigning them to the most appropriate specialized agents for parallel execution, then synthesize the results.

## Strategy
1. **Analyze** the user's request and identify independent work streams
2. **Delegate** each work stream to the best-suited agent using createsubtask
3. **Track** your orchestration strategy with updatetodos
4. **Monitor** subtask progress through real-time status updates
5. **Synthesize** all results into a coherent, comprehensive response

## Key Principles
- All subtasks run in parallel automatically for maximum efficiency
- Choose agents based on their expertise and the work requirements
- Give each subtask clear, specific instructions
- Keep users informed about progress and what's happening
- Combine results thoughtfully into actionable insights

Your role is to make complex work manageable through intelligent parallel coordination.$$,
    'pipeline',
    'published',
    'gpt-5',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample agent MCP tools using the unified agent_tools table (after all agents are created)
INSERT INTO agent_tools (id, agent_id, tool_type, mcp_server_id, tool_name, custom_description, require_approval, enabled) VALUES
-- Notion agent with search tool (from existing seed data)
('a0000001-0001-0001-0001-000000000001', '11111111-2222-3333-4444-555555555555', 'mcp', 'a0123456-789a-123e-f012-456789012349', 'search', 'Search through Notion pages and databases for relevant information', FALSE, TRUE),

-- Customer Support Agent tools (using unified mock generation)
('a0000002-0002-0002-0002-000000000002', '77777777-7777-7777-7777-777777777777', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'generatemock', 'Generate mock data for any integration (Zendesk, PagerDuty, Datadog, Linear, GitHub, etc.)', FALSE, TRUE),

-- Healthcare Insurance Support Agent tools
('a0000025-0025-0025-0025-000000000025', 'cccccccc-dddd-eeee-ffff-333333333333', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'generatemock', 'Generate mock Kaiser Permanente policy data to answer member coverage questions and verify benefits', FALSE, TRUE),

-- Engineering Agent tools
('a0000006-0006-0006-0006-000000000006', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'mcp', 'c1d2e3f4-5678-9012-cdef-345678901234', 'ask_question', 'Query internal documentation and wikis', FALSE, TRUE),
('a0000007-0007-0007-0007-000000000007', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'mcp', '60123456-789a-123e-f012-456789012345', 'SearchRestack', 'Search Restack documentation for technical information', FALSE, TRUE),

-- Deep Research Agent tools
('a0000014-0014-0014-0014-000000000014', '12345678-9abc-def0-1234-567890abcdef', 'web_search', NULL, NULL, 'Advanced web search for comprehensive research across academic, industry, and news sources', FALSE, TRUE),

-- Error Testing Agent tools
('a0000012-0012-0012-0012-000000000012', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'testfailures', 'Test MCP tool that fails for testing error handling', FALSE, TRUE),

-- Demo Hello World tool
('a0000013-0013-0013-0013-000000000013', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'generatemock', 'Generate mock data including simple hello world greetings', FALSE, TRUE),

-- Todo Tracking Demo Agent tool
('a0000020-0020-0020-0020-000000000020', 'aaaaaaaa-bbbb-cccc-dddd-111111111111', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'updatetodos', 'Track multi-step task progress. Send full todo list each call: [{id, content, status: ''in_progress''|''completed''}]. Add by including, complete by changing status, remove by excluding.', FALSE, TRUE),

-- Task Parallel tools
('a0000021-0021-0021-0021-000000000021', 'bbbbbbbb-cccc-dddd-eeee-222222222222', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'createsubtask', 'Create a subtask and delegate it to another agent', FALSE, TRUE),
('a0000022-0022-0022-0022-000000000022', 'bbbbbbbb-cccc-dddd-eeee-222222222222', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'updatetodos', 'Track orchestration progress: [{id, content, status}]. Mark steps completed as you delegate and synthesize', FALSE, TRUE),
('a0000023-0023-0023-0023-000000000023', 'bbbbbbbb-cccc-dddd-eeee-222222222222', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'clickhouserunselectquery', 'Execute SQL queries on ClickHouse to analyze pipeline events', FALSE, TRUE),
('a0000024-0024-0024-0024-000000000024', 'bbbbbbbb-cccc-dddd-eeee-222222222222', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'clickhouselisttables', 'List all available tables in the ClickHouse database', FALSE, TRUE),

-- Pipeline Agent tools (Extract → Transform → Load)
('a0000015-0015-0015-0015-000000000015', '99999999-9999-9999-9999-999999999999', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'generatemock', 'Extract support ticket data from Zendesk using mock generation (Step 1: Extract)', FALSE, TRUE),
('a0000016-0016-0016-0016-000000000016', '99999999-9999-9999-9999-999999999999', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'transformdata', 'Assess ticket urgency using AI analysis (Step 2: Transform)', FALSE, TRUE),
('a0000017-0017-0017-0017-000000000017', '99999999-9999-9999-9999-999999999999', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'loadintodataset', 'Load enriched data to pipeline_events dataset (Step 3: Load)', FALSE, TRUE),

-- Events Analytics Agent tools (ClickHouse via restack-core)
('a0000018-0018-0018-0018-000000000018', '88888888-8888-8888-8888-888888888888', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'clickhouserunselectquery', 'Execute SQL queries on ClickHouse to analyze pipeline events (Step 1: Query)', FALSE, TRUE),
('a0000019-0019-0019-0019-000000000019', '88888888-8888-8888-8888-888888888888', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'clickhouselisttables', 'List all available tables in the ClickHouse database', FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Insert agent subagent relationships (agents that can be delegated to via createsubtask)
INSERT INTO agent_subagents (id, parent_agent_id, subagent_id, enabled) VALUES
-- Task Parallel agent subagents (can delegate to these agents)
('b0000001-0001-0001-0001-000000000001', 'bbbbbbbb-cccc-dddd-eeee-222222222222', '99999999-9999-9999-9999-999999999999', TRUE), -- zendesk-ticket-urgency (pipeline)
('b0000002-0002-0002-0002-000000000002', 'bbbbbbbb-cccc-dddd-eeee-222222222222', '77777777-7777-7777-7777-777777777777', TRUE), -- zendesk-support-orchestrator
('b0000003-0003-0003-0003-000000000003', 'bbbbbbbb-cccc-dddd-eeee-222222222222', '88888888-8888-8888-8888-888888888888', TRUE), -- events-analytics-writer
('b0000004-0004-0004-0004-000000000004', 'bbbbbbbb-cccc-dddd-eeee-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', TRUE), -- technical-research-assistant
('b0000005-0005-0005-0005-000000000005', 'bbbbbbbb-cccc-dddd-eeee-222222222222', 'aaaaaaaa-bbbb-cccc-dddd-111111111111', TRUE), -- todo-tracking-demo
('b0000006-0006-0006-0006-000000000006', 'bbbbbbbb-cccc-dddd-eeee-222222222222', 'cccccccc-dddd-eeee-ffff-333333333333', TRUE)  -- support-healthinsurance
ON CONFLICT (parent_agent_id, subagent_id) DO NOTHING;

-- Demo completed tasks with realistic conversation history
-- Customer Support: Login issue resolution
INSERT INTO tasks (id, workspace_id, team_id, title, description, status, agent_id, assigned_to_id, temporal_agent_id, messages) VALUES
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
          "name": "generatemock",
          "server_label": "restack-core",
          "status": "completed",
          "arguments": {"integration_template": "zendesk_ticket", "parameters": {"query": "login authentication errors", "timeframe": "24h"}},
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
          "name": "generatemock",
          "server_label": "restack-core",
          "status": "completed",
          "arguments": {"integration_template": "pagerduty_incident", "parameters": {"service": "authentication", "status": "open"}},
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
          "name": "generatemock",
          "server_label": "restack-core",
          "status": "completed",
          "arguments": {"integration_template": "datadog_logs", "parameters": {"user": "john.doe@example.com", "service": "authentication", "timeframe": "1h"}},
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
          "name": "generatemock",
          "server_label": "restack-core",
          "status": "completed",
          "arguments": {"integration_template": "zendesk_ticket", "parameters": {"action": "create", "subject": "Login issue resolved", "status": "resolved"}},
          "output": "Ticket #ZD-12345 created and marked as resolved"
        }
      },
      {
        "id": "msg-008",
        "type": "assistant",
        "content": "**Issue Resolved Successfully**\n\n**Root Cause**: Account lockout due to failed login attempts\n**Solution**: Unlocked account and sent password reset email\n**Documentation**: Zendesk ticket #ZD-12345\n**Status**: Customer can now log in normally\n\nThe security lockout was working as intended to protect the account from potential unauthorized access attempts.",
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
          "name": "generatemock",
          "server_label": "restack-core",
          "status": "failed",
          "arguments": {"integration_template": "datadog_logs", "parameters": {"service": "payment", "log_level": "error", "timeframe": "1h"}},
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
          "name": "generatemock",
          "server_label": "restack-core",
          "status": "completed",
          "arguments": {"integration_template": "linear_issue", "parameters": {"priority": "high", "team": "security", "title": "Payment fraud investigation", "description": "Suspicious payment patterns detected"}},
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
          "name": "generatemock",
          "server_label": "restack-core",
          "status": "completed",
          "arguments": {"integration_template": "pagerduty_incident", "parameters": {"category": "security", "status": "resolved", "timeframe": "7d"}},
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
          "name": "generatemock",
          "server_label": "restack-core",
          "status": "completed",
          "arguments": {"integration_template": "zendesk_ticket", "parameters": {"action": "create", "subject": "Security escalation - Payment fraud", "priority": "high"}},
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
        "content": "Based on my qualification analysis:\n\n**Budget**:  Strong ($100K-500K range)\n**Authority**:  CTO has decision-making power\n**Need**:  Developer platform for 200+ team\n**Timeline**: ⏳ To be determined\n\nThis is a high-quality enterprise lead. Creating opportunity now.",
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
          "arguments": {"page_id": "page_project_overview_22222", "properties": {"Last Updated": {"date": {"start": "2024-01-21"}}}, "children": [{"object": "block", "type": "heading_2", "heading_2": {"rich_text": [{"type": "text", "text": {"content": "Recent Updates"}}]}}, {"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"type": "text", "text": {"content": " Created Project Milestones database for better tracking\\n Added MVP Release milestone (Due: Feb 15, 2024)\\n Added Beta Testing milestone (Due: Mar 1, 2024)\\n Refreshed OAuth tokens for continuous API access"}}]}}]},
          "output": "Updated Project Overview page with latest progress and milestone information"
        }
      },
      {
        "id": "msg-610",
        "type": "assistant",
        "content": "📚 **Project Documentation Successfully Organized**\\n\\n**Existing Documentation Found**:\\n- Project Overview (updated with latest progress)\\n- API Documentation\\n- User Guide\\n- Development Setup\\n- Release Notes\\n\\n**New Milestone Database Created**:\\n- Database ID: db_milestone_12345\\n- Properties: Milestone, Status, Due Date, Owner, Priority\\n\\n**Initial Milestones Added**:\\n1. **MVP Release** - In Progress (Due: Feb 15, 2024) - High Priority\\n2. **Beta Testing** - Not Started (Due: Mar 1, 2024) - Medium Priority\\n\\n**OAuth Token Management**:\\n Tokens automatically refreshed during API calls\\n Continuous access maintained without interruption\\n Secure token storage with encryption\\n\\n**Next Steps**:\\n- Add team members as owners to specific milestones\\n- Create additional documentation pages as needed\\n- Set up automated progress tracking\\n\\nYour Notion workspace is now well-organized with proper milestone tracking and up-to-date documentation!",
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
    temporal_agent_id,
    created_at, 
    updated_at,
    messages
) VALUES (
    uuid_generate_v4(),
    'Error Handling Examples - UI Testing',
    'This task demonstrates all possible error types that can occur during agent execution for UI testing purposes',
    'in_progress',
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
