-- Unified Task Metrics Table
-- Consolidates performance + quality metrics into a single table
-- Replaces: task_performance_metrics + task_quality_metrics

USE boilerplate_clickhouse;

-- Drop old tables (if consolidating)
-- DROP TABLE IF EXISTS task_performance_metrics;
-- DROP TABLE IF EXISTS task_quality_metrics;

-- Unified task_metrics table
CREATE TABLE IF NOT EXISTS task_metrics (
    id UUID DEFAULT generateUUIDv4(),
    
    -- Identifiers (common to all metric types)
    task_id UUID,
    agent_id UUID,
    workspace_id UUID,
    agent_name Nullable(String), -- For performance metrics
    parent_agent_id Nullable(UUID), -- For performance metrics
    
    -- Version tracking for A/B testing
    agent_version String DEFAULT 'v1',
    
    -- Response tracking (for continuous metrics)
    response_id Nullable(String), -- OpenAI response ID (resp_xxx)
    response_index Nullable(UInt16), -- Which response in conversation (1, 2, 3...)
    message_count Nullable(UInt16), -- Total messages in conversation so far
    
    -- Metric identification
    metric_category LowCardinality(String), -- 'performance', 'quality', 'security', 'compliance', etc.
    metric_name Nullable(String), -- For quality metrics: name of the metric
    metric_type Nullable(String), -- For quality: 'llm_judge', 'python_code', 'formula'
    metric_definition_id Nullable(UUID), -- For quality: references PostgreSQL
    
    -- Performance metrics (nullable, only populated for performance category)
    duration_ms Nullable(UInt32),
    input_tokens Nullable(UInt32),
    output_tokens Nullable(UInt32),
    cost_usd Nullable(Float64),
    status Nullable(String), -- completed, failed, in_progress
    
    -- Quality metrics (nullable, only populated for quality category)
    passed Nullable(Boolean), -- Pass or fail result
    score Nullable(Float64), -- Optional score 0-100
    reasoning Nullable(String), -- Explanation (mainly for LLM judges)
    
    -- Evaluation metadata (applicable to both types)
    eval_duration_ms Nullable(UInt32), -- For quality: time to evaluate
    eval_cost_usd Nullable(Float64), -- For quality: cost to evaluate
    
    -- Context (for retroactive evaluation - NOT returned in typical queries)
    task_input Nullable(String),
    task_output Nullable(String),
    
    -- Timestamps
    created_at DateTime64(3) DEFAULT now64(3),
    date Date MATERIALIZED toDate(created_at)
) ENGINE = MergeTree()
PARTITION BY (toYYYYMM(date), metric_category)
ORDER BY (workspace_id, agent_version, task_id, metric_category, created_at)
SETTINGS index_granularity = 8192;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_task_id ON task_metrics (task_id) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_agent_id ON task_metrics (agent_id) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_metric_category ON task_metrics (metric_category) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_metric_name ON task_metrics (metric_name) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_quality_passed ON task_metrics (passed) TYPE bloom_filter GRANULARITY 1;

-- Migration strategy (optional - for moving existing data):
-- 1. Migrate performance metrics:
-- INSERT INTO task_metrics SELECT
--     id, task_id, agent_id, workspace_id, agent_name, parent_agent_id,
--     agent_version, response_id, response_index, message_count,
--     'performance' as metric_category, NULL, NULL, NULL,
--     duration_ms, input_tokens, output_tokens, cost_usd, status,
--     NULL, NULL, NULL, NULL, NULL,
--     task_input, task_output,
--     executed_at, date
-- FROM task_performance_metrics;

-- 2. Migrate quality metrics:
-- INSERT INTO task_metrics SELECT
--     id, task_id, agent_id, workspace_id, NULL, NULL,
--     'v1', response_id, response_index, message_count,
--     'quality' as metric_category, metric_name, metric_type, metric_definition_id,
--     NULL, NULL, NULL, NULL, NULL,
--     passed, score, reasoning, eval_duration_ms, eval_cost_usd,
--     NULL, NULL,
--     evaluated_at, date
-- FROM task_quality_metrics;

