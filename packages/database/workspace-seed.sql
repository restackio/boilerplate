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
('11111111-1111-1111-1111-111111111111', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Product', 'Responsible for product strategy and development', 'Lightbulb'),
('22222222-2222-2222-2222-222222222222', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Engineering', 'Develops and maintains the product', 'Code'),
('33333333-3333-3333-3333-333333333333', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Marketing', 'Handles marketing and customer outreach', 'Megaphone'),
('44444444-4444-4444-4444-444444444444', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Sales', 'Manages sales and customer relationships', 'DollarSign'),
('55555555-5555-5555-5555-555555555555', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'Support', 'Provides customer support', 'HeadphonesIcon')
ON CONFLICT (id) DO NOTHING;

-- Insert single dataset representing all pipeline events
INSERT INTO datasets (id, workspace_id, name, description, storage_type, storage_config) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c926e979-1f16-46bf-a7cc-8aab70162d65', 'pipeline_events', 'All pipeline events from ClickHouse - unified event storage', 'clickhouse', 
 '{"database": "boilerplate_clickhouse", "table": "pipeline_events"}')
ON CONFLICT (id) DO NOTHING;
