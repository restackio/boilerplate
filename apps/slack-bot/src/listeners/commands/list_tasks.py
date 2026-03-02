"""Handle /restack-list and /restack-new commands."""
import asyncio
import logging
import os

from ...database import get_workspace_id_from_event

logger = logging.getLogger(__name__)

# Get the app instance
from ...app import app


@app.command("/restack-list")
def handle_restack_list_command(ack, command, client):
    """
    Handle /restack-list slash command.
    Shows your open tasks.
    """
    ack()
    
    try:
        asyncio.run(handle_list_tasks(command, client))
    except Exception as e:
        logger.exception(f"Error handling /restack-list command: {e}")
        client.chat_postEphemeral(
            channel=command["channel_id"],
            user=command["user_id"],
            text=f"❌ Error: {str(e)}"
        )


@app.command("/restack-new")
def handle_restack_new_command(ack, command, client):
    """
    Handle /restack-new slash command.
    Creates a new task with a modal.
    """
    ack()
    
    try:
        handle_create_task(command, client)
    except Exception as e:
        logger.exception(f"Error handling /restack-new command: {e}")
        client.chat_postEphemeral(
            channel=command["channel_id"],
            user=command["user_id"],
            text=f"❌ Error: {str(e)}"
        )


async def handle_list_tasks(command, client):
    """Handle list-tasks subcommand."""
    try:
        user_id = command["user_id"]
        channel_id = command["channel_id"]
        
        # Get workspace ID from Slack team
        workspace_id = await get_workspace_id_from_event({"team": command.get("team_id")})
        if not workspace_id:
            workspace_id = os.getenv("DEFAULT_WORKSPACE_ID")
        
        if not workspace_id:
            client.chat_postEphemeral(
                channel=channel_id,
                user=user_id,
                text="❌ Workspace not configured. Please connect Slack to your workspace first."
            )
            return
        
        # Query tasks from backend
        from ...client import client as restack_client
        
        # TODO: Need to create a workflow to fetch tasks by workspace
        # For now, show a placeholder
        client.chat_postEphemeral(
            channel=channel_id,
            user=user_id,
            text="📋 *Your Tasks*",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "📋 *Your Open Tasks*\n\n_Loading tasks..._"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Workspace: `{workspace_id}`"
                        }
                    ]
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "View in Dashboard"
                            },
                            "url": f"http://localhost:3000/tasks",
                            "action_id": "view_dashboard"
                        }
                    ]
                }
            ]
        )
        
    except Exception as e:
        logger.exception(f"Error listing tasks: {e}")
        client.chat_postEphemeral(
            channel=command["channel_id"],
            user=command["user_id"],
            text=f"❌ Error listing tasks: {str(e)}"
        )


def handle_create_task(command, client):
    """Handle create-task subcommand."""
    try:
        user_id = command["user_id"]
        channel_id = command["channel_id"]
        text = command.get("text", "").replace("create-task", "").strip()
        
        if not text:
            # Show modal for task creation
            client.views_open(
                trigger_id=command["trigger_id"],
                view={
                    "type": "modal",
                    "callback_id": "create_task_modal",
                    "title": {"type": "plain_text", "text": "Create Task"},
                    "submit": {"type": "plain_text", "text": "Create"},
                    "close": {"type": "plain_text", "text": "Cancel"},
                    "blocks": [
                        {
                            "type": "input",
                            "block_id": "task_title",
                            "label": {"type": "plain_text", "text": "Task Title"},
                            "element": {
                                "type": "plain_text_input",
                                "action_id": "title_input",
                                "placeholder": {"type": "plain_text", "text": "What needs to be done?"}
                            }
                        },
                        {
                            "type": "input",
                            "block_id": "task_description",
                            "label": {"type": "plain_text", "text": "Description"},
                            "element": {
                                "type": "plain_text_input",
                                "action_id": "description_input",
                                "multiline": True,
                                "placeholder": {"type": "plain_text", "text": "Provide more details..."}
                            },
                            "optional": True
                        },
                        {
                            "type": "input",
                            "block_id": "agent_select",
                            "label": {"type": "plain_text", "text": "Assign to Agent"},
                            "element": {
                                "type": "static_select",
                                "action_id": "agent_input",
                                "placeholder": {"type": "plain_text", "text": "Select an agent"},
                                "options": [
                                    {
                                        "text": {"type": "plain_text", "text": "🤖 General Assistant"},
                                        "value": "general-assistant"
                                    },
                                    {
                                        "text": {"type": "plain_text", "text": "💬 Customer Support"},
                                        "value": "customer-support"
                                    },
                                    {
                                        "text": {"type": "plain_text", "text": "🔍 Data Analyst"},
                                        "value": "data-analyst"
                                    },
                                    {
                                        "text": {"type": "plain_text", "text": "📊 Report Generator"},
                                        "value": "report-generator"
                                    }
                                ]
                            }
                        }
                    ]
                }
            )
        else:
            # Quick create with text
            client.chat_postEphemeral(
                channel=channel_id,
                user=user_id,
                text=f"Creating task: {text}...\n\n_This feature is coming soon! For now, DM me to create tasks._"
            )
            
    except Exception as e:
        logger.exception(f"Error in create-task: {e}")
        client.chat_postEphemeral(
            channel=command["channel_id"],
            user=command["user_id"],
            text=f"❌ Error: {str(e)}"
        )


@app.view("create_task_modal")
def handle_create_task_submission(ack, body, client, view):
    """Handle task creation modal submission."""
    ack()
    
    try:
        user_id = body["user"]["id"]
        values = view["state"]["values"]
        
        title = values["task_title"]["title_input"]["value"]
        description = values["task_description"]["description_input"].get("value", "")
        agent = values["agent_select"]["agent_input"]["selected_option"]["value"]
        
        logger.info(f"Creating task: {title} for agent {agent}")
        
        # Create task via workflow
        workspace_id = os.getenv("DEFAULT_WORKSPACE_ID")
        
        from ...client import client as restack_client
        import time
        
        workflow_id = f"slack_command_{user_id}_{int(time.time())}"
        
        result = restack_client.schedule_workflow(
            workflow_name="TasksCreateWorkflow",
            workflow_id=workflow_id,
            workflow_input={
                "workspace_id": workspace_id,
                "title": title,
                "description": description or title,
                "status": "open",
                "agent_name": agent,
                "metadata": {
                    "slack_user_id": user_id,
                    "source": "slash_command"
                }
            }
        )
        
        logger.info(f"Created task {result} from slash command")
        
        # Send confirmation DM
        user_dm = client.conversations_open(users=[user_id])
        dm_channel = user_dm["channel"]["id"]
        
        client.chat_postMessage(
            channel=dm_channel,
            text=f"✅ Task created: {title}",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"✅ *Task Created*\n\n*Title:* {title}\n*Agent:* {agent}\n*Task ID:* `{result}`"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "View Task"},
                            "url": f"http://localhost:3000/tasks/{result}",
                            "action_id": "view_task"
                        }
                    ]
                }
            ]
        )
        
    except Exception as e:
        logger.exception(f"Error creating task: {e}")

