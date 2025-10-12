-- Sample Task Metrics Data for Development/Demo
-- This gives the analytics page data to display
USE boilerplate_clickhouse;

-- Sample task IDs and agent ID (using the Research & Writing Assistant from agents-seed.sql)
-- Agent ID: 4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d
-- Workspace ID: c926e979-1f16-46bf-a7cc-8aab70162d65

-- ========================================
-- Performance Metrics (from traces)
-- ========================================

INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, agent_name, agent_version,
    metric_category, duration_ms, input_tokens, output_tokens, cost_usd, status,
    response_id, response_index, message_count,
    task_input, task_output,
    created_at
) VALUES 
-- Last 7 days of tasks
('11111111-1111-1111-1111-111111111111', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Research & Writing Assistant', 'v1', 'performance', 2500, 1200, 800, 0.011, 'completed', 'resp_001', 1, 2, 'Write a blog post about AI trends', 'Here is a comprehensive blog post about AI trends in 2024...', now() - INTERVAL 1 DAY),
('22222222-2222-2222-2222-222222222222', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Research & Writing Assistant', 'v1', 'performance', 3200, 1500, 1200, 0.016, 'completed', 'resp_002', 1, 2, 'Research quantum computing applications', 'Quantum computing is revolutionizing multiple industries...', now() - INTERVAL 2 DAY),
('33333333-3333-3333-3333-333333333333', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Research & Writing Assistant', 'v1', 'performance', 1800, 900, 600, 0.008, 'completed', 'resp_003', 1, 2, 'Summarize recent tech news', 'Key tech news: Major AI advancements...', now() - INTERVAL 3 DAY),
('44444444-4444-4444-4444-444444444444', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Research & Writing Assistant', 'v1', 'performance', 4500, 2000, 1500, 0.020, 'completed', 'resp_004', 1, 2, 'Write technical documentation for API', 'API Documentation: Authentication, Endpoints...', now() - INTERVAL 4 DAY),
('55555555-5555-5555-5555-555555555555', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Research & Writing Assistant', 'v1', 'performance', 2100, 1100, 700, 0.010, 'completed', 'resp_005', 1, 2, 'Create social media content', 'Social media post: Engaging content...', now() - INTERVAL 5 DAY),
('66666666-6666-6666-6666-666666666666', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Research & Writing Assistant', 'v1', 'performance', 2700, 1300, 900, 0.012, 'completed', 'resp_006', 1, 2, 'Analyze market trends', 'Market analysis reveals...', now() - INTERVAL 6 DAY);

-- ========================================
-- Quality Metrics (from LLM judges)
-- ========================================

-- Commented out: Response Helpfulness and Safety & Compliance metrics
-- These are now handled separately in the demo seed
-- Uncomment if you want to seed example quality metrics for testing

-- Response Helpfulness (metric_definition_id: a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1)
-- INSERT INTO task_metrics (
--     task_id, agent_id, workspace_id, metric_category, metric_definition_id, metric_name, metric_type,
--     passed, score, reasoning, eval_duration_ms, eval_cost_usd,
--     response_id, response_index, message_count,
--     created_at
-- ) VALUES 
-- ('11111111-1111-1111-1111-111111111111', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'quality', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Response Helpfulness', 'llm_judge', true, 85.0, 'The response is comprehensive and addresses the query well', 1200, 0.0001, 'resp_001', 1, 2, now() - INTERVAL 1 DAY);

-- Safety & Compliance (metric_definition_id: a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2)
-- INSERT INTO task_metrics (
--     task_id, agent_id, workspace_id, metric_category, metric_definition_id, metric_name, metric_type,
--     passed, score, reasoning, eval_duration_ms, eval_cost_usd,
--     response_id, response_index, message_count,
--     created_at
-- ) VALUES 
-- ('11111111-1111-1111-1111-111111111111', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'quality', 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'Safety & Compliance', 'llm_judge', true, 98.0, 'Content is safe and compliant', 900, 0.0001, 'resp_001', 1, 2, now() - INTERVAL 1 DAY);

