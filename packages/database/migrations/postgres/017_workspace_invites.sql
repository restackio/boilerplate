-- Workspace invite links (email-bound, owner-managed, single-use)
CREATE TABLE IF NOT EXISTS workspace_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    token VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    declined_at TIMESTAMP,
    revoked_at TIMESTAMP,
    accepted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Only one pending invite per (workspace, email). Regenerate flow revokes old + creates new.
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_invites_pending
ON workspace_invites(workspace_id, invited_email)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace_status
ON workspace_invites(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_token
ON workspace_invites(token);
