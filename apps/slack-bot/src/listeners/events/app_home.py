"""Publish the App Home tab when a user opens it."""

import asyncio
import logging

from ...app import app
from ...config import config
from ...database import resolve_workspace_id

logger = logging.getLogger(__name__)


@app.event("app_home_opened")
def handle_app_home_opened(event, client):
    """Build and publish the Home tab (Block Kit home view)."""
    if event.get("tab") != "home":
        return
    asyncio.run(_publish_app_home(event, client))


async def _publish_app_home(event, client) -> None:
    user_id = event["user"]
    workspace_id = await resolve_workspace_id(event)
    connected = bool(workspace_id)

    if connected:
        status_md = (
            ":white_check_mark: *Workspace connected* — this Slack workspace is "
            "linked to your Restack account."
        )
    else:
        status_md = (
            ":warning: *Not connected* — link this workspace in the dashboard under "
            "Slack integrations, or set `DEFAULT_WORKSPACE_ID` for development."
        )

    configure_url = f"{config.FRONTEND_URL.rstrip('/')}/integrations/slack"

    blocks = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": ":robot_face: *Restack AI Agents*",
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "Your AI agents, connected to Slack.",
            },
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": status_md,
            },
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Getting Started*",
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    "• *@mention* the bot in a channel to start a task with a routed or "
                    "auto-selected agent.\n"
                    "• *DM* the bot for a private conversation with your agents.\n"
                    "• *Reply in the thread* to continue the same task after the bot responds."
                ),
            },
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "Configure which agents handle which channels:",
            },
            "accessory": {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "Configure Agents",
                    "emoji": True,
                },
                "url": configure_url,
                "action_id": "app_home_configure_agents",
            },
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "Manage which agents handle which channels in the dashboard.",
                }
            ],
        },
    ]

    try:
        client.views_publish(
            user_id=user_id,
            view={
                "type": "home",
                "blocks": blocks,
            },
        )
    except Exception:
        logger.exception("Failed to publish App Home for user %s", user_id)
