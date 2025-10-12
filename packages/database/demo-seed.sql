-- Demo seed data for feature demonstration
-- This file seeds data for two demo scenarios:
-- 1. Healthcare Insurance Support Agent with policy query failures
-- 2. Newsletter Agent with outdated content due to missing timestamp filter

-- ==========================
-- SCENARIO 1: Healthcare Insurance Support Agent
-- ==========================

-- Healthcare agent already exists in agents-seed.sql with ID: cccccccc-dddd-eeee-ffff-333333333333

-- Insert failed tasks with thumbs down feedback
-- Pattern: Agent is NOT querying the policy database when policy numbers are provided

-- Task 1: Failed - Policy coverage question without proper query
INSERT INTO tasks (id, workspace_id, team_id, title, description, status, agent_id, assigned_to_id, temporal_agent_id, messages, created_at) VALUES
(
    '10000001-0001-0001-0001-000000000001',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Policy coverage question - Physical therapy',
    'Customer asking about physical therapy coverage with policy number provided',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000001-0001-0001-0001-000000000001',
    '[
      {
        "id": "msg-001",
        "type": "user",
        "content": "My policy number is 0123456. Am I covered for physical therapy?",
        "timestamp": "2024-10-09T10:30:00Z"
      },
      {
        "id": "msg-002",
        "type": "assistant",
        "content": "Yes, physical therapy is typically covered under most Kaiser Permanente plans. You should have coverage for up to 30 sessions per year with a copay of around $25 per session.",
        "timestamp": "2024-10-09T10:30:15Z"
      }
    ]',
    NOW() - INTERVAL '2 days'
),

-- Task 2: Failed - MRI coverage without checking actual policy  
(
    '10000002-0002-0002-0002-000000000002',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'MRI coverage inquiry',
    'Customer asking about MRI coverage',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000002-0002-0002-0002-000000000002',
    '[
      {
        "id": "msg-011",
        "type": "user",
        "content": "I have policy 0234567. Do I need pre-authorization for an MRI?",
        "timestamp": "2024-10-09T14:15:00Z"
      },
      {
        "id": "msg-012",
        "type": "assistant",
        "content": "For most diagnostic imaging like MRIs, pre-authorization is typically required. Your doctor will need to submit the request through our authorization system.",
        "timestamp": "2024-10-09T14:15:20Z"
      }
    ]',
    NOW() - INTERVAL '2 days'
),

-- Task 3: THE KEY FAILED TASK - Wrong answer about coverage
(
    '10000003-0003-0003-0003-000000000003',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Specialist visit coverage - cardiology',
    'Customer asking about specialist coverage with clear complaint',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000003-0003-0003-0003-000000000003',
    '[
      {
        "id": "msg-021",
        "type": "user",
        "content": "My policy number is 0345678. Am I covered for a cardiology specialist visit?",
        "timestamp": "2024-10-08T09:00:00Z"
      },
      {
        "id": "msg-022",
        "type": "assistant",
        "content": "Yes! Under your Kaiser Permanente plan, specialist visits including cardiology are covered. You will have a specialist copay which is typically $40-50 per visit. No referral is needed.",
        "timestamp": "2024-10-08T09:00:25Z"
      },
      {
        "id": "msg-023",
        "type": "user_feedback",
        "content": "👎 Bad - I was at the doctor and learned that actually I am not covered. My plan requires a referral and has different copays. This information was completely wrong!",
        "timestamp": "2024-10-08T15:30:00Z",
        "feedback": {
          "rating": "negative",
          "reason": "incorrect_information",
          "details": "Agent provided wrong coverage information without checking actual policy"
        }
      }
    ]',
    NOW() - INTERVAL '3 days'
),

