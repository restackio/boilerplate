-- CockroachDB Initial Schema Migration
-- Creates the pipeline_events table for the CockroachDB context store option.
-- Uses PostgreSQL-compatible types since CockroachDB speaks the PostgreSQL wire protocol.

-- Create the database (idempotent)
CREATE DATABASE IF NOT EXISTS boilerplate_cockroachdb;

USE boilerplate_cockroachdb;

-- Migration tracking table (mirrors the pattern used for ClickHouse and PostgreSQL)
CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_name STRING PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Universal pipeline events table for the CockroachDB context store.
-- Schema mirrors ClickHouse pipeline_events but uses CockroachDB/PostgreSQL-compatible types:
--   JSON        -> JSONB
--   Array(String) -> TEXT[]
--   Array(Float32) -> FLOAT8[]
--   DateTime64  -> TIMESTAMPTZ
CREATE TABLE IF NOT EXISTS pipeline_events (
    id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    agent_id    UUID        NOT NULL,
    task_id     UUID,
    workspace_id UUID       NOT NULL,
    dataset_id  TEXT,
    event_name  TEXT        NOT NULL,
    raw_data    JSONB       NOT NULL DEFAULT '{}',
    transformed_data JSONB,
    tags        TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    embedding   FLOAT8[]    NOT NULL DEFAULT ARRAY[]::FLOAT8[],
    event_timestamp TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (id),
    INDEX idx_pipeline_agent_ts  (agent_id, event_timestamp),
    INDEX idx_pipeline_workspace (workspace_id),
    INDEX idx_pipeline_dataset   (dataset_id),
    INDEX idx_pipeline_ingested  (ingested_at DESC)
);
