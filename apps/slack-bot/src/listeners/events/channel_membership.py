"""Handle ``member_joined_channel`` events to fire deferred welcomes.

When the agent builder connects an agent to a **private** Slack channel,
the bot can't self-join (Slack constraint), so the welcome message gets
deferred. The connection is stored with ``welcome_pending=true`` and we
wait for the user to actually invite the bot.

Slack delivers ``member_joined_channel`` whenever any user joins a
channel the bot is in. When the joining user is the bot itself (added
via ``/invite @bot`` or by typing ``@bot`` and clicking 'Invite Them'
on Slack's prompt), we:

1. Atomically pop the pending welcome flag for that channel.
2. Post the welcome message attributing the connection to whoever
   triggered the connect step in the agent builder.

This event requires a subscription in the Slack app config:
``api.slack.com/apps`` → Event Subscriptions → bot events →
``member_joined_channel``. No additional OAuth scopes are needed
beyond the ones we already request.
"""

from __future__ import annotations

import asyncio
import logging

from ...app import app
from ...bot_services.channel_router import consume_pending_welcome
from ...bot_services.lifecycle import maybe_handle_auth_failure

logger = logging.getLogger(__name__)


@app.event("member_joined_channel")
def handle_member_joined_channel(event, body, client):
    """Bolt fires this for *every* member join in any channel the bot's in.

    We delegate to an async handler so the workflow round-trip doesn't
    block Bolt's event loop.
    """
    asyncio.run(_handle_member_joined_channel(event, body, client))


async def _handle_member_joined_channel(event, body, client):
    user_id = event.get("user") or ""
    channel_id = event.get("channel") or ""
    team_id = body.get("team_id") or event.get("team") or ""

    if not user_id or not channel_id or not team_id:
        return

    # Identify whether *we* are the joiner. Slack fires this event for
    # every member that joins, so without the gate we'd post the welcome
    # the first time any human joined the channel — wrong attribution and
    # potentially before the bot is even there. ``auth.test`` is per-team
    # token so it returns the bot user id for the workspace this event
    # came from (Bolt's TokenManager already scoped the client).
    try:
        auth = client.auth_test()
        bot_user_id = auth.get("user_id")
    except Exception as e:  # noqa: BLE001
        # If the install is dead, drop it the same way other listeners do
        # so the dashboard reflects reality.
        dropped = await maybe_handle_auth_failure(team_id, e)
        if dropped:
            logger.info(
                "Dropped Slack install for team %s after auth_test failure",
                team_id,
            )
            return
        logger.exception("auth_test failed; cannot decide if joiner is the bot")
        return

    if not bot_user_id or user_id != bot_user_id:
        return

    result = await consume_pending_welcome(team_id, channel_id)
    if not result or not result.get("found"):
        # Common case for already-public channels: nothing pending,
        # nothing to do. We still get the event; we just no-op.
        return

    agent_name = result.get("agent_name") or "Restack agent"
    connected_by_user_name = result.get("connected_by_user_name") or ""

    if connected_by_user_name:
        text = (
            f"👋 Hi! I'm *{agent_name}*. I was just connected to this "
            f"channel by *{connected_by_user_name}*. Mention me with "
            f"`@{agent_name}` or send me a DM to get started."
        )
    else:
        text = (
            f"👋 Hi! I'm *{agent_name}*. I was just connected to this "
            f"channel. Mention me with `@{agent_name}` or send me a DM "
            f"to get started."
        )

    try:
        client.chat_postMessage(channel=channel_id, text=text)
    except Exception as e:  # noqa: BLE001
        # The flag has already been cleared by the consume call. We log
        # and move on rather than re-pending — re-pending could spam if
        # the post failure is transient and the next join event
        # (e.g. the user themselves) re-triggers it.
        dropped = await maybe_handle_auth_failure(team_id, e)
        if not dropped:
            logger.exception(
                "Failed to post deferred welcome message in channel %s",
                channel_id,
            )
