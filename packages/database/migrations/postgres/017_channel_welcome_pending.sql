-- Defer the in-channel welcome message for private Slack channels.
-- See migration 016 for the channels table itself.
--
-- Why this is a separate migration: 016 was already applied in earlier
-- dev environments before these columns existed. We use ADD COLUMN
-- IF NOT EXISTS so this is idempotent: fresh installs get the columns
-- from 016 (which now also defines them) and then this is a no-op.

ALTER TABLE channels
    ADD COLUMN IF NOT EXISTS welcome_pending BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE channels
    ADD COLUMN IF NOT EXISTS connected_by_user_id UUID
    REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_channels_welcome_pending
    ON channels(channel_integration_id, external_channel_id)
    WHERE welcome_pending = TRUE;
