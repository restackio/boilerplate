-- ClickHouse Seed Data for Development
-- Database is specified in connection URL, no need for USE statement

-- All events now use the single pipeline_events dataset ID (aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)

-- Social Media Content
INSERT INTO pipeline_events (agent_id, task_id, workspace_id, dataset_id, event_name, raw_data, transformed_data, tags, embedding, event_timestamp) VALUES (generateUUIDv4(), generateUUIDv4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'LinkedIn Post', '{"platform": "linkedin", "author": "Kelsey Hightower", "content": "Just deployed a new Kubernetes cluster with improved security policies.", "likes": 275}', NULL, ['social_media', 'kubernetes', 'security', 'devops'], [0.1, 0.3, 0.8, 0.2], now() - INTERVAL 1 DAY);

-- Weather Sensor Data
INSERT INTO pipeline_events (agent_id, task_id, workspace_id, dataset_id, event_name, raw_data, transformed_data, tags, embedding, event_timestamp) VALUES (generateUUIDv4(), generateUUIDv4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Temperature Reading', '{"sensor_id": "temp_001", "location": "San Francisco", "temperature": 18.5, "unit": "celsius"}', NULL, ['weather', 'temperature', 'san-francisco'], [0.3, 0.1, 0.2, 0.8], now() - INTERVAL 30 MINUTE);

-- Kubernetes Logs
INSERT INTO pipeline_events (agent_id, task_id, workspace_id, dataset_id, event_name, raw_data, transformed_data, tags, embedding, event_timestamp) VALUES (generateUUIDv4(), generateUUIDv4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pod Deployment', '{"namespace": "production", "pod": "web-app-123", "status": "deployed", "replicas": 3}', NULL, ['k8s', 'logs', 'kubernetes', 'pod', 'deployment'], [0.5, 0.3, 0.4, 0.9], now() - INTERVAL 2 HOUR);

-- Customer Service
INSERT INTO pipeline_events (agent_id, task_id, workspace_id, dataset_id, event_name, raw_data, transformed_data, tags, embedding, event_timestamp) VALUES (generateUUIDv4(), generateUUIDv4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Support Ticket', '{"ticket_id": "SUPP-12345", "priority": "high", "issue": "connectivity", "customer_id": "CUST-789"}', NULL, ['customer-service', 'high-priority', 'connectivity'], [0.7, 0.5, 0.6, 0.9], now() - INTERVAL 3 HOUR);

-- Financial Data
INSERT INTO pipeline_events (agent_id, task_id, workspace_id, dataset_id, event_name, raw_data, transformed_data, tags, embedding, event_timestamp) VALUES (generateUUIDv4(), generateUUIDv4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stock Price Update', '{"symbol": "AAPL", "price": 185.42, "currency": "USD", "exchange": "NASDAQ"}', NULL, ['financial', 'stock', 'apple', 'nasdaq'], [0.8, 0.6, 0.7, 0.8], now() - INTERVAL 15 MINUTE);

-- Additional Social Media Events
INSERT INTO pipeline_events (agent_id, task_id, workspace_id, dataset_id, event_name, raw_data, transformed_data, tags, embedding, event_timestamp) VALUES (generateUUIDv4(), generateUUIDv4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Twitter Post', '{"platform": "twitter", "author": "devops_guru", "content": "New monitoring dashboard is live! Real-time insights into our infrastructure.", "retweets": 42, "likes": 156}', NULL, ['social_media', 'monitoring', 'devops', 'infrastructure'], [0.2, 0.4, 0.7, 0.3], now() - INTERVAL 6 HOUR);

INSERT INTO pipeline_events (agent_id, task_id, workspace_id, dataset_id, event_name, raw_data, transformed_data, tags, embedding, event_timestamp) VALUES (generateUUIDv4(), generateUUIDv4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'LinkedIn Article', '{"platform": "linkedin", "author": "tech_lead", "content": "Best practices for microservices architecture in 2024", "views": 1250, "comments": 23}', NULL, ['social_media', 'microservices', 'architecture', 'tech'], [0.1, 0.5, 0.9, 0.4], now() - INTERVAL 12 HOUR);

-- Additional Weather Events
INSERT INTO pipeline_events (agent_id, task_id, workspace_id, dataset_id, event_name, raw_data, transformed_data, tags, embedding, event_timestamp) VALUES (generateUUIDv4(), generateUUIDv4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Humidity Reading', '{"sensor_id": "humid_002", "location": "New York", "humidity": 65.2, "unit": "percent"}', NULL, ['weather', 'humidity', 'new-york'], [0.4, 0.2, 0.3, 0.7], now() - INTERVAL 45 MINUTE);

INSERT INTO pipeline_events (agent_id, task_id, workspace_id, dataset_id, event_name, raw_data, transformed_data, tags, embedding, event_timestamp) VALUES (generateUUIDv4(), generateUUIDv4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Wind Speed Alert', '{"sensor_id": "wind_003", "location": "Chicago", "wind_speed": 45.8, "unit": "mph", "alert_level": "moderate"}', NULL, ['weather', 'wind', 'chicago', 'alert'], [0.3, 0.1, 0.4, 0.9], now() - INTERVAL 90 MINUTE);

-- Additional K8s Events
INSERT INTO pipeline_events (agent_id, task_id, workspace_id, dataset_id, event_name, raw_data, transformed_data, tags, embedding, event_timestamp) VALUES (generateUUIDv4(), generateUUIDv4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Service Restart', '{"namespace": "staging", "service": "api-gateway", "reason": "memory_limit", "restart_count": 3}', NULL, ['k8s', 'logs', 'service', 'restart', 'staging'], [0.6, 0.4, 0.5, 0.8], now() - INTERVAL 4 HOUR);

INSERT INTO pipeline_events (agent_id, task_id, workspace_id, dataset_id, event_name, raw_data, transformed_data, tags, embedding, event_timestamp) VALUES (generateUUIDv4(), generateUUIDv4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Node Health Check', '{"node": "worker-node-02", "status": "healthy", "cpu_usage": 45.2, "memory_usage": 67.8, "disk_usage": 23.1}', NULL, ['k8s', 'logs', 'node', 'health', 'monitoring'], [0.5, 0.3, 0.6, 0.7], now() - INTERVAL 20 MINUTE);

-- Additional Customer Service Events
INSERT INTO pipeline_events (agent_id, task_id, workspace_id, dataset_id, event_name, raw_data, transformed_data, tags, embedding, event_timestamp) VALUES (generateUUIDv4(), generateUUIDv4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chat Session', '{"session_id": "CHAT-67890", "customer_id": "CUST-456", "agent_id": "AGENT-123", "duration": 780, "satisfaction": 4.5, "resolved": true}', NULL, ['customer-service', 'chat', 'resolved', 'satisfaction'], [0.8, 0.6, 0.7, 0.8], now() - INTERVAL 5 HOUR);

INSERT INTO pipeline_events (agent_id, task_id, workspace_id, dataset_id, event_name, raw_data, transformed_data, tags, embedding, event_timestamp) VALUES (generateUUIDv4(), generateUUIDv4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Feedback Survey', '{"survey_id": "SURVEY-111", "customer_id": "CUST-789", "rating": 5, "category": "billing", "comment": "Quick resolution, very helpful"}', NULL, ['customer-service', 'feedback', 'billing', 'positive'], [0.9, 0.7, 0.8, 0.9], now() - INTERVAL 8 HOUR);

-- Additional Financial Events
INSERT INTO pipeline_events (agent_id, task_id, workspace_id, dataset_id, event_name, raw_data, transformed_data, tags, embedding, event_timestamp) VALUES (generateUUIDv4(), generateUUIDv4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Crypto Price Alert', '{"symbol": "BTC", "price": 43250.75, "currency": "USD", "change_24h": 2.3, "alert_type": "price_target"}', NULL, ['financial', 'crypto', 'bitcoin', 'alert'], [0.7, 0.5, 0.8, 0.9], now() - INTERVAL 30 MINUTE);

INSERT INTO pipeline_events (agent_id, task_id, workspace_id, dataset_id, event_name, raw_data, transformed_data, tags, embedding, event_timestamp) VALUES (generateUUIDv4(), generateUUIDv4(), 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Trading Volume Spike', '{"symbol": "TSLA", "volume": 45678900, "avg_volume": 28456000, "spike_ratio": 1.61, "time_window": "1h"}', NULL, ['financial', 'stock', 'tesla', 'volume', 'spike'], [0.8, 0.6, 0.9, 0.7], now() - INTERVAL 75 MINUTE);


-- ========================================
-- Task Metrics Seed Data (DISABLED - using real traces instead)
-- ========================================

-- NOTE: Seed data for task_metrics is disabled.
-- We now capture real metrics and traces from actual agent execution.
-- Run an agent in the playground to generate real data.

/*
-- Performance metrics for Research & Writing Assistant (agent_id: 4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d)
-- Version v1 (current version)
INSERT INTO task_performance_metrics (task_id, agent_id, agent_name, parent_agent_id, workspace_id, agent_version, duration_ms, input_tokens, output_tokens, cost_usd, status, task_input, task_output, executed_at) VALUES 
('11111111-1111-1111-1111-111111111111', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'Research & Writing Assistant', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'v1', 2500, 1200, 800, 0.011, 'completed', 'Write a blog post about AI trends', 'Here is a comprehensive blog post about AI trends in 2024...', now() - INTERVAL 1 DAY),
('22222222-2222-2222-2222-222222222222', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'Research & Writing Assistant', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'v1', 3200, 1500, 1200, 0.016, 'completed', 'Research quantum computing applications', 'Quantum computing is revolutionizing multiple industries...', now() - INTERVAL 2 DAY),
('33333333-3333-3333-3333-333333333333', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'Research & Writing Assistant', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'v1', 1800, 900, 600, 0.008, 'completed', 'Summarize recent tech news', 'Key tech news: Major AI advancements, new chip releases...', now() - INTERVAL 3 DAY),
('44444444-4444-4444-4444-444444444444', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'Research & Writing Assistant', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'v1', 4500, 2000, 1500, 0.020, 'completed', 'Write technical documentation for API', 'API Documentation: Authentication, Endpoints, Examples...', now() - INTERVAL 4 DAY),
('55555555-5555-5555-5555-555555555555', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'Research & Writing Assistant', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'v1', 2100, 1100, 700, 0.010, 'completed', 'Create social media content', 'Social media post: Engaging content about our new features...', now() - INTERVAL 5 DAY);

-- Version v2 (experimental - slightly faster but less verbose)
INSERT INTO task_performance_metrics (task_id, agent_id, agent_name, parent_agent_id, workspace_id, agent_version, duration_ms, input_tokens, output_tokens, cost_usd, status, task_input, task_output, executed_at) VALUES 
('66666666-6666-6666-6666-666666666666', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'Research & Writing Assistant', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'v2', 2000, 1000, 650, 0.009, 'completed', 'Write a blog post about AI trends', 'Concise blog post covering key AI trends in 2024...', now() - INTERVAL 1 DAY),
('77777777-7777-7777-7777-777777777777', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'Research & Writing Assistant', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'v2', 2800, 1300, 1000, 0.013, 'completed', 'Research quantum computing applications', 'Quantum computing applications: Healthcare, finance, cryptography...', now() - INTERVAL 2 DAY),
('88888888-8888-8888-8888-888888888888', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'Research & Writing Assistant', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'v2', 1500, 800, 500, 0.007, 'completed', 'Summarize recent tech news', 'Tech news summary: AI, chips, cloud computing...', now() - INTERVAL 3 DAY);

-- ===================================
-- Quality Metrics (Removed)
-- ===================================
-- Note: No default quality metrics are seeded in ClickHouse
-- Users create custom quality metrics through the UI
-- The metric definitions are stored in Postgres and referenced here by metric_definition_id
-- 
-- Previously seeded default metrics (Response Helpfulness, Safety & Compliance, etc.) have been removed
-- Only custom metrics created by users will appear in the analytics
-- 
/*-- Sample Task Metrics Data for Development/Demo
-- This gives the analytics page data to display
-- Database is specified in connection URL

-- Sample task IDs and agent ID (using the Research & Writing Assistant from agents-seed.sql)
-- Agent ID: 4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d
-- Workspace ID: c926e979-1f16-46bf-a7cc-8aab70162d65

-- ========================================
-- Performance Metrics (from traces)
-- ========================================
-- NOTE: Costs calculated using GPT-5 pricing: $1.25/1M input, $10.00/1M output

INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, agent_name, agent_version,
    metric_category, duration_ms, input_tokens, output_tokens, cost_usd, status,
    response_id, response_index, message_count,
    task_input, task_output,
    created_at
) VALUES 
-- Last 7 days of tasks (using GPT-5 model)
('11111111-1111-1111-1111-111111111111', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Research & Writing Assistant', 'v1', 'performance', 2500, 1200, 800, 0.009500, 'completed', 'resp_001', 1, 2, 'Write a blog post about AI trends', 'Here is a comprehensive blog post about AI trends in 2024...', now() - INTERVAL 1 DAY),
('22222222-2222-2222-2222-222222222222', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Research & Writing Assistant', 'v1', 'performance', 3200, 1500, 1200, 0.013875, 'completed', 'resp_002', 1, 2, 'Research quantum computing applications', 'Quantum computing is revolutionizing multiple industries...', now() - INTERVAL 2 DAY),
('33333333-3333-3333-3333-333333333333', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Research & Writing Assistant', 'v1', 'performance', 1800, 900, 600, 0.007125, 'completed', 'resp_003', 1, 2, 'Summarize recent tech news', 'Key tech news: Major AI advancements...', now() - INTERVAL 3 DAY),
('44444444-4444-4444-4444-444444444444', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Research & Writing Assistant', 'v1', 'performance', 4500, 2000, 1500, 0.017500, 'completed', 'resp_004', 1, 2, 'Write technical documentation for API', 'API Documentation: Authentication, Endpoints...', now() - INTERVAL 4 DAY),
('55555555-5555-5555-5555-555555555555', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Research & Writing Assistant', 'v1', 'performance', 2100, 1100, 700, 0.008375, 'completed', 'resp_005', 1, 2, 'Create social media content', 'Social media post: Engaging content...', now() - INTERVAL 5 DAY),
('66666666-6666-6666-6666-666666666666', '4a1a7e60-8b2f-4a3b-9c1d-5e6f7a8b9c0d', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Research & Writing Assistant', 'v1', 'performance', 2700, 1300, 900, 0.010625, 'completed', 'resp_006', 1, 2, 'Analyze market trends', 'Market analysis reveals...', now() - INTERVAL 6 DAY);

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

-- ClickHouse seed data for Demo
-- Metrics and feedback for healthcare insurance and newsletter agent tasks
-- Database is specified in connection URL

-- ==========================
-- SCENARIO 1: Healthcare Insurance Support - Performance Metrics
-- ==========================
-- NOTE: Costs calculated using GPT-5 pricing: $1.25/1M input, $10.00/1M output

-- Performance metrics for the healthcare insurance tasks
-- Version 1 (original) - Failed to validate policy status
-- Version 2 (improved) - Successfully validated policy status and caught expired policy
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, agent_name, parent_agent_id, agent_version,
    metric_category, duration_ms, input_tokens, output_tokens, cost_usd, status,
    response_id, response_index, message_count,
    task_input, task_output,
    created_at
) VALUES 
('10000003-0003-0003-0003-000000000003', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'v1', 'performance', 2150, 520, 310, 0.003750, 'completed', 'resp_health_003', 1, 4, 'My policy number is 0345678. Am I covered for physical therapy?', 'Yes! Based on your policy 0345678, physical therapy is covered. Your copay is $25 per session...', now() - INTERVAL 3 DAY),
('a4cc0ca4-0827-43cd-85e9-eb125c7359f7', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'v1', 'performance', 2800, 1885, 1507, 0.017427, 'completed', 'resp_0577462a113957750068edbd4523d08190b3c6105421771bf5', 1, 2, 'My policy number is 0123456, am I covered for physical therapy?', 'Here is what your policy shows for physical therapy (policy 0123456): Coverage summary - Covered: Yes, in-network - Copay: $15 per visit...', now() - INTERVAL 2 DAY),
('10000010-0010-0010-0010-000000000010', 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'v2', 'performance', 2450, 580, 380, 0.004525, 'completed', 'resp_health_010', 1, 3, 'Hi, my policy number is 0456789. I need to get an MRI - is that covered?', 'I need to inform you that your policy 0456789 is currently showing as expired...', now() - INTERVAL 1 DAY),
('10000006-0006-0006-0006-000000000006', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'v1', 'performance', 1650, 420, 250, 0.003025, 'completed', 'resp_health_006', 1, 2, 'Policy 0678901 - What is my ER copay?', 'Emergency room visits have a copay of $150 per visit...', now() - INTERVAL 6 DAY),
('10000007-0007-0007-0007-000000000007', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'v1', 'performance', 1900, 470, 290, 0.003488, 'completed', 'resp_health_007', 1, 2, 'Vision coverage inquiry', 'Vision coverage includes annual eye exams...', now() - INTERVAL 7 DAY),
('10000009-0009-0009-0009-000000000009', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'v1', 'performance', 1850, 460, 280, 0.003375, 'failed', 'resp_health_009', 1, 2, 'Lab work coverage', 'Lab work is typically covered...', now() - INTERVAL 6 DAY);


-- ==========================
-- SCENARIO 1: Healthcare Insurance - Feedback/Quality Metrics
-- ==========================

-- User feedback as quality metrics - stored in feedback category
-- V1 (original): Negative feedback - gave coverage info for expired policy
-- V1 (successful): Positive feedback - comprehensive and helpful policy information
-- V2 (improved): Positive feedback - caught expired policy proactively
-- V1 failure: Customer discovered policy was expired AFTER being told they were covered
-- V2 success: Customer grateful that agent caught expired policy before they went to appointment
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, agent_name, parent_agent_id,
    metric_category, metric_name, metric_type,
    passed, reasoning,
    response_id, response_index, message_count,
    created_at
) VALUES 
('10000003-0003-0003-0003-000000000003', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'feedback', 'user_feedback', 'negative', false, 'Bad - I went to my physical therapy appointment and they told me I am not covered anymore. My policy expired last month! The agent should have checked this.', 'resp_health_003', 1, 4, now() - INTERVAL 3 DAY),
('a4cc0ca4-0827-43cd-85e9-eb125c7359f7', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'feedback', 'user_feedback', 'positive', true, 'Great - Very thorough explanation of my PT coverage! I now understand my copay, visit limits, referral requirements, and deductible details. Exactly what I needed to know.', 'resp_0577462a113957750068edbd4523d08190b3c6105421771bf5', 1, 2, now() - INTERVAL 2 DAY),
('10000010-0010-0010-0010-000000000010', 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'feedback', 'user_feedback', 'positive', true, 'Excellent - Thank you for catching that my policy expired! I had no idea and would have been surprised at my appointment. This saved me a lot of trouble.', 'resp_health_010', 1, 3, now() - INTERVAL 1 DAY),
('10000006-0006-0006-0006-000000000006', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'feedback', 'user_feedback', 'negative', false, 'Not helpful - My actual copay is $250. The agent should have looked up my specific policy details!', 'resp_health_006', 1, 2, now() - INTERVAL 6 DAY);


-- ==========================
-- SCENARIO 2: Newsletter Agent - Performance Metrics
-- ==========================
-- NOTE: Costs calculated using GPT-5 pricing: $1.25/1M input, $10.00/1M output

-- Performance metrics for newsletter tasks (with outdated content issue)
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, agent_name, agent_version,
    metric_category, duration_ms, input_tokens, output_tokens, cost_usd, status,
    response_id, response_index, message_count,
    task_input, task_output,
    created_at
) VALUES 
('20000010-0000-0000-0000-000000000010', '20000001-0000-0000-0000-000000000001', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'leader-newsletter-creator', 'v1', 'performance', 8500, 2800, 1500, 0.018500, 'completed', 'resp_news_001', 1, 6, 'Create todays daily newsletter from recent tech leader posts', 'Tech Leader Newsletter - October 9, 2024 [Contains 3-month-old posts from July-September]', now() - INTERVAL 2 DAY);


-- ==========================
-- SCENARIO 1: Custom Quality Metric - Policy Status Validation
-- ==========================
-- NOTE: Eval costs calculated using GPT-5 nano pricing: $0.05/1M input, $0.40/1M output
-- Assuming ~800 input tokens (prompt + task data) and ~300 output tokens (reasoning)

-- Quality metric evaluations for healthcare agent tasks
-- This LLM-as-judge metric checks if agent validated policy status (active vs expired) before providing coverage info
-- V1 (original): Failed evaluation - provided coverage info for expired policy
-- V1 (successful): Passed evaluation - retrieved specific policy data and provided comprehensive info
-- V2 (improved): Passed evaluation - validated policy status first and caught expired policy
-- V1 failure: Gave coverage details without validating policy was expired
-- V2 success: Validated policy status and caught expiration before providing coverage
INSERT INTO task_metrics (
    task_id, agent_id, workspace_id, agent_name, parent_agent_id,
    metric_category, metric_definition_id, metric_name, metric_type,
    passed, score, reasoning,
    eval_duration_ms, eval_cost_usd,
    response_id, response_index, message_count,
    created_at
) VALUES 
('10000003-0003-0003-0003-000000000003', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'quality', 'bbbbbbbb-1111-2222-3333-444444444444', 'Policy Status Validation', 'llm_judge', false, 0, 'Agent provided coverage details for policy 0345678 without validating policy status. Customer later discovered policy was expired, leading to complaint.', 1250, 0.00016, 'resp_health_003', 1, 4, now() - INTERVAL 3 DAY),
('a4cc0ca4-0827-43cd-85e9-eb125c7359f7', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'quality', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Response Helpfulness', 'llm_judge', true, 95, 'Comprehensive and well-structured response providing all relevant coverage details: copay, visit limits, network requirements, referral needs, deductible info, and helpful next steps. Excellent organization with clear sections.', 1400, 0.00016, 'resp_0577462a113957750068edbd4523d08190b3c6105421771bf5', 1, 2, now() - INTERVAL 2 DAY),
('a4cc0ca4-0827-43cd-85e9-eb125c7359f7', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'quality', 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'Safety & Compliance', 'llm_judge', true, 98, 'Response is safe, professional, and compliant with healthcare communication standards. No problematic content.', 950, 0.00016, 'resp_0577462a113957750068edbd4523d08190b3c6105421771bf5', 1, 2, now() - INTERVAL 2 DAY),
('10000010-0010-0010-0010-000000000010', 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'quality', 'bbbbbbbb-1111-2222-3333-444444444444', 'Policy Status Validation', 'llm_judge', true, 100, 'Agent validated policy status for 0456789, detected policy was expired (ended August 15, 2024), and proactively informed customer before providing coverage details. Excellent validation.', 1320, 0.00016, 'resp_health_010', 1, 3, now() - INTERVAL 1 DAY),
('10000010-0010-0010-0010-000000000010', 'cccccccc-dddd-eeee-ffff-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'quality', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Response Helpfulness', 'llm_judge', true, 92, 'Helpful response that correctly identified the expired policy and provided clear next steps for the customer to renew coverage.', 1250, 0.00016, 'resp_health_010', 1, 3, now() - INTERVAL 1 DAY),
('10000006-0006-0006-0006-000000000006', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'quality', 'bbbbbbbb-1111-2222-3333-444444444444', 'Policy Status Validation', 'llm_judge', false, 0, 'Agent gave generic copay info without querying actual policy 0678901 details or validating status', 1180, 0.00016, 'resp_health_006', 1, 2, now() - INTERVAL 6 DAY),
('10000007-0007-0007-0007-000000000007', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'quality', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Response Helpfulness', 'llm_judge', true, 88, 'Good response covering vision coverage details clearly. Helpful and accurate.', 1100, 0.00016, 'resp_health_007', 1, 2, now() - INTERVAL 7 DAY),
('10000007-0007-0007-0007-000000000007', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'quality', 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'Safety & Compliance', 'llm_judge', true, 100, 'Safe and compliant healthcare information.', 850, 0.00016, 'resp_health_007', 1, 2, now() - INTERVAL 7 DAY),
('10000009-0009-0009-0009-000000000009', 'cccccccc-dddd-eeee-ffff-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'support-healthinsurance', 'cccccccc-dddd-eeee-ffff-333333333333', 'quality', 'bbbbbbbb-1111-2222-3333-444444444444', 'Policy Status Validation', 'llm_judge', false, 0, 'Generic response without policy validation', 1150, 0.00016, 'resp_health_009', 1, 2, now() - INTERVAL 6 DAY);


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
('20000010-0000-0000-0000-000000000010', '20000001-0000-0000-0000-000000000001', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'feedback', 'user_feedback', 'negative', false, 'Bad - All of these posts are MONTHS old! This newsletter is supposed to have content from the last 24 hours, not 3-month-old posts. Completely useless!', 'resp_news_001', 1, 6, now() - INTERVAL 2 DAY);


-- ==========================
-- Summary
-- ==========================

-- This creates metrics showing:
-- 1. Healthcare Support Agent - Policy Validation Improvement:
--    Version 1 (original):
--      - Task 10000003: Gave coverage info for EXPIRED policy (0345678) without validation
--      - Customer complained: "I'm not covered anymore. My policy expired last month!"
--      - Custom metric FAILED: Did not validate policy status
--      - Negative feedback
--    Version 2 (improved):
--      - Task 10000010: Validated policy status for 0456789, detected expiration, warned customer
--      - Customer praised: "Thank you for catching that my policy expired!"
--      - Custom metric PASSED: Properly validated policy status
--      - Positive feedback
--      - Shows todos tracking verification steps
--
-- 2. Newsletter Agent: Task with negative feedback about old content
--    - Issue: Subagent tool lacks timestamp filter, retrieves all historical posts
--
-- Demo flow:
-- 1. Analytics shows Version 1 with thumbs down, Version 2 with thumbs up
-- 2. User compares tasks to see what's different
-- 3. Custom "Policy Status Validation" metric shows V1 failed, V2 passed
-- 4. V2 agent has updatetodos tool to track verification steps transparently
-- 5. Clear before/after demonstration of improvement
