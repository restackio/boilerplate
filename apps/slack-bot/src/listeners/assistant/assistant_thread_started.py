"""Handle assistant thread started events."""
import logging
from slack_bolt import App

logger = logging.getLogger(__name__)

# Get the app instance
from ...app import app


@app.event("assistant_thread_started")
def handle_assistant_thread_started(event, say, logger):
    """
    Handle when a user starts a new conversation in the assistant side panel.
    Send suggested prompts to help users get started.
    """
    try:
        logger.info("Assistant thread started")
        
        # Send welcome message with suggested prompts
        say({
            "text": "Hi! I'm your AI assistant. How can I help you today?",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "👋 Hi! I'm your AI assistant. Here are some things I can help with:"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "• *Analyze data* - Upload files or describe datasets\n• *Create tasks* - Describe what needs to be done\n• *Answer questions* - Ask me anything about your projects\n• *Summarize conversations* - Get quick summaries"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "💡 *Suggested prompts:*"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "📊 Show my task stats"
                            },
                            "value": "show_task_stats",
                            "action_id": "suggested_prompt_stats"
                        },
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "🔍 List open tasks"
                            },
                            "value": "list_open_tasks",
                            "action_id": "suggested_prompt_open"
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
                                "text": "🤖 List all agents"
                            },
                            "value": "list_agents",
                            "action_id": "suggested_prompt_agents"
                        },
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "❓ Help & documentation"
                            },
                            "value": "show_help",
                            "action_id": "suggested_prompt_help"
                        }
                    ]
                }
            ]
        })
        
    except Exception as e:
        logger.exception(f"Error in assistant_thread_started: {e}")


@app.action("suggested_prompt_stats")
def handle_stats_prompt(ack, body, client):
    """Handle stats prompt button click."""
    ack()
    # This would trigger a message event that gets processed by the assistant
    # For now, we'll just acknowledge it
    logger.info("User clicked stats prompt")


@app.action("suggested_prompt_open")
def handle_open_tasks_prompt(ack, body, client):
    """Handle open tasks prompt button click."""
    ack()
    logger.info("User clicked open tasks prompt")


@app.action("suggested_prompt_agents")
def handle_agents_prompt(ack, body, client):
    """Handle agents prompt button click."""
    ack()
    logger.info("User clicked agents prompt")


@app.action("suggested_prompt_help")
def handle_help_prompt(ack, body, client):
    """Handle help prompt button click."""
    ack()
    logger.info("User clicked help prompt")

