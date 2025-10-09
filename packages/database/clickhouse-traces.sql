-- Task Observability System (inspired by OpenAI Agents Tracing & OpenTelemetry)
-- Reference: https://openai.github.io/openai-agents-python/ref/tracing/
-- 
-- Traces = immutable source of truth (can recompute metrics retroactively)
-- Metrics = pre-computed aggregates (fast dashboard queries)

USE boilerplate_clickhouse;

-- ================================================================
-- 1. TASK TRACES - Immutable execution log (source of truth)
-- ================================================================
-- Hierarchical spans (like OpenTelemetry) - each span is a unit of work
-- Parent-child relationships allow drilling down from task → response → tool call

CREATE TABLE IF NOT EXISTS task_traces (
    -- Span identification (OpenTelemetry-style)
    trace_id UUID, -- Groups related spans (one task = one trace)
    span_id UUID DEFAULT generateUUIDv4(), -- Unique ID for this span
    parent_span_id Nullable(UUID), -- For nested operations (tool calls, subtasks)
    
    -- Business identifiers
    task_id UUID, -- Links to PostgreSQL tasks table
    agent_id UUID,
    agent_name String,
    workspace_id UUID,
    agent_version String DEFAULT 'v1',
    
    -- Span classification (typed, like OpenAI Agents)
    span_type LowCardinality(String), -- 'agent', 'generation', 'function', 'guardrail', 'handoff'
    span_name String, -- Human-readable name: "GPT-4o generation", "search_web tool"
    
    -- Performance data (always captured for all span types)
    duration_ms UInt32,
    status LowCardinality(String), -- 'ok', 'error', 'cancelled'
    
    -- LLM-specific data (nullable, only for 'generation' spans)
    model_name Nullable(String),
    input_tokens Nullable(UInt32),
    output_tokens Nullable(UInt32),
    cost_usd Nullable(Float64),
    
    -- Full I/O context (CRITICAL for retroactive quality metrics!)
    -- Stored compressed - ClickHouse handles this efficiently
    input String, -- Task input, user message, tool args, etc.
    output String, -- Task output, assistant message, tool result, etc.
    
    -- Structured metadata (tool calls, errors, etc.)
    metadata JSON,
    error_message Nullable(String),
    error_type Nullable(String),
    
    -- Timestamps
    started_at DateTime64(3),
    ended_at DateTime64(3),
    date Date MATERIALIZED toDate(ended_at)
) ENGINE = MergeTree()
PARTITION BY (toYYYYMM(date), span_type)
ORDER BY (workspace_id, agent_version, trace_id, started_at)
SETTINGS index_granularity = 8192;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_traces_task_id ON task_traces (task_id) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_traces_agent_id ON task_traces (agent_id) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_traces_span_id ON task_traces (span_id) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_traces_status ON task_traces (status) TYPE bloom_filter GRANULARITY 1;


-- ================================================================
-- 2. METRIC EVALUATIONS - Quality metric results (recomputable)
-- ================================================================
-- Separate from traces because:
-- 1. Can be recomputed when metric definitions change
-- 2. Multiple metrics evaluated against same trace
-- 3. Evaluation happens async (may be delayed)

CREATE TABLE IF NOT EXISTS metric_evaluations (
    id UUID DEFAULT generateUUIDv4(),
    
    -- Links to trace
    task_id UUID,
    trace_id UUID, -- References task_traces.id (which span was evaluated)
    agent_id UUID,
    workspace_id UUID,
    
    -- Metric definition
    metric_definition_id UUID, -- References PostgreSQL
    metric_name String,
    metric_type LowCardinality(String), -- 'llm_judge', 'python_code', 'formula'
    
    -- Results
    passed Boolean,
    score Nullable(Float64), -- 0-100 score
    reasoning Nullable(String), -- Explanation from LLM judge
    
    -- Evaluation metadata
    eval_duration_ms UInt32,
    eval_cost_usd Float64,
    eval_version UInt16 DEFAULT 1, -- Increment when re-evaluating
    
    -- Timestamps
    evaluated_at DateTime64(3) DEFAULT now64(3),
    date Date MATERIALIZED toDate(evaluated_at)
) ENGINE = ReplacingMergeTree(evaluated_at, eval_version) -- Keep latest eval per metric
PARTITION BY toYYYYMM(date)
ORDER BY (workspace_id, task_id, metric_definition_id, eval_version)
SETTINGS index_granularity = 8192;

CREATE INDEX IF NOT EXISTS idx_eval_metric_def ON metric_evaluations (metric_definition_id) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_eval_passed ON metric_evaluations (passed) TYPE bloom_filter GRANULARITY 1;


-- ================================================================
-- 3. TASK METRICS - Pre-aggregated rollups (fast dashboard queries)
-- ================================================================
-- Automatically computed from traces via materialized view
-- Use SummingMergeTree for automatic aggregation on read

CREATE TABLE IF NOT EXISTS task_metrics_rollup (
    -- Dimensions
    workspace_id UUID,
    agent_id UUID,
    agent_version String,
    date Date,
    
    -- Aggregated performance metrics
    task_count UInt64,
    total_duration_ms UInt64,
    total_input_tokens UInt64,
    total_output_tokens UInt64,
    total_cost_usd Float64,
    
    -- Status counts
    completed_count UInt64,
    failed_count UInt64,
    
    -- Quality metrics (joined from evaluations)
    quality_checks_passed UInt64,
    quality_checks_failed UInt64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (workspace_id, agent_id, agent_version, date)
SETTINGS index_granularity = 8192;


-- ================================================================
-- 4. MATERIALIZED VIEW - Auto-populate rollups from traces
-- ================================================================
-- Automatically aggregates traces into task_metrics_rollup

CREATE MATERIALIZED VIEW IF NOT EXISTS task_metrics_rollup_mv
TO task_metrics_rollup
AS SELECT
    workspace_id,
    agent_id,
    agent_version,
    date,
    count() as task_count,
    sum(duration_ms) as total_duration_ms,
    sum(input_tokens) as total_input_tokens,
    sum(output_tokens) as total_output_tokens,
    sum(cost_usd) as total_cost_usd,
    countIf(status = 'completed') as completed_count,
    countIf(status = 'failed') as failed_count,
    0 as quality_checks_passed, -- Populated separately from evaluations
    0 as quality_checks_failed
FROM task_traces
WHERE span_type = 'task_complete' -- Only count final task completion
GROUP BY workspace_id, agent_id, agent_version, date;


-- ================================================================
-- USAGE PATTERNS
-- ================================================================

-- 1. Ingest trace (on task completion):
-- INSERT INTO task_traces (task_id, agent_id, ..., task_input, task_output, ...)

-- 2. Query for retroactive evaluation (when new metric added):
-- SELECT task_id, task_input, task_output 
-- FROM task_traces 
-- WHERE workspace_id = ? AND NOT EXISTS (
--   SELECT 1 FROM metric_evaluations 
--   WHERE metric_definition_id = ? AND task_id = task_traces.task_id
-- )

-- 3. Dashboard queries (super fast - pre-aggregated):
-- SELECT * FROM task_metrics_rollup 
-- WHERE workspace_id = ? AND date >= today() - 30

-- 4. Get trace details (when user clicks on specific task):
-- SELECT * FROM task_traces WHERE task_id = ?

-- 5. Get metric results for a task:
-- SELECT * FROM metric_evaluations WHERE task_id = ?

