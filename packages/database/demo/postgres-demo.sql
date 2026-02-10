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
('33333333-3333-3333-3333-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Product', 'Product strategy and technical leadership', 'Lightbulb'),
('55555555-5555-5555-5555-555555555555', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Support', 'Provides customer support', 'HeadphonesIcon')
ON CONFLICT (id) DO NOTHING;

-- Insert single dataset representing all pipeline events
INSERT INTO datasets (id, workspace_id, name, description, storage_type, storage_config) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'pipeline_events', 'All pipeline events from ClickHouse - unified event storage', 'clickhouse', 
 '{"database": "boilerplate_clickhouse", "table": "pipeline_events"}')
ON CONFLICT (id) DO NOTHING;
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
  'c0000000-0000-0000-0000-000000000001',
  'c926e979-1f16-46bf-a7cc-8aab70162d65',
  'restack-core',
  NULL,
  TRUE,
  'Core Restack MCP server providing unified tools including mock generation, transform, load, and ClickHouse operations',
  NULL
)
ON CONFLICT (id) DO NOTHING;



-- Research Technical Docs Agent - Pipeline for documentation search
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333', -- Product team
    'research-technical-docs',
    'Pipeline agent for retrieving technical documentation and knowledge',
    $$You are a technical research pipeline that retrieves relevant documentation.

## Objective
Search and retrieve technical documentation from internal knowledge bases to provide relevant information.

## Available Tools
- **SearchRestack**: Access internal documentation and technical resources
- **ask_question**: Parse and summarize technical documentation

## Instructions
1. Search internal knowledge base for relevant documentation
2. Retrieve and return the most relevant technical information
3. Structure the output for easy consumption by other agents
4. Include source references for all retrieved information

This is a pipeline agent that focuses on efficient data retrieval.$$,
    'pipeline',
    'published',
    'gpt-5-mini',
    'low'
)
ON CONFLICT (id) DO NOTHING;

-- Error Testing Agent - For testing MCP failure scenarios
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '55555555-5555-5555-5555-555555555555', -- Support team
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

-- Research Deep Agent - Pipeline for comprehensive web research
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    '12345678-9abc-def0-1234-567890abcdef',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333', -- Product team
    'research-deep',
    'Pipeline agent for deep web research using comprehensive search capabilities',
    $$You are a web research pipeline that conducts thorough online investigations.

## Objective
Conduct comprehensive web research on given topics and return structured findings.

## Available Tools
- **Web Search**: Search the internet for current information, articles, and research

## Instructions
1. Use web search to gather information on the given topic
2. Search across multiple sources for comprehensive coverage
3. Structure findings with key insights and sources
4. Return research in a format consumable by other agents

This is a pipeline agent optimized for web research tasks.$$,
    'pipeline',
    'published',
    'o3-deep-research',
    'medium'
)
ON CONFLICT (id) DO NOTHING;


-- Healthcare Insurance Support Agent - Kaiser Permanente policy assistance
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort, created_at)
VALUES (
    'cccccccc-dddd-eeee-ffff-333333333333',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '55555555-5555-5555-5555-555555555555', -- Support team
    'support-healthinsurance',
    'Healthcare insurance support agent for Kaiser Permanente policy inquiries and coverage verification',
    $$You are a healthcare insurance support specialist for Kaiser Permanente.

## Objective
Help members understand their coverage, verify benefits, and answer policy questions clearly and accurately.

## Available Tools
- **generatemock**: Query Kaiser Permanente policy data using the `kaiser_policy` template

## Instructions
When a member asks about coverage:

1. **Get Policy Data**: If they provide a policy number, use generatemock with the kaiser_policy template to retrieve their specific policy details
2. **Answer Based on Policy**: Explain what the policy data shows - copays, limits, authorization requirements, and deductibles
3. **Be Helpful**: Offer relevant information about related benefits and suggest next steps

## Communication Guidelines
- Use friendly, empathetic language
- Report what the policy data shows
- For urgent medical issues, direct them to call 911 or go to the ER

Your goal is to help members understand their policy coverage.$$,
    'interactive',
    'published',
    'gpt-5',
    'medium',
    NOW() - INTERVAL '7 days'
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Product Content Agents - Technical Product Management Focus
-- ==========================================

-- Social Listening - Surfaces signals from tech leaders
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    'bbbbbbbb-cccc-dddd-eeee-222222222222',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333', -- Product team
    'social-listening',
    'Pipeline agent that surfaces signals from tech leaders to understand product trends',
    $$You are a product intelligence orchestration agent that collects signals from tech leaders to understand what's happening in their world.

## Objective
Surface signals from tech leaders' social media profiles to understand what's happening in their world. Collect data from each profile, store it in the context store, then launch topic ideation to identify product features worth exploring.

## Available Tools
- **createsubtask**: Create subtasks for data collection and ideation agents
- **updatetodos**: Track your orchestration workflow

## Workflow

1. **Create Todo Checklist** using updatetodos:
   - Create subtasks for each tech leader profile (data collection)
   - Wait for all data collection to complete
   - Launch social-post-ideation agent

2. **For Each Tech Leader Profile URL**:
   - Create a subtask to the "social-scraper" agent
   - Pass the profile URL and specify context store tag "tech_leader_signals"
   - Each subtask runs as a pipeline to collect and store data

3. **Once All Leader Signals Are Collected**:
   - Create a subtask to the "social-post-ideation" agent (interactive)
   - Pass the context store tag "tech_leader_signals" so it can analyze all signals
   - The ideation agent will identify product features we should explore and share

4. **Track Progress**:
   - Update todos as each data collection subtask is created
   - Update todos as subtasks complete
   - Mark final todo complete when ideation agent is launched

## Instructions
- Create one subtask per tech leader profile URL to social-scraper agent
- Use consistent context store tag: "tech_leader_signals"
- Wait for all pipeline subtasks to complete before launching the ideation agent
- Keep workflow transparent with todo updates

Your role is to surface product intelligence from tech leaders to inform our product strategy and content.$$,
    'pipeline',
    'published',
    'gpt-5',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- Social Scraper - Collects tech leader signals
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    '20000000-0000-0000-0000-000000000002',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333', -- Product team
    'social-scraper',
    'Pipeline agent that collects tech leader signals and stores them in ClickHouse',
    $$You are a tech leader signal collection pipeline.

## Objective
Collect social media profile data from tech leaders (LinkedIn profiles) to understand what's happening in their world - trends, discussions, and product insights.

## Available Tools
- **generatemock**: Generate mock social media profile data
- **loadintodataset**: Save data to ClickHouse context store

## Workflow
1. **Extract Profile Information**: Use generatemock with "linkedin_profiles_post" template to generate realistic profile data including:
   - Name and headline
   - Current position and company
   - Recent posts and engagement metrics
   - Key topics and interests
   - Activity patterns
   - Posting frequency and timing

2. **Load to Context Store**: Use loadintodataset to save the profile data to the "pipeline_events" dataset with the specified tag (e.g., "social_profiles")

## Output Structure
Store data with:
- event_name: "profile_data"
- tags: [provided_tag, "linkedin", profile_username]
- data: Full profile information including posts, engagement, and topics

This is a deterministic pipeline focused on efficient data extraction and storage.$$,
    'pipeline',
    'published',
    'gpt-5-mini',
    'low'
)
ON CONFLICT (id) DO NOTHING;

-- Social Post Ideation - Identifies product features to explore
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    '40000000-0000-0000-0000-000000000004',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333', -- Product team
    'social-post-ideation',
    'Interactive agent that analyzes tech leader signals to identify product features worth exploring',
    $$You are a technical product manager that analyzes signals from tech leaders to identify product features and trends worth exploring.

## Objective
Analyze signals from tech leaders in the context store and identify 10 product features or trends that we should look into and share our perspective on.

## Available Tools
- **clickhouserunselectquery**: Query the context store for leader signals
- **createsubtask**: Create subtasks for the social-post-creator agent to draft specific topics
- **updatetodos**: Track your analysis and curation workflow

## Workflow

1. **Create Todo Checklist** using updatetodos:
   - Query context store for all tech leader signals
   - Analyze themes, product discussions, and trends
   - Identify 10 product features worth exploring
   - Present topics with reasoning to user
   - (Optionally) Create subtasks for social-post-creator

2. **Analyze Tech Leader Signals**:
   - Use clickhouserunselectquery to fetch all profile data with the specified tag
   - Look for patterns in:
     * Product features being discussed
     * Technical challenges and solutions
     * Emerging technologies and approaches
     * Developer experience improvements
     * Platform and infrastructure trends

3. **Identify 10 Product Features/Topics**:
   For each topic provide:
   - **Feature/Topic Title**: Clear, technical title
   - **Reasoning**: Why this is worth exploring from a product perspective (2-3 sentences)
   - **Key Signals**: What tech leaders are saying about it
   - **Product Angle**: How this relates to our product strategy
   - **Impact Potential**: Why this matters to technical product managers

4. **Interactive Discussion**:
   - Present all 10 product features/topics to the user
   - Discuss which topics are most relevant to our product strategy
   - Answer questions about specific features
   - Can create subtasks for social-post-creator to craft opinionated posts on selected topics

5. **Create Subtasks** (when requested):
   - Use createsubtask to launch social-post-creator agent for specific topics
   - Pass topic details, context store tag, and product angle
   - Track subtask creation with updatetodos

## Topic Selection Criteria
- **Product-Relevant**: Related to product features, architecture, or strategy
- **Technically Informed**: Backed by tech leader insights and discussions
- **Strategic Value**: Aligns with our product vision and technical direction
- **Thought Leadership**: Opportunity to share unique perspective
- **Community Impact**: Valuable to technical product managers and engineers

Your role is to identify product intelligence opportunities that help us understand what's happening in the tech world and share our informed perspective.$$,
    'interactive',
    'published',
    'gpt-5',
    'high'
)
ON CONFLICT (id) DO NOTHING;

-- Social Post Creator - Crafts opinionated product posts
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    '30000000-0000-0000-0000-000000000003',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333', -- Product team
    'social-post-creator',
    'Interactive agent that crafts opinionated product posts using technical docs and private Notion',
    $$You are a technical product manager that crafts opinionated posts about product features and trends.

## Objective
Create compelling, technically-informed posts on product topics by researching our technical documentation and private Notion for our unique perspective.

