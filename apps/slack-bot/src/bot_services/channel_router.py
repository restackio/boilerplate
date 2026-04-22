"""Channel → agent routing via the SlackRouteEventWorkflow."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from ..config import config

logger = logging.getLogger(__name__)


def _to_dict(result: Any) -> dict[str, Any] | None:
    if isinstance(result, dict):
        return result
    if hasattr(result, "found"):
        return {
            "found": result.found,
            "agent_id": getattr(result, "agent_id", None),
            "workspace_id": getattr(result, "workspace_id", None),
            "bot_token": getattr(result, "bot_token", None),
            "installation_id": getattr(result, "installation_id", None),
        }
    return None


async def route_slack_event(team_id: str, channel_id: str) -> dict[str, Any] | None:
    """Look up the agent/workspace for a Slack team + channel pair.

    Calls the ``SlackRouteEventWorkflow`` which returns a dict with keys:
    ``found``, ``agent_id``, ``workspace_id``, ``bot_token``, ``installation_id``.
    Returns ``None`` if the workflow call fails entirely.
    """
    from ..client import client as restack_client

    workflow_id = f"slack_route_{team_id}_{channel_id}_{uuid.uuid4().hex[:12]}"

    try:
        run_id = await restack_client.schedule_workflow(
            workflow_name="SlackRouteEventWorkflow",
            workflow_id=workflow_id,
            workflow_input={
                "team_id": team_id,
                "channel_id": channel_id,
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
            "SlackRouteEventWorkflow failed for %s/%s: %s", team_id, channel_id, e
        )
        return None
