"""Onboarding DMs and channel notifications for the Slack bot."""

from __future__ import annotations

import logging
from typing import Any, Callable

import httpx

logger = logging.getLogger(__name__)

SLACK_API = "https://slack.com/api"

# Public channel created (or joined) on successful OAuth. Requires `channels:manage`
# in the app install scope; reinstall the app if you add new scopes.
DEFAULT_SLACK_CHANNEL_NAME = "restack-agents"


def _welcome_blocks(
    team_name: str,
    frontend_url: str,
    *,
    default_channel_id: str | None = None,
) -> list[dict[str, Any]]:
    base = frontend_url.rstrip("/")
    dashboard_url = f"{base}/integrations/slack"
    blocks: list[dict[str, Any]] = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": ":wave: Welcome to Restack!",
                "emoji": True,
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"I've been installed to *{team_name}*. "
                    "Here's how to get started:"
                ),
            },
        },
    ]
    if default_channel_id:
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"• A default public channel <#{default_channel_id}> is ready. "
                        "Map an agent to it in the dashboard when you're set."
                    ),
                },
            }
        )
    blocks.extend(
        [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        ":one: *Invite me to channels* — Type `/invite @Restack` "
                        "in any channel"
                    ),
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        ":two: *Configure agents* — Assign which AI agent handles "
                        "each channel"
                    ),
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        ":three: *Start chatting* — @mention me in a channel or "
                        "send me a DM"
                    ),
                },
            },
            {"type": "divider"},
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "When you're ready, open the dashboard to assign agents to channels.",
                },
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Configure Agents"},
                        "url": dashboard_url,
                        "action_id": "onboarding_configure_agents",
                    }
                ],
            },
        ]
    )
    return blocks


async def _find_public_channel_id_by_name(
    http: httpx.AsyncClient,
    headers: dict[str, str],
    name: str,
) -> str | None:
    """Find a public channel the bot is in whose name matches ``name``."""
    cursor: str | None = None
    while True:
        params: dict[str, str | int] = {
            "types": "public_channel",
            "limit": 200,
        }
        if cursor:
            params["cursor"] = cursor
        list_resp = await http.get(
            f"{SLACK_API}/conversations.list",
            headers=headers,
            params=params,
            timeout=20.0,
        )
        data = list_resp.json()
        if not data.get("ok"):
            logger.warning("conversations.list (find channel) failed: %s", data.get("error"))
            return None
        for ch in data.get("channels") or []:
            if ch.get("name") == name:
                return ch.get("id")
        cursor = (data.get("response_metadata") or {}).get("next_cursor") or None
        if not cursor:
            return None


async def ensure_default_restack_channel(bot_token: str) -> str | None:
    """Create public ``#restack-agents`` or join it if it already exists.

    Returns the Slack channel id on success, or None if the channel could not
    be ensured (OAuth still succeeds; errors are logged).
    """
    headers = {
        "Authorization": f"Bearer {bot_token}",
        "Content-Type": "application/json; charset=utf-8",
    }
    name = DEFAULT_SLACK_CHANNEL_NAME

    try:
        async with httpx.AsyncClient() as http:
            create_resp = await http.post(
                f"{SLACK_API}/conversations.create",
                headers=headers,
                json={"name": name, "is_private": False},
                timeout=20.0,
            )
            create_data = create_resp.json()

            if create_data.get("ok"):
                ch = create_data.get("channel") or {}
                cid = ch.get("id")
                if cid:
                    logger.info("Created Slack channel #%s (%s)", name, cid)
                return cid

            err = create_data.get("error")
            if err == "name_taken":
                found = await _find_public_channel_id_by_name(http, headers, name)
                if not found:
                    logger.warning(
                        "Slack channel #%s exists but bot is not a member; "
                        "add the bot to the channel or archive/rename the old one",
                        name,
                    )
                    return None
                join_resp = await http.post(
                    f"{SLACK_API}/conversations.join",
                    headers=headers,
                    json={"channel": found},
                    timeout=20.0,
                )
                join_data = join_resp.json()
                if join_data.get("ok") or join_data.get("error") == "already_in_channel":
                    if join_data.get("ok"):
                        logger.info("Joined existing Slack channel #%s (%s)", name, found)
                    return found
                logger.warning(
                    "conversations.join for #%s failed: %s",
                    name,
                    join_data.get("error"),
                )
                return None

            logger.warning("conversations.create for #%s failed: %s", name, err)
            return None
    except httpx.HTTPError:
        logger.exception("HTTP error while ensuring default Slack channel")
        return None