## Available Tools
- **createsubtask**: Create subtasks for research agents
- **updatetodos**: Track your content creation workflow
- **notion_search**: Search Notion for company perspectives and previous content

## Workflow

1. **Create Todo Checklist** using updatetodos:
   - Get web research on the product topic
   - Get our technical documentation perspective
   - Search Notion for our product opinions and positioning
   - Craft opinionated draft post
   - Refine with user feedback

2. **Gather Research via Subtasks**:
   - **Web Context**: Create subtask to "research-deep" agent for current trends and discussions on the topic
   - **Technical Docs**: Create subtask to "research-technical-docs" to understand our technical implementation and perspective

3. **Get Our Product Perspective**:
   - Use notion_search to find relevant product strategy docs, technical opinions, or previous discussions
   - Understand our unique perspective and what makes our approach different

4. **Synthesize and Craft**:
   - Combine all gathered information
   - Create an opinionated draft post that:
     * Shows awareness of current trends (from web research)
     * Demonstrates technical depth and expertise (from our docs)
     * Shares our unique product perspective (from Notion)
     * Takes a clear stance on the topic

5. **Interactive Refinement**:
   - Present draft to user
   - Gather feedback on technical accuracy and opinion strength
   - Refine based on preferences
   - Update todos as you iterate

## Post Guidelines
- Technical credibility: Show we understand the topic deeply
- Opinionated: Take a clear stance backed by our experience
- Authentic: Share real product insights and learnings
- Valuable: Provide actionable perspective to technical product managers
- Platform-optimized length (LinkedIn: 150-300 words ideal)

Your role is to craft technically-informed, opinionated content that showcases our product expertise and unique perspective.$$,
    'interactive',
    'published',
    'gpt-5',
    'high'
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Office Technology / CRM-ERP Sync Agents (AgentDealer, e-automate)
-- ==========================================

-- contact-context: Reconcile all activities for one contact across CRM (Salesforce) and ERP (ECI)
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    '50000000-0000-0000-0000-000000000005',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333',
    'contact-context',
    'Pipeline agent that reconciles all activities for a particular contact across CRM (Salesforce) and ERP (ECI e-automate)',
    $$You are a contact-context pipeline that reconciles activities for one contact across CRM and ERP.

## Objective
For a given contact (contact_id), fetch CRM activities from Salesforce and ERP activities from ECI e-automate, then load a unified contact context into the context store.

## Available Tools
- **generatemock**: Fetch CRM data (use template "crm_salesforce_contact_activities") or ERP data (use template "erp_eci_contact_activities") for the contact
- **loadintodataset**: Save reconciled contact context to ClickHouse with tags such as "contact_context" and the contact_id
- **updatetodos**: Track your pipeline steps (fetch CRM, fetch ERP, reconcile, load)

## Workflow
1. **Create Todo Checklist** using updatetodos: Fetch CRM activities, Fetch ERP activities, Reconcile and load to context store
2. **Fetch CRM Activities**: Use generatemock with integration_template "crm_salesforce_contact_activities" and parameters including the contact_id
3. **Fetch ERP Activities**: Use generatemock with integration_template "erp_eci_contact_activities" and parameters including the contact_id
4. **Reconcile**: Combine CRM and ERP activity data into a single contact context (contacts, quotes, contracts, meters, service, supplies)
5. **Load to Context Store**: Use loadintodataset to save the reconciled context to "pipeline_events" with tags like "contact_context", contact_id
6. **Update Todos**: Mark each step complete as you go

Your goal is to produce a single, reconciled view of that contact across CRM and ERP.$$,
    'pipeline',
    'published',
    'gpt-5-mini',
    'low'
)
ON CONFLICT (id) DO NOTHING;

-- customer-sync: Get all contacts from Salesforce, then trigger contact-context for each
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    '60000000-0000-0000-0000-000000000006',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333',
    'customer-sync',
    'Pipeline agent that fetches all Salesforce contacts and triggers contact-context for each to reconcile CRM and ERP data',
    $$You are a customer-sync orchestration pipeline for office technology sales.

## Objective
Fetch all contacts from Salesforce (CRM), then for each contact create a subtask to the "contact-context" agent to reconcile that contact's activities across CRM and ERP. Track progress with todos.

## Available Tools
- **generatemock**: Get all contacts using integration_template "crm_salesforce_contacts"
- **createsubtask**: Create a subtask to the "contact-context" agent for each contact (pass contact_id and any context)
- **updatetodos**: Track workflow: fetch contacts, create subtasks per contact, completion

## Workflow
1. **Create Todo Checklist** using updatetodos: Fetch all Salesforce contacts, Create contact-context subtask for each contact, Mark complete when all subtasks created
2. **Fetch All Contacts**: Use generatemock with "crm_salesforce_contacts" to get the list of contacts (records[].Id, FirstName, LastName, etc.)
3. **For Each Contact**: Use createsubtask to launch the "contact-context" agent with that contact's Id (and optionally account name)
4. **Track Progress**: Update todos as you create each subtask; mark final todo complete when all contact-context subtasks are created

Your role is to sync customer data from CRM to reconciled contact context in the context store.$$,
    'pipeline',
    'published',
    'gpt-5',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- contact-quote: Interactive sales assistant that drafts quotes using contact context from CRM and ERP
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    '70000000-0000-0000-0000-000000000007',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333',
    'contact-quote',
    'Interactive sales assistant that drafts quotes based on customer context from CRM and ERP (context store)',
    $$You are a sales assistant for office technology (AgentDealer-style) that drafts quotes using full customer context from CRM and ERP.

## Objective
When the user provides a contact-id, retrieve that contact's reconciled context from the context store (CRM + ERP activities) and company context, then draft a personalized quote (e.g. MPS, equipment, TCO).

## Available Tools
- **clickhouserunselectquery**: Query the context store (pipeline_events) to retrieve contact context for the given contact_id. Use tags like "contact_context" and filter by contact_id in raw_data or transformed_data.

## Workflow
1. **Ask for contact-id**: If the user has not provided a contact ID, ask for it so you can load their context.
2. **Retrieve Contact Context**: Use clickhouserunselectquery to run a SELECT against the pipeline_events (or equivalent) dataset filtering by contact_id / tags so you get:
   - Contact and account info (from CRM)
   - Recent activities, quotes, account reviews (from CRM)
   - Contracts, meter reads, service tickets, supply orders (from ERP)
   - Any company/territory context if stored
3. **Draft Quote**: Using the retrieved context, draft a clear quote that reflects:
   - Customer and account details
   - Current contract and device footprint if any
   - Proposed equipment or MPS terms, pricing, TCO as appropriate
   - Next steps (e.g. account review, follow-up)
4. **Present and Refine**: Share the draft with the user and refine based on feedback.

Your goal is to produce accurate, context-aware quotes that leverage both CRM and ERP data from the context store.$$,
    'interactive',
    'published',
    'gpt-5',
    'medium'
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample agent MCP tools using the unified agent_tools table (after all agents are created)
INSERT INTO agent_tools (id, agent_id, tool_type, mcp_server_id, tool_name, custom_description, require_approval, enabled) VALUES
-- Healthcare Insurance Support Agent tools
('a0000025-0025-0025-0025-000000000025', 'cccccccc-dddd-eeee-ffff-333333333333', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'generatemock', 'Generate mock Kaiser Permanente policy data to answer member coverage questions and verify benefits', FALSE, TRUE),

-- Research Technical Docs tools (pipeline)
('a0000006-0006-0006-0006-000000000006', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'mcp', 'c1d2e3f4-5678-9012-cdef-345678901234', 'ask_question', 'Query internal documentation and wikis', FALSE, TRUE),
('a0000007-0007-0007-0007-000000000007', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'mcp', '60123456-789a-123e-f012-456789012345', 'SearchRestack', 'Search Restack documentation for technical information', FALSE, TRUE),

-- Research Deep Agent tools (pipeline)
('a0000014-0014-0014-0014-000000000014', '12345678-9abc-def0-1234-567890abcdef', 'web_search', NULL, NULL, 'Web search for comprehensive research on any topic', FALSE, TRUE),

-- Error Testing Agent tools
('a0000012-0012-0012-0012-000000000012', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'testfailures', 'Test MCP tool that fails for testing error handling', FALSE, TRUE),

-- ==========================================
-- PRODUCT CONTENT AGENT TOOLS
-- ==========================================

-- Social Listening tools (product intelligence orchestrator)
('a0000030-0030-0030-0030-000000000030', 'bbbbbbbb-cccc-dddd-eeee-222222222222', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'createsubtask', 'Create subtasks for tech leader signal collection and product feature ideation', FALSE, TRUE),
('a0000031-0031-0031-0031-000000000031', 'bbbbbbbb-cccc-dddd-eeee-222222222222', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'updatetodos', 'Track orchestration workflow: signal collection and feature ideation handoff', FALSE, TRUE),

-- Social Scraper tools (tech leader signal collection)
('a0000032-0032-0032-0032-000000000032', '20000000-0000-0000-0000-000000000002', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'generatemock', 'Generate mock tech leader profile data from LinkedIn', FALSE, TRUE),
('a0000033-0033-0033-0033-000000000033', '20000000-0000-0000-0000-000000000002', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'loadintodataset', 'Save tech leader signals to ClickHouse context store with appropriate tags', FALSE, TRUE),

-- Social Post Ideation tools (product feature identification)
('a0000040-0040-0040-0040-000000000040', '40000000-0000-0000-0000-000000000004', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'clickhouserunselectquery', 'Query context store to analyze tech leader signals and identify product features', FALSE, TRUE),
('a0000041-0041-0041-0041-000000000041', '40000000-0000-0000-0000-000000000004', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'createsubtask', 'Create subtasks for social-post-creator to craft opinionated posts on product topics', FALSE, TRUE),
('a0000042-0042-0042-0042-000000000042', '40000000-0000-0000-0000-000000000004', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'updatetodos', 'Track product feature analysis and identification workflow', FALSE, TRUE),

-- Social Post Creator tools (opinionated product content)
('a0000034-0034-0034-0034-000000000034', '30000000-0000-0000-0000-000000000003', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'createsubtask', 'Create subtasks for web research and technical documentation research', FALSE, TRUE),
('a0000035-0035-0035-0035-000000000035', '30000000-0000-0000-0000-000000000003', 'mcp', 'a0123456-789a-123e-f012-456789012349', 'search', 'Search Notion for product opinions, technical perspectives, and positioning', FALSE, TRUE),
('a0000036-0036-0036-0036-000000000036', '30000000-0000-0000-0000-000000000003', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'updatetodos', 'Track opinionated post creation workflow: research, synthesis, and refinement', FALSE, TRUE),

