"""Slack Lists API integration for task management.

The Lists API (introduced 2025) allows creating and managing structured task lists
directly in Slack channels, providing native UI for task tracking.

See: https://api.slack.com/methods#lists
"""
import logging
import os
from typing import Any

import httpx
from pydantic import BaseModel, Field
from restack_ai import function

logger = logging.getLogger(__name__)


class SlackListCreateInput(BaseModel):
    """Input for creating a Slack list."""

    channel_id: str = Field(..., description="Channel to create list in")
    name: str = Field(..., description="List name (e.g., 'Open Tasks')")
    description: str | None = Field(None, description="List description")


class SlackListOutput(BaseModel):
    """Output from Slack list operations."""

    success: bool
    list_id: str | None = None
    error: str | None = None


@function.defn()
async def create_slack_list(
    function_input: SlackListCreateInput,
) -> SlackListOutput:
    """
    Create a task list in a Slack channel using the Lists API.
    
    This creates a native Slack list that users can interact with directly
    in the channel, providing better UX than messages.
    
    Example:
        await workflow.step(
            function=create_slack_list,
            function_input={
                "channel_id": "C123456",
                "name": "Customer Support Tasks",
                "description": "Active support tickets"
            }
        )
    """
    slack_bot_token = os.getenv("SLACK_BOT_TOKEN")
    
    if not slack_bot_token:
        return SlackListOutput(
            success=False,
            error="SLACK_BOT_TOKEN not configured"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://slack.com/api/lists.create",
                headers={
                    "Authorization": f"Bearer {slack_bot_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "channel_id": function_input.channel_id,
                    "name": function_input.name,
                    "description": function_input.description or ""
                }
            )
            
            data = response.json()
            
            if data.get("ok"):
                list_id = data.get("list", {}).get("id")
                logger.info(f"Created Slack list {list_id} in channel {function_input.channel_id}")
                return SlackListOutput(
                    success=True,
                    list_id=list_id
                )
            else:
                error = data.get("error", "Unknown error")
                logger.error(f"Failed to create Slack list: {error}")
                return SlackListOutput(
                    success=False,
                    error=error
                )
    
    except Exception as e:
        logger.exception("Error creating Slack list")
        return SlackListOutput(
            success=False,
            error=str(e)
        )


class SlackListItemInput(BaseModel):
    """Input for adding item to Slack list."""

    list_id: str = Field(..., description="List ID to add item to")
    title: str = Field(..., description="Item title")
    description: str | None = Field(None, description="Item description")
    assignee_id: str | None = Field(None, description="User ID to assign to")
    due_date: str | None = Field(None, description="Due date (ISO 8601)")


@function.defn()
async def add_slack_list_item(
    function_input: SlackListItemInput,
) -> SlackListOutput:
    """
    Add a task item to a Slack list.
    
    This syncs your platform tasks to Slack's native list UI,
    allowing users to view and manage tasks without leaving Slack.
    
    Example:
        await workflow.step(
            function=add_slack_list_item,
            function_input={
                "list_id": "L123456",
                "title": "Review PR #123",
                "description": "Priority: High",
                "assignee_id": "U123456"
            }
        )
    """
    slack_bot_token = os.getenv("SLACK_BOT_TOKEN")
    
    if not slack_bot_token:
        return SlackListOutput(
            success=False,
            error="SLACK_BOT_TOKEN not configured"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            payload: dict[str, Any] = {
                "list_id": function_input.list_id,
                "title": function_input.title,
            }
            
            if function_input.description:
                payload["description"] = function_input.description
            
            if function_input.assignee_id:
                payload["assignee_id"] = function_input.assignee_id
            
            if function_input.due_date:
                payload["due_date"] = function_input.due_date
            
            response = await client.post(
                "https://slack.com/api/lists.items.add",
                headers={
                    "Authorization": f"Bearer {slack_bot_token}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
            
            data = response.json()
            
            if data.get("ok"):
                item_id = data.get("item", {}).get("id")
                logger.info(f"Added item {item_id} to Slack list {function_input.list_id}")
                return SlackListOutput(
                    success=True,
                    list_id=item_id
                )
            else:
                error = data.get("error", "Unknown error")
                logger.error(f"Failed to add Slack list item: {error}")
                return SlackListOutput(
                    success=False,
                    error=error
                )
    
    except Exception as e:
        logger.exception("Error adding Slack list item")
        return SlackListOutput(
            success=False,
            error=str(e)
        )


class SlackListItemUpdateInput(BaseModel):
    """Input for updating Slack list item."""

    list_id: str = Field(..., description="List ID")
    item_id: str = Field(..., description="Item ID to update")
    title: str | None = Field(None, description="New title")
    completed: bool | None = Field(None, description="Mark as completed")
    assignee_id: str | None = Field(None, description="New assignee")


@function.defn()
async def update_slack_list_item(
    function_input: SlackListItemUpdateInput,
) -> SlackListOutput:
    """
    Update a Slack list item (e.g., mark as complete).
    
    Use this to sync task status changes back to Slack.
    
    Example:
        # Mark task as complete
        await workflow.step(
            function=update_slack_list_item,
            function_input={
                "list_id": "L123456",
                "item_id": "I123456",
                "completed": True
            }
        )
    """
    slack_bot_token = os.getenv("SLACK_BOT_TOKEN")
    
    if not slack_bot_token:
        return SlackListOutput(
            success=False,
            error="SLACK_BOT_TOKEN not configured"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            payload: dict[str, Any] = {
                "list_id": function_input.list_id,
                "item_id": function_input.item_id,
            }
            
            if function_input.title is not None:
                payload["title"] = function_input.title
            
            if function_input.completed is not None:
                payload["completed"] = function_input.completed
            
            if function_input.assignee_id is not None:
                payload["assignee_id"] = function_input.assignee_id
            
            response = await client.post(
                "https://slack.com/api/lists.items.update",
                headers={
                    "Authorization": f"Bearer {slack_bot_token}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
            
            data = response.json()
            
            if data.get("ok"):
                logger.info(f"Updated Slack list item {function_input.item_id}")
                return SlackListOutput(success=True)
            else:
                error = data.get("error", "Unknown error")
                logger.error(f"Failed to update Slack list item: {error}")
                return SlackListOutput(
                    success=False,
                    error=error
                )
    
    except Exception as e:
        logger.exception("Error updating Slack list item")
        return SlackListOutput(
            success=False,
            error=str(e)
        )

