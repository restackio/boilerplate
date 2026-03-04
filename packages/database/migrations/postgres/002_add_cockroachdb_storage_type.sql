-- Migration: add 'cockroachdb' as an allowed storage_type for datasets
-- Drops the old CHECK constraint and replaces it with one that includes cockroachdb.

ALTER TABLE datasets DROP CONSTRAINT IF EXISTS valid_storage_type;

ALTER TABLE datasets
    ADD CONSTRAINT valid_storage_type
    CHECK (storage_type IN ('clickhouse', 'cockroachdb'));
