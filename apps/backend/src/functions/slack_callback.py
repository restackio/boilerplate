"""Slack notification functions for posting to Slack via bot token."""

import logging
import os
import re
from typing import Any

import httpx
from pydantic import BaseModel, Field
from restack_ai.function import function

logger = logging.getLogger(__name__)

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SLACK_DEFAULT_CHANNEL_ID = os.getenv("SLACK_DEFAULT_CHANNEL_ID")
SLACK_API_BASE = "https://slack.com/api"
_DESCRIPTION_PREVIEW_MAX = 500


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


def _task_dashboard_url(
    frontend_url: str, task_id: str, task_title: str,
) -> str:
    """Build tasks use the builder canvas; regular tasks use the task detail page."""
    if task_title == "Build":
        return f"{frontend_url}/agents/new/{task_id}"
    return f"{frontend_url}/tasks/{task_id}"


def _table_rows_to_code_block(rows: list[list[str]]) -> str:
    """Render parsed table rows as an aligned monospace code block."""
    num_cols = max(len(r) for r in rows)
    col_widths = [
        max((len(row[i]) if i < len(row) else 0) for row in rows)
        for i in range(num_cols)
    ]
    formatted = []
    for idx, row in enumerate(rows):
        padded = [
            (row[i] if i < len(row) else "").ljust(col_widths[i])
            for i in range(num_cols)
        ]
        formatted.append(" | ".join(padded))
        if idx == 0:
            formatted.append("-+-".join("-" * w for w in col_widths))
    return "```\n" + "\n".join(formatted) + "\n```"


def _convert_inline_markdown(line: str) -> str:
    """Convert inline markdown formatting to Slack mrkdwn."""
    result = re.sub(r"\*\*(.+?)\*\*", r"*\1*", line)
    result = re.sub(r"__(.+?)__", r"*\1*", result)
    result = re.sub(
        r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"_\1_", result,
    )
    result = re.sub(r"~~(.+?)~~", r"~\1~", result)
    return re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"<\2|\1>", result)


_TABLE_SEPARATOR_RE = re.compile(r"^\|[\s:]*-+[\s:|-]*\|$")
_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$")


def markdown_to_slack(text: str) -> str:
    """Convert standard markdown to Slack mrkdwn format."""
    lines = text.split("\n")
    out: list[str] = []
    table_rows: list[list[str]] = []

    for line in lines:
        stripped = line.strip()

        if stripped.startswith("|") and stripped.endswith("|"):
            if _TABLE_SEPARATOR_RE.match(stripped):
                continue
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            table_rows.append(cells)
            continue

        if table_rows:
            out.append(_table_rows_to_code_block(table_rows))
            table_rows = []

        heading = _HEADING_RE.match(stripped)
        if heading:
            out.append(f"\n*{heading.group(2).strip()}*")
            continue

        out.append(_convert_inline_markdown(stripped))

    if table_rows:
        out.append(_table_rows_to_code_block(table_rows))

    return "\n".join(out)


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
    task_url = _task_dashboard_url(
        frontend_url, function_input.task_id, function_input.task_title,
    )

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


class SlackPostTaskStartedInput(BaseModel):
    task_id: str = Field(..., description="Task ID")
    task_title: str = Field(..., description="Task title")
    task_description: str = Field(
        ..., description="Task description (user's first message)"
    )
    agent_name: str = Field(..., description="Agent name")
    frontend_url: str | None = Field(
        None, description="Base URL for the frontend dashboard"
    )


class SlackPostTaskStartedOutput(BaseModel):
    posted: bool
    channel: str | None = None
    thread_ts: str | None = None
    error: str | None = None


@function.defn()
async def slack_post_task_started(
    function_input: SlackPostTaskStartedInput,
) -> SlackPostTaskStartedOutput:
    """Post a 'task started' message to the default Slack channel.

    Returns the channel and thread_ts so the caller can inject them
    into task_metadata for agent streaming and thread replies.
    Only posts when both SLACK_BOT_TOKEN and SLACK_DEFAULT_CHANNEL_ID are set.
    """
    if not SLACK_BOT_TOKEN or not SLACK_DEFAULT_CHANNEL_ID:
        return SlackPostTaskStartedOutput(
            posted=False,
            error="SLACK_BOT_TOKEN or SLACK_DEFAULT_CHANNEL_ID not configured",
        )

    frontend_url = function_input.frontend_url or os.getenv(
        "FRONTEND_URL", "http://localhost:3000"
    )
    task_url = _task_dashboard_url(
        frontend_url, function_input.task_id, function_input.task_title,
    )

    description_preview = function_input.task_description[:_DESCRIPTION_PREVIEW_MAX]
    if len(function_input.task_description) > _DESCRIPTION_PREVIEW_MAX:
        description_preview += "..."

    blocks: list[dict[str, Any]] = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f":rocket: *New task started*\n\n"
                    f"*{function_input.task_title}*\n"
                    f"Agent: {function_input.agent_name}"
                ),
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": description_preview,
            },
        },
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
        },
    ]

    result = await _slack_api_call(
        "chat.postMessage",
        {
            "channel": SLACK_DEFAULT_CHANNEL_ID,
            "text": f"New task: {function_input.task_title} (Agent: {function_input.agent_name})",
            "blocks": blocks,
        },
    )

    if result.get("ok"):
        return SlackPostTaskStartedOutput(
            posted=True,
            channel=SLACK_DEFAULT_CHANNEL_ID,
            thread_ts=result.get("ts"),
        )

    error = result.get("error", "unknown_error")
    logger.warning("Failed to post task-started to Slack: %s", error)
    return SlackPostTaskStartedOutput(posted=False, error=error)