async def send_welcome_dm(
    bot_token: str,
    installer_user_id: str,
    team_name: str,
    frontend_url: str,
    *,
    default_channel_id: str | None = None,
) -> None:
    """Open a DM with the installer and send the onboarding Block Kit message."""
    headers = {
        "Authorization": f"Bearer {bot_token}",
        "Content-Type": "application/json; charset=utf-8",
    }

    try:
        async with httpx.AsyncClient() as http:
            logger.debug(
                "Sending welcome DM to installer %s",
                installer_user_id,
            )
            open_resp = await http.post(
                f"{SLACK_API}/conversations.open",
                headers=headers,
                json={"users": installer_user_id},
                timeout=15.0,
            )
            open_data = open_resp.json()

            if not open_data.get("ok"):
                logger.error(
                    "conversations.open failed for installer %s: %s",
                    installer_user_id,
                    open_data.get("error"),
                )
                return

            channel = open_data.get("channel") or {}
            dm_channel_id = channel.get("id")
            if not dm_channel_id:
                logger.error(
                    "conversations.open returned no channel id for installer %s",
                    installer_user_id,
                )
                return

            blocks = _welcome_blocks(
                team_name,
                frontend_url,
                default_channel_id=default_channel_id,
            )
            post_resp = await http.post(
                f"{SLACK_API}/chat.postMessage",
                headers=headers,
                json={
                    "channel": dm_channel_id,
                    "text": "Welcome to Restack!",
                    "blocks": blocks,
                },
                timeout=15.0,
            )
            post_data = post_resp.json()

            if not post_data.get("ok"):
                logger.error(
                    "chat.postMessage (welcome DM) failed: %s",
                    post_data.get("error"),
                )
    except httpx.HTTPError:
        logger.exception("HTTP error while sending welcome DM")


async def send_channel_agent_notification(
    bot_token: str,
    channel_id: str,
    agent_name: str,
) -> None:
    """Post a channel message that the agent is now active."""
    text = (
        f":white_check_mark: I'm now active in this channel, powered by "
        f"*{agent_name}*. @mention me to get started!"
    )
    headers = {
        "Authorization": f"Bearer {bot_token}",
        "Content-Type": "application/json; charset=utf-8",
    }

    try:
        async with httpx.AsyncClient() as http:
            resp = await http.post(
                f"{SLACK_API}/chat.postMessage",
                headers=headers,
                json={
                    "channel": channel_id,
                    "text": text,
                    "blocks": [
                        {
                            "type": "section",
                            "text": {"type": "mrkdwn", "text": text},
                        }
                    ],
                },
                timeout=15.0,
            )
            data = resp.json()
            if not data.get("ok"):
                logger.error(
                    "chat.postMessage (agent notification) failed for %s: %s",
                    channel_id,
                    data.get("error"),
                )
    except httpx.HTTPError:
        logger.exception(
            "HTTP error while posting agent notification to channel %s",
            channel_id,
        )


def send_no_agent_configured_message(
    say_func: Callable[..., None],
    thread_ts: str,
    frontend_url: str,
) -> None:
    """Reply in-thread when the channel has no mapped agent."""
    url = f"{frontend_url.rstrip('/')}/integrations/slack"
    blocks: list[dict[str, Any]] = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    "No agent is configured for this channel yet. "
                    "An admin can set one up in the dashboard."
                ),
            },
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Configure in dashboard"},
                    "url": url,
                    "action_id": "no_agent_open_slack_integrations",
                }
            ],
        },
    ]
    say_func(
        text="No agent is configured for this channel yet.",
        blocks=blocks,
        thread_ts=thread_ts,
    )
