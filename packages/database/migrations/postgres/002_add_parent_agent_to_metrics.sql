-- Add many-to-many relationship between metrics and agents
-- This allows metrics to be scoped to multiple parent agents (and all their versions)

-- Create junction table for metric-agent associations
CREATE TABLE IF NOT EXISTS metric_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_definition_id UUID NOT NULL REFERENCES metric_definitions(id) ON DELETE CASCADE,
    parent_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Ensure unique metric-agent pairs
    CONSTRAINT unique_metric_agent UNIQUE(metric_definition_id, parent_agent_id)
);

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_metric_agents_metric_id ON metric_agents(metric_definition_id);
CREATE INDEX IF NOT EXISTS idx_metric_agents_agent_id ON metric_agents(parent_agent_id);

-- Add comment explaining the table
COMMENT ON TABLE metric_agents IS 
'Many-to-many relationship between metrics and parent agents. When a metric has associated agents, it only runs for tasks using those parent agents or any of their versions. When a metric has no associated agents, it runs for all tasks in the workspace.';

