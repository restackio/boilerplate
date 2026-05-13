DROP TABLE IF EXISTS slack_channel_agents CASCADE;
DROP TABLE IF EXISTS slack_installations CASCADE;

CREATE TABLE IF NOT EXISTS channel_integrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_type    TEXT NOT NULL,
    external_id     TEXT NOT NULL,
    credentials     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT channel_integrations_channel_type_check
        CHECK (channel_type IN ('slack')),
    UNIQUE (channel_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_integrations_workspace
    ON channel_integrations(workspace_id);

CREATE TABLE IF NOT EXISTS channels (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_integration_id      UUID NOT NULL REFERENCES channel_integrations(id) ON DELETE CASCADE,
    external_channel_id         TEXT NOT NULL,
    agent_id                    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    welcome_pending             BOOLEAN NOT NULL DEFAULT FALSE,
    connected_by_user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (channel_integration_id, external_channel_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_channels_lookup
    ON channels(external_channel_id, channel_integration_id);

CREATE INDEX IF NOT EXISTS idx_channels_welcome_pending
    ON channels(channel_integration_id, external_channel_id)
    WHERE welcome_pending = TRUE;
