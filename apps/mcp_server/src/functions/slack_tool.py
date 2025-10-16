"""Slack integration as an MCP tool for agents.

This provides Slack notifications as a toggleable tool that can be enabled/disabled
per agent, just like updatetodos.
"""
import logging
import os
from typing import Any

import httpx
from pydantic import BaseModel, Field
from restack_ai import function

logger = logging.getLogger(__name__)


class SlackNotifyInput(BaseModel):
    """Input for sending Slack notifications via MCP tool."""

    message: str = Field(..., description="Message to send to Slack thread")
    message_type: str = Field(
        default="update",
        description="Type of message: 'update', 'progress', 'completion', 'error'"
    )


class SlackNotifyOutput(BaseModel):
    """Output from Slack notification."""

    success: bool
    message_ts: str | None = None
    error: str | None = None


@function.defn()
async def slacknotify(
    function_input: SlackNotifyInput,
    # Context from task metadata (injected by agent)
    slack_channel: str | None = None,
    slack_thread_ts: str | None = None,
    task_id: str | None = None,
) -> SlackNotifyOutput:
    """
    Send a notification to the Slack thread for this task.
    
    This is an MCP tool that agents can use to send updates to Slack.
    Like updatetodos, it can be enabled/disabled per agent in the UI.
    
    The agent calls this just like any other tool:
    
    ```python
    # In agent instructions:
    "Use the slacknotify tool to send progress updates to the user in Slack."
    
    # Agent calls:
    slacknotify(
        message="I've analyzed the data and found 3 key insights...",
        message_type="progress"
    )
    ```
    
    The tool automatically:
    - Checks if this task has Slack context (from metadata)
    - Formats the message based on type
    - Posts to the correct thread
    - Handles errors gracefully
    
    Args:
        function_input: The message and type
        slack_channel: Injected from task metadata
        slack_thread_ts: Injected from task metadata
        task_id: Injected from task metadata
        
    Returns:
        Success status and message timestamp
    """
    # Check if Slack integration is available
    if not slack_channel or not slack_thread_ts:
        logger.info(
            f"Slack not configured for task {task_id}, skipping notification"
        )
        return SlackNotifyOutput(
            success=False,
            error="Slack integration not enabled for this task"
        )
    
    slack_bot_token = os.getenv("SLACK_BOT_TOKEN")
    if not slack_bot_token:
        logger.warning("SLACK_BOT_TOKEN not configured")
        return SlackNotifyOutput(
            success=False,
            error="Slack bot token not configured"
        )
    
    try:
        # Format message based on type
        emoji_map = {
            "update": "💬",
            "progress": "⚙️",
            "completion": "✅",
            "error": "❌",
        }
        emoji = emoji_map.get(function_input.message_type, "ℹ️")
        
        # Create formatted blocks
        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{emoji} {function_input.message}"
                }
            }
        ]
        
        # Add context for completion/error
        if function_input.message_type in ["completion", "error"]:
            blocks.append({
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Task ID: `{task_id}`"
                    }
                ]
            })
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={
                    "Authorization": f"Bearer {slack_bot_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "channel": slack_channel,
                    "thread_ts": slack_thread_ts,
                    "text": f"{emoji} {function_input.message}",
                    "blocks": blocks
                }
            )
            
            data = response.json()
            
            if data.get("ok"):
                logger.info(f"Sent Slack notification for task {task_id}")
                return SlackNotifyOutput(
                    success=True,
                    message_ts=data.get("ts")
                )
            else:
                error = data.get("error", "Unknown error")
                logger.error(f"Slack API error: {error}")
                return SlackNotifyOutput(
                    success=False,
                    error=error
                )
    
    except Exception as e:
        logger.exception("Error sending Slack notification")
        return SlackNotifyOutput(
            success=False,
            error=str(e)
        )


# Tool definition for MCP registration
SLACK_TOOL_DEFINITION = {
    "type": "mcp",
    "name": "Slack Integration",
    "description": "Send real-time updates to Slack threads for tasks created from Slack",
    "mcp_server": "internal",
    "allowed_tools": ["slacknotify"],
    "requires_oauth": True,  # 🆕 Indicates OAuth is needed
    "oauth_provider": "slack",
    "instructions": """Use the slacknotify tool to send updates to the user in Slack.

Examples:
- Progress updates: slacknotify(message="Analyzing data...", message_type="progress")
- Key findings: slacknotify(message="Found 3 insights...", message_type="update")  
- Completion: slacknotify(message="Analysis complete!", message_type="completion")
- Errors: slacknotify(message="Failed to process file", message_type="error")

The tool automatically sends to the correct Slack thread. Use it frequently to keep users informed!"""
}

