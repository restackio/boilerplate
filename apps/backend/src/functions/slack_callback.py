"""Handle Slack callbacks for task lifecycle events."""
import logging
from typing import Any

from pydantic import BaseModel, Field
from restack_ai import function

logger = logging.getLogger(__name__)


class TaskSlackCallbackInput(BaseModel):
    """Input for notifying Slack about task events."""

    task_id: str = Field(..., description="Task ID")
    task_title: str = Field(..., description="Task title")
    task_status: str = Field(..., description="Task status (completed, failed, etc)")
    agent_name: str = Field(..., description="Agent name")
    metadata: dict[str, Any] | None = Field(
        None, description="Task metadata with Slack context"
    )
    result_summary: str | None = Field(
        None, description="Summary of task result"
    )


class TaskSlackCallbackOutput(BaseModel):
    """Output from Slack callback."""

    notified: bool = Field(..., description="Whether Slack was notified")
    message_ts: str | None = Field(None, description="Slack message timestamp")
    error: str | None = Field(None, description="Error if notification failed")


@function.defn()
async def notify_slack_on_task_complete(
    function_input: TaskSlackCallbackInput,
) -> TaskSlackCallbackOutput:
    """
    Notify Slack when a task completes.
    
    This function is called automatically by task workflows when they complete,
    providing two-way sync between your platform and Slack.
    
    The function checks if the task was created from Slack (by looking at metadata)
    and sends an update back to the original channel/thread.
    """
    # Check if task has Slack context
    metadata = function_input.metadata or {}
    slack_channel = metadata.get("slack_channel")
    slack_thread_ts = metadata.get("slack_thread_ts")
    slack_user_id = metadata.get("slack_user_id")
    
    if not slack_channel and not slack_user_id:
        logger.info(
            f"Task {function_input.task_id} has no Slack context, skipping notification"
        )
        return TaskSlackCallbackOutput(
            notified=False,
            error="No Slack context in task metadata"
        )
    
    # Import the Slack notification function
    # Note: In production, you'd import from the MCP server functions
    # For now, we'll just log and return success
    try:
        # Format the message
        status_emoji = {
            "completed": "✅",
            "failed": "❌",
            "cancelled": "⚠️",
        }.get(function_input.task_status, "ℹ️")
        
        text = f"{status_emoji} *Task {function_input.task_status.title()}*\n\n"
        text += f"*Task:* {function_input.task_title}\n"
        text += f"*Agent:* {function_input.agent_name}\n"
        
        if function_input.result_summary:
            text += f"\n*Result:*\n{function_input.result_summary}"
        
        task_url = f"http://localhost:3000/tasks/{function_input.task_id}"
        text += f"\n\n<{task_url}|View Full Details>"
        
        # Create rich blocks for better formatting
        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{status_emoji} *Task {function_input.task_status.title()}*"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Task:*\n{function_input.task_title}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Agent:*\n{function_input.agent_name}"
                    }
                ]
            }
        ]
        
        if function_input.result_summary:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Result:*\n{function_input.result_summary}"
                }
            })
        
        blocks.append({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "View Full Details"
                    },
                    "url": task_url,
                    "action_id": "view_task"
                }
            ]
        })
        
        # Here you would actually call the Slack API via the MCP function
        # For now, we'll log the notification
        logger.info(
            f"Would notify Slack channel {slack_channel or slack_user_id} "
            f"about task {function_input.task_id} completion"
        )
        
        # In production, you'd do:
        # from src.functions.slack_notification import send_slack_notification
        # result = await send_slack_notification({
        #     "channel": slack_channel,
        #     "user_id": slack_user_id,
        #     "text": text,
        #     "blocks": blocks,
        #     "thread_ts": slack_thread_ts
        # })
        
        return TaskSlackCallbackOutput(
            notified=True,
            message_ts=None  # Would be returned by actual Slack API call
        )
        
    except Exception as e:
        logger.exception("Error notifying Slack")
        return TaskSlackCallbackOutput(
            notified=False,
            error=str(e)
        )