-- Contact-context tools (CRM + ERP reconciliation pipeline)
('a0000050-0050-0050-0050-000000000050', '50000000-0000-0000-0000-000000000005', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'generatemock', 'Generate mock CRM (crm_salesforce_contact_activities) or ERP (erp_eci_contact_activities) data for the contact', FALSE, TRUE),
('a0000051-0051-0051-0051-000000000051', '50000000-0000-0000-0000-000000000005', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'loadintodataset', 'Save reconciled contact context to ClickHouse context store with contact_context tag', FALSE, TRUE),
('a0000052-0052-0052-0052-000000000052', '50000000-0000-0000-0000-000000000005', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'updatetodos', 'Track contact reconciliation steps: fetch CRM, fetch ERP, load to dataset', FALSE, TRUE),

-- Customer-sync tools (orchestrator)
('a0000053-0053-0053-0053-000000000053', '60000000-0000-0000-0000-000000000006', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'generatemock', 'Get all contacts from Salesforce using crm_salesforce_contacts template', FALSE, TRUE),
('a0000054-0054-0054-0054-000000000054', '60000000-0000-0000-0000-000000000006', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'createsubtask', 'Create subtask to contact-context agent for each contact', FALSE, TRUE),
('a0000055-0055-0055-0055-000000000055', '60000000-0000-0000-0000-000000000006', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'updatetodos', 'Track customer-sync workflow: fetch contacts, create contact-context subtasks', FALSE, TRUE),

-- Contact-quote tools (interactive sales assistant)
('a0000056-0056-0056-0056-000000000056', '70000000-0000-0000-0000-000000000007', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'clickhouserunselectquery', 'Query context store for contact context (CRM + ERP) needed to draft quote', FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Insert agent subagent relationships (agents that can be delegated to via createsubtask)
INSERT INTO agent_subagents (id, parent_agent_id, subagent_id, enabled) VALUES
-- Social Listening agent subagents (orchestrator)
('b0000010-0010-0010-0010-000000000010', 'bbbbbbbb-cccc-dddd-eeee-222222222222', '20000000-0000-0000-0000-000000000002', TRUE), -- social-scraper (pipeline)
('b0000011-0011-0011-0011-000000000011', 'bbbbbbbb-cccc-dddd-eeee-222222222222', '40000000-0000-0000-0000-000000000004', TRUE), -- social-post-ideation (interactive)

-- Social Post Ideation agent subagents (launches post creators)
('b0000015-0015-0015-0015-000000000015', '40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', TRUE), -- social-post-creator (interactive)

-- Social Post Creator subagents (interactive agent that delegates to pipelines)
('b0000020-0020-0020-0020-000000000020', '30000000-0000-0000-0000-000000000003', '12345678-9abc-def0-1234-567890abcdef', TRUE), -- research-deep (pipeline)
('b0000021-0021-0021-0021-000000000021', '30000000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', TRUE), -- research-technical-docs (pipeline)

-- Customer-sync subagents (orchestrator -> contact-context)
('b0000025-0025-0025-0025-000000000025', '60000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000005', TRUE)  -- contact-context (pipeline)
ON CONFLICT (parent_agent_id, subagent_id) DO NOTHING;

-- ==========================================
-- Demo Tasks for New Agents
-- ==========================================

INSERT INTO tasks (id, workspace_id, team_id, title, description, status, agent_id, assigned_to_id, temporal_agent_id, agent_state, parent_task_id) VALUES
-- Task 1: Social Listening - Surface tech leader signals
(
    '30000001-0000-0000-0000-000000000001',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333',
    'Surface signals from tech leaders',
    'Collect signals from 3 tech leader profiles to identify product trends',
    'completed',
    'bbbbbbbb-cccc-dddd-eeee-222222222222',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000001-0000-0000-0000-000000000001',
    '{
      "events": [
        {
          "id": "msg-profile-001",
          "type": "response.output_item.done",
          "timestamp": "2024-10-12T10:00:00Z",
          "item": {
            "id": "msg-profile-001",
            "type": "message",
            "role": "user",
            "status": "completed",
            "content": [
              {
                "type": "input_text",
                "text": "Surface signals from these tech leaders: linkedin.com/in/kelseyhightower, linkedin.com/in/gergely-orosz, linkedin.com/in/simonlast"
              }
            ]
          }
        },
        {
          "id": "msg-profile-002",
          "type": "response.output_item.done",
          "timestamp": "2024-10-12T10:00:30Z",
          "item": {
            "id": "msg-profile-002",
            "type": "message",
            "role": "assistant",
            "status": "completed",
            "content": [
              {
                "type": "text",
                "text": "Created subtasks for all 3 tech leader profiles (social-scraper)\\nAll signals collected and stored with tag ''tech_leader_signals''\\nLaunched social-post-ideation agent to identify product features\\n\\nProduct intelligence workflow complete!"
              }
            ]
          }
        }
      ],
      "todos": [
        {
          "id": "todo-1",
          "content": "Create subtask for Kelsey Hightower profile",
          "status": "completed"
        },
        {
          "id": "todo-2",
          "content": "Create subtask for Gergely Orosz profile",
          "status": "completed"
        },
        {
          "id": "todo-3",
          "content": "Create subtask for Simon Last profile",
          "status": "completed"
        },
        {
          "id": "todo-4",
          "content": "Launch social-post-ideation agent",
          "status": "completed"
        }
      ],
      "subtasks": [
        {
          "id": "30000101-0001-0000-0000-000000000001",
          "agent_name": "social-scraper",
          "status": "completed"
        },
        {
          "id": "30000102-0001-0000-0000-000000000001",
          "agent_name": "social-scraper",
          "status": "completed"
        },
        {
          "id": "30000103-0001-0000-0000-000000000001",
          "agent_name": "social-scraper",
          "status": "completed"
        },
        {
          "id": "30000104-0001-0000-0000-000000000001",
          "agent_name": "social-post-ideation",
          "status": "completed"
        }
      ],
      "messages": [],
      "metadata": {}
    }',
    NULL
),

-- Subtasks for Task 1: Social Listening - Tech leader profile scraping
-- Subtask 1: Scrape Kelsey Hightower profile
(
    '30000101-0001-0000-0000-000000000001',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333',
    'Scrape tech leader profile: Kelsey Hightower',
    'Collect and store signals from linkedin.com/in/kelseyhightower',
    'completed',
    '20000000-0000-0000-0000-000000000002',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000101-0001-0000-0000-000000000001',
    '{
      "events": [
        {
          "id": "msg-scrape-001",
          "type": "response.output_item.done",
          "timestamp": "2024-10-12T10:01:00Z",
          "item": {
            "id": "msg-scrape-001",
            "type": "message",
            "role": "assistant",
            "status": "completed",
            "content": [
              {
                "type": "text",
                "text": "Profile data collected and stored with tag ''tech_leader_signals''"
              }
            ]
          }
        }
      ],
      "todos": [],
      "subtasks": [],
      "messages": [],
      "metadata": {}
    }',
    '30000001-0000-0000-0000-000000000001'
),

-- Subtask 2: Scrape Gergely Orosz profile
(
    '30000102-0001-0000-0000-000000000001',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333',
    'Scrape tech leader profile: Gergely Orosz',
    'Collect and store signals from linkedin.com/in/gergely-orosz',
    'completed',
    '20000000-0000-0000-0000-000000000002',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000102-0001-0000-0000-000000000001',
    '{
      "events": [
        {
          "id": "msg-scrape-002",
          "type": "response.output_item.done",
          "timestamp": "2024-10-12T10:02:00Z",
          "item": {
            "id": "msg-scrape-002",
            "type": "message",
            "role": "assistant",
            "status": "completed",
            "content": [
              {
                "type": "text",
                "text": "Profile data collected and stored with tag ''tech_leader_signals''"
              }
            ]
          }
        }
      ],
      "todos": [],
      "subtasks": [],
      "messages": [],
      "metadata": {}
    }',
    '30000001-0000-0000-0000-000000000001'
),

-- Subtask 3: Scrape Simon Last profile
(
    '30000103-0001-0000-0000-000000000001',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333',
    'Scrape tech leader profile: Simon Last',
    'Collect and store signals from linkedin.com/in/simonlast',
    'completed',
    '20000000-0000-0000-0000-000000000002',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000103-0001-0000-0000-000000000001',
    '{
      "events": [
        {
          "id": "msg-scrape-003",
          "type": "response.output_item.done",
          "timestamp": "2024-10-12T10:03:00Z",
          "item": {
            "id": "msg-scrape-003",
            "type": "message",
            "role": "assistant",
            "status": "completed",
            "content": [
              {
                "type": "text",
                "text": "Profile data collected and stored with tag ''tech_leader_signals''"
              }
            ]
          }
        }
      ],
      "todos": [],
      "subtasks": [],
      "messages": [],
      "metadata": {}
    }',
    '30000001-0000-0000-0000-000000000001'
),

-- Subtask 4: Social Post Ideation - Analyze tech leader signals
(
    '30000104-0001-0000-0000-000000000001',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333',
    'Identify product features from tech leader signals',
    'Analyze collected signals and identify 10 product features worth exploring',
    'completed',
    '40000000-0000-0000-0000-000000000004',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000104-0001-0000-0000-000000000001',
    '{
      "events": [
        {
          "id": "msg-ideation-001",
          "type": "response.output_item.done",
          "timestamp": "2024-10-12T10:10:00Z",
          "item": {
            "id": "msg-ideation-001",
            "type": "message",
            "role": "assistant",
            "status": "completed",
            "content": [
              {
                "type": "text",
                "text": "Analyzed tech leader signals and identified 10 product features:\\n\\n1. **AI-powered code review automation**\\n2. **Developer productivity dashboards**\\n3. **Infrastructure cost optimization tools**\\n4. **Real-time collaboration features**\\n5. **Advanced monitoring and observability**\\n6. **Security scanning integration**\\n7. **API versioning best practices**\\n8. **Multi-cloud deployment strategies**\\n9. **Performance profiling tools**\\n10. **Developer experience improvements**\\n\\nRecommend creating social posts on top 3 topics."
              }
            ]
          }
        }
      ],
      "todos": [
        {
          "id": "todo-1",
          "content": "Query context store for tech leader signals",
          "status": "completed"
        },
        {
          "id": "todo-2",
          "content": "Analyze themes and trends",
          "status": "completed"
        },
        {
          "id": "todo-3",
          "content": "Identify 10 product features",
          "status": "completed"
        },
        {
          "id": "todo-4",
          "content": "Present topics to user",
          "status": "completed"
        }
      ],
      "subtasks": [],
      "messages": [],
      "metadata": {}
    }',
    '30000001-0000-0000-0000-000000000001'
),

