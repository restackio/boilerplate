-- ClickHouse Migration Tracking Table
-- This table tracks which migrations have been applied

CREATE DATABASE IF NOT EXISTS boilerplate_clickhouse;

USE boilerplate_clickhouse;

CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_name String,
    applied_at DateTime64(3) DEFAULT now64(3)
) ENGINE = MergeTree()
ORDER BY migration_name
SETTINGS index_granularity = 8192;


