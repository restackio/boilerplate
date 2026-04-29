"""Handle inline channel-agent configuration from Slack.

When a user @mentions the bot in a channel with no mapped agent, the bot
shows a dropdown.  Selecting an agent triggers this handler which:
1. Persists the channel → agent mapping in the database
2. Confirms the configuration
3. Processes the original message as a new task
"""

import asyncio
import logging

from ...app import app
from ...bot_services.task_manager import create_task_from_slack
from ...config import config
from ...utils.blocks import error_blocks, task_created_blocks
from ...utils.formatters import format_slack_message_for_task
from ...utils.helpers import extract_task_id

logger = logging.getLogger(__name__)


@app.action("configure_channel_agent")
def handle_configure_channel_agent(ack, body, say, client):
    ack()
    asyncio.run(_do_configure(body, say, client))


async def _do_configure(body, say, client):
    try:
        selected = body["actions"][0]["selected_option"]
        agent_id = selected["value"]
        agent_name = selected["text"]["text"]

        channel_id = body["channel"]["id"]
        message = body["message"]
        thread_ts = message.get("thread_ts") or message.get("ts")
        team_id = (body.get("team") or {}).get("id") or body.get("team_id") or ""

        metadata = message.get("metadata", {}).get("event_payload", {})
        workspace_id = metadata.get("workspace_id")
        channel_integration_id = metadata.get("channel_integration_id")
        message_text = metadata.get("message_text", "")
        user_id = metadata.get("user_id", body["user"]["id"])
        user_name = metadata.get("user_name", "Unknown")
        original_ts = metadata.get("message_ts", thread_ts)
        channel_name = metadata.get("channel_name", "")

        if not workspace_id:
            workspace_id = config.DEFAULT_WORKSPACE_ID
        if not workspace_id:
            say(
                text="Workspace not configured.",
                blocks=error_blocks(
                    "No workspace configured. Set DEFAULT_WORKSPACE_ID."
                ),
                thread_ts=thread_ts,
            )
            return

        # -- 1. Persist the channel → agent mapping --
        if channel_integration_id:
            try:
                from ...client import client as restack_client

                import uuid

                wf_id = f"slack_ch_agent_{channel_id}_{uuid.uuid4().hex[:8]}"
                run_id = await restack_client.schedule_workflow(
                    workflow_name="ChannelCreateWorkflow",
                    workflow_id=wf_id,
                    workflow_input={
                        "channel_integration_id": channel_integration_id,
                        "external_channel_id": channel_id,
                        "agent_id": agent_id,
                        "notify_slack": False,
                    },
                    task_queue=config.RESTACK_TASK_QUEUE,
                )
                await restack_client.get_workflow_result(
                    workflow_id=wf_id, run_id=run_id
                )
                logger.info(
                    "Persisted channel mapping %s → agent %s (%s)",
                    channel_id,
                    agent_id,
                    agent_name,
                )
            except Exception:
                logger.exception("Failed to persist channel mapping for %s", channel_id)

        # -- 2. Update the selector message to show confirmation --
        client.chat_update(
            channel=channel_id,
            ts=message["ts"],
            text=f"Channel configured — using {agent_name}",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": (
                            f":white_check_mark: *{agent_name}* is now the agent "
                            f"for this channel. Future messages will be routed "
                            f"automatically."
                        ),
                    },
                }
            ],
        )

        # -- 3. Process the original message --
        if not message_text:
            return

        is_channel = bool(channel_id) and not channel_id.startswith("D")
        title, description = format_slack_message_for_task(
            user_name=user_name,
            user_id=user_id,
            message_text=message_text,
            channel_id=channel_id,
            message_ts=original_ts,
            is_channel_message=is_channel,
        )

        result = await create_task_from_slack(
            workspace_id=workspace_id,
            agent_id=agent_id,
            agent_name=agent_name,
            title=title,
            description=description,
            slack_channel=channel_id,
            slack_thread_ts=original_ts,
            slack_user_id=user_id,
            slack_team_id=team_id or None,
            slack_channel_name=channel_name or None,
        )

        if result:
            task_id = extract_task_id(result)
            say(
                text=f"Task created with {agent_name}",
                blocks=task_created_blocks(task_id, agent_name),
                thread_ts=original_ts,
            )
        else:
            say(
                text="Failed to create task.",
                blocks=error_blocks("Something went wrong creating the task."),
                thread_ts=original_ts,
            )

    except Exception as e:
        logger.exception("Error handling channel config: %s", e)
        thread = body.get("message", {}).get("ts")
        say(
            text=f"Error: {e}",
            blocks=error_blocks(f"Error configuring channel: {e}"),
            thread_ts=thread,
        )