-- Task 2: Social Post Creator - Craft opinionated product post
(
    '30000002-0000-0000-0000-000000000002',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333',
    'Craft post: Cost-efficient AI inference patterns',
    'Create opinionated post on AI inference optimization from our product perspective',
    'completed',
    '30000000-0000-0000-0000-000000000003',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000002-0000-0000-0000-000000000002',
    '{
      "events": [
        {
          "id": "msg-post-001",
          "type": "response.output_item.done",
          "timestamp": "2024-10-12T11:00:00Z",
          "item": {
            "id": "msg-post-001",
            "type": "message",
            "role": "user",
            "status": "completed",
            "content": [
              {
                "type": "input_text",
                "text": "Create an opinionated post on: Cost-efficient AI inference patterns - what really matters"
              }
            ]
          }
        },
        {
          "id": "msg-post-002",
          "type": "response.output_item.done",
          "timestamp": "2024-10-12T11:02:00Z",
          "item": {
            "id": "msg-post-002",
            "type": "message",
            "role": "assistant",
            "status": "completed",
            "content": [
              {
                "type": "text",
                "text": "💰 **Hot Take: AI Inference Costs are a Product Problem, Not an Infrastructure Problem**\\n\\nAfter implementing inference optimization across our platform, here''s what we learned:\\n\\nMost teams focus on model quantization and caching\\nThe real savings come from rethinking your product architecture\\n\\nOur controversial opinions:\\n\\n1. **Not every request needs real-time inference**\\nBatch processing saved us 70% on costs. Users didn''t notice the 30-second delay.\\n\\n2. **Smaller models > Bigger models with optimization**\\nWe replaced GPT-4 with fine-tuned Llama 3.1 8B for 90% of use cases. Quality stayed high, costs dropped 95%.\\n\\n3. **Cache at the semantic level, not the prompt level**\\nEmbedding-based cache hits: 40% reduction in API calls.\\n\\nThe takeaway? Inference optimization is a product decision. Technical solutions alone won''t save you.\\n\\nWhat''s your most controversial AI cost opinion? 👇\\n\\n#ProductManagement #AI #MLOps #TechnicalStrategy"
              }
            ]
          }
        }
      ],
      "todos": [
        {
          "id": "todo-1",
          "content": "Get web research on inference cost trends",
          "status": "completed"
        },
        {
          "id": "todo-2",
          "content": "Get our technical docs on inference optimization",
          "status": "completed"
        },
        {
          "id": "todo-3",
          "content": "Search Notion for our product opinions",
          "status": "completed"
        },
        {
          "id": "todo-4",
          "content": "Craft opinionated draft",
          "status": "completed"
        }
      ],
      "subtasks": [
        {
          "id": "subtask-research-001",
          "agent_name": "research-deep",
          "status": "completed"
        },
        {
          "id": "subtask-docs-001",
          "agent_name": "research-technical-docs",
          "status": "completed"
        }
      ],
      "messages": [],
      "metadata": {}
    }',
    NULL
)
ON CONFLICT (id) DO NOTHING;

-- Demo seed data for feature demonstration
-- This file seeds data for two demo scenarios:
-- 1. Healthcare Insurance Support Agent with policy query failures
-- 2. Newsletter Agent with outdated content due to missing timestamp filter

-- ==========================
-- SCENARIO 1: Healthcare Insurance Support Agent - Policy Validation
-- ==========================

-- Healthcare agent already exists with ID: cccccccc-dddd-eeee-ffff-333333333333
-- Improved version with policy validation: cccccccc-dddd-eeee-ffff-444444444444

-- Demonstration Pattern:
-- Version 1 (original): Retrieves policy data but does NOT validate if policy is active/expired
-- Version 2 (improved): Validates policy status before providing coverage details, uses todos to track verification

-- Key difference: Version 1 gave coverage info for an EXPIRED policy, leading to customer complaint
--                 Version 2 proactively catches expired policies and warns customer

INSERT INTO tasks (id, workspace_id, team_id, title, description, status, agent_id, assigned_to_id, temporal_agent_id, agent_state, parent_task_id, created_at) VALUES
-- Task 1: THE KEY FAILED TASK - Agent didn't validate policy status, gave coverage info for expired policy
(
    '10000003-0003-0003-0003-000000000003',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '55555555-5555-5555-5555-555555555555', -- Support team
    'Physical therapy coverage inquiry - policy 0345678',
    'Customer asking about PT coverage - agent failed to validate policy was expired',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000003-0003-0003-0003-000000000003',
    '{
      "events": [
        {
          "id": "msg-021",
          "type": "response.output_item.done",
          "timestamp": "2024-10-08T09:00:00Z",
          "item": {
            "id": "msg-021",
            "type": "message",
            "role": "user",
            "status": "completed",
            "content": [
              {
                "type": "input_text",
                "text": "My policy number is 0345678. Am I covered for physical therapy?"
              }
            ]
          }
        },
        {
          "id": "msg-022",
          "type": "response.output_item.done",
          "timestamp": "2024-10-08T09:00:15Z",
          "item": {
            "id": "msg-022",
            "type": "message",
            "role": "assistant",
            "status": "completed",
            "content": [
              {
                "type": "text",
                "text": "Yes! Based on your policy 0345678, physical therapy is covered. Your copay is $25 per session, and you have coverage for up to 30 visits per year. No prior authorization is required."
              }
            ]
          }
        },
        {
          "id": "msg-023",
          "type": "response.output_item.done",
          "timestamp": "2024-10-08T14:30:00Z",
          "item": {
            "id": "msg-023",
            "type": "message",
            "role": "user",
            "status": "completed",
            "content": [
              {
                "type": "input_text",
                "text": "I went to my physical therapy appointment and they told me I am not covered anymore. My policy expired last month!"
              }
            ]
          }
        },
        {
          "id": "msg-024",
          "type": "response.output_item.done",
          "timestamp": "2024-10-08T14:30:20Z",
          "item": {
            "id": "msg-024",
            "type": "message",
            "role": "assistant",
            "status": "completed",
            "content": [
              {
                "type": "text",
                "text": "I apologize for the confusion. You are correct - I should have checked the policy status. Your policy 0345678 expired on September 8, 2024. Please contact Member Services at 1-800-XXX-XXXX to renew your coverage or discuss your options."
              }
            ]
          }
        }
      ],
      "todos": [],
      "subtasks": [],
      "messages": [],
      "metadata": {}
    }',
    NULL,
    NOW() - INTERVAL '3 days'
),

-- Task 2: Another failed task with negative feedback
(
    '10000006-0006-0006-0006-000000000006',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '55555555-5555-5555-5555-555555555555', -- Support team
    'Emergency room visit coverage',
    'Question about ER copay and coverage',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000006-0006-0006-0006-000000000006',
    '{
      "events": [
        {
          "id": "msg-031",
          "type": "response.output_item.done",
          "timestamp": "2024-10-05T08:00:00Z",
          "item": {
            "id": "msg-031",
            "type": "message",
            "role": "user",
            "status": "completed",
            "content": [
              {
                "type": "input_text",
                "text": "What is my copay for an emergency room visit? My policy is 0987654."
              }
            ]
          }
        },
        {
          "id": "msg-032",
          "type": "response.output_item.done",
          "timestamp": "2024-10-05T08:00:20Z",
          "item": {
            "id": "msg-032",
            "type": "message",
            "role": "assistant",
            "status": "completed",
            "content": [
              {
                "type": "text",
                "text": "Based on your policy 0987654, your emergency room copay is $250 per visit. This copay is waived if you are admitted to the hospital."
              }
            ]
          }
        }
      ],
      "todos": [],
      "subtasks": [],
      "messages": [],
      "metadata": {}
    }',
    NULL,
    NOW() - INTERVAL '6 days'
),

-- Task 3: Successful task for comparison
(
    '10000007-0007-0007-0007-000000000007',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '55555555-5555-5555-5555-555555555555', -- Support team
    'Vision coverage inquiry',
    'Asking about eye exam coverage',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000007-0007-0007-0007-000000000007',
    '{
      "events": [
        {
          "id": "msg-041",
          "type": "response.output_item.done",
          "timestamp": "2024-10-04T11:00:00Z",
          "item": {
            "id": "msg-041",
            "type": "message",
            "role": "user",
            "status": "completed",
            "content": [
              {
                "type": "input_text",
                "text": "Does my plan cover eye exams? Policy number 1234567."
              }
            ]
          }
        },
        {
          "id": "msg-042",
          "type": "response.output_item.done",
          "timestamp": "2024-10-04T11:00:25Z",
          "item": {
            "id": "msg-042",
            "type": "message",
            "role": "assistant",
            "status": "completed",
            "content": [
              {
                "type": "text",
                "text": "Yes! Your policy 1234567 covers routine eye exams. You have one covered exam per year with a $15 copay. The exam must be performed by a Kaiser Permanente optometrist or at a contracted vision center."
              }
            ]
          }
        },
        {
          "id": "msg-043",
          "type": "response.output_item.done",
          "timestamp": "2024-10-04T11:01:00Z",
          "item": {
            "id": "msg-043",
            "type": "message",
            "role": "user",
            "status": "completed",
            "content": [
              {
                "type": "input_text",
                "text": "Perfect, thank you! Do I need to schedule this through the app?"
              }
            ]
          }
        },
        {
          "id": "msg-044",
          "type": "response.output_item.done",
          "timestamp": "2024-10-04T11:01:20Z",
          "item": {
            "id": "msg-044",
            "type": "message",
            "role": "assistant",
            "status": "completed",
            "content": [
              {
                "type": "text",
                "text": "Yes, you can schedule your eye exam through the Kaiser Permanente app or by calling the Vision Services department. The app is usually the fastest way to find available appointments."
              }
            ]
          }
        }
      ],
      "todos": [],
      "subtasks": [],
      "messages": [],
      "metadata": {}
    }',
    NULL,
    NOW() - INTERVAL '7 days'
),

