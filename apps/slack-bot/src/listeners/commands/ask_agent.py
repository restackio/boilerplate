"""Handle /ask-agent slash command."""
import logging
import os
import time

logger = logging.getLogger(__name__)

# Get the app instance
from ...app import app


@app.command("/ask-agent")
def handle_ask_agent_command(ack, command, client, respond):
    """
    Handle the /ask-agent slash command.
    Example: /ask-agent What's the status of task #123?
    """
    ack()
    
    try:
        user_id = command.get("user_id")
        channel_id = command.get("channel_id")
        text = command.get("text", "").strip()
        
        if not text:
            respond({
                "response_type": "ephemeral",
                "text": "Please provide a question or request after the command.\nExample: `/ask-agent What are my open tasks?`"
            })
            return
        
        # Get user info
        user_info = client.users_info(user=user_id)
        user_name = user_info["user"]["real_name"] or user_info["user"]["name"]
        
        logger.info(f"Slash command from {user_name}: {text[:50]}...")
        
        # Send immediate response
        respond({
            "response_type": "ephemeral",
            "text": f"🤖 Processing your request: _{text}_\n\nI'll send you a DM with the response shortly!"
        })
        
        # Get configuration
        workspace_id = os.getenv("DEFAULT_WORKSPACE_ID")
        if not workspace_id:
            client.chat_postMessage(
                channel=user_id,
                text="❌ Configuration error: Workspace not configured. Please contact your administrator."
            )
            return
        
        agent_name = os.getenv("DEFAULT_AGENT_NAME", "slack-assistant")
        
        # Create task via workflow
        workflow_id = f"slack_command_{user_id}_{int(time.time())}"
        
        from ...client import client as restack_client
        from ...utils.formatters import format_slack_message_for_task
        
        title, description = format_slack_message_for_task(
            user_name=user_name,
            user_id=user_id,
            message_text=text,
            channel_id=channel_id,
            message_ts=None,
            is_slash_command=True
        )
        
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
                    "slack_user_id": user_id,
                    "slack_channel": channel_id,
                    "source": "slash_command"
                }
            }
        )
        
        logger.info(f"Created task {result} from slash command")
        
        # Send DM with task details
        task_url = f"http://localhost:3000/tasks/{result}"
        client.chat_postMessage(
            channel=user_id,
            text=f"✅ Your request has been created as a task!\n\n*Your question:* {text}\n\nView task: {task_url}\n\nI'll notify you here when it's complete."
        )
        
    except Exception as e:
        logger.exception(f"Error handling /ask-agent command: {e}")
        respond({
            "response_type": "ephemeral",
            "text": f"❌ Sorry, I encountered an error: {str(e)}"
        })

