"""Slack notification functions for posting to Slack via bot token."""

import logging
import os
from typing import Any

import httpx
from pydantic import BaseModel, Field
from restack_ai.function import function

logger = logging.getLogger(__name__)

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SLACK_API_BASE = "https://slack.com/api"


class SlackPostMessageInput(BaseModel):
    channel: str = Field(..., description="Slack channel ID")
    text: str = Field(..., description="Fallback text")
    blocks: list[dict[str, Any]] | None = Field(
        None, description="Block Kit blocks"
    )
    thread_ts: str | None = Field(
        None, description="Thread timestamp to reply in"
    )


class SlackPostMessageOutput(BaseModel):
    ok: bool
    message_ts: str | None = None
    error: str | None = None


class SlackUpdateMessageInput(BaseModel):
    channel: str = Field(..., description="Slack channel ID")
    ts: str = Field(
        ..., description="Message timestamp to update"
    )
    text: str = Field(..., description="Updated fallback text")
    blocks: list[dict[str, Any]] | None = Field(
        None, description="Updated Block Kit blocks"
    )


class SlackUpdateMessageOutput(BaseModel):
    ok: bool
    error: str | None = None


class SlackReactionInput(BaseModel):
    channel: str = Field(..., description="Slack channel ID")
    timestamp: str = Field(..., description="Message timestamp")
    name: str = Field(
        ..., description="Emoji name without colons"
    )


class SlackReactionOutput(BaseModel):
    ok: bool
    error: str | None = None


class TaskSlackCallbackInput(BaseModel):
    task_id: str = Field(..., description="Task ID")
    task_title: str = Field(..., description="Task title")
    task_status: str = Field(
        ...,
        description="Task status (completed, failed, etc)",
    )
    agent_name: str = Field(..., description="Agent name")
    task_metadata: dict[str, Any] | None = Field(
        None,
        description="Task metadata with Slack context",
    )
    result_summary: str | None = Field(
        None, description="Summary of task result"
    )
    frontend_url: str | None = Field(
        None, description="Base URL for the frontend dashboard"
    )


class TaskSlackCallbackOutput(BaseModel):
    notified: bool
    message_ts: str | None = None
    error: str | None = None


