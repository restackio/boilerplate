-- ClickHouse Seed Data for Development
USE boilerplate_clickhouse;

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