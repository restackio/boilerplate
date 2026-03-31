"""Task creation and agent messaging via Restack workflows."""

import logging
import time
from typing import Any

from ..config import config

TASK_QUEUE = config.RESTACK_TASK_QUEUE

logger = logging.getLogger(__name__)


async def create_task_from_slack(
    *,
    workspace_id: str,
    agent_id: str,
    agent_name: str,
    title: str,
    description: str,
    slack_channel: str,
    slack_thread_ts: str,
    slack_user_id: str,
    assigned_to_id: str | None = None,
) -> dict[str, Any] | None:
    """Schedule a TasksCreateWorkflow with Slack metadata attached."""
    from ..client import client as restack_client

    workflow_id = f"slack_task_{slack_user_id}_{int(time.time())}"

    try:
        run_id = await restack_client.schedule_workflow(
            workflow_name="TasksCreateWorkflow",
            workflow_id=workflow_id,
            workflow_input={
                "workspace_id": workspace_id,
                "title": title,
                "description": description,
                "status": "in_progress",
                "agent_id": agent_id,
                "agent_name": agent_name,
                "assigned_to_id": assigned_to_id,
                "task_metadata": {
                    "slack_channel": slack_channel,
                    "slack_thread_ts": slack_thread_ts,
                    "slack_user_id": slack_user_id,
                    "source": "slack",
                },
            },
            task_queue=TASK_QUEUE,
        )
        result = await restack_client.get_workflow_result(
            workflow_id=workflow_id,
            run_id=run_id,
        )

        logger.info("Created task via workflow %s", workflow_id)
        return result

    except Exception as e:
        logger.exception("Failed to create task via workflow: %s", e)
        return None


async def send_message_to_agent(
    *,
    temporal_agent_id: str,
    message_text: str,
) -> bool:
    """Forward a thread reply to a running agent as a user message event."""
    from ..client import client as restack_client

    try:
        await restack_client.send_agent_event(
            event_name="messages",
            agent_id=temporal_agent_id,
            event_input={"messages": [{"role": "user", "content": message_text}], "source": "slack"},
        )
        logger.info("Sent message to agent %s", temporal_agent_id)
        return True

    except Exception as e:
        logger.warning(
            "Failed to send message to agent %s: %s",
            temporal_agent_id,
            e,
        )
        return False