async def _slack_api_call(
    method: str, payload: dict[str, Any]
) -> dict[str, Any]:
    """Make a Slack API call using the bot token."""
    if not SLACK_BOT_TOKEN:
        return {"ok": False, "error": "no_bot_token"}

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SLACK_API_BASE}/{method}",
            json=payload,
            headers={
                "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        return response.json()


@function.defn()
async def slack_post_message(
    function_input: SlackPostMessageInput,
) -> SlackPostMessageOutput:
    """Post a new message to a Slack channel or thread."""
    if not SLACK_BOT_TOKEN:
        return SlackPostMessageOutput(
            ok=False, error="SLACK_BOT_TOKEN not configured"
        )

    payload: dict[str, Any] = {
        "channel": function_input.channel,
        "text": function_input.text,
    }
    if function_input.blocks:
        payload["blocks"] = function_input.blocks
    if function_input.thread_ts:
        payload["thread_ts"] = function_input.thread_ts

    result = await _slack_api_call("chat.postMessage", payload)

    if result.get("ok"):
        return SlackPostMessageOutput(
            ok=True,
            message_ts=result.get("ts"),
        )

    error = result.get("error", "unknown_error")
    logger.warning("Failed to post Slack message: %s", error)
    return SlackPostMessageOutput(ok=False, error=error)


@function.defn()
async def slack_update_message(
    function_input: SlackUpdateMessageInput,
) -> SlackUpdateMessageOutput:
    """Update an existing Slack message (for progressive streaming)."""
    if not SLACK_BOT_TOKEN:
        return SlackUpdateMessageOutput(
            ok=False, error="SLACK_BOT_TOKEN not configured"
        )

    payload: dict[str, Any] = {
        "channel": function_input.channel,
        "ts": function_input.ts,
        "text": function_input.text,
    }
    if function_input.blocks:
        payload["blocks"] = function_input.blocks

    result = await _slack_api_call("chat.update", payload)

    if result.get("ok"):
        return SlackUpdateMessageOutput(ok=True)

    error = result.get("error", "unknown_error")
    logger.warning("Failed to update Slack message: %s", error)
    return SlackUpdateMessageOutput(ok=False, error=error)


@function.defn()
async def slack_add_reaction(
    function_input: SlackReactionInput,
) -> SlackReactionOutput:
    """Add an emoji reaction to a Slack message."""
    if not SLACK_BOT_TOKEN:
        return SlackReactionOutput(
            ok=False, error="SLACK_BOT_TOKEN not configured"
        )

    result = await _slack_api_call(
        "reactions.add",
        {
            "channel": function_input.channel,
            "timestamp": function_input.timestamp,
            "name": function_input.name,
        },
    )

    if (
        result.get("ok")
        or result.get("error") == "already_reacted"
    ):
        return SlackReactionOutput(ok=True)

    error = result.get("error", "unknown_error")
    logger.warning("Failed to add Slack reaction: %s", error)
    return SlackReactionOutput(ok=False, error=error)


@function.defn()
async def slack_remove_reaction(
    function_input: SlackReactionInput,
) -> SlackReactionOutput:
    """Remove an emoji reaction from a Slack message."""
    if not SLACK_BOT_TOKEN:
        return SlackReactionOutput(
            ok=False, error="SLACK_BOT_TOKEN not configured"
        )

    result = await _slack_api_call(
        "reactions.remove",
        {
            "channel": function_input.channel,
            "timestamp": function_input.timestamp,
            "name": function_input.name,
        },
    )

    if result.get("ok") or result.get("error") == "no_reaction":
        return SlackReactionOutput(ok=True)

    error = result.get("error", "unknown_error")
    logger.warning("Failed to remove Slack reaction: %s", error)
    return SlackReactionOutput(ok=False, error=error)


@function.defn()
async def notify_slack_on_task_complete(
    function_input: TaskSlackCallbackInput,
) -> TaskSlackCallbackOutput:
    """Notify Slack when a task completes, fails, or closes."""
    meta = function_input.task_metadata or {}
    slack_channel = meta.get("slack_channel")
    slack_thread_ts = meta.get("slack_thread_ts") or None

    if not slack_channel:
        return TaskSlackCallbackOutput(
            notified=False,
            error="No Slack context in task metadata",
        )

    if not SLACK_BOT_TOKEN:
        return TaskSlackCallbackOutput(
            notified=False,
            error="SLACK_BOT_TOKEN not configured",
        )

    status_emoji = {
        "completed": ":white_check_mark:",
        "failed": ":x:",
        "closed": ":warning:",
    }.get(function_input.task_status, ":information_source:")

    frontend_url = function_input.frontend_url or os.getenv(
        "FRONTEND_URL", "http://localhost:3000"
    )
    task_url = f"{frontend_url}/tasks/{function_input.task_id}"

    blocks: list[dict[str, Any]] = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"{status_emoji} *Task {function_input.task_status.title()}*\n\n"
                    f"*{function_input.task_title}*\n"
                    f"Agent: {function_input.agent_name}"
                ),
            },
        },
    ]

    if function_input.result_summary:
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": function_input.result_summary[:3000],
                },
            }
        )

    blocks.append(
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "View in Dashboard",
                    },
                    "url": task_url,
                    "action_id": "view_task",
                }
            ],
        }
    )

    payload: dict[str, Any] = {
        "channel": slack_channel,
        "text": f"Task {function_input.task_status}: {function_input.task_title}",
        "blocks": blocks,
    }
    if slack_thread_ts:
        payload["thread_ts"] = slack_thread_ts

    result = await _slack_api_call(
        "chat.postMessage",
        payload,
    )

    if result.get("ok"):
        if slack_thread_ts:
            reaction = {
                "completed": "white_check_mark",
                "failed": "x",
                "closed": "warning",
            }.get(function_input.task_status, "white_check_mark")

            await _slack_api_call(
                "reactions.remove",
                {
                    "channel": slack_channel,
                    "timestamp": slack_thread_ts,
                    "name": "eyes",
                },
            )
            await _slack_api_call(
                "reactions.add",
                {
                    "channel": slack_channel,
                    "timestamp": slack_thread_ts,
                    "name": reaction,
                },
            )

        return TaskSlackCallbackOutput(
            notified=True,
            message_ts=result.get("ts"),
        )

    error = result.get("error", "unknown_error")
    logger.warning(
        "Failed to notify Slack on task complete: %s", error
    )
    return TaskSlackCallbackOutput(notified=False, error=error)
