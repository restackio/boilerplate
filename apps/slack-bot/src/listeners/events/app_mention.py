"""Handle @mentions of the bot in channels."""

import asyncio
import logging

from ...app import app
from ...config import config
from ...database import get_task_by_thread_ts, resolve_workspace_id
from ...bot_services.agent_resolver import fetch_available_agents, resolve_agent
from ...bot_services.channel_router import route_slack_event
from ...bot_services.concierge import run_concierge
from ...bot_services.lifecycle import maybe_handle_auth_failure
from ...bot_services.task_manager import create_task_from_slack, send_message_to_agent
from ...utils.blocks import (
    agent_selector_blocks,
    error_blocks,
    status_blocks,
    task_created_blocks,
)
from ...utils.formatters import format_slack_message_for_task
from ...utils.helpers import BOT_MENTION_RE, extract_task_id

logger = logging.getLogger(__name__)


@app.event("app_mention")
def handle_app_mention(event, say, client):
    """Handle when the bot is @mentioned in a channel."""
    asyncio.run(_handle_mention(event, say, client))


async def _handle_mention(event, say, client):
    user_id = event.get("user")
    raw_text = event.get("text", "")
    channel_id = event.get("channel")
    message_ts = event.get("ts")
    thread_ts = event.get("thread_ts")

    message_text = BOT_MENTION_RE.sub("", raw_text).strip()
    if not message_text:
        say(
            text="You mentioned me but didn't include a message. Try again with a request.",
            thread_ts=thread_ts or message_ts,
        )
        return

    # If this @mention is inside an existing thread, forward to the running agent
    if thread_ts:
        try:
            task = await get_task_by_thread_ts(thread_ts)
            if (
                task
                and task.get("temporal_agent_id")
                and task["status"] not in ("completed", "closed", "failed")
            ):
                client.reactions_add(
                    channel=channel_id, timestamp=message_ts, name="speech_balloon"
                )
                await send_message_to_agent(
                    temporal_agent_id=task["temporal_agent_id"],
                    message_text=message_text,
                )
                return
        except Exception as e:
            logger.warning("Thread reply lookup failed, creating new task: %s", e)

    try:
        client.reactions_add(
            channel=channel_id,
            timestamp=message_ts,
            name="eyes",
        )
    except Exception:
        pass

    try:
        user_info = client.users_info(user=user_id)
        user_name = user_info["user"].get("real_name") or user_info["user"]["name"]

        team_id = event.get("team") or event.get("team_id") or ""
        workspace_id = None
        agent = None
        channel_route_found_no_agent = False

        # Try channel routing first — gives us workspace + agent in one call
        if team_id and channel_id:
            route = await route_slack_event(team_id, channel_id)
            if route:
                workspace_id = route.get("workspace_id")
                if route.get("found") and route.get("agent_id"):
                    agent = {
                        "id": route["agent_id"],
                        "name": route.get("agent_name", "Agent"),
                    }
                    if route.get("bot_token"):
                        client.token = route["bot_token"]
                elif route.get("found") is False and route.get("installation_id"):
                    channel_route_found_no_agent = True
                    if route.get("bot_token"):
                        client.token = route["bot_token"]

        # Fall back to the original workspace resolution
        if not workspace_id:
            workspace_id = await resolve_workspace_id(event)

        if not workspace_id:
            say(
                text="Workspace not connected.",
                blocks=error_blocks(
                    "This Slack workspace is not connected. "
                    "Set `DEFAULT_WORKSPACE_ID` or connect via OAuth."
                ),
                thread_ts=message_ts,
            )
            return

        if channel_route_found_no_agent and agent is None:
            channel_name = ""
            try:
                info = client.conversations_info(channel=channel_id)
                channel_name = info["channel"].get("name", "")
            except Exception:
                pass

            result = await run_concierge(
                user_message=message_text,
                context={
                    "workspace_id": workspace_id,
                    "installation_id": (route or {}).get("installation_id"),
                    "channel_id": channel_id,
                    "channel_name": channel_name,
                    "slack_user_id": user_id,
                    "user_name": user_name,
                    "thread_ts": message_ts,
                    "team_id": team_id,
                    "dashboard_url": (
                        f"{config.FRONTEND_URL.rstrip('/')}/integrations/slack"
                    ),
                },
            )
            try:
                client.reactions_remove(
                    channel=channel_id, timestamp=message_ts, name="eyes"
                )
            except Exception:
                pass
            say(text=result.reply_text, thread_ts=message_ts)
            return

        # If channel routing didn't resolve an agent, fall back to LLM auto-resolve
        if agent is None:
            agents = await fetch_available_agents(workspace_id)
            if not agents:
                say(
                    text="No agents configured.",
                    blocks=error_blocks(
                        "No agents found in this workspace. Create one in the dashboard first."
                    ),
                    thread_ts=message_ts,
                )
                return

            agent = await resolve_agent(message_text, agents)

            if agent is None:
                say(
                    text="Which agent should handle this?",
                    blocks=agent_selector_blocks(agents, message_text, user_id),
                    thread_ts=message_ts,
                    metadata={
                        "event_type": "pending_task",
                        "event_payload": {
                            "workspace_id": workspace_id,
                            "message_text": message_text,
                            "user_id": user_id,
                            "user_name": user_name,
                            "channel_id": channel_id,
                            "message_ts": message_ts,
                        },
                    },
                )
                return

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
            is_channel_message=True,
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

            try:
                client.reactions_remove(
                    channel=channel_id, timestamp=message_ts, name="eyes"
                )
            except Exception:
                pass

            say(
                text=f"Task created with {agent['name']}",
                blocks=task_created_blocks(task_id, agent["name"]),
                thread_ts=message_ts,
            )
        else:
            say(
                text="Failed to create task.",
                blocks=error_blocks("Something went wrong creating the task."),
                thread_ts=message_ts,
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

        logger.exception("Error handling app_mention: %s", e)
        try:
            say(
                text=f"Error: {e}",
                blocks=error_blocks(f"Sorry, an error occurred: {e}"),
                thread_ts=message_ts,
            )
        except Exception:
            logger.debug("Failed to report error back to Slack", exc_info=True)
