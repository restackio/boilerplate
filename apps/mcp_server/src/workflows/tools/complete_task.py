"""Complete task workflow for MCP tool."""

from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import NonRetryableError, log, workflow


class SendAgentEventInput(BaseModel):
    event_name: str
    temporal_agent_id: str
    temporal_run_id: str | None = None
    event_input: dict[str, Any] | None = None


class CompleteTaskInput(BaseModel):
    """Input for completing a task."""

    temporal_agent_id: str = Field(
        description="temporal_agent_id from meta_info (this is the Temporal agent ID to complete)"
    )
    temporal_run_id: str = Field(
        description="temporal_run_id from meta_info (this is the Temporal run ID to complete)"
    )
    result: str | None = Field(
        default=None,
        description="Optional completion message or result summary"
    )
    task_id: str = Field(
        description="task_id from meta_info (this is the ID of the task to complete)"
    )


class CompleteTaskOutput(BaseModel):
    """Result from completing a task."""

    status: str
    message: str


@workflow.defn(
    description="""Complete the current task and stop the agent.

    Use this when you have finished your work and want to mark the task as complete.

    IMPORTANT: You must pass your temporal_agent_id, temporal_run_id and task_id from meta_info.

    Example: After completing a research task, call this to signal completion and mark task as completed.
    Example: When all subtasks are done and you're ready to finish.

    The agent will stop running after this event is sent."""
)
class CompleteTask:
    """MCP workflow to complete a task via agent event."""

    @workflow.run
    async def run(
        self, workflow_input: CompleteTaskInput
    ) -> CompleteTaskOutput:
        """Send end event to agent to mark task as complete.

        Uses the send_agent_event function to send an "end" event.
        The agent's temporal_agent_id and temporal_run_id come from meta_info that the LLM has access to.
        """
        log.info(
            f"CompleteTask workflow started for agent: {workflow_input.temporal_agent_id}"
        )
        try:
            # Prepare event input
            event_input = {}
            if workflow_input.result:
                event_input["result"] = workflow_input.result

            # Send end event to agent using temporal_agent_id from meta_info
            await workflow.step(
                function="send_agent_event",
                function_input=SendAgentEventInput(
                    event_name="end",
                    temporal_agent_id=workflow_input.temporal_agent_id,
                    temporal_run_id=workflow_input.temporal_run_id,
                    event_input=event_input if event_input else None,
                    wait_for_completion=False,
                ),
                start_to_close_timeout=timedelta(seconds=30),
            )

            log.info(
                f"End event sent to agent {workflow_input.temporal_agent_id}"
            )

            return CompleteTaskOutput(
                status="completed",
                message=f"Task completion signal sent. Agent will stop running.",
            )

        except Exception as e:
            error_message = f"Error during complete_task: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