-- Task 4: Failed - Prescription coverage
(
    '10000004-0004-0004-0004-000000000004',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Prescription drug coverage tiers',
    'Question about prescription drug tiers',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000004-0004-0004-0004-000000000004',
    '[
      {
        "id": "msg-031",
        "type": "user",
        "content": "Policy 0456789 - What tier is my Lipitor prescription?",
        "timestamp": "2024-10-07T11:20:00Z"
      },
      {
        "id": "msg-032",
        "type": "assistant",
        "content": "Lipitor (atorvastatin) is generally a Tier 2 preferred brand medication with a copay around $35. However, the generic version is available as Tier 1 for lower cost.",
        "timestamp": "2024-10-07T11:20:18Z"
      }
    ]',
    NOW() - INTERVAL '4 days'
),

-- Task 5: Failed - Surgery coverage
(
    '10000005-0005-0005-0005-000000000005',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Knee surgery coverage question',
    'Coverage for elective knee surgery',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000005-0005-0005-0005-000000000005',
    '[
      {
        "id": "msg-041",
        "type": "user",
        "content": "I have policy number 0567890. Is my upcoming knee surgery covered?",
        "timestamp": "2024-10-06T13:45:00Z"
      },
      {
        "id": "msg-042",
        "type": "assistant",
        "content": "Medically necessary knee surgery is typically covered under Kaiser Permanente plans. You will be responsible for your deductible and any coinsurance. Pre-authorization from your surgeon is required.",
        "timestamp": "2024-10-06T13:45:30Z"
      }
    ]',
    NOW() - INTERVAL '5 days'
),

-- Task 6: Another failed task with negative feedback
(
    '10000006-0006-0006-0006-000000000006',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Emergency room visit coverage',
    'Question about ER copay and coverage',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000006-0006-0006-0006-000000000006',
    '[
      {
        "id": "msg-051",
        "type": "user",
        "content": "Policy 0678901 - What is my ER copay?",
        "timestamp": "2024-10-05T16:00:00Z"
      },
      {
        "id": "msg-052",
        "type": "assistant",
        "content": "Emergency room visits typically have a copay of $100-150 per visit. This is waived if you are admitted to the hospital.",
        "timestamp": "2024-10-05T16:00:22Z"
      },
      {
        "id": "msg-053",
        "type": "user_feedback",
        "content": "👎 Not helpful - My actual copay is $250. The agent should have looked up my specific policy!",
        "timestamp": "2024-10-05T18:30:00Z",
        "feedback": {
          "rating": "negative",
          "reason": "generic_answer",
          "details": "Provided generic information instead of policy-specific details"
        }
      }
    ]',
    NOW() - INTERVAL '6 days'
),

-- Additional tasks to show volume and success rate variation over time
-- Day 7: Low volume, mixed results (2 tasks)
(
    '10000007-0007-0007-0007-000000000007',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Vision coverage inquiry',
    'Asking about eye exam coverage',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000007-0007-0007-0007-000000000007',
    '[]',
    NOW() - INTERVAL '7 days'
),
(
    '10000008-0008-0008-0008-000000000008',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Mental health coverage',
    'Therapy session coverage question',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000008-0008-0008-0008-000000000008',
    '[]',
    NOW() - INTERVAL '7 days'
),

-- Day 6: Higher volume (5 tasks, 2 failed, 3 completed)
(
    '10000009-0009-0009-0009-000000000009',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Lab work coverage',
    'Blood test coverage inquiry - agent timeout',
    'failed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000009-0009-0009-0009-000000000009',
    '[]',
    NOW() - INTERVAL '6 days'
),
(
    '10000010-0010-0010-0010-000000000010',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Imaging coverage - X-ray',
    'X-ray coverage question',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000010-0010-0010-0010-000000000010',
    '[]',
    NOW() - INTERVAL '6 days'
),
(
    '10000011-0011-0011-0011-000000000011',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Urgent care copay',
    'Urgent care visit cost',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000011-0011-0011-0011-000000000011',
    '[]',
    NOW() - INTERVAL '6 days'
),
(
    '10000023-0023-0023-0023-000000000023',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Dental cleaning inquiry',
    'Dental coverage - agent error',
    'failed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    NULL,
    '[]',
    NOW() - INTERVAL '6 days'
),
(
    '10000024-0024-0024-0024-000000000024',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Eye exam coverage',
    'Vision coverage question',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000024-0024-0024-0024-000000000024',
    '[]',
    NOW() - INTERVAL '6 days'
),

