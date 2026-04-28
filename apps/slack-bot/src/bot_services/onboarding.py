"""Onboarding DMs and channel notifications for the Slack bot."""

from __future__ import annotations

import logging
from typing import Any, Callable

import httpx

logger = logging.getLogger(__name__)

SLACK_API = "https://slack.com/api"


def _welcome_blocks(team_name: str, frontend_url: str) -> list[dict[str, Any]]:
    base = frontend_url.rstrip("/")
    dashboard_url = f"{base}/integrations/slack"
    return [
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


async def send_welcome_dm(
    bot_token: str,
    installer_user_id: str,
    team_name: str,
    frontend_url: str,
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

            blocks = _welcome_blocks(team_name, frontend_url)
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
