"""Send notifications to Slack channels and threads."""
import json
import logging
import os
from typing import Any

import httpx
from pydantic import BaseModel, Field
from restack_ai import function

logger = logging.getLogger(__name__)


class SlackNotificationInput(BaseModel):
    """Input for sending Slack notifications."""

    channel: str = Field(..., description="Channel ID or name (e.g., 'C1234567890' or '#general')")
    text: str = Field(..., description="Message text (fallback for notifications)")
    blocks: list[dict[str, Any]] | None = Field(
        None, description="Rich message blocks for formatting"
    )
    thread_ts: str | None = Field(
        None, description="Thread timestamp to reply in thread"
    )
    user_id: str | None = Field(
        None, description="If provided, sends DM to this user instead"
    )


class SlackNotificationOutput(BaseModel):
    """Output from Slack notification."""

    success: bool
    message_ts: str | None = None
    channel: str | None = None
    error: str | None = None


@function.defn()
async def send_slack_notification(
    function_input: SlackNotificationInput,
) -> SlackNotificationOutput:
    """
    Send a notification message to a Slack channel or user.
    
    This function is used by workflows to send updates back to Slack,
    enabling two-way communication between your platform and Slack.
    
    Examples:
        # Reply in thread
        await workflow.step(
            function=send_slack_notification,
            function_input={
                "channel": "C1234567890",
                "text": "Task completed!",
                "thread_ts": "1234567890.123456"
            }
        )
        
        # Send DM
        await workflow.step(
            function=send_slack_notification,
            function_input={
                "user_id": "U1234567890",
                "text": "Your task is ready!"
            }
        )
    """
    slack_bot_token = os.getenv("SLACK_BOT_TOKEN")
    
    if not slack_bot_token:
        logger.error("SLACK_BOT_TOKEN not configured")
        return SlackNotificationOutput(
            success=False,
            error="Slack bot token not configured"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            # Prepare the message payload
            payload: dict[str, Any] = {
                "text": function_input.text,
            }
            
            # Use user DM if user_id provided, otherwise use channel
            if function_input.user_id:
                # Open DM channel with user
                dm_response = await client.post(
                    "https://slack.com/api/conversations.open",
                    headers={
                        "Authorization": f"Bearer {slack_bot_token}",
                        "Content-Type": "application/json"
                    },
                    json={"users": function_input.user_id}
                )
                dm_data = dm_response.json()
                
                if not dm_data.get("ok"):
                    raise ValueError(f"Failed to open DM: {dm_data.get('error')}")
                
                payload["channel"] = dm_data["channel"]["id"]
            else:
                payload["channel"] = function_input.channel
            
            # Add thread_ts if replying in thread
            if function_input.thread_ts:
                payload["thread_ts"] = function_input.thread_ts
            
            # Add blocks if provided
            if function_input.blocks:
                payload["blocks"] = function_input.blocks
            
            # Send the message
            response = await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={
                    "Authorization": f"Bearer {slack_bot_token}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
            
            data = response.json()
            
            if data.get("ok"):
                logger.info(
                    f"Sent Slack message to {payload['channel']}"
                )
                return SlackNotificationOutput(
                    success=True,
                    message_ts=data.get("ts"),
                    channel=data.get("channel")
                )
            else:
                error_msg = data.get("error", "Unknown error")
                logger.error(f"Slack API error: {error_msg}")
                return SlackNotificationOutput(
                    success=False,
                    error=error_msg
                )
    
    except Exception as e:
        logger.exception("Error sending Slack notification")
        return SlackNotificationOutput(
            success=False,
            error=str(e)
        )


class SlackUpdateMessageInput(BaseModel):
    """Input for updating existing Slack messages."""

    channel: str = Field(..., description="Channel ID where message was sent")
    message_ts: str = Field(..., description="Timestamp of message to update")
    text: str = Field(..., description="New message text")
    blocks: list[dict[str, Any]] | None = Field(
        None, description="New message blocks"
    )


@function.defn()
async def update_slack_message(
    function_input: SlackUpdateMessageInput,
) -> SlackNotificationOutput:
    """
    Update an existing Slack message.
    
    Useful for showing progress updates on long-running tasks.
    """
    slack_bot_token = os.getenv("SLACK_BOT_TOKEN")
    
    if not slack_bot_token:
        return SlackNotificationOutput(
            success=False,
            error="Slack bot token not configured"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            payload: dict[str, Any] = {
                "channel": function_input.channel,
                "ts": function_input.message_ts,
                "text": function_input.text,
            }
            
            if function_input.blocks:
                payload["blocks"] = function_input.blocks
            
            response = await client.post(
                "https://slack.com/api/chat.update",
                headers={
                    "Authorization": f"Bearer {slack_bot_token}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
            
            data = response.json()
            
            if data.get("ok"):
                logger.info(f"Updated Slack message {function_input.message_ts}")
                return SlackNotificationOutput(
                    success=True,
                    message_ts=data.get("ts"),
                    channel=data.get("channel")
                )
            else:
                return SlackNotificationOutput(
                    success=False,
                    error=data.get("error", "Unknown error")
                )
    
    except Exception as e:
        logger.exception("Error updating Slack message")
        return SlackNotificationOutput(
            success=False,
            error=str(e)
        )


class SlackReactionInput(BaseModel):
    """Input for adding reactions to Slack messages."""

    channel: str = Field(..., description="Channel ID")
    message_ts: str = Field(..., description="Message timestamp")
    reaction: str = Field(..., description="Emoji name without colons (e.g., 'thumbsup')")


@function.defn()
async def add_slack_reaction(
    function_input: SlackReactionInput,
) -> SlackNotificationOutput:
    """
    Add an emoji reaction to a Slack message.
    
    Quick way to acknowledge receipt or show status.
    """
    slack_bot_token = os.getenv("SLACK_BOT_TOKEN")
    
    if not slack_bot_token:
        return SlackNotificationOutput(
            success=False,
            error="Slack bot token not configured"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://slack.com/api/reactions.add",
                headers={
                    "Authorization": f"Bearer {slack_bot_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "channel": function_input.channel,
                    "timestamp": function_input.message_ts,
                    "name": function_input.reaction
                }
            )
            
            data = response.json()
            
            if data.get("ok") or data.get("error") == "already_reacted":
                return SlackNotificationOutput(success=True)
            else:
                return SlackNotificationOutput(
                    success=False,
                    error=data.get("error", "Unknown error")
                )
    
    except Exception as e:
        logger.exception("Error adding Slack reaction")
        return SlackNotificationOutput(
            success=False,
            error=str(e)
        )

