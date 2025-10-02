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
