-- Snapshot a Slack channel's display name on the connection row so the UI can
-- show ``#general`` instead of the raw ``C0AS7JQHXFA`` id. The slack-bot
-- still treats the id as the source of truth for routing; this column is
-- presentation-only and gets refreshed opportunistically (see
-- ``slack_refresh_channel_names`` activity).
--
-- Idempotent: fresh installs add the column once; re-applies are no-ops.

ALTER TABLE channels
    ADD COLUMN IF NOT EXISTS external_channel_name TEXT;