-- Day 5: Peak volume (7 tasks, 2 failed, 5 completed)
(
    '10000012-0012-0012-0012-000000000012',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Allergy testing coverage',
    'Coverage for allergy tests - system error',
    'failed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    NULL,
    '[]',
    NOW() - INTERVAL '5 days'
),
(
    '10000013-0013-0013-0013-000000000013',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Maternity coverage',
    'Prenatal care coverage',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000013-0013-0013-0013-000000000013',
    '[]',
    NOW() - INTERVAL '5 days'
),
(
    '10000014-0014-0014-0014-000000000014',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Diabetic supplies coverage',
    'Coverage for glucose monitor',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000014-0014-0014-0014-000000000014',
    '[]',
    NOW() - INTERVAL '5 days'
),
(
    '10000015-0015-0015-0015-000000000015',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Sleep study coverage',
    'Coverage for sleep apnea test',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000015-0015-0015-0015-000000000015',
    '[]',
    NOW() - INTERVAL '5 days'
),
(
    '10000016-0016-0016-0016-000000000016',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Orthopedic surgery',
    'Shoulder surgery coverage - connection failed',
    'failed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    NULL,
    '[]',
    NOW() - INTERVAL '5 days'
),
(
    '10000017-0017-0017-0017-000000000017',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Dermatology coverage',
    'Skin screening coverage',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000017-0017-0017-0017-000000000017',
    '[]',
    NOW() - INTERVAL '5 days'
),
(
    '10000018-0018-0018-0018-000000000018',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Immunization coverage',
    'Flu shot coverage',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000018-0018-0018-0018-000000000018',
    '[]',
    NOW() - INTERVAL '5 days'
),

-- Day 4: Medium volume (4 tasks, 1 failed, 3 completed)
(
    '10000019-0019-0019-0019-000000000019',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Hearing aid coverage',
    'Coverage for hearing devices - agent crashed',
    'failed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    NULL,
    '[]',
    NOW() - INTERVAL '4 days'
),
(
    '10000020-0020-0020-0020-000000000020',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Cancer screening',
    'Mammogram coverage',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000020-0020-0020-0020-000000000020',
    '[]',
    NOW() - INTERVAL '4 days'
),
(
    '10000021-0021-0021-0021-000000000021',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Ambulance coverage',
    'Emergency transport coverage',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000021-0021-0021-0021-000000000021',
    '[]',
    NOW() - INTERVAL '4 days'
),
(
    '10000022-0022-0022-0022-000000000022',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'Home health care',
    'In-home nursing coverage',
    'completed',
    'cccccccc-dddd-eeee-ffff-333333333333',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '40000022-0022-0022-0022-000000000022',
    '[]',
    NOW() - INTERVAL '4 days'
)
ON CONFLICT (id) DO NOTHING;


-- ==========================
-- Improved Agent Version - Published after identifying the issue
-- ==========================

