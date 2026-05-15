"""Handle agent selection dropdown when auto-resolution is skipped."""

import asyncio
import logging

from ...app import app
from ...bot_services.task_manager import create_task_from_slack
from ...utils.blocks import error_blocks, task_created_blocks
from ...utils.formatters import format_slack_message_for_task
from ...utils.helpers import extract_task_id

logger = logging.getLogger(__name__)


@app.action("select_agent_for_task")
def handle_agent_selection(ack, body, say, client):
    """User selected an agent from the fallback dropdown."""
    ack()
    asyncio.run(_do_agent_selection(body, say, client))


async def _do_agent_selection(body, say, client):
    try:
        selected = body["actions"][0]["selected_option"]
        agent_id = selected["value"]
        agent_name = selected["text"]["text"]

        user_id = body["user"]["id"]
        channel_id = body["channel"]["id"]
        message = body["message"]
        thread_ts = message.get("thread_ts") or message.get("ts")
        team_id = (body.get("team") or {}).get("id") or body.get("team_id") or ""

        metadata = message.get("metadata", {}).get("event_payload", {})
        workspace_id = metadata.get("workspace_id")
        message_text = metadata.get("message_text", "")
        user_name = metadata.get("user_name", "Unknown")

        if not workspace_id:
            from ...config import config

            workspace_id = config.DEFAULT_WORKSPACE_ID

        if not workspace_id:
            say(
                text="Workspace not configured.",
                blocks=error_blocks(
                    "No workspace configured. Set DEFAULT_WORKSPACE_ID."
                ),
                thread_ts=thread_ts,
            )
            return

        client.chat_update(
            channel=channel_id,
            ts=message["ts"],
            text=f"Creating task with {agent_name}...",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f":hourglass_flowing_sand: Creating task with *{agent_name}*...",
                    },
                }
            ],
        )

        is_channel = bool(channel_id) and not channel_id.startswith("D")
        title, description = format_slack_message_for_task(
            user_name=user_name,
            user_id=user_id,
            message_text=message_text,
            channel_id=channel_id,
            message_ts=thread_ts,
            is_channel_message=is_channel,
        )

        # Best-effort channel-name snapshot for task_metadata.
        channel_name = ""
        if is_channel:
            try:
                info = client.conversations_info(channel=channel_id)
                channel_name = info["channel"].get("name", "")
            except Exception:
                pass

        result = await create_task_from_slack(
            workspace_id=workspace_id,
            agent_id=agent_id,
            agent_name=agent_name,
            title=title,
            description=description,
            slack_channel=channel_id,
            slack_thread_ts=thread_ts,
            slack_user_id=user_id,
            slack_team_id=team_id or None,
            slack_channel_name=channel_name or None,
        )

        if result:
            task_id = extract_task_id(result)
            client.chat_update(
                channel=channel_id,
                ts=message["ts"],
                text=f"Task created with {agent_name}",
                blocks=task_created_blocks(task_id, agent_name),
            )
        else:
            say(
                text="Failed to create task.",
                blocks=error_blocks("Something went wrong creating the task."),
                thread_ts=thread_ts,
            )

    except Exception as e:
        logger.exception("Error handling agent selection: %s", e)
        say(
            text=f"Error: {e}",
            blocks=error_blocks(f"Error creating task: {e}"),
            thread_ts=body.get("message", {}).get("ts"),
        )


@app.action("view_task")
def handle_view_task(ack, body):
    """Acknowledge button clicks for external URL buttons."""
    ack()
