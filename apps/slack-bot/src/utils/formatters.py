"""Format Slack messages for task creation and display."""
import json
from datetime import datetime


def format_slack_message_for_task(
    user_name: str,
    user_id: str,
    message_text: str,
    channel_id: str,
    message_ts: str | None = None,
    is_channel_message: bool = False,
    is_slash_command: bool = False,
    is_assistant_panel: bool = False,
) -> tuple[str, str]:
    """
    Format a Slack message into task title and description.
    
    Args:
        user_name: Display name of user
        user_id: Slack user ID
        message_text: Message content
        channel_id: Channel ID
        message_ts: Message timestamp
        is_channel_message: True if from channel mention
        is_slash_command: True if from slash command
        is_assistant_panel: True if from AI assistant panel (new feature)
    
    Returns:
        tuple: (title, description)
    """
    # Create title based on source
    if is_assistant_panel:
        title = f"AI Assistant: {user_name}"
    elif is_slash_command:
        title = f"Slack Command: {user_name}"
    elif is_channel_message:
        title = f"Slack Request: {user_name}"
    else:
        title = f"Slack DM: {user_name}"
    
    # Truncate message for title if too long
    if len(message_text) > 50:
        title = f"{title} - {message_text[:47]}..."
    else:
        title = f"{title} - {message_text}"
    
    # Create detailed description
    if is_assistant_panel:
        source_type = "AI assistant panel (side panel UI)"
    elif is_slash_command:
        source_type = "slash command"
    elif is_channel_message:
        source_type = "channel mention"
    else:
        source_type = "direct message"
    
    description = f"""**Slack Request from {user_name}**

**Message:**
{message_text}

**Context:**
- Source: {source_type}
- Channel: <#{channel_id}>
- User: <@{user_id}>
- Timestamp: {message_ts if message_ts else 'N/A'}
- Created: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}

**Instructions:**
Process this request and send the response back to the user via Slack.
Use the Slack notification function to reply in the appropriate channel/thread.
"""
    
    return title, description


def format_task_completion_for_slack(
    task_id: str,
    task_title: str,
    task_status: str,
    agent_name: str,
    result_summary: str | None = None,
) -> dict:
    """
    Format a task completion message for Slack with rich formatting.
    
    Uses modern Block Kit features for better presentation.
    
    Returns:
        dict: Slack message payload with blocks
    """
    status_emoji = {
        "completed": "✅",
        "failed": "❌",
        "cancelled": "⚠️",
    }.get(task_status, "ℹ️")
    
    task_url = f"http://localhost:3000/tasks/{task_id}"
    
    blocks = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"{status_emoji} *Task {task_status.title()}*"
            }
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*Task:*\n{task_title}"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Agent:*\n{agent_name}"
                }
            ]
        }
    ]
    
    # Add result summary if available
    if result_summary:
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Result:*\n{result_summary}"
            }
        })
    
    # Add divider
    blocks.append({"type": "divider"})
    
    # Add task link button
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
    
    return {
        "text": f"{status_emoji} Task {task_status}: {task_title}",
        "blocks": blocks
    }


def format_agent_response_for_slack(
    message: str,
    include_feedback: bool = True,
    source_documents: list[str] | None = None
) -> dict:
    """
    Format an agent response message for Slack with modern Block Kit.
    
    Args:
        message: The agent's response text
        include_feedback: Whether to include feedback buttons
        source_documents: Optional list of source document URLs
        
    Returns:
        dict: Slack message payload with rich formatting
    """
    blocks = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": message
            }
        }
    ]
    
    # Add source documents if provided (Claude-style citations)
    if source_documents:
        sources_text = "\n".join([f"• <{doc}|Document {i+1}>" for i, doc in enumerate(source_documents)])
        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"📚 *Sources:*\n{sources_text}"
                }
            ]
        })
    
    # Add divider before actions
    if include_feedback or source_documents:
        blocks.append({"type": "divider"})
    
    # Add feedback buttons (similar to Claude's thumbs up/down)
    if include_feedback:
        blocks.append({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "emoji": True,
                        "text": "👍 Helpful"
                    },
                    "style": "primary",
                    "value": "positive",
                    "action_id": "feedback_positive"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "emoji": True,
                        "text": "👎 Not helpful"
                    },
                    "value": "negative",
                    "action_id": "feedback_negative"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "emoji": True,
                        "text": "🔄 Regenerate"
                    },
                    "value": "regenerate",
                    "action_id": "regenerate_response"
                }
            ]
        })
    
    return {
        "text": message,
        "blocks": blocks
    }


def format_task_list_for_slack(
    tasks: list[dict],
    list_title: str = "Your Tasks"
) -> dict:
    """
    Format a list of tasks using modern Block Kit table-like layout.
    
    Uses the new Block Kit features for better data presentation.
    
    Args:
        tasks: List of task dicts with id, title, status, agent
        list_title: Title for the task list
        
    Returns:
        dict: Slack message payload
    """
    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": list_title,
                "emoji": True
            }
        },
        {"type": "divider"}
    ]
    
    if not tasks:
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "_No tasks found_"
            }
        })
    else:
        for task in tasks[:10]:  # Limit to 10 tasks
            status_emoji = {
                "open": "📋",
                "in_progress": "⚙️",
                "completed": "✅",
                "failed": "❌"
            }.get(task.get("status", "open"), "📋")
            
            task_url = f"http://localhost:3000/tasks/{task['id']}"
            
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{status_emoji} *<{task_url}|{task['title']}>*\n"
                            f"Agent: {task.get('agent_name', 'N/A')} • Status: {task.get('status', 'open')}"
                },
                "accessory": {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "View",
                        "emoji": True
                    },
                    "url": task_url,
                    "action_id": f"view_task_{task['id']}"
                }
            })
        
        if len(tasks) > 10:
            blocks.append({
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"_Showing 10 of {len(tasks)} tasks_"
                    }
                ]
            })
    
    return {
        "text": f"{list_title} ({len(tasks)} tasks)",
        "blocks": blocks
    }