-- Create improved version of healthcare insurance agent with better policy query behavior
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort, parent_agent_id, created_at)
VALUES (
    'cccccccc-dddd-eeee-ffff-444444444444',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '11111111-1111-1111-1111-111111111111',
    'support-healthinsurance',
    'Healthcare insurance support agent with improved policy lookup - always queries member-specific policy data when policy number is provided',
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

## CRITICAL IMPROVEMENT - Your Approach
When a member asks about their coverage:

1. **ALWAYS Extract Policy Number First**:
   - Look for policy numbers in the format: digits like 0123456, 0234567, etc.
   - If mentioned, YOU MUST query it before answering

2. **ALWAYS Use generatemock When Policy Number Provided**:
   - Use generatemock with kaiser_policy template
   - Include their policy number and specific query in parameters
   - Base your answer ONLY on the returned policy data

3. **Provide Clear, Specific Answers**:
   - Explain coverage in plain, friendly language (avoid insurance jargon)
   - Include specific copay amounts and any visit limits from THEIR policy
   - Mention if prior authorization is required
   - Note any deductible that applies
   - Explain in-network vs out-of-network if relevant

4. **Never Give Generic Answers When Policy Number Available**:
   - Don't say "typically covered" - say what THEIR plan covers
   - Don't give ranges - give their specific copays
   - Always verify against their actual policy data

Your goal is to make healthcare coverage easy to understand using THEIR SPECIFIC POLICY DETAILS.$$,
    'interactive',
    'published',
    'gpt-5',
    'medium',
    'cccccccc-dddd-eeee-ffff-333333333333',
    NOW() - INTERVAL '3 days'
)
ON CONFLICT (id) DO NOTHING;

-- Copy tools from parent agent to new version
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


-- ==========================
-- SCENARIO 2: Newsletter Agent with Outdated Content
-- ==========================

-- Create the main Newsletter Agent
INSERT INTO agents (id, workspace_id, team_id, name, description, instructions, type, status, model, reasoning_effort)
VALUES (
    '20000001-0000-0000-0000-000000000001',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333', -- Marketing team
    'influencer-newsletter-creator',
    'Creates daily newsletters by analyzing posts from 5000+ influencers in the tech vertical',
    $$You are a newsletter curator that creates engaging daily newsletters from influencer content.

## Objective
Monitor 5000+ tech influencers and create a daily newsletter highlighting the most important and trending content.

## Workflow
1. **Retrieve Recent Posts**: Use the get_influencer_posts subagent to fetch recent posts
2. **Analyze Content**: Identify key themes, trends, and high-engagement posts
3. **Curate Newsletter**: Select 8-10 top posts and write engaging summaries
4. **Format Output**: Create a well-formatted newsletter with sections

## Newsletter Structure
- **Top Story** - Most important/trending post
- **Trending Topics** - 5-7 noteworthy posts grouped by theme
- **Quick Hits** - 2-3 rapid-fire updates
- **What to Watch** - Emerging trends and predictions

Focus on timely, relevant content that provides value to tech professionals.$$,
    'pipeline',
    'published',
    'gpt-5',
    'medium'
),

-- Create the Subagent that retrieves influencer posts (with the BUG - no timestamp filter)
(
    '20000002-0000-0000-0000-000000000002',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333',
    'get-influencer-posts',
    'Retrieves posts from monitored influencers (ISSUE: missing timestamp filter)',
    $$You are a data retrieval specialist for influencer content.

## Objective
Fetch posts from our monitored list of 5000+ tech influencers.

## Available Tools
- **fetch_social_posts**: Retrieve posts from influencer database

## Instructions
1. Use fetch_social_posts tool to get influencer posts
2. Return the posts in structured format with author, content, engagement metrics
3. Include all available posts from the database

Note: Currently fetches ALL posts without date filtering.$$,
    'pipeline',
    'published',
    'gpt-5-mini',
    'low'
)
ON CONFLICT (id) DO NOTHING;

-- Link the retrieval subagent to the newsletter agent
INSERT INTO agent_subagents (id, parent_agent_id, subagent_id, enabled) VALUES
('20000003-0000-0000-0000-000000000003', '20000001-0000-0000-0000-000000000001', '20000002-0000-0000-0000-000000000002', TRUE)
ON CONFLICT (parent_agent_id, subagent_id) DO NOTHING;

