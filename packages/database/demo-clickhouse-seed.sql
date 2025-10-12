-- ClickHouse seed data for Demo
-- Metrics and feedback for healthcare insurance and newsletter agent tasks

USE boilerplate_clickhouse;

-- ==========================
-- SCENARIO 1: Healthcare Insurance Support - Performance Metrics
-- ==========================

-- Performance metrics for the failed healthcare insurance tasks
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, agent_name, agent_version,
    metric_category, duration_ms, input_tokens, output_tokens, cost_usd, status,
    response_id, response_index, message_count,
    task_input, task_output,
    created_at
) VALUES 
('10000001-0001-0001-0001-000000000001', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 1800, 450, 280, 0.004, 'completed', 'resp_health_001', 1, 2, 'My policy number is 0123456. Am I covered for physical therapy?', 'Yes, physical therapy is typically covered under most Kaiser Permanente plans...', now() - INTERVAL 2 DAY),
('10000002-0002-0002-0002-000000000002', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 2100, 520, 310, 0.005, 'completed', 'resp_health_002', 1, 2, 'I have policy 0234567. Do I need pre-authorization for an MRI?', 'For most diagnostic imaging like MRIs, pre-authorization is typically required...', now() - INTERVAL 2 DAY),
('10000003-0003-0003-0003-000000000003', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 1950, 480, 290, 0.004, 'completed', 'resp_health_003', 1, 2, 'My policy number is 0345678. Am I covered for a cardiology specialist visit?', 'Yes! Under your Kaiser Permanente plan, specialist visits including cardiology are covered...', now() - INTERVAL 3 DAY),
('10000004-0004-0004-0004-000000000004', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 1750, 440, 270, 0.004, 'completed', 'resp_health_004', 1, 2, 'Policy 0456789 - What tier is my Lipitor prescription?', 'Lipitor (atorvastatin) is generally a Tier 2 preferred brand medication...', now() - INTERVAL 4 DAY),
('10000005-0005-0005-0005-000000000005', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 2050, 510, 300, 0.005, 'completed', 'resp_health_005', 1, 2, 'I have policy number 0567890. Is my upcoming knee surgery covered?', 'Medically necessary knee surgery is typically covered under Kaiser Permanente plans...', now() - INTERVAL 5 DAY),
('10000006-0006-0006-0006-000000000006', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 1650, 420, 250, 0.003, 'completed', 'resp_health_006', 1, 2, 'Policy 0678901 - What is my ER copay?', 'Emergency room visits typically have a copay of $100-150 per visit...', now() - INTERVAL 6 DAY);


-- ==========================
-- SCENARIO 1: Healthcare Insurance - Feedback/Quality Metrics
-- ==========================

