"""Handle direct messages to the bot with agent selection."""
import asyncio
import logging
import os
from slack_bolt import App

from ...client import client
from ...utils.formatters import format_slack_message_for_task
from ...database import get_workspace_id_from_event

logger = logging.getLogger(__name__)

# Get the app instance
from ...app import app


@app.event("message")
def handle_message_events(event, say, client):
    """
    Handle all message events - routes to appropriate handler.
    Bolt requires sync handlers, so we wrap async calls.
    """
    logger.info(f"📩 Message event received: type={event.get('type')}, channel_type={event.get('channel_type')}, subtype={event.get('subtype')}")
    
    # Ignore messages from bots
    if event.get("subtype") == "bot_message":
        return
    
    # Route based on message type
    if event.get("thread_ts"):
        # This is a thread reply - forward to agent
        asyncio.run(handle_thread_reply(event, say, client))
        return
    
    # Only handle DMs for new tasks (channel type is 'im')
    channel_type = event.get("channel_type")
    if channel_type != "im":
        return
    
    # This is a new DM - show agent selector
    asyncio.run(handle_new_dm(event, say, client))


async def handle_new_dm(event, say, client):
    """Handle new direct messages to the bot."""
    try:
        user_id = event.get("user")
        message_text = event.get("text", "")
        channel_id = event.get("channel")
        message_ts = event.get("ts")
        
        # Get user info
        user_info = client.users_info(user=user_id)
        user_name = user_info["user"]["real_name"] or user_info["user"]["name"]
        
        logger.info(f"Received DM from {user_name}: {message_text[:50]}...")
        
        # Look up workspace ID from Slack team
        workspace_id = await get_workspace_id_from_event(event)
        if not workspace_id:
            # Fallback to env var for single-workspace mode
            workspace_id = os.getenv("DEFAULT_WORKSPACE_ID")
            
        if not workspace_id:
            logger.error("No workspace found for this Slack team")
            say(
                text="❌ This Slack workspace is not connected. Please connect it first via the platform's Integrations page.",
                thread_ts=message_ts
            )
            return
        
        # Show agent selection modal/dropdown
        # First, send a message asking to select agent
        response = say(
            text="I'll help you with that! First, which agent should handle this?",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"📝 *New Task Request*\n\n_{message_text[:100]}{'...' if len(message_text) > 100 else ''}_"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "Which agent should handle this task?"
                    },
                    "accessory": {
                        "type": "static_select",
                        "placeholder": {
                            "type": "plain_text",
                            "text": "Select an agent"
                        },
                        "action_id": "select_agent_for_task",
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
                            },
                            {
                                "text": {"type": "plain_text", "text": "🐛 Bug Triager"},
                                "value": "bug-triager"
                            }
                        ]
                    }
                }
            ],
            thread_ts=message_ts
        )
        
        # Store the context in the message metadata for the action handler
        # We'll retrieve this when the user selects an agent
        
    except Exception as e:
        logger.exception(f"Error handling message: {e}")
        say(
            text=f"❌ Sorry, I encountered an error: {str(e)}",
            thread_ts=event.get("ts")
        )


@app.action("select_agent_for_task")
def handle_agent_selection(ack, body, say, client):
    """Handle when user selects an agent from the dropdown."""
    ack()
    
    try:
        # Get selected agent
        selected_agent = body["actions"][0]["selected_option"]["value"]
        agent_name = body["actions"][0]["selected_option"]["text"]["text"]
        
        # Get original message context
        user_id = body["user"]["id"]
        channel_id = body["channel"]["id"]
        message = body["message"]
        
        # Extract the original user message from the blocks
        original_text = message["blocks"][0]["text"]["text"]
        # Remove the header and formatting
        original_text = original_text.split("\n\n")[1].strip("_")
        
        # Get thread_ts from the message
        thread_ts = message.get("ts")
        
        logger.info(f"User selected agent: {selected_agent}")
        
        # Update the message to show selection
        client.chat_update(
            channel=channel_id,
            ts=message["ts"],
            text=f"Creating task with {agent_name}...",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"✅ Creating task with *{agent_name}*..."
                    }
                }
            ]
        )
        
        # Get workspace ID
        workspace_id = os.getenv("DEFAULT_WORKSPACE_ID")
        
        # Get user info
        user_info = client.users_info(user=user_id)
        user_name = user_info["user"]["real_name"] or user_info["user"]["name"]
        
        # Format task
        title, description = format_slack_message_for_task(
            user_name=user_name,
            user_id=user_id,
            message_text=original_text,
            channel_id=channel_id,
            message_ts=thread_ts
        )
        
        # Create task via backend workflow
        import time
        workflow_id = f"slack_dm_{user_id}_{int(time.time())}"
        
        from ...client import client as restack_client
        
        result = restack_client.schedule_workflow(
            workflow_name="TasksCreateWorkflow",
            workflow_id=workflow_id,
            workflow_input={
                "workspace_id": workspace_id,
                "title": title,
                "description": description,
                "status": "open",
                "agent_name": selected_agent,
                "metadata": {
                    "slack_channel": channel_id,
                    "slack_thread_ts": thread_ts,
                    "slack_user_id": user_id,
                    "slack_message_ts": message["ts"]  # For updating
                }
            }
        )
        
        logger.info(f"Created task {result} from Slack DM with agent {selected_agent}")
        
        # Update the message with task info
        task_url = f"http://localhost:3000/tasks/{result}"
        client.chat_update(
            channel=channel_id,
            ts=message["ts"],
            text=f"Task created with {agent_name}!",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"✅ *Task Created!*\n\nAssigned to: {agent_name}\nTask ID: `{result}`"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "View Task"},
                            "url": task_url,
                            "action_id": "view_task"
                        }
                    ]
                }
            ]
        )
        
        # Send a new message in thread to start the conversation
        say(
            text=f"🚀 I'm working on your request now! I'll keep you updated in this thread.",
            thread_ts=thread_ts,
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🚀 *Task Started*\n\nI'm processing your request. You'll receive updates here as I progress.\n\n💬 Reply in this thread to send messages to the agent."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Agent: {agent_name} | <{task_url}|View in Dashboard>"
                        }
                    ]
                }
            ]
        )
        
    except Exception as e:
        logger.exception(f"Error handling agent selection: {e}")
        say(
            text=f"❌ Error creating task: {str(e)}",
            thread_ts=body.get("message", {}).get("ts")
        )


