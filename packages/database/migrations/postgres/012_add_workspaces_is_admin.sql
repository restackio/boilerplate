-- Add is_admin to workspaces (admin workspace seed and backend model expect this column)
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
