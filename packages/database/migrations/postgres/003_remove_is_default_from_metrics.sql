-- Migration: Remove is_default column from metric_definitions
-- Since we no longer want default/built-in quality metrics

-- Drop the is_default column
ALTER TABLE metric_definitions 
DROP COLUMN IF EXISTS is_default;