-- User feedback (thumbs down) as quality metrics - stored in feedback category
-- Healthcare Agent - User Feedback (stored with metric_category = 'feedback')
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, metric_category, metric_name, metric_type,
    passed, reasoning,
    response_id, response_index, message_count,
    created_at
) VALUES 
('10000001-0001-0001-0001-000000000001', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Agent provided generic answer without checking actual policy details', 'resp_health_001', 1, 2, now() - INTERVAL 2 DAY),
('10000002-0002-0002-0002-000000000002', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Generic response without verifying against actual policy', 'resp_health_002', 1, 2, now() - INTERVAL 2 DAY),
('10000003-0003-0003-0003-000000000003', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Bad - I was at the doctor and learned that actually I am not covered. My plan requires a referral and has different copays. This information was completely wrong!', 'resp_health_003', 1, 2, now() - INTERVAL 3 DAY),
('10000006-0006-0006-0006-000000000006', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Not helpful - My actual copay is $250. The agent should have looked up my specific policy!', 'resp_health_006', 1, 2, now() - INTERVAL 6 DAY);


-- ==========================
-- SCENARIO 2: Newsletter Agent - Performance Metrics
-- ==========================

-- Performance metrics for newsletter tasks (with outdated content issue)
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, agent_name, agent_version,
    metric_category, duration_ms, input_tokens, output_tokens, cost_usd, status,
    response_id, response_index, message_count,
    task_input, task_output,
    created_at
) VALUES 
('20000010-0000-0000-0000-000000000010', '20000001-0000-0000-0000-000000000001', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'influencer-newsletter-creator', 'v1', 'performance', 8500, 2800, 1500, 0.025, 'completed', 'resp_news_001', 1, 6, 'Create todays daily newsletter from recent influencer posts', 'Tech Influencer Newsletter - October 9, 2024 [Contains 3-month-old posts from July-September]', now() - INTERVAL 2 DAY),
('20000011-0000-0000-0000-000000000011', '20000001-0000-0000-0000-000000000001', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'influencer-newsletter-creator', 'v1', 'performance', 7900, 2600, 1400, 0.023, 'completed', 'resp_news_002', 1, 4, 'Generate todays newsletter', 'Newsletter generated with posts from July-September 2024', now() - INTERVAL 3 DAY);


-- ==========================
-- SCENARIO 1: Custom Quality Metric - Policy Number Verification
-- ==========================

-- Quality metric evaluations for healthcare agent tasks
-- This LLM-as-judge metric checks if agent queried policy number when provided
-- Failed evaluations (agent didn't query policy number)
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, metric_category, metric_definition_id, metric_name, metric_type,
    passed, score, reasoning,
    eval_duration_ms, eval_cost_usd,
    response_id, response_index, message_count,
    created_at
) VALUES 
('10000001-0001-0001-0001-000000000001', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'quality', 'bbbbbbbb-1111-2222-3333-444444444444', 'Policy Number Verification', 'llm_judge', false, 0, 'Customer provided policy number 0123456 but agent gave generic answer without querying the specific policy', 1200, 0.0001, 'resp_health_001', 1, 2, now() - INTERVAL 2 DAY),
('10000002-0002-0002-0002-000000000002', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'quality', 'bbbbbbbb-1111-2222-3333-444444444444', 'Policy Number Verification', 'llm_judge', false, 0, 'Policy number 0234567 mentioned but agent did not verify against actual policy data', 1100, 0.0001, 'resp_health_002', 1, 2, now() - INTERVAL 2 DAY),
('10000003-0003-0003-0003-000000000003', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'quality', 'bbbbbbbb-1111-2222-3333-444444444444', 'Policy Number Verification', 'llm_judge', false, 0, 'Policy 0345678 provided - agent failed to query actual policy, resulting in incorrect information', 1250, 0.0001, 'resp_health_003', 1, 2, now() - INTERVAL 3 DAY),
('10000006-0006-0006-0006-000000000006', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'quality', 'bbbbbbbb-1111-2222-3333-444444444444', 'Policy Number Verification', 'llm_judge', false, 0, 'Policy 0678901 mentioned - agent gave generic copay info instead of checking actual policy', 1180, 0.0001, 'resp_health_006', 1, 2, now() - INTERVAL 6 DAY),
('10000009-0009-0009-0009-000000000009', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'quality', 'bbbbbbbb-1111-2222-3333-444444444444', 'Policy Number Verification', 'llm_judge', false, 0, 'Generic response without policy lookup when customer provided their policy number', 1150, 0.0001, 'resp_health_009', 1, 2, now() - INTERVAL 6 DAY),
('10000019-0019-0019-0019-000000000019', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'quality', 'bbbbbbbb-1111-2222-3333-444444444444', 'Policy Number Verification', 'llm_judge', false, 0, 'Policy number provided but agent did not verify it', 1190, 0.0001, 'resp_health_019', 1, 2, now() - INTERVAL 4 DAY);

-- Passed evaluations for v2 (improved agent that correctly queries policies)
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, metric_category, metric_definition_id, metric_name, metric_type,
    passed, score, reasoning,
    eval_duration_ms, eval_cost_usd,
    response_id, response_index, message_count,
    created_at
) VALUES 
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'quality', 'bbbbbbbb-1111-2222-3333-444444444444', 'Policy Number Verification', 'llm_judge', true, 100, 'Agent correctly used generatemock to query policy 0456789 before responding', 1300, 0.0001, 'resp_v2_001', 1, 3, now() - INTERVAL 3 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'quality', 'bbbbbbbb-1111-2222-3333-444444444444', 'Policy Number Verification', 'llm_judge', true, 100, 'Proper policy lookup performed for policy 0567890', 1280, 0.0001, 'resp_v2_002', 1, 3, now() - INTERVAL 3 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'quality', 'bbbbbbbb-1111-2222-3333-444444444444', 'Policy Number Verification', 'llm_judge', true, 100, 'Agent successfully queried specific policy details before answering', 1320, 0.0001, 'resp_v2_003', 1, 3, now() - INTERVAL 3 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'quality', 'bbbbbbbb-1111-2222-3333-444444444444', 'Policy Number Verification', 'llm_judge', true, 100, 'Correctly verified policy information using policy number', 1290, 0.0001, 'resp_v2_004', 1, 3, now() - INTERVAL 2 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'quality', 'bbbbbbbb-1111-2222-3333-444444444444', 'Policy Number Verification', 'llm_judge', true, 100, 'Policy lookup performed as expected', 1310, 0.0001, 'resp_v2_005', 1, 3, now() - INTERVAL 1 DAY);


-- ==========================
-- SCENARIO 2: Newsletter Agent - Feedback
-- ==========================

-- Negative feedback for newsletter tasks (outdated content) - stored in feedback category
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, metric_category, metric_name, metric_type,
    passed, reasoning,
    response_id, response_index, message_count,
    created_at
) VALUES 
('20000010-0000-0000-0000-000000000010', '20000001-0000-0000-0000-000000000001', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Bad - All of these posts are MONTHS old! This newsletter is supposed to have content from the last 24 hours, not 3-month-old posts. Completely useless!', 'resp_news_001', 1, 6, now() - INTERVAL 2 DAY),
('20000011-0000-0000-0000-000000000011', '20000001-0000-0000-0000-000000000001', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Not useful - Same problem as yesterday. Were getting 2-3 month old content instead of fresh posts!', 'resp_news_002', 1, 4, now() - INTERVAL 3 DAY);


-- ==========================
-- Additional Sample Metrics for Context
-- ==========================

-- Additional tasks for volume and success rate variation
-- Day 7: 2 tasks (1 success, 1 fail) = 50%
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, agent_name, agent_version,
    metric_category, duration_ms, input_tokens, output_tokens, cost_usd, status,
    response_id, response_index, message_count,
    task_input, task_output,
    created_at
) VALUES 
('10000007-0007-0007-0007-000000000007', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 1900, 470, 290, 0.004, 'completed', 'resp_health_007', 1, 2, 'Vision coverage inquiry', 'Generic vision coverage response...', now() - INTERVAL 7 DAY),
('10000008-0008-0008-0008-000000000008', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 2200, 530, 330, 0.005, 'completed', 'resp_health_008', 1, 2, 'Therapy coverage', 'Checked policy - therapy covered with $30 copay', now() - INTERVAL 7 DAY);

-- Day 7 feedback (1 fail)
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, metric_category, metric_name, metric_type,
    passed, reasoning,
    response_id, response_index, message_count,
    created_at
) VALUES 
('10000007-0007-0007-0007-000000000007', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Didnt check my specific policy', 'resp_health_007', 1, 2, now() - INTERVAL 7 DAY),
('10000008-0008-0008-0008-000000000008', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Helpful!', 'resp_health_008', 1, 2, now() - INTERVAL 7 DAY);

-- Day 6: 5 tasks (2 success, 3 fail) = 40%
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, agent_name, agent_version,
    metric_category, duration_ms, input_tokens, output_tokens, cost_usd, status,
    response_id, response_index, message_count,
    task_input, task_output,
    created_at
) VALUES 
('10000009-0009-0009-0009-000000000009', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 1850, 460, 280, 0.004, 'completed', 'resp_health_009', 1, 2, 'Lab work coverage', 'Lab work is typically covered...', now() - INTERVAL 6 DAY),
('10000010-0010-0010-0010-000000000010', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 1950, 480, 295, 0.004, 'completed', 'resp_health_010', 1, 2, 'X-ray coverage', 'X-rays require pre-auth usually...', now() - INTERVAL 6 DAY),
('10000011-0011-0011-0011-000000000011', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 2100, 520, 310, 0.005, 'completed', 'resp_health_011', 1, 2, 'Urgent care copay', 'Checked policy - urgent care $50', now() - INTERVAL 6 DAY),
('10000023-0023-0023-0023-000000000023', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 1800, 450, 275, 0.004, 'completed', 'resp_health_023', 1, 2, 'Dental cleaning', 'Dental cleanings typically covered...', now() - INTERVAL 6 DAY),
('10000024-0024-0024-0024-000000000024', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 1950, 480, 290, 0.004, 'completed', 'resp_health_024', 1, 2, 'Eye exam', 'Eye exams covered annually...', now() - INTERVAL 6 DAY);

-- Day 6 feedback (3 fails, 2 success)
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, metric_category, metric_name, metric_type,
    passed, reasoning,
    response_id, response_index, message_count,
    created_at
) VALUES 
('10000009-0009-0009-0009-000000000009', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Generic answer', 'resp_health_009', 1, 2, now() - INTERVAL 6 DAY),
('10000010-0010-0010-0010-000000000010', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Not policy specific', 'resp_health_010', 1, 2, now() - INTERVAL 6 DAY),
('10000011-0011-0011-0011-000000000011', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Correct!', 'resp_health_011', 1, 2, now() - INTERVAL 6 DAY),
('10000023-0023-0023-0023-000000000023', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Wrong info', 'resp_health_023', 1, 2, now() - INTERVAL 6 DAY),
('10000024-0024-0024-0024-000000000024', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Great', 'resp_health_024', 1, 2, now() - INTERVAL 6 DAY);

-- Day 5: 7 tasks (3 success, 4 fail) = 43% - WORST DAY
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, agent_name, agent_version,
    metric_category, duration_ms, input_tokens, output_tokens, cost_usd, status,
    response_id, response_index, message_count,
    task_input, task_output,
    created_at
) VALUES 
('10000012-0012-0012-0012-000000000012', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 1800, 450, 270, 0.004, 'completed', 'resp_health_012', 1, 2, 'Allergy testing', 'Allergy tests are covered...', now() - INTERVAL 5 DAY),
('10000013-0013-0013-0013-000000000013', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 2000, 500, 300, 0.005, 'completed', 'resp_health_013', 1, 2, 'Maternity coverage', 'Prenatal care typically covered...', now() - INTERVAL 5 DAY),
('10000014-0014-0014-0014-000000000014', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 1900, 470, 285, 0.004, 'completed', 'resp_health_014', 1, 2, 'Diabetic supplies', 'Supplies usually covered...', now() - INTERVAL 5 DAY),
('10000015-0015-0015-0015-000000000015', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 2200, 540, 320, 0.005, 'completed', 'resp_health_015', 1, 2, 'Sleep study', 'Checked policy - sleep study covered with pre-auth', now() - INTERVAL 5 DAY),
('10000016-0016-0016-0016-000000000016', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 2100, 520, 310, 0.005, 'completed', 'resp_health_016', 1, 2, 'Shoulder surgery', 'Surgery requires pre-auth...', now() - INTERVAL 5 DAY),
('10000017-0017-0017-0017-000000000017', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 2300, 560, 340, 0.006, 'completed', 'resp_health_017', 1, 2, 'Dermatology', 'Verified policy - dermatology $35 copay', now() - INTERVAL 5 DAY),
('10000018-0018-0018-0018-000000000018', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 1700, 430, 260, 0.003, 'completed', 'resp_health_018', 1, 2, 'Flu shot', 'Vaccinations are preventive care...', now() - INTERVAL 5 DAY);

-- Day 5 feedback (4 fails, 3 success)
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, metric_category, metric_name, metric_type,
    passed, reasoning,
    response_id, response_index, message_count,
    created_at
) VALUES 
('10000012-0012-0012-0012-000000000012', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Wrong coverage info', 'resp_health_012', 1, 2, now() - INTERVAL 5 DAY),
('10000013-0013-0013-0013-000000000013', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Generic info', 'resp_health_013', 1, 2, now() - INTERVAL 5 DAY),
('10000014-0014-0014-0014-000000000014', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Not specific to my plan', 'resp_health_014', 1, 2, now() - INTERVAL 5 DAY),
('10000015-0015-0015-0015-000000000015', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Very helpful', 'resp_health_015', 1, 2, now() - INTERVAL 5 DAY),
('10000016-0016-0016-0016-000000000016', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Incorrect', 'resp_health_016', 1, 2, now() - INTERVAL 5 DAY),
('10000017-0017-0017-0017-000000000017', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Perfect', 'resp_health_017', 1, 2, now() - INTERVAL 5 DAY),
('10000018-0018-0018-0018-000000000018', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Great info', 'resp_health_018', 1, 2, now() - INTERVAL 5 DAY);

-- Day 4: 4 tasks (2 success, 2 fail) = 50%
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, agent_name, agent_version,
    metric_category, duration_ms, input_tokens, output_tokens, cost_usd, status,
    response_id, response_index, message_count,
    task_input, task_output,
    created_at
) VALUES 
('10000019-0019-0019-0019-000000000019', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 2000, 490, 295, 0.005, 'completed', 'resp_health_019', 1, 2, 'Hearing aid coverage', 'Hearing aids typically not covered...', now() - INTERVAL 4 DAY),
('10000020-0020-0020-0020-000000000020', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 2200, 530, 320, 0.005, 'completed', 'resp_health_020', 1, 2, 'Mammogram', 'Verified policy - preventive care covered', now() - INTERVAL 4 DAY),
('10000021-0021-0021-0021-000000000021', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 1900, 470, 285, 0.004, 'completed', 'resp_health_021', 1, 2, 'Ambulance', 'Ambulance covered for emergencies...', now() - INTERVAL 4 DAY),
('10000022-0022-0022-0022-000000000022', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v1', 'performance', 2400, 580, 350, 0.006, 'completed', 'resp_health_022', 1, 2, 'Home health', 'Checked policy - home health 20 visits/year', now() - INTERVAL 4 DAY);

-- Day 4 feedback (2 fails, 2 success)
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, metric_category, metric_name, metric_type,
    passed, reasoning,
    response_id, response_index, message_count,
    created_at
) VALUES 
('10000019-0019-0019-0019-000000000019', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Didnt check my policy', 'resp_health_019', 1, 2, now() - INTERVAL 4 DAY),
('10000020-0020-0020-0020-000000000020', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Accurate', 'resp_health_020', 1, 2, now() - INTERVAL 4 DAY),
('10000021-0021-0021-0021-000000000021', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Generic answer', 'resp_health_021', 1, 2, now() - INTERVAL 4 DAY),
('10000022-0022-0022-0022-000000000022', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Helpful!', 'resp_health_022', 1, 2, now() - INTERVAL 4 DAY);

-- ==========================
-- V2 TASKS - After Fix (Day 1-3) - High Success Rate ~85%
-- ==========================

-- Day 3: V2 tasks (7 tasks, 5 success, 2 fail) = 71%
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, agent_name, agent_version,
    metric_category, duration_ms, input_tokens, output_tokens, cost_usd, status,
    response_id, response_index, message_count,
    task_input, task_output,
    created_at
) VALUES 
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 2450, 590, 360, 0.007, 'completed', 'resp_v2_001', 1, 3, 'Policy 0888999 - specialist coverage?', 'Checked your policy - specialist visits $45 copay', now() - INTERVAL 3 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 2350, 570, 350, 0.006, 'completed', 'resp_v2_002', 1, 3, 'Policy 0999888 - CT scan coverage?', 'Verified your plan - CT scans covered with pre-auth', now() - INTERVAL 3 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 2400, 580, 355, 0.006, 'completed', 'resp_v2_003', 1, 3, 'Policy 0777666 - urgent care?', 'Checked policy - urgent care $60 copay', now() - INTERVAL 3 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 2500, 600, 365, 0.007, 'completed', 'resp_v2_003', 1, 3, 'Policy 0666555 - allergy meds?', 'Verified - allergy meds Tier 2, $30 copay', now() - INTERVAL 3 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 2300, 560, 340, 0.006, 'completed', 'resp_v2_005', 1, 3, 'Policy 0555444 - vaccine coverage?', 'Checked policy - all vaccines covered $0', now() - INTERVAL 3 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 170, 55, 0, 0.001, 'failed', 'resp_v2_006', 1, 2, 'Mental health session?', '', now() - INTERVAL 3 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 190, 65, 0, 0.001, 'failed', 'resp_v2_007', 1, 2, 'Coverage question', '', now() - INTERVAL 3 DAY);

-- Day 3 V2 feedback (5 success, 2 fail)
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, metric_category, metric_name, metric_type,
    passed, reasoning,
    response_id, response_index, message_count,
    created_at
) VALUES 
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Perfect info!', 'resp_v2_001', 1, 3, now() - INTERVAL 3 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Exactly what I needed', 'resp_v2_002', 1, 3, now() - INTERVAL 3 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Very helpful', 'resp_v2_003', 1, 3, now() - INTERVAL 3 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Great service', 'resp_v2_004', 1, 3, now() - INTERVAL 3 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Thanks!', 'resp_v2_005', 1, 3, now() - INTERVAL 3 DAY);

-- Day 2: V2 tasks (6 tasks, 4 success, 2 fail) = 67%
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, agent_name, agent_version,
    metric_category, duration_ms, input_tokens, output_tokens, cost_usd, status,
    response_id, response_index, message_count,
    task_input, task_output,
    created_at
) VALUES 
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 2400, 580, 350, 0.006, 'completed', 'resp_v2_day2_001', 1, 3, 'Policy 0444333 - prescription?', 'Checked - prescriptions Tier 1 $10 copay', now() - INTERVAL 2 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 2500, 600, 365, 0.007, 'completed', 'resp_v2_day2_002', 1, 3, 'Policy 0333222 - hospital stay?', 'Verified - inpatient covered after $500 deductible', now() - INTERVAL 2 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 2350, 570, 345, 0.006, 'completed', 'resp_v2_day2_003', 1, 3, 'Policy 0222111 - PT sessions?', 'Checked policy - PT $30 copay, 25 visits/year', now() - INTERVAL 2 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 2450, 590, 360, 0.007, 'completed', 'resp_v2_day2_004', 1, 3, 'Policy 0111000 - MRI coverage?', 'Verified - MRI covered with pre-authorization', now() - INTERVAL 2 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 180, 60, 0, 0.001, 'failed', 'resp_v2_day2_005', 1, 2, 'Blood pressure check?', '', now() - INTERVAL 2 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 200, 70, 0, 0.001, 'failed', 'resp_v2_day2_006', 1, 2, 'Policy coverage inquiry', '', now() - INTERVAL 2 DAY);

-- Day 2 V2 feedback (4 success, 2 fail)
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, metric_category, metric_name, metric_type,
    passed, reasoning,
    response_id, response_index, message_count,
    created_at
) VALUES 
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Accurate!', 'resp_v2_day2_001', 1, 3, now() - INTERVAL 2 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Helpful', 'resp_v2_day2_002', 1, 3, now() - INTERVAL 2 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Perfect', 'resp_v2_day2_003', 1, 3, now() - INTERVAL 2 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Great', 'resp_v2_day2_004', 1, 3, now() - INTERVAL 2 DAY);

-- Day 1: V2 tasks (4 tasks, 3 success, 1 fail) = 75%
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, agent_name, agent_version,
    metric_category, duration_ms, input_tokens, output_tokens, cost_usd, status,
    response_id, response_index, message_count,
    task_input, task_output,
    created_at
) VALUES 
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 2400, 580, 350, 0.006, 'completed', 'resp_v2_day1_001', 1, 3, 'Policy 0999777 - annual physical?', 'Checked policy - annual physical $0 copay', now() - INTERVAL 1 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 2550, 600, 370, 0.007, 'completed', 'resp_v2_day1_002', 1, 3, 'Policy 0888666 - dental cleaning?', 'Verified - dental cleaning $0 preventive', now() - INTERVAL 1 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 2350, 570, 345, 0.006, 'completed', 'resp_v2_day1_003', 1, 3, 'Policy 0777555 - eye exam?', 'Checked policy - eye exam $25 copay annual', now() - INTERVAL 1 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'v2', 'performance', 150, 50, 0, 0.001, 'failed', 'resp_v2_day1_004', 1, 3, 'Policy 0666444 - flu shot?', '', now() - INTERVAL 1 DAY);

-- Day 1 V2 feedback (3 success, 1 fail)
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, metric_category, metric_name, metric_type,
    passed, reasoning,
    response_id, response_index, message_count,
    created_at
) VALUES 
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Excellent!', 'resp_v2_day1_001', 1, 3, now() - INTERVAL 1 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Perfect', 'resp_v2_day1_002', 1, 3, now() - INTERVAL 1 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Very helpful', 'resp_v2_day1_003', 1, 3, now() - INTERVAL 1 DAY);

-- Positive feedback for successful tasks - stored in feedback category
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, metric_category, metric_name, metric_type,
    passed, reasoning,
    response_id, response_index, message_count,
    created_at
) VALUES 
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Perfect! Exactly what I needed to know about my specific coverage', 'resp_health_success_001', 1, 3, now() - INTERVAL 1 DAY),
(generateUUIDv4(), 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'positive', true, '👍 Very helpful and accurate information', 'resp_health_success_002', 1, 3, now() - INTERVAL 1 DAY);


-- ==========================
-- Summary
-- ==========================

-- This creates metrics showing:
-- 1. Healthcare Support: 6 failed tasks with 4 negative feedback items
--    - Pattern: Tasks with policy numbers in input but no policy query in response
--    - 2 successful tasks that DO query policies (for comparison)
-- 2. Newsletter Agent: 2 failed tasks with negative feedback about old content
--    - Issue: Subagent tool lacks timestamp filter, retrieves all historical posts
--
-- Demo flow:
-- 1. Analytics shows thumbs down feedback
-- 2. Failed table shows the healthcare tasks
-- 3. User clicks on task 10000003 (the key one with strong complaint)
-- 4. User creates metric: "Did agent query policy database when policy number provided?"
-- 5. Metric runs retroactively on all tasks
-- 6. Shows clear pattern: failed tasks didn't query, successful ones did
-- 7. For newsletter: Tool configuration needs timestamp parameter added

