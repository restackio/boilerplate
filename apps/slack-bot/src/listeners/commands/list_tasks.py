"""Handle /restack-list slash command."""

import logging

from ...app import app
from ...config import config

logger = logging.getLogger(__name__)


@app.command("/restack-list")
def handle_restack_list_command(ack, command, client):
    """Show open tasks with a link to the dashboard."""
    ack()

    try:
        user_id = command["user_id"]
        channel_id = command["channel_id"]
        dashboard_url = f"{config.FRONTEND_URL}/tasks"

        client.chat_postEphemeral(
            channel=channel_id,
            user=user_id,
            text="View your tasks in the dashboard.",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": ":clipboard: *Your Tasks*\nView and manage your tasks in the dashboard.",
                    },
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "Open Dashboard"},
                            "url": dashboard_url,
                            "action_id": "view_dashboard",
                        }
                    ],
                },
            ],
        )
    except Exception as e:
        logger.exception("Error handling /restack-list: %s", e)
        client.chat_postEphemeral(
            channel=command["channel_id"],
            user=command["user_id"],
            text=f"Error: {e}",
        )


@app.action("view_dashboard")
def handle_view_dashboard(ack, body):
    """Acknowledge dashboard button click."""
    ack()