-- Add tools to the subagent (the problematic tool without timestamp filter)
INSERT INTO agent_tools (id, agent_id, tool_type, mcp_server_id, tool_name, custom_description, require_approval, enabled) VALUES
('20000004-0000-0000-0000-000000000004', '20000002-0000-0000-0000-000000000002', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'fetchsocialposts', 'Fetch posts from monitored influencers. WARNING: Currently returns ALL posts without date filtering!', FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Add tool to newsletter agent
INSERT INTO agent_tools (id, agent_id, tool_type, mcp_server_id, tool_name, custom_description, require_approval, enabled) VALUES
('20000005-0000-0000-0000-000000000005', '20000001-0000-0000-0000-000000000001', 'mcp', 'c0000000-0000-0000-0000-000000000001', 'createsubtask', 'Delegate tasks to subagents including the influencer post retrieval agent', FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Create newsletter tasks with OLD content (3 months old)
INSERT INTO tasks (id, workspace_id, team_id, title, description, status, agent_id, assigned_to_id, temporal_agent_id, messages, created_at) VALUES
(
    '20000010-0000-0000-0000-000000000010',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333',
    'Daily Tech Influencer Newsletter - Oct 9, 2024',
    'Generate today daily newsletter from influencer posts',
    'completed',
    '20000001-0000-0000-0000-000000000001',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '50000010-0000-0000-0000-000000000010',
    '[
      {
        "id": "msg-newsletter-001",
        "type": "user",
        "content": "Create todays daily newsletter from recent influencer posts",
        "timestamp": "2024-10-09T06:00:00Z"
      },
      {
        "id": "msg-newsletter-002",
        "type": "assistant",
        "content": "Ill create todays newsletter by retrieving recent posts from our monitored influencers.",
        "timestamp": "2024-10-09T06:00:10Z"
      },
      {
        "id": "msg-newsletter-003",
        "type": "subtask_created",
        "content": "Creating subtask to retrieve influencer posts",
        "timestamp": "2024-10-09T06:00:15Z",
        "subtask": {
          "agent_name": "get-influencer-posts",
          "instructions": "Fetch recent posts from all monitored tech influencers"
        }
      },
      {
        "id": "msg-newsletter-004",
        "type": "subtask_result",
        "content": "Retrieved posts from influencers",
        "timestamp": "2024-10-09T06:00:45Z",
        "data": {
          "posts_retrieved": 450,
          "date_range": "July 1 - September 30, 2024",
          "note": "WARNING: Posts are 1-3 months old due to missing timestamp filter"
        }
      },
      {
        "id": "msg-newsletter-005",
        "type": "assistant",
        "content": "# 🚀 Tech Influencer Newsletter - October 9, 2024\n\n## 📰 Top Story\n**Kelsey Hightower** (posted July 15):\n\"Kubernetes 1.30 brings major improvements to resource management...\"\n[This post is 3 months old!]\n\n## 🔥 Trending Topics\n\n### AI & Machine Learning\n- **@techleader** (July 8): GPT-4 adoption strategies\n- **@airesearcher** (July 22): Vision transformers breakthrough\n\n### Cloud Infrastructure  \n- **@cloudarchitect** (August 5): Multi-cloud strategy guide\n- **@devopsexpert** (August 12): Infrastructure as Code best practices\n\n### Developer Tools\n- **@buildtools** (September 10): New CI/CD pipelines\n- **@codequality** (September 15): Code review automation\n\n## ⚡ Quick Hits\n- GitHub Copilot updates (August 2024)\n- Docker Desktop performance improvements (July 2024)\n- VS Code extension recommendations (September 2024)\n\n❌ **ISSUE: All content is 1-3 months old!**",
        "timestamp": "2024-10-09T06:01:30Z"
      },
      {
        "id": "msg-newsletter-006",
        "type": "user_feedback",
        "content": "👎 Bad - All of these posts are MONTHS old! This newsletter is supposed to have content from the last 24 hours, not 3-month-old posts. Completely useless!",
        "timestamp": "2024-10-09T08:30:00Z",
        "feedback": {
          "rating": "negative",
          "reason": "outdated_content",
          "details": "Newsletter contains posts from 1-3 months ago instead of recent 24-hour content"
        }
      }
    ]',
    NOW() - INTERVAL '2 days'
),

-- Second newsletter task with similar issue
(
    '20000011-0000-0000-0000-000000000011',
    'c926e979-1f16-46bf-a7cc-8aab70162d65',
    '33333333-3333-3333-3333-333333333333',
    'Daily Tech Influencer Newsletter - Oct 8, 2024',
    'Generate daily newsletter',
    'completed',
    '20000001-0000-0000-0000-000000000001',
    '29fcdd0a-708e-478a-8030-34b02ad9ef84',
    '50000011-0000-0000-0000-000000000011',
    '[
      {
        "id": "msg-news2-001",
        "type": "user",
        "content": "Generate todays newsletter",
        "timestamp": "2024-10-08T06:00:00Z"
      },
      {
        "id": "msg-news2-002",
        "type": "assistant",
        "content": "Creating newsletter with latest influencer posts...",
        "timestamp": "2024-10-08T06:00:20Z"
      },
      {
        "id": "msg-news2-003",
        "type": "assistant",
        "content": "Newsletter generated with top posts from tech influencers. [Contains old content from July-September 2024]",
        "timestamp": "2024-10-08T06:02:00Z"
      },
      {
        "id": "msg-news2-004",
        "type": "user_feedback",
        "content": "👎 Not useful - Same problem as yesterday. Were getting 2-3 month old content instead of fresh posts!",
        "timestamp": "2024-10-08T09:00:00Z",
        "feedback": {
          "rating": "negative",
          "reason": "stale_content",
          "details": "Repeated issue with outdated content"
        }
      }
    ]',
    NOW() - INTERVAL '3 days'
)
ON CONFLICT (id) DO NOTHING;

