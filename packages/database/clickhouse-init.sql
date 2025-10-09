-- ClickHouse Universal Event Storage
-- Single table for ANY type of event data from pipeline agents
-- Fully dynamic schema with vector embeddings for semantic search

-- Create database
CREATE DATABASE IF NOT EXISTS boilerplate_clickhouse;

-- Use the clickhouse database
USE boilerplate_clickhouse;

-- Universal Pipeline Events - Single table for ANY type of event data
CREATE TABLE IF NOT EXISTS pipeline_events (
    id UUID DEFAULT generateUUIDv4(),
    
    -- Pipeline tracking (required)
    agent_id UUID, -- Which pipeline agent generated this event
    task_id Nullable(UUID), -- Task ID from PostgreSQL (if event is task-related)
    workspace_id UUID,
    dataset_id Nullable(String), -- Optional dataset association (name or UUID)
    
    -- Event identification
    event_name String, -- Human readable event name
    
    -- Dynamic event data (JSON for ultimate flexibility)
    raw_data JSON, -- ALL original event-specific data goes here - completely flexible schema
    transformed_data Nullable(JSON), -- Optional processed/transformed version of the data
    
    -- Flexible tagging system for classification and search
    tags Array(String), -- Searchable tags/keywords/labels for any classification needs
    
    -- Vector embedding for semantic search (the magic sauce!)
    embedding Array(Float32), -- Vector representation of the event for semantic queries
    
    -- Timestamps (required)
    event_timestamp DateTime64(3), -- When the original event occurred
    ingested_at DateTime64(3) DEFAULT now64(3), -- When we stored it
    date Date MATERIALIZED toDate(event_timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (agent_id, event_timestamp)
SETTINGS index_granularity = 8192;


-- ========================================
-- Task Metrics System (Unified)
-- ========================================

-- Unified task_metrics table - stores ALL metric types (performance + quality)
-- Simpler schema with metric_category to distinguish types
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
    
    -- Evaluation metadata
    eval_duration_ms Nullable(UInt32), -- For quality: time to evaluate; for performance: task duration
    eval_cost_usd Nullable(Float64), -- For quality: cost to evaluate
    
    -- Context (for retroactive evaluation - stored but NOT returned in typical queries)
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
CREATE INDEX IF NOT EXISTS idx_task_metrics_task_id ON task_metrics (task_id) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_task_metrics_agent_id ON task_metrics (agent_id) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_task_metrics_category ON task_metrics (metric_category) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_task_metrics_name ON task_metrics (metric_name) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_task_metrics_passed ON task_metrics (passed) TYPE bloom_filter GRANULARITY 1;
