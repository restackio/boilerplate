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
-- Task Metrics System
-- ========================================

-- Task Performance Metrics - ALWAYS captured (speed, tokens, cost)
CREATE TABLE IF NOT EXISTS task_performance_metrics (
    id UUID DEFAULT generateUUIDv4(),
    
    -- Identifiers
    task_id UUID,
    agent_id UUID,
    agent_name String,
    parent_agent_id Nullable(UUID),
    workspace_id UUID,
    
    -- Version tracking for A/B testing
    agent_version String DEFAULT 'v1',
    
    -- Performance data
    duration_ms UInt32,
    input_tokens UInt32,
    output_tokens UInt32,
    cost_usd Float64,
    status String, -- completed, failed
    
    -- Context (for running metrics retroactively)
    task_input String,
    task_output String,
    
    -- Timestamps
    executed_at DateTime64(3) DEFAULT now64(3),
    date Date MATERIALIZED toDate(executed_at)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (workspace_id, parent_agent_id, agent_version, executed_at)
SETTINGS index_granularity = 8192;

CREATE INDEX IF NOT EXISTS idx_perf_task_id ON task_performance_metrics (task_id) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_perf_agent_id ON task_performance_metrics (agent_id) TYPE bloom_filter GRANULARITY 1;


-- Task Quality Metrics - Custom metric results (LLM judges, code, formulas)
CREATE TABLE IF NOT EXISTS task_quality_metrics (
    id UUID DEFAULT generateUUIDv4(),
    
    -- Identifiers
    task_id UUID,
    agent_id UUID,
    workspace_id UUID,
    metric_definition_id UUID, -- References PostgreSQL
    metric_name String, -- Denormalized for easy queries
    metric_type String, -- llm_judge, python_code, formula
    
    -- Results (flexible for different output types)
    score Float32, -- 0-100 or custom range
    passed Boolean, -- For pass/fail metrics
    reasoning Nullable(String), -- Explanation (mainly for LLM judges)
    metadata JSON, -- Additional context
    
    -- Execution metadata
    eval_duration_ms UInt32,
    eval_cost_usd Float64,
    
    -- Timestamps
    evaluated_at DateTime64(3) DEFAULT now64(3),
    date Date MATERIALIZED toDate(evaluated_at)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (workspace_id, task_id, metric_definition_id, evaluated_at)
SETTINGS index_granularity = 8192;

CREATE INDEX IF NOT EXISTS idx_quality_metric_def ON task_quality_metrics (metric_definition_id) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_quality_metric_name ON task_quality_metrics (metric_name) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_quality_passed ON task_quality_metrics (passed) TYPE bloom_filter GRANULARITY 1;
