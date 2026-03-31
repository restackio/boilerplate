"""Block Kit helpers for consistent Slack message formatting."""

from typing import Any

from ..config import config


def status_blocks(
    text: str,
    *,
    emoji: str = ":hourglass_flowing_sand:",
    context: str | None = None,
) -> list[dict[str, Any]]:
    """Generic status message block."""
    blocks: list[dict[str, Any]] = [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"{emoji} {text}"},
        }
    ]
    if context:
        blocks.append(
            {
                "type": "context",
                "elements": [{"type": "mrkdwn", "text": context}],
            }
        )
    return blocks


def task_created_blocks(
    task_id: str,
    agent_name: str,
) -> list[dict[str, Any]]:
    """Blocks shown when a task is successfully created."""
    url = config.task_url(task_id)
    return [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f":white_check_mark: *Task created*\n"
                    f"Agent: *{agent_name}*\n"
                    f"I'll reply in this thread as I make progress."
                ),
            },
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "View in Dashboard"},
                    "url": url,
                    "action_id": "view_task",
                }
            ],
        },
    ]


def agent_selector_blocks(
    agents: list[dict[str, Any]],
    message_preview: str,
    user_id: str,
) -> list[dict[str, Any]]:
    """Dropdown for manual agent selection when auto-resolution is off or fails."""
    truncated = message_preview[:100] + ("..." if len(message_preview) > 100 else "")
    options = [
        {
            "text": {"type": "plain_text", "text": a["name"][:75]},
            "value": a["id"],
        }
        for a in agents[:25]
    ]
    return [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*New request from <@{user_id}>*\n_{truncated}_",
            },
        },
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": "Which agent should handle this?"},
            "accessory": {
                "type": "static_select",
                "placeholder": {"type": "plain_text", "text": "Select an agent"},
                "action_id": "select_agent_for_task",
                "options": options,
            },
        },
    ]


def mcp_approval_blocks(
    tool_name: str,
    tool_args: str,
    approval_id: str,
) -> list[dict[str, Any]]:
    """Blocks for MCP tool approval request."""
    return [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f":wrench: *Tool approval needed*\n"
                    f"Tool: `{tool_name}`\n"
                    f"```{tool_args[:1500]}```"
                ),
            },
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Approve"},
                    "style": "primary",
                    "value": approval_id,
                    "action_id": "mcp_approve",
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Reject"},
                    "style": "danger",
                    "value": approval_id,
                    "action_id": "mcp_reject",
                },
            ],
        },
    ]


def error_blocks(message: str) -> list[dict[str, Any]]:
    """Error message block."""
    return [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f":x: {message}"},
        }
    ]
