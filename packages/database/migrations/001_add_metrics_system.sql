-- Migration: Add Metrics System
-- Custom metrics can be: LLM judges, code analysis, or formulas

-- Metric Definitions - Define custom metrics
CREATE TABLE IF NOT EXISTS metric_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Metric details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'quality', 'cost', 'performance', 'custom'
    metric_type VARCHAR(50) NOT NULL, -- 'llm_judge', 'python_code', 'formula'
    
    -- Type-specific configuration (JSONB for flexibility)
    config JSONB NOT NULL,
    /* Examples:
       LLM Judge: {"judge_prompt": "...", "judge_model": "gpt-4o-mini"}
       Python Code: {"code": "def evaluate(task_input, task_output): return score"}
       Formula: {"formula": "input_tokens * 0.00003 + output_tokens * 0.00015", "variables": ["input_tokens", "output_tokens"]}
    */
    
    -- Output configuration
    output_type VARCHAR(20) DEFAULT 'score', -- 'score', 'pass_fail', 'numeric', 'boolean'
    min_value FLOAT DEFAULT 0,
    max_value FLOAT DEFAULT 100,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- Suggest for new agents
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_metric_per_workspace UNIQUE(workspace_id, name),
    CONSTRAINT valid_metric_type CHECK (metric_type IN ('llm_judge', 'python_code', 'formula')),
    CONSTRAINT valid_output_type CHECK (output_type IN ('score', 'pass_fail', 'numeric', 'boolean'))
);

CREATE INDEX idx_metric_definitions_workspace ON metric_definitions(workspace_id);
CREATE INDEX idx_metric_definitions_category ON metric_definitions(category);
CREATE INDEX idx_metric_definitions_active ON metric_definitions(is_active) WHERE is_active = true;


-- Agent Metrics - Which metrics are assigned to which agents
CREATE TABLE IF NOT EXISTS agent_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    metric_definition_id UUID NOT NULL REFERENCES metric_definitions(id) ON DELETE CASCADE,
    
    -- Configuration
    enabled BOOLEAN DEFAULT true,
    run_on_completion BOOLEAN DEFAULT true, -- Auto-run when task completes
    run_on_playground BOOLEAN DEFAULT true, -- Show in playground
    
    -- Alerting thresholds (optional)
    alert_threshold FLOAT,
    alert_condition VARCHAR(20), -- 'below', 'above', 'equals'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_agent_metric UNIQUE(agent_id, metric_definition_id),
    CONSTRAINT valid_alert_condition CHECK (alert_condition IN ('below', 'above', 'equals'))
);

CREATE INDEX idx_agent_metrics_agent ON agent_metrics(agent_id);
CREATE INDEX idx_agent_metrics_metric ON agent_metrics(metric_definition_id);
CREATE INDEX idx_agent_metrics_enabled ON agent_metrics(agent_id, enabled) WHERE enabled = true;

-- Triggers for updated_at
CREATE TRIGGER update_metric_definitions_updated_at 
    BEFORE UPDATE ON metric_definitions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_metrics_updated_at 
    BEFORE UPDATE ON agent_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
