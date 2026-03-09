"""Handle MCP tool approval requests via Slack interactive buttons.

When a workflow needs approval for an MCP tool, this sends an interactive
message to the Slack thread with Approve/Reject buttons.
"""
import logging
import os
from typing import Any

import httpx
from pydantic import BaseModel, Field
from restack_ai import function

logger = logging.getLogger(__name__)


class SlackMcpApprovalInput(BaseModel):
    """Input for requesting MCP approval via Slack."""

    task_id: str = Field(..., description="Task ID")
    tool_name: str = Field(..., description="Name of tool requiring approval")
    tool_description: str = Field(..., description="What the tool does")
    tool_parameters: dict[str, Any] = Field(..., description="Parameters to be used")
    slack_channel: str = Field(..., description="Slack channel ID")
    slack_thread_ts: str = Field(..., description="Thread timestamp")
    approval_id: str = Field(..., description="Unique approval ID")


class SlackMcpApprovalOutput(BaseModel):
    """Output from Slack MCP approval request."""

    success: bool
    message_ts: str | None = None
    error: str | None = None


@function.defn()
async def request_mcp_approval_via_slack(
    function_input: SlackMcpApprovalInput,
) -> SlackMcpApprovalOutput:
    """
    Send an MCP tool approval request to Slack with interactive buttons.
    
    When an agent wants to use a tool that requires approval, this function
    sends a message to the Slack thread with Approve/Reject buttons.
    
    The user's response is captured by the Bolt app and sent back to the workflow.
    
    Example:
        # In agent workflow when tool needs approval
        await workflow.step(
            function=request_mcp_approval_via_slack,
            function_input={
                "task_id": task.id,
                "tool_name": "send_email",
                "tool_description": "Send email to customer",
                "tool_parameters": {"to": "user@example.com", "subject": "..."},
                "slack_channel": task.metadata["slack_channel"],
                "slack_thread_ts": task.metadata["slack_thread_ts"],
                "approval_id": f"approval_{workflow.uuid4()}"
            }
        )
        
        # Then wait for approval via signal or event
        approval = await workflow.wait_for_signal("mcp_approval", approval_id)
    """
    slack_bot_token = os.getenv("SLACK_BOT_TOKEN")
    
    if not slack_bot_token:
        logger.error("SLACK_BOT_TOKEN not configured")
        return SlackMcpApprovalOutput(
            success=False,
            error="Slack bot token not configured"
        )
    
    try:
        # Format parameters for display
        params_formatted = "\n".join([
            f"• *{key}:* `{value}`" 
            for key, value in function_input.tool_parameters.items()
        ])
        
        # Create approval request message with buttons
        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "🔐 *Approval Required*\n\nI need your permission to use this tool:"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Tool:*\n`{function_input.tool_name}`"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Description:*\n{function_input.tool_description}"
                    }
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Parameters:*\n{params_formatted}"
                }
            },
            {
                "type": "divider"
            },
            {
                "type": "actions",
                "block_id": f"mcp_approval_{function_input.approval_id}",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "emoji": True,
                            "text": "✅ Approve"
                        },
                        "style": "primary",
                        "value": function_input.approval_id,
                        "action_id": "mcp_approve"
                    },
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "emoji": True,
                            "text": "❌ Reject"
                        },
                        "style": "danger",
                        "value": function_input.approval_id,
                        "action_id": "mcp_reject"
                    }
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Task ID: `{function_input.task_id}` | Approval ID: `{function_input.approval_id}`"
                    }
                ]
            }
        ]
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={
                    "Authorization": f"Bearer {slack_bot_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "channel": function_input.slack_channel,
                    "thread_ts": function_input.slack_thread_ts,
                    "text": f"🔐 Approval required for tool: {function_input.tool_name}",
                    "blocks": blocks
                }
            )
            
            data = response.json()
            
            if data.get("ok"):
                message_ts = data.get("ts")
                logger.info(
                    f"Sent MCP approval request to Slack for {function_input.tool_name}"
                )
                return SlackMcpApprovalOutput(
                    success=True,
                    message_ts=message_ts
                )
            else:
                error_msg = data.get("error", "Unknown error")
                logger.error(f"Failed to send MCP approval to Slack: {error_msg}")
                return SlackMcpApprovalOutput(
                    success=False,
                    error=error_msg
                )
    
    except Exception as e:
        logger.exception("Error sending MCP approval request to Slack")
        return SlackMcpApprovalOutput(
            success=False,
            error=str(e)
        )


@function.defn()
async def update_mcp_approval_in_slack(
    approval_id: str,
    approved: bool,
    slack_channel: str,
    message_ts: str,
    user_name: str | None = None
) -> SlackMcpApprovalOutput:
    """
    Update the Slack message after user approves/rejects.
    
    Called by the Bolt app action handler after user clicks button.
    """
    slack_bot_token = os.getenv("SLACK_BOT_TOKEN")
    
    if not slack_bot_token:
        return SlackMcpApprovalOutput(
            success=False,
            error="SLACK_BOT_TOKEN not configured"
        )
    
    try:
        status = "✅ Approved" if approved else "❌ Rejected"
        user_text = f" by {user_name}" if user_name else ""
        
        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{status}{user_text}"
                }
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Approval ID: `{approval_id}`"
                    }
                ]
            }
        ]
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://slack.com/api/chat.update",
                headers={
                    "Authorization": f"Bearer {slack_bot_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "channel": slack_channel,
                    "ts": message_ts,
                    "text": f"{status}{user_text}",
                    "blocks": blocks
                }
            )
            
            data = response.json()
            
            if data.get("ok"):
                return SlackMcpApprovalOutput(success=True)
            else:
                return SlackMcpApprovalOutput(
                    success=False,
                    error=data.get("error", "Unknown error")
                )
    
    except Exception as e:
        logger.exception("Error updating MCP approval in Slack")
        return SlackMcpApprovalOutput(
            success=False,
            error=str(e)
        )

