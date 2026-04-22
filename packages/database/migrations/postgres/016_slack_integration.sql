-- Slack integration tables: workspace installations and per-agent channel permissions.

CREATE TABLE IF NOT EXISTS slack_installations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         TEXT NOT NULL UNIQUE,
    team_name       TEXT NOT NULL DEFAULT '',
    bot_token       TEXT NOT NULL,
    bot_user_id     TEXT NOT NULL DEFAULT '',
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    installed_by    TEXT,
    installed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slack_installations_workspace
    ON slack_installations(workspace_id);

CREATE TABLE IF NOT EXISTS slack_channel_agents (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slack_installation_id   UUID NOT NULL REFERENCES slack_installations(id) ON DELETE CASCADE,
    channel_id              TEXT NOT NULL,
    channel_name            TEXT NOT NULL DEFAULT '',
    agent_id                UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    is_default              BOOLEAN NOT NULL DEFAULT false,
    enabled                 BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (slack_installation_id, channel_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_slack_channel_agents_lookup
    ON slack_channel_agents(channel_id, slack_installation_id) WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_slack_channel_agents_agent
    ON slack_channel_agents(agent_id);

-- Partial unique index: only one default agent per installation
CREATE UNIQUE INDEX IF NOT EXISTS idx_slack_channel_agents_default
    ON slack_channel_agents(slack_installation_id) WHERE is_default = true;