@app.event("app_mention")
def handle_app_mention_in_channel(event, say, client):
    """Handle when bot is mentioned in a channel - also shows agent selector."""
    try:
        # Look up workspace ID from Slack team (wrap async call)
        workspace_id = asyncio.run(get_workspace_id_from_event(event))
        if not workspace_id:
            workspace_id = os.getenv("DEFAULT_WORKSPACE_ID")
        
        if not workspace_id:
            logger.error("No workspace found for this Slack team")
            say(
                text="❌ This Slack workspace is not connected. Please connect it first via the platform's Integrations page.",
                thread_ts=event.get("ts")
            )
            return
        
        # Continue with existing logic
        user_id = event.get("user")
        message_text = event.get("text", "")
        channel_id = event.get("channel")
        message_ts = event.get("ts")
        
        # Remove the bot mention from the text
        bot_user_id = os.getenv("SLACK_BOT_USER_ID", "")
        message_text = message_text.replace(f"<@{bot_user_id}>", "").strip()
        
        # Get user info
        user_info = client.users_info(user=user_id)
        user_name = user_info["user"]["real_name"] or user_info["user"]["name"]
        
        logger.info(f"Mentioned by {user_name} in channel {channel_id}")
        
        # React to show we're processing
        client.reactions_add(
            channel=channel_id,
            timestamp=message_ts,
            name="eyes"
        )
        
        # Show agent selector in thread
        say(
            text="Which agent should handle this?",
            thread_ts=message_ts,
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"📝 *New Request from <@{user_id}>*\n\n_{message_text[:100]}{'...' if len(message_text) > 100 else ''}_"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "Which agent should handle this?"
                    },
                    "accessory": {
                        "type": "static_select",
                        "placeholder": {
                            "type": "plain_text",
                            "text": "Select an agent"
                        },
                        "action_id": "select_agent_for_task",
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
        )
        
        # Remove eyes reaction
        client.reactions_remove(
            channel=channel_id,
            timestamp=message_ts,
            name="eyes"
        )
        
    except Exception as e:
        logger.exception(f"Error handling app mention: {e}")
        say(
            text=f"❌ Error: {str(e)}",
            thread_ts=message_ts
        )


# Handle thread replies - these become messages to the agent
async def handle_thread_reply(event, say, client):
    """
    Handle replies in threads - these are messages to the agent.
    When user replies in a task thread, forward to agent.
    """
    
    try:
        thread_ts = event.get("thread_ts")
        message_text = event.get("text", "")
        user_id = event.get("user")
        channel_id = event.get("channel")
        message_ts = event.get("ts")
        
        logger.info(f"Thread reply from user {user_id}: {message_text[:50]}...")
        
        # Add a reaction to show we received it
        client.reactions_add(
            channel=channel_id,
            timestamp=message_ts,
            name="speech_balloon"
        )
        
        # Look up the task_id for this thread
        from ...database import get_task_id_by_thread_ts
        task_id = await get_task_id_by_thread_ts(thread_ts)
        
        if not task_id:
            logger.warning(f"No task found for thread {thread_ts}")
            say(
                thread_ts=thread_ts,
                text="⚠️ I couldn't find the task for this conversation. The task may have been deleted."
            )
            return
        
        logger.info(f"Forwarding message to task {task_id}")
        
        # Send the user message to the agent
        # For now, we'll acknowledge and show we're processing
        say(
            thread_ts=thread_ts,
            text=f"💬 Processing your message..."
        )
        
        # TODO: Create workflow to add user message to task and trigger agent response
        # This would be something like: TasksAddUserMessageWorkflow
        # For now, just log it
        logger.info(f"Would send message to task {task_id}: {message_text[:100]}")
        
    except Exception as e:
        logger.exception(f"Error handling thread reply: {e}")
