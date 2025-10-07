"""Create subtask workflow for MCP tool."""

from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import NonRetryableError, log, workflow


class SendAgentEventInput(BaseModel):
    event_name: str
    temporal_agent_id: str
    temporal_run_id: str | None = None
    event_input: dict[str, Any] | None = None

class CreateSubtaskInput(BaseModel):
    """Input for creating a subtask with a specific agent."""

    sub_agent_id: str = Field(
        description="Database UUID of the agent to use for this subtask (e.g., pipeline agent, research agent). Use a different agent_id from meta_info.agent_id."
    )
    task_title: str = Field(
        description="Title for the subtask"
    )
    task_description: str = Field(
        description="Detailed instructions for the subtask"
    )
    parent_temporal_agent_id: str = Field(
        description="temporal_agent_id from meta_info (this is the Temporal agent ID of the parent agent)"
    )
    parent_temporal_run_id: str = Field(
        description="temporal_run_id from meta_info (this is the Temporal run ID of the parent agent)"
    )

    class Config:
        """Pydantic configuration."""

        populate_by_name = True  # Allow both agent_id and subagent_id


class CreateSubtaskOutput(BaseModel):
    """Result from creating a subtask."""

    status: str
    message: str


@workflow.defn(
    description="""Create a subtask to handle a specialized task.

    Use this when you need help from another agent with specific expertise.

    IMPORTANT: You must pass your temporal_agent_id and temporal_run_id from meta_info.

    Example: If you need code reviewed, create a code-reviewer subtask.
    Example: If you need tests written, create a test-generator subtask.

    The subtask will complete its task and report back to you."""
)
class CreateSubtask:
    """MCP workflow to create a subtask via agent event."""

    @workflow.run
    async def run(
        self, workflow_input: CreateSubtaskInput
    ) -> CreateSubtaskOutput:
        """Send subtask creation event to parent agent.

        Uses the generic send_agent_event function to notify the parent agent.
        The parent agent's temporal_agent_id and temporal_run_id come from meta_info that the LLM has access to.
        """
        log.info(f"CreateSubtask workflow started for: {workflow_input.task_title}")
        try:
            # Send subtask_create event to parent agent using temporal_agent_id from meta_info
            await workflow.step(
                function="send_agent_event",
                function_input=SendAgentEventInput(
                    event_name="subtask_create",
                    temporal_agent_id=workflow_input.parent_temporal_agent_id,
                    temporal_run_id=workflow_input.parent_temporal_run_id,
                    event_input={
                        "agent_id": workflow_input.sub_agent_id,
                        "task_title": workflow_input.task_title,
                        "task_description": workflow_input.task_description,
                    },
                    wait_for_completion=False,
                ),
                start_to_close_timeout=timedelta(seconds=30),
            )

            log.info(f"Subtask creation event sent to parent agent {workflow_input.parent_temporal_agent_id}")

            return CreateSubtaskOutput(
                status="requested",
                message=f"Subtask '{workflow_input.task_title}' has been requested",
            )

        except Exception as e:
            error_message = f"Error during create_subtask: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e