-- Task 4: Failed task (system error)
(
    '10000009-0009-0009-0009-000000000009',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '55555555-5555-5555-5555-555555555555', -- Support team
    'Lab work coverage',
    'Blood test coverage inquiry - agent timeout',
    'failed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000009-0009-0009-0009-000000000009',
    '{
      "events": [
        {
          "id": "msg-051",
          "type": "response.output_item.done",
          "timestamp": "2024-10-05T14:00:00Z",
          "item": {
            "id": "msg-051",
            "type": "message",
            "role": "user",
            "status": "completed",
            "content": [
              {
                "type": "input_text",
                "text": "I need to get blood work done. Is this covered under my policy 5678901?"
              }
            ]
          }
        },
        {
          "id": "msg-052",
          "type": "response.output_item.done",
          "timestamp": "2024-10-05T14:00:05Z",
          "item": {
            "id": "msg-052",
            "type": "message",
            "role": "assistant",
            "status": "failed",
            "content": [
              {
                "type": "text",
                "text": "Error: Request timeout while retrieving policy data. Please try again or contact Member Services at 1-800-XXX-XXXX for assistance."
              }
            ]
          }
        }
      ],
      "todos": [],
      "subtasks": [],
      "messages": [],
      "metadata": {}
    }',
    NULL,
    NOW() - INTERVAL '6 days'
),

-- Task 5: Successful task - Physical therapy coverage inquiry (good example)
(
    'a4cc0ca4-0827-43cd-85e9-eb125c7359f7',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '55555555-5555-5555-5555-555555555555', -- Support team
    'Physical therapy coverage - policy 0123456',
    'Customer asking about PT coverage - agent provides comprehensive policy details',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    'local-task_agent_a4cc0ca4-0827-43cd-85e9-eb125c7359f7',
    '{
      "events": [
        {
          "type": "response.output_item.done",
          "item": {
            "id": "msg_user_1d668b16-1a40-4aa3-916b-47dd1eb3c278",
            "type": "message",
            "role": "user",
            "status": "completed",
            "content": [
              {
                "type": "input_text",
                "text": "My policy number is 0123456, am I covered for physical therapy?"
              }
            ]
          }
        },
        {
          "item": {
            "id": "mcp_0577462a113957750068edbd4afd0c8190845b6d15cf72a22a",
            "arguments": "{\"integration_template\":\"kaiser_policy\",\"parameters\":{\"policy_number\":\"0123456\",\"request\":\"benefit_details\",\"benefit\":\"physical_therapy\"}}",
            "name": "generatemock",
            "server_label": "restack-core",
            "type": "mcp_call",
            "status": "completed",
            "output": "Policy data retrieved successfully for policy 0123456. Physical therapy coverage details available."
          },
          "type": "response.output_item.done"
        },
        {
          "item": {
            "id": "msg_0577462a113957750068edbd907fe0819097b476614892332e",
            "content": [
              {
                "type": "output_text",
                "text": "Here is what your policy shows for physical therapy (policy 0123456):\\n\\nCoverage summary\\n- Covered: Yes, in-network\\n- Copay: $15 per visit\\n- Annual visit limit: 20 visits per calendar year\\n- Visits used so far: 5 (about 15 remaining)\\n- Prior authorization: Not required for typical PT sessions\\n\\nNetwork and referrals\\n- Plan type: HMO (Kaiser Permanente network only, except emergencies or approved referrals)\\n- Referrals: Specialist visits generally require a PCP referral in HMO plans. To avoid delays, please get a referral/order from your Kaiser clinician before scheduling PT.\\n\\nCosts and accumulators\\n- Deductible (individual): $500; met to date: $250\\n- Out-of-pocket maximum (individual): $3,000; met to date: $1,200\\n- The policy lists a flat $15 copay for PT; no additional PT-specific deductible is noted. Your copays will count toward your out-of-pocket maximum.\\n\\nHelpful notes\\n- If you approach the 20-visit limit, additional visits may require review/authorization based on medical necessity.\\n- Out-of-network PT is not covered without prior authorization.\\n\\nNext steps\\n- If you do not already have one, request a PT referral from your Kaiser PCP.\\n- Schedule PT at a Kaiser facility or an in-network provider.\\n- Want me to check appointment options or confirm your remaining visits in real time? I can help with that."
              }
            ],
            "role": "assistant",
            "status": "completed",
            "type": "message"
          },
          "type": "response.output_item.done"
        }
      ],
      "todos": [],
      "subtasks": [],
      "messages": [],
      "metadata": {
        "temporal_agent_id": "local-task_agent_a4cc0ca4-0827-43cd-85e9-eb125c7359f7",
        "temporal_run_id": "0199e0ab-50dc-7c72-be00-efcc09d458f6",
        "response_count": 1,
        "message_count": 2
      }
    }',
    NULL,
    NOW() - INTERVAL '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- ==========================
-- Additional 20 Tasks for Healthcare Insurance Agent Demo
-- ==========================

