"""Lightweight subtask lifecycle notifications."""

import logging

from pydantic import BaseModel, Field
from restack_ai.function import function

from src.client import client

log = logging.getLogger(__name__)


class SubtaskNotifyInput(BaseModel):
    """Input for notifying parent of subtask lifecycle event."""

    temporal_parent_agent_id: str = Field(..., description="Parent agent Temporal ID")
    task_id: str = Field(..., description="This subtask task_id (database UUID)")
    title: str = Field(..., description="Subtask title")
    status: str = Field(..., description="Lifecycle status: started, completed, failed")
    message: str | None = Field(None, description="Optional message (e.g., error)")


class SubtaskNotifyOutput(BaseModel):
    """Output for notification."""

    success: bool
    message: str | None = None


@function.defn()
async def subtask_notify(
    function_input: SubtaskNotifyInput,
) -> SubtaskNotifyOutput:
    """Notify parent agent of subtask lifecycle event.

    Lightweight notification for important events only (started, completed, failed).
    Parent can react without storing state.
    """
    try:
        await client.send_agent_event(
            event_name="subtask_notify",
            agent_id=function_input.temporal_parent_agent_id,
            run_id=None,
            event_input={
                "task_id": function_input.task_id,
                "title": function_input.title,
                "status": function_input.status,
                "message": function_input.message,
            },
            wait_for_completion=False,  # Don't block child agent
        )

        log.debug(
            "Notified parent %s: %s → %s",
            function_input.temporal_parent_agent_id,
            function_input.title,
            function_input.status,
        )

        return SubtaskNotifyOutput(
            success=True,
            message=f"Status {function_input.status} sent to parent",
        )

    except Exception as e:
        log.exception("Failed to notify parent")
        return SubtaskNotifyOutput(success=False, message=f"Failed to notify: {e}")

