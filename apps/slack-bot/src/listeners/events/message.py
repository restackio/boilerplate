"""Handle DM and thread-reply messages."""

import asyncio
import logging

from ...app import app
from ...config import config
from ...database import get_task_by_thread_ts, resolve_workspace_id
from ...bot_services.channel_router import route_slack_event
from ...bot_services.concierge import run_concierge
from ...bot_services.lifecycle import maybe_handle_auth_failure
from ...bot_services.task_manager import create_task_from_slack, send_message_to_agent
from ...utils.blocks import (
    error_blocks,
    status_blocks,
    task_created_blocks,
)
from ...utils.formatters import format_slack_message_for_task
from ...utils.helpers import BOT_MENTION_RE, extract_task_id

logger = logging.getLogger(__name__)


@app.event("message")
def handle_message_events(event, say, client):
    """Route incoming messages to the correct handler."""
    if event.get("subtype") in ("bot_message", "message_changed", "message_deleted"):
        return

    if event.get("bot_id"):
        return

    text = event.get("text", "")

    if event.get("thread_ts"):
        # Skip @mentions in threads - handled by app_mention handler
        if BOT_MENTION_RE.search(text):
            return
        asyncio.run(_handle_thread_reply(event, say, client))
        return

    if event.get("channel_type") == "im":
        asyncio.run(_handle_new_dm(event, say, client))


async def _handle_new_dm(event, say, client):
    """Handle a new DM: channel routing → auto-resolve agent → create task."""
    user_id = event.get("user")
    message_text = event.get("text", "").strip()
    channel_id = event.get("channel")
    message_ts = event.get("ts")

    if not message_text:
        return

    try:
        user_info = client.users_info(user=user_id)
        user_name = user_info["user"].get("real_name") or user_info["user"]["name"]

        team_id = event.get("team") or event.get("team_id") or ""
        workspace_id = None
        channel_integration_id = None
        agent = None

        # Try channel routing first
        if team_id and channel_id:
            route = await route_slack_event(team_id, channel_id)
            if route:
                workspace_id = route.get("workspace_id")
                channel_integration_id = route.get("channel_integration_id")
                if route.get("found") and route.get("agent_id"):
                    agent = {"id": route["agent_id"], "name": route.get("agent_name", "Agent")}
                    if route.get("bot_token"):
                        client.token = route["bot_token"]

        if not workspace_id:
            workspace_id = await resolve_workspace_id(event)

        if not workspace_id:
            say(
                text="This Slack workspace is not connected to a platform workspace.",
                blocks=error_blocks(
                    "This Slack workspace is not connected. "
                    "Set `DEFAULT_WORKSPACE_ID` or connect via OAuth."
                ),
                thread_ts=message_ts,
            )
            return

        # DMs with no explicit channel mapping go through the concierge.
        # The concierge can chat, list agents, and hand off via its tools.
        if agent is None:
            result = await run_concierge(
                user_message=message_text,
                context={
                    "workspace_id": workspace_id,
                    "channel_integration_id": channel_integration_id,
                    "channel_id": channel_id,
                    "channel_name": "",
                    "slack_user_id": user_id,
                    "user_name": user_name,
                    "thread_ts": message_ts,
                    "team_id": team_id,
                    "dashboard_url": (
                        f"{config.FRONTEND_URL.rstrip('/')}/integrations/slack"
                    ),
                },
            )
            say(text=result.reply_text, thread_ts=message_ts)
            return

        # Explicitly mapped DM (unusual but supported): go straight to the agent.
        say(
            text="Working on it...",
            blocks=status_blocks("Working on it...", context=f"Agent: {agent['name']}"),
            thread_ts=message_ts,
        )

        title, description = format_slack_message_for_task(
            user_name=user_name,
            user_id=user_id,
            message_text=message_text,
            channel_id=channel_id,
            message_ts=message_ts,
        )

        result = await create_task_from_slack(
            workspace_id=workspace_id,
            agent_id=agent["id"],
            agent_name=agent["name"],
            title=title,
            description=description,
            slack_channel=channel_id,
            slack_thread_ts=message_ts,
            slack_user_id=user_id,
            slack_team_id=team_id or None,
        )

        if result:
            task_id = extract_task_id(result)
            say(
                text=f"Task created with {agent['name']}",
                blocks=task_created_blocks(task_id, agent["name"]),
                thread_ts=message_ts,
            )
        else:
            say(
                text="Failed to create task.",
                blocks=error_blocks(
                    "Something went wrong creating the task. Please try again."
                ),
                thread_ts=message_ts,
            )

    except Exception as e:
        # If Slack tells us the bot token is dead, drop the installation so
        # the dashboard stops claiming "Connected". Don't try to say() — the
        # same token would fail again; just log and move on.
        team_id = event.get("team") or event.get("team_id") or ""
        dropped = await maybe_handle_auth_failure(team_id, e)
        if dropped:
            logger.info(
                "Removed stale Slack installation for team %s after auth error",
                team_id,
            )
            return

        logger.exception("Error handling DM: %s", e)
        try:
            say(
                text=f"Error: {e}",
                blocks=error_blocks(f"Sorry, an error occurred: {e}"),
                thread_ts=event.get("ts"),
            )
        except Exception:
            logger.debug("Failed to report error back to Slack", exc_info=True)


async def _handle_thread_reply(event, say, client):
    """Forward thread replies to the running agent."""
    thread_ts = event.get("thread_ts")
    message_text = event.get("text", "").strip()
    channel_id = event.get("channel")
    message_ts = event.get("ts")

    if not message_text:
        return

    try:
        task = await get_task_by_thread_ts(thread_ts)

        if not task:
            return

        if task["status"] in ("completed", "closed", "failed"):
            say(
                text="This task has already finished.",
                blocks=status_blocks(
                    "This task has already finished. Start a new message to create a new task.",
                    emoji=":information_source:",
                ),
                thread_ts=thread_ts,
            )
            return

        temporal_agent_id = task.get("temporal_agent_id")
        if not temporal_agent_id:
            say(
                text="No running agent found for this task.",
                blocks=error_blocks("No active agent found for this task."),
                thread_ts=thread_ts,
            )
            return

        client.reactions_add(
            channel=channel_id,
            timestamp=message_ts,
            name="speech_balloon",
        )

        sent = await send_message_to_agent(
            temporal_agent_id=temporal_agent_id,
            message_text=message_text,
        )

        if not sent:
            say(
                text="Couldn't forward your message to the agent.",
                blocks=error_blocks(
                    "Failed to forward message to the agent. It may have already finished."
                ),
                thread_ts=thread_ts,
            )

    except Exception as e:
        team_id = event.get("team") or event.get("team_id") or ""
        dropped = await maybe_handle_auth_failure(team_id, e)
        if dropped:
            logger.info(
                "Removed stale Slack installation for team %s after auth error",
                team_id,
            )
            return

        logger.exception("Error handling thread reply: %s", e)
        try:
            say(
                text="Something went wrong forwarding your message.",
                blocks=error_blocks(f"Sorry, an error occurred: {e}"),
                thread_ts=thread_ts,
            )
        except Exception:
            logger.debug("Failed to report error back to Slack", exc_info=True)
