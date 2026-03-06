-- Migration: add 'cockroachdb' as an allowed storage_type for datasets
-- The datasets table has two CHECK constraints on storage_type that both need updating:
--   1. valid_storage_type  -- named constraint created by the SQLAlchemy model
--   2. datasets_storage_type_check -- auto-named inline constraint from the CREATE TABLE SQL
ALTER TABLE datasets DROP CONSTRAINT IF EXISTS valid_storage_type;
ALTER TABLE datasets DROP CONSTRAINT IF EXISTS datasets_storage_type_check;
ALTER TABLE datasets
ADD CONSTRAINT valid_storage_type CHECK (storage_type IN ('clickhouse', 'cockroachdb'));