-- Tasks 6-25: Varied healthcare insurance support scenarios
INSERT INTO tasks (id, workspace_id, team_id, title, description, status, agent_id, assigned_to_id, temporal_agent_id, agent_state, parent_task_id, created_at) VALUES
-- Task 6: Prescription coverage
('10000011-0011-0011-0011-000000000011', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Prescription drug coverage - policy 1111111', 'Question about prescription medication coverage and copays', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000011-0011-0011-0011-000000000011', '{"events": [{"id": "msg-111", "type": "response.output_item.done", "item": {"id": "msg-111", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "Policy 1111111 - What is my copay for prescription medications?"}]}}, {"id": "msg-112", "type": "response.output_item.done", "item": {"id": "msg-112", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Based on policy 1111111, your prescription copays are: Generic $10, Preferred brand $35, Non-preferred brand $60. 90-day supply through mail order available at 2x copay."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '8 days'),

-- Task 7: Specialist referral
('10000012-0012-0012-0012-000000000012', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Specialist referral - policy 2222222', 'Asking about seeing a cardiologist', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000012-0012-0012-0012-000000000012', '{"events": [{"id": "msg-121", "type": "response.output_item.done", "item": {"id": "msg-121", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "I need to see a cardiologist. My policy is 2222222."}]}}, {"id": "msg-122", "type": "response.output_item.done", "item": {"id": "msg-122", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 2222222 shows specialist visits are covered with a $40 copay. You need a referral from your PCP. I can help you schedule with your primary care doctor to get that referral."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '9 days'),

-- Task 8: Dental coverage
('10000013-0013-0013-0013-000000000013', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Dental coverage inquiry - policy 3333333', 'Question about dental cleaning coverage', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000013-0013-0013-0013-000000000013', '{"events": [{"id": "msg-131", "type": "response.output_item.done", "item": {"id": "msg-131", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "Does my plan cover dental cleanings? Policy 3333333."}]}}, {"id": "msg-132", "type": "response.output_item.done", "item": {"id": "msg-132", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 3333333 includes dental coverage. Preventive care (cleanings, exams) is covered twice per year with no copay. Schedule through Kaiser Dental Services."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '10 days'),

-- Task 9: Maternity coverage
('10000014-0014-0014-0014-000000000014', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Maternity coverage - policy 4444444', 'Prenatal care and delivery coverage', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000014-0014-0014-0014-000000000014', '{"events": [{"id": "msg-141", "type": "response.output_item.done", "item": {"id": "msg-141", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "Im pregnant. What maternity coverage do I have? Policy 4444444."}]}}, {"id": "msg-142", "type": "response.output_item.done", "item": {"id": "msg-142", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Congratulations! Policy 4444444 covers prenatal care, delivery, and postpartum care. Office visits have standard copays, hospital delivery has no additional charge after deductible is met."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '11 days'),

-- Task 10: Mental health coverage
('10000015-0015-0015-0015-000000000015', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Mental health services - policy 5555555', 'Therapy and counseling coverage', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000015-0015-0015-0015-000000000015', '{"events": [{"id": "msg-151", "type": "response.output_item.done", "item": {"id": "msg-151", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "I need to see a therapist. Policy 5555555 - whats covered?"}]}}, {"id": "msg-152", "type": "response.output_item.done", "item": {"id": "msg-152", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 5555555 covers mental health services. Individual therapy $25 copay per session, no visit limit. Both in-person and telehealth available through Kaiser mental health providers."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '12 days'),

-- Task 11: Surgery pre-authorization
('10000016-0016-0016-0016-000000000016', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Surgery authorization - policy 6666666', 'Knee surgery pre-authorization question', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000016-0016-0016-0016-000000000016', '{"events": [{"id": "msg-161", "type": "response.output_item.done", "item": {"id": "msg-161", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "My doctor recommended knee surgery. Do I need authorization? Policy 6666666."}]}}, {"id": "msg-162", "type": "response.output_item.done", "item": {"id": "msg-162", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 6666666 requires prior authorization for elective surgeries. Your surgeon will submit the request. Expect 5-7 business days for approval. Surgery is covered after meeting your deductible."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '13 days'),

-- Task 12: Urgent care copay
('10000017-0017-0017-0017-000000000017', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Urgent care visit - policy 7777777', 'Urgent care copay question', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000017-0017-0017-0017-000000000017', '{"events": [{"id": "msg-171", "type": "response.output_item.done", "item": {"id": "msg-171", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "Whats the copay for urgent care? Policy 7777777."}]}}, {"id": "msg-172", "type": "response.output_item.done", "item": {"id": "msg-172", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 7777777 urgent care copay is $50 per visit. Open 7 days/week. For life-threatening emergencies, go to ER or call 911."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '14 days'),

-- Task 13: Chiropractic coverage
('10000018-0018-0018-0018-000000000018', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Chiropractic care - policy 8888888', 'Back pain chiropractic coverage', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000018-0018-0018-0018-000000000018', '{"events": [{"id": "msg-181", "type": "response.output_item.done", "item": {"id": "msg-181", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "I have back pain. Is chiropractic care covered? Policy 8888888."}]}}, {"id": "msg-182", "type": "response.output_item.done", "item": {"id": "msg-182", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 8888888 covers chiropractic care. $20 copay per visit, up to 15 visits per year. Referral from PCP recommended but not required."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '15 days'),

-- Task 14: Home health care
('10000019-0019-0019-0019-000000000019', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Home health services - policy 9999999', 'Post-surgery home care coverage', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000019-0019-0019-0019-000000000019', '{"events": [{"id": "msg-191", "type": "response.output_item.done", "item": {"id": "msg-191", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "After surgery, can I get home health care? Policy 9999999."}]}}, {"id": "msg-192", "type": "response.output_item.done", "item": {"id": "msg-192", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 9999999 covers home health care when medically necessary. Requires physician order and prior authorization. No copay for covered home health services."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '16 days'),

-- Task 15: Diabetes management
('10000020-0020-0020-0020-000000000020', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Diabetes supplies - policy 1010101', 'Coverage for glucose monitors and test strips', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000020-0020-0020-0020-000000000020', '{"events": [{"id": "msg-201", "type": "response.output_item.done", "item": {"id": "msg-201", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "I have diabetes. Are glucose monitors covered? Policy 1010101."}]}}, {"id": "msg-202", "type": "response.output_item.done", "item": {"id": "msg-202", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 1010101 covers diabetes supplies. Glucose monitors, test strips, and lancets covered through Kaiser pharmacy. Copay depends on your prescription benefit tier."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '17 days'),

-- Task 16: Sleep study
('10000021-0021-0021-0021-000000000021', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Sleep study - policy 2020202', 'Sleep apnea diagnostic test coverage', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000021-0021-0021-0021-000000000021', '{"events": [{"id": "msg-211", "type": "response.output_item.done", "item": {"id": "msg-211", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "Doctor wants me to do a sleep study. Policy 2020202 - is it covered?"}]}}, {"id": "msg-212", "type": "response.output_item.done", "item": {"id": "msg-212", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 2020202 covers sleep studies when medically necessary. Requires physician referral and prior authorization. Both in-lab and home sleep tests available."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '18 days'),

-- Task 17: Allergy testing
('10000022-0022-0022-0022-000000000022', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Allergy testing - policy 3030303', 'Allergy test and immunotherapy coverage', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000022-0022-0022-0022-000000000022', '{"events": [{"id": "msg-221", "type": "response.output_item.done", "item": {"id": "msg-221", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "I need allergy testing. Covered under policy 3030303?"}]}}, {"id": "msg-222", "type": "response.output_item.done", "item": {"id": "msg-222", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 3030303 covers allergy testing and immunotherapy. Testing copay $40, allergy shots $15 per visit. Requires referral to allergist."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '19 days'),

-- Task 18: Hearing aids
('10000023-0023-0023-0023-000000000023', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Hearing aid coverage - policy 4040404', 'Question about hearing aid benefits', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000023-0023-0023-0023-000000000023', '{"events": [{"id": "msg-231", "type": "response.output_item.done", "item": {"id": "msg-231", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "Does my plan cover hearing aids? Policy 4040404."}]}}, {"id": "msg-232", "type": "response.output_item.done", "item": {"id": "msg-232", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 4040404 includes hearing aid coverage. Up to $2000 per aid every 3 years for members with diagnosed hearing loss. Audiologist evaluation required first."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '20 days'),

-- Task 19: Annual physical
('10000024-0024-0024-0024-000000000024', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Annual checkup - policy 5050505', 'Annual physical exam coverage', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000024-0024-0024-0024-000000000024', '{"events": [{"id": "msg-241", "type": "response.output_item.done", "item": {"id": "msg-241", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "Time for annual physical. Whats covered? Policy 5050505."}]}}, {"id": "msg-242", "type": "response.output_item.done", "item": {"id": "msg-242", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 5050505 covers preventive care including annual physicals at no cost. Age-appropriate screenings and vaccines also included. Schedule with your PCP."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '21 days'),

-- Task 20: Acupuncture
('10000025-0025-0025-0025-000000000025', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Acupuncture coverage - policy 6060606', 'Alternative medicine coverage inquiry', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000025-0025-0025-0025-000000000025', '{"events": [{"id": "msg-251", "type": "response.output_item.done", "item": {"id": "msg-251", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "Is acupuncture covered under policy 6060606?"}]}}, {"id": "msg-252", "type": "response.output_item.done", "item": {"id": "msg-252", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 6060606 covers acupuncture for chronic pain management. $25 copay per session, up to 12 visits per year. Must be performed by licensed Kaiser acupuncturist."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '22 days'),

-- Task 21: Colonoscopy screening
('10000026-0026-0026-0026-000000000026', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Colonoscopy screening - policy 7070707', 'Preventive screening coverage', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000026-0026-0026-0026-000000000026', '{"events": [{"id": "msg-261", "type": "response.output_item.done", "item": {"id": "msg-261", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "Im turning 50. Is colonoscopy covered? Policy 7070707."}]}}, {"id": "msg-262", "type": "response.output_item.done", "item": {"id": "msg-262", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 7070707 covers preventive colonoscopy screening at age 45-50 at no cost. If polyps found and removed, may have deductible/copay. Talk to your doctor about scheduling."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '23 days'),

-- Task 22: Ambulance service
('10000027-0027-0027-0027-000000000027', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Ambulance coverage - policy 8080808', 'Emergency transport coverage question', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000027-0027-0027-0027-000000000027', '{"events": [{"id": "msg-271", "type": "response.output_item.done", "item": {"id": "msg-271", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "What does ambulance service cost? Policy 8080808."}]}}, {"id": "msg-272", "type": "response.output_item.done", "item": {"id": "msg-272", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 8080808 covers emergency ambulance transport with $200 copay per trip. Non-emergency transport requires prior authorization. Always call 911 for true emergencies."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '24 days'),

-- Task 23: Durable medical equipment
('10000028-0028-0028-0028-000000000028', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Medical equipment - policy 9090909', 'Wheelchair and walker coverage', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000028-0028-0028-0028-000000000028', '{"events": [{"id": "msg-281", "type": "response.output_item.done", "item": {"id": "msg-281", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "I need a wheelchair. Is durable medical equipment covered? Policy 9090909."}]}}, {"id": "msg-282", "type": "response.output_item.done", "item": {"id": "msg-282", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 9090909 covers durable medical equipment (DME) when medically necessary. Wheelchairs, walkers, and other DME require physician order and prior authorization. 20% coinsurance applies."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '25 days'),

-- Task 24: Occupational therapy
('10000029-0029-0029-0029-000000000029', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Occupational therapy - policy 0101010', 'OT coverage after stroke', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000029-0029-0029-0029-000000000029', '{"events": [{"id": "msg-291", "type": "response.output_item.done", "item": {"id": "msg-291", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "After my stroke, I need OT. Covered under policy 0101010?"}]}}, {"id": "msg-292", "type": "response.output_item.done", "item": {"id": "msg-292", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 0101010 covers occupational therapy. $25 copay per visit, up to 30 visits per year when medically necessary. Your doctor will provide referral and treatment plan."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '26 days'),

-- Task 25: Telehealth consultation
('10000030-0030-0030-0030-000000000030', 'c926e979-1f16-46bf-a7cc-8aab70162d65', '55555555-5555-5555-5555-555555555555', 'Telehealth visit - policy 1212121', 'Virtual doctor visit coverage', 'completed', 'cccccccc-dddd-eeee-ffff-333333333333', '29fcdd0a-708e-478a-8030-34b02ad9ef84', '40000030-0030-0030-0030-000000000030', '{"events": [{"id": "msg-301", "type": "response.output_item.done", "item": {"id": "msg-301", "type": "message", "role": "user", "content": [{"type": "input_text", "text": "Can I do a video visit with my doctor? Policy 1212121."}]}}, {"id": "msg-302", "type": "response.output_item.done", "item": {"id": "msg-302", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "Policy 1212121 covers telehealth visits. Same copay as in-person visits ($20 PCP, $40 specialist). Use Kaiser app or website to schedule video appointments with your providers."}]}}], "todos": [], "subtasks": [], "messages": [], "metadata": {}}', NULL, NOW() - INTERVAL '27 days')
ON CONFLICT (id) DO NOTHING;


-- ==========================
-- Improved Agent Version - Published after identifying the issue
-- ==========================

-- Create improved version of healthcare insurance agent with policy validation
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort, parent_agent_id, created_at)
VALUES (
    'cccccccc-dddd-eeee-ffff-444444444444',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '55555555-5555-5555-5555-555555555555', -- Support team
    'support-healthinsurance',
    'Healthcare insurance support agent with policy validation - verifies policy is active before providing coverage details',
    $$You are a healthcare insurance support specialist for Kaiser Permanente.

## Objective
Help members understand their coverage by retrieving and validating their policy data before providing coverage information.

## Available Tools
- **generatemock**: Query Kaiser Permanente policy data using the `kaiser_policy` template
- **updatetodos**: Track your verification steps for transparency

## Critical Improvements
1. **Always query policy numbers** when provided
2. **Verify policy status** - check if policy is active, expired, or terminated
3. **Track your work** - use updatetodos to show verification steps

## Instructions
When a member asks about coverage:

1. **Create Todo Checklist** using updatetodos:
   - Retrieve policy data
   - Verify policy status
   - Check coverage details
   - Provide answer

2. **Get Policy Data**: Use generatemock with kaiser_policy template and policy number

3. **Validate Policy Status**: Check the policy data for:
   - Status field (active, expired, terminated)
   - Effective dates
   - Coverage end date
   
4. **Handle Invalid Policies**:
   - If expired/terminated: Inform member their policy is not active and suggest contacting Member Services to renew or update
   - Never provide coverage details for inactive policies

5. **Provide Coverage Details**: Only if policy is active, explain copays, limits, and requirements from their specific policy

## Communication Guidelines
- Use friendly, empathetic language
- Always validate policy status before answering coverage questions
- If policy is inactive, clearly explain the situation and next steps
- Update todos as you complete each verification step

Your goal is to provide accurate, validated coverage information.$$,
    'interactive',
    'published',
    'gpt-5',
    'medium',
    'cccccccc-dddd-eeee-ffff-333333333333',
    NOW() - INTERVAL '3 days'
)
ON CONFLICT (id) DO NOTHING;

-- Copy tools from parent agent to new version and add updatetodos
INSERT INTO agent_tools (id, agent_id, tool_type, mcp_server_id, tool_name, custom_description, require_approval, enabled)
SELECT 
    'a0000026-0026-0026-0026-000000000026',
    'cccccccc-dddd-eeee-ffff-444444444444',
    tool_type,
    mcp_server_id,
    tool_name,
    custom_description,
    require_approval,
    enabled
FROM agent_tools
WHERE agent_id = 'cccccccc-dddd-eeee-ffff-333333333333'
ON CONFLICT (id) DO NOTHING;

-- Add updatetodos tool to improved version for tracking verification steps
INSERT INTO agent_tools (id, agent_id, tool_type, mcp_server_id, tool_name, custom_description, require_approval, enabled) VALUES
('a0000027-0027-0027-0027-000000000027', 'cccccccc-dddd-eeee-ffff-444444444444', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'updatetodos', 'Track policy verification steps: retrieve policy, validate status, check coverage, provide answer', FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Task demonstrating improved version successfully validating policy status
INSERT INTO tasks (id, workspace_id, team_id, title, description, status, agent_id, assigned_to_id, temporal_agent_id, agent_state, parent_task_id, created_at) VALUES
(
    '10000010-0010-0010-0010-000000000010',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '55555555-5555-5555-5555-555555555555', -- Support team
    'MRI coverage inquiry - policy 0456789 (support-healthinsurance)',
    'Customer asking about MRI coverage - improved agent validates policy status first',
    'completed',
    'cccccccc-dddd-eeee-ffff-444444444444',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    'local-task_agent_10000010-0010-0010-0010-000000000010',
    '{
      "task_id": "10000010-0010-0010-0010-000000000010",
      "workspace_id": "c926e979-1f16-46bf-a7cc-8aab70162d65",
      "temporal_agent_id": "local-task_agent_10000010-0010-0010-0010-000000000010",
      "temporal_run_id": "0199e0ab-55e0-738d-ba15-e14c9450beef",
      "initialized": true,
      "todos": [
        {
          "id": "todo1",
          "content": "Retrieve policy data",
          "status": "completed"
        },
        {
          "id": "todo2",
          "content": "Verify policy status",
          "status": "completed"
        },
        {
          "id": "todo3",
          "content": "Check coverage details",
          "status": "completed"
        },
        {
          "id": "todo4",
          "content": "Provide answer",
          "status": "completed"
        }
      ],
      "events": [
        {
          "type": "response.output_item.done",
          "item": {
            "id": "msg_user_001",
            "role": "user",
            "type": "message",
            "status": "completed",
            "content": [
              {
                "type": "input_text",
                "text": "Hi, my policy number is 0456789. I need to get an MRI - is that covered?"
              }
            ]
          }
        },
        {
          "type": "response.created",
          "response": {
            "id": "resp_001",
            "status": "in_progress",
            "model": "gpt-5",
            "tools": [
              {
                "type": "mcp",
                "server_label": "restack-core",
                "allowed_tools": ["generatemock", "updatetodos"]
              }
            ]
          }
        },
        {
          "type": "response.output_item.added",
          "item": {
            "id": "mcp_list_001",
            "type": "mcp_list_tools",
            "server_label": "restack-core"
          },
          "output_index": 0
        },
        {
          "type": "response.output_item.done",
          "item": {
            "id": "mcp_list_001",
            "type": "mcp_list_tools",
            "tools": [
              {
                "name": "generatemock",
                "description": "Generate mock data for any integration"
              },
              {
                "name": "updatetodos",
                "description": "Track multi-step task progress"
              }
            ],
            "server_label": "restack-core"
          },
          "output_index": 0
        },
        {
          "type": "response.output_item.added",
          "item": {
            "id": "mcp_updatetodos_001",
            "name": "updatetodos",
            "type": "mcp_call",
            "status": "in_progress",
            "server_label": "restack-core"
          },
          "output_index": 1
        },
        {
          "type": "response.mcp_call_arguments.done",
          "item_id": "mcp_updatetodos_001",
          "arguments": "{\"temporal_agent_id\":\"local-task_agent_10000010-0010-0010-0010-000000000010\",\"temporal_run_id\":\"0199e0ab-55e0-738d-ba15-e14c9450beef\",\"todos\":[{\"id\":\"todo1\",\"content\":\"Retrieve policy data\",\"status\":\"pending\"},{\"id\":\"todo2\",\"content\":\"Verify policy status\",\"status\":\"pending\"},{\"id\":\"todo3\",\"content\":\"Check coverage details\",\"status\":\"pending\"},{\"id\":\"todo4\",\"content\":\"Provide answer\",\"status\":\"pending\"}]}",
          "output_index": 1
        },
        {
          "type": "response.mcp_call.completed",
          "item_id": "mcp_updatetodos_001",
          "output_index": 1
        },
        {
          "type": "response.output_item.done",
          "item": {
            "id": "mcp_updatetodos_001",
            "name": "updatetodos",
            "type": "mcp_call",
            "status": "completed",
            "output": "Workflow UpdateTodos completed successfully. Result: {\"message\":\"Todos updated: 0/4 completed, 0 in progress\",\"success\":true}",
            "arguments": "{\"temporal_agent_id\":\"local-task_agent_10000010-0010-0010-0010-000000000010\",\"temporal_run_id\":\"0199e0ab-55e0-738d-ba15-e14c9450beef\",\"todos\":[{\"id\":\"todo1\",\"content\":\"Retrieve policy data\",\"status\":\"pending\"},{\"id\":\"todo2\",\"content\":\"Verify policy status\",\"status\":\"pending\"},{\"id\":\"todo3\",\"content\":\"Check coverage details\",\"status\":\"pending\"},{\"id\":\"todo4\",\"content\":\"Provide answer\",\"status\":\"pending\"}]}",
            "server_label": "restack-core"
          },
          "output_index": 1
        },
        {
          "type": "response.output_item.added",
          "item": {
            "id": "mcp_generatemock_001",
            "name": "generatemock",
            "type": "mcp_call",
            "status": "in_progress",
            "server_label": "restack-core"
          },
          "output_index": 2
        },
        {
          "type": "response.mcp_call_arguments.done",
          "item_id": "mcp_generatemock_001",
          "arguments": "{\"integration_template\":\"kaiser_policy\",\"parameters\":{\"policy_number\":\"0456789\"}}",
          "output_index": 2
        },
        {
          "type": "response.mcp_call.completed",
          "item_id": "mcp_generatemock_001",
          "output_index": 2
        },
        {
          "type": "response.output_item.done",
          "item": {
            "id": "mcp_generatemock_001",
            "name": "generatemock",
            "type": "mcp_call",
            "status": "completed",
            "output": "Workflow GenerateMock completed successfully. Result: {\"integration_type\":\"kaiser_policy\",\"response\":{\"policy\":{\"policy_number\":\"0456789\",\"status\":\"Expired\",\"effective_date\":\"2023-08-15\",\"renewal_date\":\"2024-08-15\",\"member\":{\"first_name\":\"Sarah\",\"last_name\":\"Johnson\"},\"coverage\":{\"benefits\":{\"imaging\":{\"mri\":{\"copay\":350,\"covered\":true,\"prior_authorization_required\":true}}}}}}}",
            "arguments": "{\"integration_template\":\"kaiser_policy\",\"parameters\":{\"policy_number\":\"0456789\"}}",
            "server_label": "restack-core"
          },
          "output_index": 2
        },
        {
          "type": "response.output_item.added",
          "item": {
            "id": "mcp_updatetodos_002",
            "name": "updatetodos",
            "type": "mcp_call",
            "status": "in_progress",
            "server_label": "restack-core"
          },
          "output_index": 3
        },
        {
          "type": "response.mcp_call_arguments.done",
          "item_id": "mcp_updatetodos_002",
          "arguments": "{\"temporal_agent_id\":\"local-task_agent_10000010-0010-0010-0010-000000000010\",\"temporal_run_id\":\"0199e0ab-55e0-738d-ba15-e14c9450beef\",\"todos\":[{\"id\":\"todo1\",\"content\":\"Retrieve policy data\",\"status\":\"completed\"},{\"id\":\"todo2\",\"content\":\"Verify policy status\",\"status\":\"in_progress\"},{\"id\":\"todo3\",\"content\":\"Check coverage details\",\"status\":\"pending\"},{\"id\":\"todo4\",\"content\":\"Provide answer\",\"status\":\"pending\"}]}",
          "output_index": 3
        },
        {
          "type": "response.mcp_call.completed",
          "item_id": "mcp_updatetodos_002",
          "output_index": 3
        },
        {
          "type": "response.output_item.done",
          "item": {
            "id": "mcp_updatetodos_002",
            "name": "updatetodos",
            "type": "mcp_call",
            "status": "completed",
            "output": "Workflow UpdateTodos completed successfully. Result: {\"message\":\"Todos updated: 1/4 completed, 1 in progress\",\"success\":true}",
            "arguments": "{\"temporal_agent_id\":\"local-task_agent_10000010-0010-0010-0010-000000000010\",\"temporal_run_id\":\"0199e0ab-55e0-738d-ba15-e14c9450beef\",\"todos\":[{\"id\":\"todo1\",\"content\":\"Retrieve policy data\",\"status\":\"completed\"},{\"id\":\"todo2\",\"content\":\"Verify policy status\",\"status\":\"in_progress\"},{\"id\":\"todo3\",\"content\":\"Check coverage details\",\"status\":\"pending\"},{\"id\":\"todo4\",\"content\":\"Provide answer\",\"status\":\"pending\"}]}",
            "server_label": "restack-core"
          },
          "output_index": 3
        },
        {
          "type": "response.output_item.added",
          "item": {
            "id": "mcp_updatetodos_003",
            "name": "updatetodos",
            "type": "mcp_call",
            "status": "in_progress",
            "server_label": "restack-core"
          },
          "output_index": 4
        },
        {
          "type": "response.mcp_call_arguments.done",
          "item_id": "mcp_updatetodos_003",
          "arguments": "{\"temporal_agent_id\":\"local-task_agent_10000010-0010-0010-0010-000000000010\",\"temporal_run_id\":\"0199e0ab-55e0-738d-ba15-e14c9450beef\",\"todos\":[{\"id\":\"todo1\",\"content\":\"Retrieve policy data\",\"status\":\"completed\"},{\"id\":\"todo2\",\"content\":\"Verify policy status\",\"status\":\"completed\"},{\"id\":\"todo3\",\"content\":\"Check coverage details\",\"status\":\"completed\"},{\"id\":\"todo4\",\"content\":\"Provide answer\",\"status\":\"in_progress\"}]}",
          "output_index": 4
        },
        {
          "type": "response.mcp_call.completed",
          "item_id": "mcp_updatetodos_003",
          "output_index": 4
        },
        {
          "type": "response.output_item.done",
          "item": {
            "id": "mcp_updatetodos_003",
            "name": "updatetodos",
            "type": "mcp_call",
            "status": "completed",
            "output": "Workflow UpdateTodos completed successfully. Result: {\"message\":\"Todos updated: 2/4 completed, 1 in progress\",\"success\":true}",
            "arguments": "{\"temporal_agent_id\":\"local-task_agent_10000010-0010-0010-0010-000000000010\",\"temporal_run_id\":\"0199e0ab-55e0-738d-ba15-e14c9450beef\",\"todos\":[{\"id\":\"todo1\",\"content\":\"Retrieve policy data\",\"status\":\"completed\"},{\"id\":\"todo2\",\"content\":\"Verify policy status\",\"status\":\"completed\"},{\"id\":\"todo3\",\"content\":\"Check coverage details\",\"status\":\"completed\"},{\"id\":\"todo4\",\"content\":\"Provide answer\",\"status\":\"in_progress\"}]}",
            "server_label": "restack-core"
          },
          "output_index": 4
        },
        {
          "type": "response.output_item.added",
          "item": {
            "id": "mcp_updatetodos_004",
            "name": "updatetodos",
            "type": "mcp_call",
            "status": "in_progress",
            "server_label": "restack-core"
          },
          "output_index": 5
        },
        {
          "type": "response.mcp_call_arguments.done",
          "item_id": "mcp_updatetodos_004",
          "arguments": "{\"temporal_agent_id\":\"local-task_agent_10000010-0010-0010-0010-000000000010\",\"temporal_run_id\":\"0199e0ab-55e0-738d-ba15-e14c9450beef\",\"todos\":[{\"id\":\"todo1\",\"content\":\"Retrieve policy data\",\"status\":\"completed\"},{\"id\":\"todo2\",\"content\":\"Verify policy status\",\"status\":\"completed\"},{\"id\":\"todo3\",\"content\":\"Check coverage details\",\"status\":\"completed\"},{\"id\":\"todo4\",\"content\":\"Provide answer\",\"status\":\"completed\"}]}",
          "output_index": 5
        },
        {
          "type": "response.mcp_call.completed",
          "item_id": "mcp_updatetodos_004",
          "output_index": 5
        },
        {
          "type": "response.output_item.done",
          "item": {
            "id": "mcp_updatetodos_004",
            "name": "updatetodos",
            "type": "mcp_call",
            "status": "completed",
            "output": "Workflow UpdateTodos completed successfully. Result: {\"message\":\"Todos updated: 4/4 completed, 0 in progress\",\"success\":true}",
            "arguments": "{\"temporal_agent_id\":\"local-task_agent_10000010-0010-0010-0010-000000000010\",\"temporal_run_id\":\"0199e0ab-55e0-738d-ba15-e14c9450beef\",\"todos\":[{\"id\":\"todo1\",\"content\":\"Retrieve policy data\",\"status\":\"completed\"},{\"id\":\"todo2\",\"content\":\"Verify policy status\",\"status\":\"completed\"},{\"id\":\"todo3\",\"content\":\"Check coverage details\",\"status\":\"completed\"},{\"id\":\"todo4\",\"content\":\"Provide answer\",\"status\":\"completed\"}]}",
            "server_label": "restack-core"
          },
          "output_index": 5
        },
        {
          "type": "response.output_item.added",
          "item": {
            "id": "msg_assistant_001",
            "role": "assistant",
            "type": "message",
            "status": "in_progress",
            "content": []
          },
          "output_index": 6
        },
        {
          "type": "response.content_part.added",
          "item": {
            "id": "msg_assistant_001",
            "type": "message",
            "content": [
              {
                "type": "output_text",
                "text": ""
              }
            ]
          },
          "output_index": 6
        },
        {
          "type": "response.output_text.done",
          "item_id": "msg_assistant_001",
          "text": "I need to inform you that your policy 0456789 is currently showing as **Expired** (ended on August 15, 2024). This means you would not have coverage for the MRI at this time.\n\n## Next Steps\nI recommend contacting Member Services at 1-800-XXX-XXXX to:\n- Verify your current coverage status\n- Renew your policy if needed\n- Discuss your options for getting coverage reinstated\n\n## About MRI Coverage\nOnce your policy is active, MRI scans:\n- **Copay**: $350\n- **Prior Authorization**: Required\n- **Coverage**: Yes, when policy is active and authorization obtained\n\nPlease get your policy renewed first before scheduling the MRI.",
          "output_index": 6
        },
        {
          "type": "response.output_item.done",
          "item": {
            "id": "msg_assistant_001",
            "role": "assistant",
            "type": "message",
            "status": "completed",
            "content": [
              {
                "type": "output_text",
                "text": "I need to inform you that your policy 0456789 is currently showing as **Expired** (ended on August 15, 2024). This means you would not have coverage for the MRI at this time.\n\n## Next Steps\nI recommend contacting Member Services at 1-800-XXX-XXXX to:\n- Verify your current coverage status\n- Renew your policy if needed\n- Discuss your options for getting coverage reinstated\n\n## About MRI Coverage\nOnce your policy is active, MRI scans:\n- **Copay**: $350\n- **Prior Authorization**: Required\n- **Coverage**: Yes, when policy is active and authorization obtained\n\nPlease get your policy renewed first before scheduling the MRI."
              }
            ]
          },
          "output_index": 6
        },
        {
          "type": "response.completed",
          "response": {
            "id": "resp_001",
            "status": "completed",
            "usage": {
              "input_tokens": 3856,
              "output_tokens": 1842,
              "total_tokens": 5698
            }
          }
        }
      ],
      "subtasks": [],
      "messages": [
        {
          "role": "developer",
          "content": "You are a healthcare insurance support specialist for Kaiser Permanente.\n\n## Objective\nHelp members understand their coverage by retrieving and validating their policy data before providing coverage information.\n\n## Available Tools\n- **generatemock**: Query Kaiser Permanente policy data using the `kaiser_policy` template\n- **updatetodos**: Track your verification steps for transparency\n\n## Critical Improvements\n1. **Always query policy numbers** when provided\n2. **Verify policy status** - check if policy is active, expired, or terminated\n3. **Track your work** - use updatetodos to show verification steps\n\n## Instructions\nWhen a member asks about coverage:\n\n1. **Create Todo Checklist** using updatetodos:\n   - Retrieve policy data\n   - Verify policy status\n   - Check coverage details\n   - Provide answer\n\n2. **Get Policy Data**: Use generatemock with kaiser_policy template and policy number\n\n3. **Validate Policy Status**: Check the policy data for:\n   - Status field (active, expired, terminated)\n   - Effective dates\n   - Coverage end date\n   \n4. **Handle Invalid Policies**:\n   - If expired/terminated: Inform member their policy is not active and suggest contacting Member Services to renew or update\n   - Never provide coverage details for inactive policies\n\n5. **Provide Coverage Details**: Only if policy is active, explain copays, limits, and requirements from their specific policy\n\n## Communication Guidelines\n- Use friendly, empathetic language\n- Always validate policy status before answering coverage questions\n- If policy is inactive, clearly explain the situation and next steps\n- Update todos as you complete each verification step\n\nYour goal is to provide accurate, validated coverage information."
        },
        {
          "role": "user",
          "content": "Hi, my policy number is 0456789. I need to get an MRI - is that covered?"
        }
      ],
      "metadata": {
        "message_count": 2,
        "response_count": 1,
        "temporal_run_id": "0199e0ab-55e0-738d-ba15-e14c9450beef",
        "temporal_agent_id": "local-task_agent_10000010-0010-0010-0010-000000000010"
      },
      "last_response_id": "resp_001"
    }',
    NULL,
    NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO NOTHING;


-- ==========================
-- CUSTOM QUALITY METRIC: Policy Status Validation
-- ==========================

-- Create a custom LLM-as-judge metric to detect if agent validates policy status
INSERT INTO metric_definitions (
    id,
    workspace_id,
    name,
    description,
    category,
    metric_type,
    config,
    is_active,
    created_at
) VALUES (
    'bbbbbbbb-1111-2222-3333-444444444444',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    'Policy Status Validation',
    'Verifies that the agent validates whether a policy is active/expired before providing coverage details',
    'quality',
    'llm_judge',
    '{"judge_prompt": "You are evaluating a healthcare insurance support agent conversation.\n\nTask: Determine if the agent properly validated the policy status (active vs expired) before providing coverage information.\n\nEvaluation Criteria:\n1. Check if the customer provided a policy number\n2. Verify the agent queried the policy data\n3. Determine if the agent checked and communicated the policy status (active, expired, terminated) before providing coverage details\n4. The agent should NOT give coverage details if a policy is expired/terminated\n\nPass if:\n- Agent validated policy status and only provided coverage if policy is active\n- Agent caught an expired policy and informed customer to renew\n- Customer did NOT provide a policy number (N/A case)\n\nFail if:\n- Agent provided coverage details for an expired/terminated policy\n- Agent gave coverage information without checking policy status\n- Customer later discovered policy was expired despite agent saying they were covered\n\nProvide:\n- pass: true/false\n- score: 0-100 (0 if failed, 100 if passed)\n- reasoning: Brief explanation of your evaluation", "judge_model": "gpt-5-nano"}',
    true,
    NOW() - INTERVAL '5 days'
) ON CONFLICT (id) DO NOTHING;

-- Associate the Policy Status Validation metric with the healthcare support agent
INSERT INTO metric_agents (id, metric_definition_id, parent_agent_id) VALUES
('bbbbbbbb-1111-2222-3333-555555555555', 'bbbbbbbb-1111-2222-3333-444444444444', 'cccccccc-dddd-eeee-ffff-333333333333')
ON CONFLICT (metric_definition_id, parent_agent_id) DO NOTHING;

-- ===================================
-- Metrics System
-- ===================================
-- Note: No default metrics are seeded
-- Users create custom quality metrics through the UI
-- The only seeded metric is the custom "Policy Status Validation" metric created above for demo purposes
