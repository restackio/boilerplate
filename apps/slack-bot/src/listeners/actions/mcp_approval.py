"""Handle MCP tool approval/rejection via Slack buttons."""

import asyncio
import logging

from ...app import app
from ...database import get_task_by_thread_ts

logger = logging.getLogger(__name__)


@app.action("mcp_approve")
def handle_mcp_approve(ack, body, client, say):
    """User approved an MCP tool execution."""
    ack()
    asyncio.run(_handle_approval(body, client, say, approved=True))


@app.action("mcp_reject")
def handle_mcp_reject(ack, body, client, say):
    """User rejected an MCP tool execution."""
    ack()
    asyncio.run(_handle_approval(body, client, say, approved=False))


async def _handle_approval(body, client, say, *, approved: bool):
    try:
        user_id = body["user"]["id"]
        approval_id = body["actions"][0]["value"]
        channel_id = body["channel"]["id"]
        message_ts = body["message"]["ts"]
        thread_ts = body["message"].get("thread_ts") or message_ts

        status_text = "Approved" if approved else "Rejected"
        status_emoji = ":white_check_mark:" if approved else ":x:"

        client.chat_update(
            channel=channel_id,
            ts=message_ts,
            text=f"{status_text} by <@{user_id}>",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"{status_emoji} *{status_text}* by <@{user_id}>",
                    },
                },
                {
                    "type": "context",
                    "elements": [
                        {"type": "mrkdwn", "text": f"Approval ID: `{approval_id}`"}
                    ],
                },
            ],
        )

        task = await get_task_by_thread_ts(thread_ts)
        if task and task.get("temporal_agent_id"):
            from ...client import client as restack_client

            try:
                await restack_client.send_agent_event(
                    event_name="mcp_approval",
                    agent_id=task["temporal_agent_id"],
                    event_input={
                        "approval_id": approval_id,
                        "approved": approved,
                        "user_id": user_id,
                    },
                )
                logger.info(
                    "Sent MCP %s to agent %s",
                    "approval" if approved else "rejection",
                    task["temporal_agent_id"],
                )
            except Exception as e:
                logger.warning("Failed to send MCP approval event: %s", e)
                say(
                    text="Could not forward approval to the agent.",
                    thread_ts=thread_ts,
                )
        else:
            logger.warning("No active agent found for thread %s", thread_ts)

    except Exception as e:
        logger.exception("Error handling MCP approval: %s", e)
        try:
            say(text="Something went wrong processing the approval. Please try again.")
        except Exception:
            pass
