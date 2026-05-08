"""Channel → agent routing via the ChannelRouteEventWorkflow."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from ..config import config

logger = logging.getLogger(__name__)

SLACK_CHANNEL_TYPE = "slack"


def _to_dict(result: Any) -> dict[str, Any] | None:
    if isinstance(result, dict):
        return result
    if hasattr(result, "found"):
        return {
            "found": result.found,
            "agent_id": getattr(result, "agent_id", None),
            "workspace_id": getattr(result, "workspace_id", None),
            "bot_token": getattr(result, "bot_token", None),
            "channel_integration_id": getattr(
                result, "channel_integration_id", None
            ),
        }
    return None


async def route_slack_event(team_id: str, channel_id: str) -> dict[str, Any] | None:
    """Look up the agent/workspace for a Slack team + channel pair.

    Calls the polymorphic ``ChannelRouteEventWorkflow`` with
    ``channel_type='slack'`` and returns a dict with keys: ``found``,
    ``agent_id``, ``workspace_id``, ``bot_token``, ``channel_integration_id``.
    Returns ``None`` if the workflow call fails entirely.
    """
    from ..client import client as restack_client

    workflow_id = f"channel_route_{team_id}_{channel_id}_{uuid.uuid4().hex[:12]}"

    try:
        run_id = await restack_client.schedule_workflow(
            workflow_name="ChannelRouteEventWorkflow",
            workflow_id=workflow_id,
            workflow_input={
                "channel_type": SLACK_CHANNEL_TYPE,
                "external_id": team_id,
                "external_channel_id": channel_id,
            },
            task_queue=config.RESTACK_TASK_QUEUE,
        )
        result = await restack_client.get_workflow_result(
            workflow_id=workflow_id,
            run_id=run_id,
        )

        d = _to_dict(result)
        if d is not None:
            logger.info(
                "Route result for %s/%s: found=%s agent=%s token=%s",
                team_id,
                channel_id,
                d.get("found"),
                d.get("agent_id"),
                "yes" if d.get("bot_token") else "no",
            )
            return d

        return None

    except Exception as e:
        logger.warning(
            "ChannelRouteEventWorkflow failed for %s/%s: %s",
            team_id,
            channel_id,
            e,
        )
        return None


async def consume_pending_welcome(
    team_id: str, channel_id: str
) -> dict[str, Any] | None:
    """Pop the welcome_pending flag for a (Slack team, channel) pair.

    Returns a dict with ``found``, and (if found) ``agent_id``,
    ``agent_name``, ``connected_by_user_name``. Returns ``None`` when the
    workflow itself fails — callers should treat that the same as
    ``found=false`` and just skip the welcome.
    """
    from ..client import client as restack_client

    workflow_id = (
        f"channel_consume_welcome_{team_id}_{channel_id}_"
        f"{uuid.uuid4().hex[:12]}"
    )

    try:
        run_id = await restack_client.schedule_workflow(
            workflow_name="ChannelConsumePendingWelcomeWorkflow",
            workflow_id=workflow_id,
            workflow_input={
                "channel_type": SLACK_CHANNEL_TYPE,
                "external_id": team_id,
                "external_channel_id": channel_id,
            },
            task_queue=config.RESTACK_TASK_QUEUE,
        )
        result = await restack_client.get_workflow_result(
            workflow_id=workflow_id,
            run_id=run_id,
        )
    except Exception as e:
        logger.warning(
            "ChannelConsumePendingWelcomeWorkflow failed for %s/%s: %s",
            team_id,
            channel_id,
            e,
        )
        return None

    if isinstance(result, dict):
        return result
    found = bool(getattr(result, "found", False))
    if not found:
        return {"found": False}
    return {
        "found": True,
        "channel_id": getattr(result, "channel_id", None),
        "agent_id": getattr(result, "agent_id", None),
        "agent_name": getattr(result, "agent_name", None),
        "connected_by_user_name": getattr(
            result, "connected_by_user_name", None
        ),
    }
