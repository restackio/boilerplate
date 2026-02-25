"""Handle messages in assistant threads - leveraging new AI assistant features."""
import logging
import os
import time

logger = logging.getLogger(__name__)

# Get the app instance
from ...app import app


@app.event("assistant_thread_context_changed")
def handle_assistant_thread_context_changed(event, client, say, logger):
    """
    Handle when assistant thread context changes.
    This fires when there are new messages in the AI assistant panel.
    
    New Slack AI assistant features (2024):
    - Dedicated side panel for AI conversations
    - Better context management
    - Persistent threads
    """
    try:
        logger.info("Assistant thread context changed")
        
        # Extract thread and channel info
        thread_ts = event.get("assistant_thread", {}).get("thread_ts")
        channel_id = event.get("assistant_thread", {}).get("channel_id")
        user_id = event.get("assistant_thread", {}).get("user_id")
        
        # Get the latest user message from context
        context = event.get("assistant_thread", {}).get("context", {})
        messages = context.get("messages", [])
        
        if not messages:
            logger.info("No messages in context")
            return
        
        # Get the last user message
        user_message = None
        for msg in reversed(messages):
            if msg.get("type") == "message" and not msg.get("bot_id"):
                user_message = msg
                break
        
        if not user_message:
            logger.info("No user message found")
            return
        
        message_text = user_message.get("text", "")
        
        logger.info(f"Processing assistant message: {message_text[:50]}...")
        
        # Get workspace configuration
        workspace_id = os.getenv("DEFAULT_WORKSPACE_ID")
        if not workspace_id:
            say({
                "text": "Configuration error: Workspace not configured.",
                "thread_ts": thread_ts
            })
            return
        
        agent_name = os.getenv("DEFAULT_AGENT_NAME", "slack-assistant")
        
        # Create task from assistant message
        workflow_id = f"slack_assistant_{user_id}_{int(time.time())}"
        
        from ...client import client as restack_client
        from ...utils.formatters import format_slack_message_for_task
        
        # Get user info
        user_info = client.users_info(user=user_id)
        user_name = user_info["user"]["real_name"] or user_info["user"]["name"]
        
        title, description = format_slack_message_for_task(
            user_name=user_name,
            user_id=user_id,
            message_text=message_text,
            channel_id=channel_id,
            message_ts=thread_ts,
            is_assistant_panel=True
        )
        
        # Create task
        result = restack_client.schedule_workflow(
            workflow_name="TasksCreateWorkflow",
            workflow_id=workflow_id,
            workflow_input={
                "workspace_id": workspace_id,
                "title": title,
                "description": description,
                "status": "open",
                "agent_name": agent_name,
                "metadata": {
                    "slack_channel": channel_id,
                    "slack_thread_ts": thread_ts,
                    "slack_user_id": user_id,
                    "source": "assistant_panel"
                }
            }
        )
        
        logger.info(f"Created task {result} from assistant panel")
        
        # Send immediate acknowledgment in assistant panel
        say({
            "text": f"I'm working on this now! Task created: http://localhost:3000/tasks/{result}",
            "thread_ts": thread_ts,
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "✅ *Task Created*\n\nI'm processing your request now. I'll update you here when complete."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Task ID: `{result}`"
                        }
                    ]
                }
            ]
        })
        
    except Exception as e:
        logger.exception(f"Error in assistant_thread_context_changed: {e}")
        try:
            say({
                "text": f"❌ Error processing your request: {str(e)}",
                "thread_ts": event.get("assistant_thread", {}).get("thread_ts")
            })
        except Exception:
            pass