-- ==========================
-- Summary Comment
-- ==========================

-- This seed file creates:
-- 1. Healthcare Insurance Support Agent with 6 failed tasks showing pattern of not querying actual policies
--    - Key task (0345678) has explicit user complaint about wrong information
--    - Pattern: Agent gives generic answers without using generatemock to check actual policy
-- 2. Newsletter Agent with subagent that has missing timestamp filter
--    - Newsletter tasks show content is 1-3 months old instead of last 24 hours
--    - Root cause: subagent fetch_social_posts tool lacks timestamp parameter
--    - Fix needed: Add timestamp filter to tool configuration
-- 3. Custom Quality Metric: Policy Number Verification (LLM-as-judge)

-- ==========================
-- CUSTOM QUALITY METRIC: Policy Number Verification
-- ==========================

-- Create a custom LLM-as-judge metric to detect if agent queries policy numbers
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
    'Policy Number Verification',
    'Verifies that when a customer provides a policy number, the agent queries it from the context store',
    'quality',
    'llm_judge',
    '{"judge_prompt": "You are evaluating a healthcare insurance support agent conversation.\n\nTask: Determine if the agent properly used the customer''s policy number when provided.\n\nEvaluation Criteria:\n1. Check if the customer mentioned a policy number (e.g., \"My policy number is 0123456\")\n2. If a policy number was provided, verify the agent used a tool/function to query that specific policy\n3. The agent should NOT give generic answers when a policy number is available\n\nPass if:\n- Customer provided policy number AND agent queried it specifically\n- Customer did NOT provide a policy number (N/A case)\n\nFail if:\n- Customer provided policy number BUT agent gave generic response without querying\n- Agent answered without checking the specific policy details\n\nProvide:\n- pass: true/false\n- score: 0-100 (0 if failed, 100 if passed)\n- reasoning: Brief explanation of your evaluation", "judge_model": "gpt-5-nano"}',
    true,
    NOW() - INTERVAL '5 days'
) ON CONFLICT (id) DO NOTHING;

